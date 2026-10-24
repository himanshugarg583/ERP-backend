const sequelize = require('../../../config/db');
const { Op } = require('sequelize');
const {
  FeeStructureV1,
  StudentFeeAssignmentV1,
  AcademicYear,
  ClassSection,
  InstallmentPlanV1,
  FeeStructureItemV1,
  FeeHeadV1,
  FeeInvoiceV1,
  FeeInvoiceItemV1
} = require('../../../models');
const { Student } = require('../../../models/admin/students');
const { User } = require('../../../models/admin/users');
const { ok, fail } = require('../../../utils/response');
const { createInvoiceForAssignmentInstallment } = require('../../../services/fees/v1/invoiceService');
const { calculateLateFine, round2 } = require('../../../services/fees/v1/feeRulesService');

const resolveStudentIdForUser = async (userId) => {
  const student = await Student.findOne({ where: { user_id: userId }, attributes: ['id'] });
  return student ? Number(student.id) : null;
};

const getTargetStudents = async ({ classIds = [], studentIds = [] }) => {
  if (studentIds.length > 0) {
    return Student.findAll({ where: { id: { [Op.in]: studentIds } }, attributes: ['id', 'class_section_id'] });
  }

  if (classIds.length > 0) {
    return Student.findAll({ where: { class_section_id: { [Op.in]: classIds } }, attributes: ['id', 'class_section_id'] });
  }

  return [];
};

const getDueInstallmentsForStructure = async (feeStructureId, startDate, transaction) => {
  return InstallmentPlanV1.findAll({
    where: {
      fee_structure_id: feeStructureId,
      start_date: {
        [Op.lte]: startDate
      }
    },
    order: [['start_date', 'ASC'], ['installment_number', 'ASC']],
    transaction
  });
};

const formatValidationDetails = (error) => {
  if (!error || !Array.isArray(error.errors)) return null;

  return error.errors.map((item) => ({
    message: item.message,
    path: item.path,
    value: item.value,
    type: item.type,
    validatorKey: item.validatorKey
  }));
};

const previewBulkAssignment = async (req, res) => {
  try {
    const structure = await FeeStructureV1.findByPk(req.params.structureId);
    if (!structure) return fail(res, { statusCode: 404, code: 'not_found', message: 'Fee structure not found' });

    const classId = req.body.class_id ?? structure.class_id ?? null;
    const classIds = classId ? [classId] : [];
    const studentIds = req.body.student_ids || [];
    const students = await getTargetStudents({ classIds, studentIds });

    return ok(res, {
      fee_structure_id: structure.id,
      total_students: students.length,
      class_id: classId,
      sample_student_ids: students.slice(0, 15).map((s) => s.id)
    });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const createAssignment = async ({
  studentId,
  structure,
  academicYearId,
  assignedBy,
  customItems,
  excludedHeads,
  overrideJson,
  transaction
}) => {
  const resolvedType = structure.structure_type;

  // Check for duplicate assignment of THIS SPECIFIC fee structure
  const duplicateAssignment = await StudentFeeAssignmentV1.findOne({
    where: {
      student_id: studentId,
      fee_structure_id: structure.id,
      status: 'active'
    },
    include: [{
      model: FeeStructureV1,
      as: 'feeStructure',
      required: true,
      where: { academic_year_id: academicYearId },
      attributes: ['id']
    }],
    transaction
  });

  if (duplicateAssignment) {
    const err = new Error(`Student ${studentId} already has this fee structure assigned for the selected academic year.`);
    err.statusCode = 409;
    throw err;
  }

  const normalizedCustomItems = customItems || null;
  const normalizedExcludedHeads = excludedHeads || null;
  const normalizedOverrideJson = overrideJson || {
    custom_items: normalizedCustomItems,
    excluded_heads: normalizedExcludedHeads
  };

  const assignment = await StudentFeeAssignmentV1.create({
    student_id: studentId,
    fee_structure_id: structure.id,
    assigned_by: assignedBy,
    assigned_at: new Date(),
    override_json: normalizedOverrideJson,
    custom_items: normalizedCustomItems,
    excluded_heads: normalizedExcludedHeads,
    status: 'active'
  }, { transaction });

  return assignment;
};

const assignSingleStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      student_id,
      fee_structure_id,
      academic_year_id,
      custom_items,
      excluded_heads,
      override_json
    } = req.body;

    const student = await Student.findByPk(student_id, { transaction });
    if (!student) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'student_not_found', message: 'Student not found' });
    }

    const structure = await FeeStructureV1.findByPk(fee_structure_id, { transaction });
    if (!structure || !structure.is_active) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'structure_not_found', message: 'Fee structure not found or inactive' });
    }

    const year = await AcademicYear.findByPk(academic_year_id, { transaction });
    if (!year) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'year_not_found', message: 'Academic year not found' });
    }

    const assignment = await createAssignment({
      studentId: student.id,
      structure,
      academicYearId: year.id,
      assignedBy: req.user.id,
      customItems: custom_items,
      excludedHeads: excluded_heads,
      overrideJson: override_json,
      transaction
    });

    // Generate invoices for all due installments (including past dates)
    const today = new Date().toISOString().split('T')[0];
    const dueInstallments = await getDueInstallmentsForStructure(structure.id, today, transaction);
    
    for (const installment of dueInstallments) {
      // eslint-disable-next-line no-await-in-loop
      await createInvoiceForAssignmentInstallment({ assignment, installment, transaction });
    }

    await transaction.commit();
    return ok(res, assignment, null, 201);
  } catch (error) {
    await transaction.rollback();
    return fail(res, { statusCode: error.statusCode || 500, code: 'assignment_failed', message: error.message });
  }
};

