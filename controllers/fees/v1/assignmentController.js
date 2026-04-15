const sequelize = require('../../../config/db');
const { Op } = require('sequelize');
const {
  FeeStructureV1,
  StudentFeeAssignmentV1,
  AcademicYear,
  InstallmentPlanV1,
  FeeStructureItemV1
} = require('../../../models/admin/fees_v1');
const { Student } = require('../../../models/admin/Student');
const { ok, fail } = require('../../../utils/response');
const { createInvoiceForAssignmentInstallment } = require('../../../services/fees/v1/invoiceService');

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

const previewBulkAssignment = async (req, res) => {
  try {
    const structure = await FeeStructureV1.findByPk(req.params.structureId);
    if (!structure) return fail(res, { statusCode: 404, code: 'not_found', message: 'Fee structure not found' });

    const classIds = req.body.class_ids || structure.class_ids || [];
    const studentIds = req.body.student_ids || [];
    const students = await getTargetStudents({ classIds, studentIds });

    return ok(res, {
      fee_structure_id: structure.id,
      total_students: students.length,
      class_ids: classIds,
      sample_student_ids: students.slice(0, 15).map((s) => s.id)
    });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const createAssignment = async ({ studentId, structure, academicYearId, assignedBy, customItems, excludedHeads, assignmentType, transaction }) => {
  const resolvedType = assignmentType || structure.structure_type;

  if (resolvedType === 'recurring') {
    const activeRecurring = await StudentFeeAssignmentV1.findOne({
      where: {
        student_id: studentId,
        academic_year_id: academicYearId,
        assignment_type: 'recurring',
        status: 'active'
      },
      transaction
    });

    if (activeRecurring) {
      const err = new Error(`Student ${studentId} already has an active recurring assignment for this academic year.`);
      err.statusCode = 409;
      throw err;
    }
  } else {
    const duplicateOneTime = await StudentFeeAssignmentV1.findOne({
      where: {
        student_id: studentId,
        academic_year_id: academicYearId,
        fee_structure_id: structure.id,
        assignment_type: 'one_time',
        status: 'active'
      },
      transaction
    });

    if (duplicateOneTime) {
      const err = new Error(`Student ${studentId} already has this one-time fee assigned for the selected year.`);
      err.statusCode = 409;
      throw err;
    }
  }

  const assignment = await StudentFeeAssignmentV1.create({
    student_id: studentId,
    fee_structure_id: structure.id,
    academic_year_id: academicYearId,
    assignment_type: resolvedType,
    assigned_by: assignedBy,
    assigned_at: new Date(),
    custom_items: customItems || null,
    excluded_heads: excludedHeads || null,
    status: 'active'
  }, { transaction });

  return assignment;
};

const assignSingleStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { student_id, fee_structure_id, academic_year_id, custom_items, excluded_heads } = req.body;

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
      assignmentType: structure.structure_type,
      transaction
    });

    // For one-time assignment, generate invoice immediately.
    if (structure.structure_type === 'one_time') {
      const installment = await InstallmentPlanV1.findOne({
        where: { fee_structure_id: structure.id },
        order: [['installment_number', 'ASC']],
        transaction
      });
      if (installment) {
        await createInvoiceForAssignmentInstallment({ assignment, installment, transaction });
      }
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
    const { fee_structure_id, class_ids = [], student_ids = [], academic_year_id, custom_items, excluded_heads } = req.body;

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

    const assigned = [];
    const skipped = [];

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
          assignmentType: structure.structure_type,
          transaction
        });

        assigned.push(assignment.id);
      } catch (err) {
        skipped.push({ student_id: student.id, reason: err.message });
      }
    }

    await transaction.commit();

    return ok(res, {
      assigned_count: assigned.length,
      skipped_count: skipped.length,
      skipped_students: skipped
    });
  } catch (error) {
    await transaction.rollback();
    return fail(res, { statusCode: 500, code: 'bulk_assignment_failed', message: error.message });
  }
};

const assignOneTimeFee = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { fee_structure_id, class_ids = [], student_ids = [], academic_year_id, custom_items, excluded_heads } = req.body;

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
          assignmentType: 'one_time',
          transaction
        });

        // eslint-disable-next-line no-await-in-loop
        await createInvoiceForAssignmentInstallment({ assignment, installment, transaction });
        result.assigned_count += 1;
        result.generated_invoices += 1;
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

const getAssignmentById = async (req, res) => {
  try {
    const assignment = await StudentFeeAssignmentV1.findByPk(req.params.id, {
      include: [
        {
          model: FeeStructureV1,
          as: 'structure',
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
    const requestedStudentId = Number(req.params.studentId);
    if (req.user?.role === 'student') {
      const authenticatedStudentId = await resolveStudentIdForUser(req.user.id);
      if (!authenticatedStudentId || authenticatedStudentId !== requestedStudentId) {
        return fail(res, { statusCode: 403, code: 'forbidden', message: 'You can only access your own assignment.' });
      }
    }

    const where = { student_id: req.params.studentId, status: 'active' };
    if (req.query.academic_year_id) where.academic_year_id = req.query.academic_year_id;

    const assignment = await StudentFeeAssignmentV1.findOne({
      where,
      include: [{ model: FeeStructureV1, as: 'structure' }],
      order: [['assigned_at', 'DESC']]
    });

    if (!assignment) return fail(res, { statusCode: 404, code: 'not_found', message: 'No active assignment found' });
    return ok(res, assignment);
  } catch (error) {
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

module.exports = {
  previewBulkAssignment,
  assignSingleStudent,
  assignBulk,
  assignOneTimeFee,
  getAssignmentById,
  getActiveAssignmentForStudent,
  cancelAssignment
};