const assignBulk = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      fee_structure_id,
      class_ids = [],
      student_ids = [],
      academic_year_id,
      custom_items,
      excluded_heads,
      override_json
    } = req.body;

    const structure = await FeeStructureV1.findByPk(fee_structure_id, { transaction });
    if (!structure || !structure.is_active) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'structure_not_found', message: 'Fee structure not found or inactive' });
    }

    const year = await AcademicYear.findByPk(academic_year_id, { transaction });
    if (!year) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'year_not_found', message: 'Academic year not found' });
    }

    const students = await getTargetStudents({ classIds: class_ids, studentIds: student_ids });
    if (students.length === 0) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'students_not_found', message: 'No students found for assignment.' });
    }

    const targetStudentIds = students.map((student) => student.id);
    const duplicateWhere = {
      student_id: { [Op.in]: targetStudentIds },
      fee_structure_id: structure.id,
      status: 'active'
    };

    const existingAssignments = await StudentFeeAssignmentV1.findAll({
      where: duplicateWhere,
      include: [{
        model: FeeStructureV1,
        as: 'feeStructure',
        required: true,
        where: { academic_year_id, id: structure.id },
        attributes: ['id', 'academic_year_id', 'structure_type']
      }],
      attributes: ['id', 'student_id', 'fee_structure_id']
    });

    if (existingAssignments.length > 0) {
      await transaction.rollback();
      return fail(res, {
        statusCode: 409,
        code: 'assignment_already_exists',
        message: 'Fee assignment already exists for one or more students. Duplicate assignment is not allowed.',
        details: existingAssignments.map((row) => ({
          assignment_id: row.id,
          student_id: row.student_id,
          fee_structure_id: row.fee_structure_id,
          assignment_type: row.feeStructure.structure_type
        }))
      });
    }

    const assigned = [];
    const skipped = [];
    const createdAssignments = [];

    for (const student of students) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const assignment = await createAssignment({
          studentId: student.id,
          structure,
          academicYearId: year.id,
          assignedBy: req.user.id,
          customItems: custom_items,
          excludedHeads: excluded_heads,
          overrideJson: override_json,
          assignmentType: structure.structure_type,
          transaction
        });

        assigned.push(assignment.id);
        createdAssignments.push(assignment);
      } catch (err) {
        skipped.push({ student_id: student.id, reason: err.message });
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const dueInstallments = await getDueInstallmentsForStructure(structure.id, today, transaction);
    let generatedInvoices = 0;

    for (const assignment of createdAssignments) {
      for (const installment of dueInstallments) {
        // eslint-disable-next-line no-await-in-loop
        const invoice = await createInvoiceForAssignmentInstallment({ assignment, installment, transaction });
        if (invoice) generatedInvoices += 1;
      }
    }

    await transaction.commit();

    return ok(res, {
      assigned_count: assigned.length,
      skipped_count: skipped.length,
      skipped_students: skipped,
      generated_invoices: generatedInvoices,
      due_installments_count: dueInstallments.length
    });
  } catch (error) {
    await transaction.rollback();
    console.error('[bulk_assignment_failed]', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      details: formatValidationDetails(error)
    });

    return fail(res, {
      statusCode: 500,
      code: 'bulk_assignment_failed',
      message: error.message,
      details: formatValidationDetails(error)
    });
  }
};

const assignOneTimeFee = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      fee_structure_id,
      class_ids = [],
      student_ids = [],
      academic_year_id,
      custom_items,
      excluded_heads,
      override_json
    } = req.body;

    const structure = await FeeStructureV1.findByPk(fee_structure_id, {
      include: [{ model: InstallmentPlanV1, as: 'installments' }],
      transaction
    });

    if (!structure || !structure.is_active) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'structure_not_found', message: 'Fee structure not found or inactive' });
    }

    if (structure.structure_type !== 'one_time') {
      await transaction.rollback();
      return fail(res, {
        statusCode: 422,
        code: 'invalid_structure_type',
        message: 'Use a one_time fee structure for this operation.'
      });
    }

    const installment = structure.installments?.[0];
    if (!installment) {
      await transaction.rollback();
      return fail(res, {
        statusCode: 422,
        code: 'missing_installment',
        message: 'One-time fee structure must have an installment plan.'
      });
    }

    const year = await AcademicYear.findByPk(academic_year_id, { transaction });
    if (!year) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'year_not_found', message: 'Academic year not found' });
    }

    const students = await getTargetStudents({ classIds: class_ids, studentIds: student_ids });
    if (students.length === 0) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'students_not_found', message: 'No students found for one-time assignment.' });
    }

    const result = {
      assigned_count: 0,
      skipped_count: 0,
      skipped_students: [],
      generated_invoices: 0
    };

    // Get all due installments (including past dates)
    const today = new Date().toISOString().split('T')[0];
    const dueInstallments = await getDueInstallmentsForStructure(structure.id, today, transaction);

    for (const student of students) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const assignment = await createAssignment({
          studentId: student.id,
          structure,
          academicYearId: year.id,
          assignedBy: req.user.id,
          customItems: custom_items,
          excludedHeads: excluded_heads,
          overrideJson: override_json,
          assignmentType: 'one_time',
          transaction
        });

        // Generate invoices for all due installments
        for (const inst of dueInstallments) {
          // eslint-disable-next-line no-await-in-loop
          await createInvoiceForAssignmentInstallment({ assignment, installment: inst, transaction });
          result.generated_invoices += 1;
        }
        result.assigned_count += 1;
      } catch (err) {
        result.skipped_count += 1;
        result.skipped_students.push({ student_id: student.id, reason: err.message });
      }
    }

    await transaction.commit();
    return ok(res, result, null, 201);
  } catch (error) {
    await transaction.rollback();
    return fail(res, { statusCode: 500, code: 'one_time_assignment_failed', message: error.message });
  }
};

const listAssignments = async (req, res) => {
  try {
    const where = {};
    const feeStructureWhere = {};
    const studentWhere = {};

    // Default to active assignments for table view.
    where.status = req.query.status || 'active';
    if (req.query.student_id) where.student_id = Number(req.query.student_id);
    if (req.query.academic_year_id) feeStructureWhere.academic_year_id = Number(req.query.academic_year_id);
    if (req.query.fee_structure_id) where.fee_structure_id = Number(req.query.fee_structure_id);
    if (req.query.assignment_type) feeStructureWhere.structure_type = req.query.assignment_type;
    if (req.query.class_section_id) studentWhere.class_section_id = Number(req.query.class_section_id);

    const rows = await StudentFeeAssignmentV1.findAll({
      where,
      include: [
        {
          model: FeeStructureV1,
          as: 'feeStructure',
          required: true,
          where: feeStructureWhere,
          attributes: ['id', 'name', 'structure_type', 'academic_year_id'],
          include: [
            {
              model: AcademicYear,
              as: 'academicYear',
              required: false
            },
            {
              model: FeeStructureItemV1,
              as: 'items',
              attributes: ['amount'],
              required: false
            }
          ]
        },
        {
          model: Student,
          as: 'student',
          required: true,
          where: studentWhere,
          attributes: ['id', 'class_section_id'],
          include: [{
            model: ClassSection,
            attributes: ['id', 'class_name', 'section_name'],
            required: false
          }]
        }
      ],
      order: [['assigned_at', 'DESC'], ['id', 'DESC']]
    });

    const grouped = new Map();

    for (const row of rows) {
      const feeStructure = row.feeStructure;
      const student = row.student;
      if (!feeStructure || !student) continue;

      const classSection = student.ClassSection || null;
      const classSectionId = student.class_section_id || null;
      const groupKey = `${feeStructure.id}::${classSectionId || 'null'}`;

      if (!grouped.has(groupKey)) {
        const totalAmount = (feeStructure.items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
        grouped.set(groupKey, {
          fee_structure_id: feeStructure.id,
          fee_structure_name: feeStructure.name,
          total_amount: totalAmount,
          total_assigned_students: 0,
          class_section_id: classSection ? classSection.id : classSectionId,
          class_section_name: classSection ? `${classSection.class_name}-${classSection.section_name}` : null,
          academic_year_id: feeStructure.academic_year_id,
          academic_year_name: feeStructure.academicYear ? feeStructure.academicYear.name : null,
          fee_type: feeStructure.structure_type,
          _student_ids: new Set()
        });
      }

      grouped.get(groupKey)._student_ids.add(student.id);
    }

    const data = Array.from(grouped.values()).map((entry) => ({
      fee_structure_id: entry.fee_structure_id,
      fee_structure_name: entry.fee_structure_name,
      total_amount: entry.total_amount,
      total_assigned_students: entry._student_ids.size,
      class_section_id: entry.class_section_id,
      class_section_name: entry.class_section_name,
      academic_year_id: entry.academic_year_id,
      academic_year_name: entry.academic_year_name,
      fee_type: entry.fee_type
    }));

    return ok(res, data);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const getAssignmentById = async (req, res) => {
  try {
    const assignment = await StudentFeeAssignmentV1.findByPk(req.params.id, {
      include: [
        {
          model: FeeStructureV1,
          as: 'feeStructure',
          include: [
            { model: FeeStructureItemV1, as: 'items' },
            { model: InstallmentPlanV1, as: 'installments' }
          ]
        }
      ]
    });

    if (!assignment) return fail(res, { statusCode: 404, code: 'not_found', message: 'Assignment not found' });
    return ok(res, assignment);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const getActiveAssignmentForStudent = async (req, res) => {
  try {
    const authenticatedStudentId = await resolveStudentIdForUser(req.user.id);
    if (!authenticatedStudentId) {
      return fail(res, { statusCode: 403, code: 'forbidden', message: 'Student profile not found for this account.' });
    }

    const where = { student_id: authenticatedStudentId, status: 'active' };
    const feeStructureWhere = {};
    if (req.query.academic_year_id) feeStructureWhere.academic_year_id = Number(req.query.academic_year_id);

    const student = await Student.findByPk(authenticatedStudentId, {
      include: [
        { model: User, attributes: ['id', 'name', 'email'] },
        { model: ClassSection, attributes: ['id', 'class_name', 'section_name'] }
      ],
      attributes: ['id', 'roll_number', 'phone_no', 'class_section_id']
    });

    if (!student) {
      return fail(res, { statusCode: 404, code: 'student_not_found', message: 'Student not found' });
    }

    // Fetch the assignment with fee structure
    const assignment = await StudentFeeAssignmentV1.findOne({
      where,
      include: [{
        model: FeeStructureV1,
        as: 'feeStructure',
        required: Object.keys(feeStructureWhere).length > 0,
        where: feeStructureWhere
      }],
      order: [['assigned_at', 'DESC']]
    });

    if (!assignment) return fail(res, { statusCode: 404, code: 'not_found', message: 'No active assignment found' });

    // Fetch fee structure items with fee head details
    const feeStructureItems = await FeeStructureItemV1.findAll({
      where: { fee_structure_id: assignment.fee_structure_id },
      include: [{ model: FeeHeadV1, as: 'feeHead', attributes: ['id', 'name', 'category', 'description', 'display_order', 'is_optional'] }],
      order: [['sort_order', 'ASC']],
      attributes: ['id', 'fee_structure_id', 'fee_head_id', 'amount', 'is_mandatory', 'sort_order']
    });

    // Fetch all installments for this fee structure
    const installments = await InstallmentPlanV1.findAll({
      where: { fee_structure_id: assignment.fee_structure_id },
      order: [['installment_number', 'ASC']],
      attributes: ['id', 'fee_structure_id', 'name', 'installment_number', 'due_date', 'start_date', 'percentage', 'allow_partial_payment', 'fixed_amount', 'late_fine_type', 'late_fine_value']
    });

    // Fetch all invoices (paid and unpaid) with their items
    const invoices = await FeeInvoiceV1.findAll({
      where: { assignment_id: assignment.id },
      include: [
        {
          model: FeeInvoiceItemV1,
          as: 'items',
          include: [{ model: FeeHeadV1, as: 'feeHead', attributes: ['id', 'name', 'category', 'display_order'] }],
          attributes: ['id', 'invoice_id', 'fee_head_id', 'gross_amount', 'concession_amount', 'net_amount']
        },
        {
          model: InstallmentPlanV1,
          as: 'installment',
          attributes: ['id', 'name', 'installment_number', 'due_date', 'percentage']
        }
      ],
      order: [['due_date', 'ASC'], ['generated_at', 'ASC']],
      attributes: ['id', 'invoice_number', 'invoice_no', 'student_id', 'assignment_id', 'installment_plan_id', 'gross_amount', 'concession_amount', 'net_amount', 'fine_amount', 'paid_amount', 'balance_amount', 'status', 'due_date', 'start_date', 'generated_at']
    });

    const feeStructureTotal = feeStructureItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const invoiceByInstallmentId = new Map(invoices.map((inv) => [inv.installment_plan_id, inv]));

    const installmentRows = installments.map((inst) => {
      const invoice = invoiceByInstallmentId.get(inst.id) || null;
      const rawFineType = inst.late_fine_type || 'none';
      const fineValue = Number(inst.late_fine_value || 0);
      const calculationFineType = rawFineType !== 'none' ? rawFineType : (fineValue > 0 && new Date() > new Date(invoice?.due_date || inst.due_date) ? 'per_day' : 'none');
      const displayFineType = calculationFineType === 'per_day' ? 'percentage' : calculationFineType;
      const calculatedFine = calculateLateFine({
        dueDate: invoice?.due_date || inst.due_date,
        graceDays: 0,
        fineType: calculationFineType,
        fineValue,
        maxFine: null,
        paymentDate: new Date()
      });

      const payableAmount = invoice
        ? round2(Number(invoice.net_amount) + Number(calculatedFine) - Number(invoice.paid_amount))
        : null;

      return {
        installment_id: inst.id,
        installment_name: inst.name,
        installment_number: inst.installment_number,
        start_date: inst.start_date,
        due_date: inst.due_date,
        percentage: Number(inst.percentage),
        allow_partial_payment: inst.allow_partial_payment,
        fixed_amount: inst.fixed_amount ? Number(inst.fixed_amount) : null,
        late_fine_type: displayFineType,
        fine_rule: {
          fine_type: displayFineType,
          due_date: invoice?.due_date || inst.due_date,
          is_overdue: new Date() > new Date(invoice?.due_date || inst.due_date)
        },
        calculated_fine: Number(calculatedFine),
        payable_amount: payableAmount !== null ? Number(payableAmount) : null,
        has_invoice: Boolean(invoice),
        invoice: invoice ? {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          invoice_no: invoice.invoice_no,
          status: invoice.status,
          gross_amount: Number(invoice.gross_amount),
          concession_amount: Number(invoice.concession_amount),
          net_amount: Number(invoice.net_amount),
          paid_amount: Number(invoice.paid_amount),
          balance_amount: Number(invoice.balance_amount),
          due_date: invoice.due_date,
          start_date: invoice.start_date,
          generated_at: invoice.generated_at
        } : null
      };
    });

    const responseData = {
      student: {
        id: student.id,
        name: student.User?.name || null,
        email: student.User?.email || null,
        phone: student.phone_no || null,
        roll_number: student.roll_number || null,
        admission_number: student.admission_no ?? student.admission_number ?? null,
        class: student.ClassSection ? {
          id: student.ClassSection.id,
          name: student.ClassSection.class_name,
          section: student.ClassSection.section_name
        } : null
      },
      assignment: {
        id: assignment.id,
        student_id: assignment.student_id,
        fee_structure_id: assignment.fee_structure_id,
        academic_year_id: assignment.feeStructure.academic_year_id,
        assignment_type: assignment.feeStructure.structure_type,
        status: assignment.status,
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by
      },
      fee_structure: {
        id: assignment.feeStructure.id,
        name: assignment.feeStructure.name,
        description: assignment.feeStructure.description,
        structure_type: assignment.feeStructure.structure_type,
        is_active: assignment.feeStructure.is_active,
        total_amount: Number(feeStructureTotal),
        fee_heads: feeStructureItems.map((item) => ({
          fee_head_id: item.fee_head_id,
          name: item.feeHead ? item.feeHead.name : null,
          amount: Number(item.amount),
          is_mandatory: item.is_mandatory,
          sort_order: item.sort_order,
          category: item.feeHead ? item.feeHead.category : null,
          description: item.feeHead ? item.feeHead.description : null,
          is_optional: item.feeHead ? item.feeHead.is_optional : null,
          display_order: item.feeHead ? item.feeHead.display_order : null
        }))
      },
      installments: installmentRows
    };

    return ok(res, responseData);
  } catch (error) {
    console.error('[getActiveAssignmentForStudent] Error:', {
      message: error.message,
      stack: error.stack,
      studentId: req.params.studentId,
      userId: req.user?.id,
      userRole: req.user?.role
    });
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const cancelAssignment = async (req, res) => {
  try {
    const assignment = await StudentFeeAssignmentV1.findByPk(req.params.id);
    if (!assignment) return fail(res, { statusCode: 404, code: 'not_found', message: 'Assignment not found' });

    assignment.status = 'cancelled';
    assignment.cancellation_reason = req.body.reason || null;
    await assignment.save();

    return ok(res, assignment);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const getClassDues = async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    if (!classId) return fail(res, { statusCode: 400, code: 'invalid_input', message: 'Class ID is required' });

    // Get all students in this class
    const students = await Student.findAll({
      where: { class_section_id: classId },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ],
      attributes: ['id', 'user_id', 'roll_number', 'phone_no', 'class_section_id']
    });

    if (students.length === 0) {
      return ok(res, []);
    }

    const studentIds = students.map(s => s.id);

    // Get all active assignments for these students
    const assignments = await StudentFeeAssignmentV1.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        status: 'active'
      },
      attributes: ['id', 'student_id', 'fee_structure_id'],
      raw: true
    });

    if (assignments.length === 0) {
      return ok(res, []);
    }

    const assignmentIds = assignments.map(a => a.id);

    // Get all unpaid invoices for these assignments
    const invoices = await FeeInvoiceV1.findAll({
      where: {
        assignment_id: { [Op.in]: assignmentIds },
        status: { [Op.in]: ['active', 'overdue', 'draft', 'partial'] }
      },
      include: [
        {
          model: FeeInvoiceItemV1,
          as: 'items',
          include: [{ model: FeeHeadV1, as: 'feeHead', attributes: ['id', 'name', 'category', 'display_order'] }],
          attributes: ['id', 'fee_head_id', 'gross_amount', 'concession_amount', 'net_amount']
        }
      ],
      attributes: ['id', 'invoice_number', 'invoice_no', 'student_id', 'assignment_id', 'gross_amount', 'concession_amount', 'net_amount', 'fine_amount', 'paid_amount', 'balance_amount', 'status', 'due_date', 'generated_at'],
      order: [['due_date', 'ASC'], ['generated_at', 'ASC']]
    });

    if (invoices.length === 0) {
      return ok(res, []);
    }

    // Build response grouped by student
    const studentsData = students.map(student => {
      const studentAssignments = assignments.filter(a => a.student_id === student.id);
      const studentInvoiceIds = studentAssignments.map(a => a.id);

      const studentInvoices = invoices.filter(inv => studentInvoiceIds.includes(inv.assignment_id));

      if (studentInvoices.length === 0) {
        return null;
      }

      const formattedInvoices = studentInvoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_no: inv.invoice_no,
        assignment_id: inv.assignment_id,
        status: inv.status,
        due_date: inv.due_date,
        generated_at: inv.generated_at,
        gross_amount: Number(inv.gross_amount),
        concession_amount: Number(inv.concession_amount),
        net_amount: Number(inv.net_amount),
        fine_amount: Number(inv.fine_amount),
        paid_amount: Number(inv.paid_amount),
        balance_amount: Number(inv.balance_amount),
        items: inv.items.map(item => ({
          id: item.id,
          fee_head_id: item.fee_head_id,
          gross_amount: Number(item.gross_amount),
          concession_amount: Number(item.concession_amount),
          net_amount: Number(item.net_amount),
          feeHead: item.feeHead ? {
            id: item.feeHead.id,
            name: item.feeHead.name,
            category: item.feeHead.category,
            display_order: item.feeHead.display_order
          } : null
        }))
      }));

      return {
        id: student.id,
        user_id: student.user_id,
        name: student.User?.name || 'N/A',
        email: student.User?.email || 'N/A',
        roll_number: student.roll_number,
        phone_no: student.phone_no,
        invoices: formattedInvoices
      };
    }).filter(s => s !== null);

    // Sort students by first invoice due date
    studentsData.sort((a, b) => new Date(a.invoices[0]?.due_date) - new Date(b.invoices[0]?.due_date));

    return ok(res, studentsData);
  } catch (error) {
    console.error('[getClassDues] Error:', {
      message: error.message,
      stack: error.stack,
      classId: req.params.classId,
      userId: req.user?.id,
      userRole: req.user?.role
    });
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

module.exports = {
  previewBulkAssignment,
  assignSingleStudent,
  assignBulk,
  assignOneTimeFee,
  listAssignments,
  getAssignmentById,
  getActiveAssignmentForStudent,
  getClassDues,
  cancelAssignment
};
