const sequelize = require('../../../config/db');
const { Op } = require('sequelize');
const {
  FeeStructureV1,
  FeeStructureItemV1,
  InstallmentPlanV1,
  StudentFeeAssignmentV1,
  AcademicYear,
  FeeHeadV1
} = require('../../../models/admin/fees_v1');
const { Student } = require('../../../models/admin/Student');
const { ok, fail } = require('../../../utils/response');
const { validateInstallmentPercentages } = require('../../../services/fees/v1/feeRulesService');

const listStructures = async (req, res) => {
  try {
    const where = {};
    if (req.query.academic_year_id) where.academic_year_id = req.query.academic_year_id;
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';
    if (req.query.structure_type) where.structure_type = req.query.structure_type;

    const rows = await FeeStructureV1.findAll({
      where,
      include: [
        { model: FeeStructureItemV1, as: 'items' },
        { model: InstallmentPlanV1, as: 'installments' }
      ],
      order: [['created_at', 'DESC']]
    });

    return ok(res, rows, { total: rows.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const createStructure = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      name,
      academic_year_id,
      applicable_to,
      class_ids,
      description,
      structure_type = 'recurring',
      items,
      installments
    } = req.body;

    const year = await AcademicYear.findByPk(academic_year_id, { transaction });
    if (!year) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'academic_year_not_found', message: 'Academic year not found' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return fail(res, { statusCode: 422, code: 'invalid_items', message: 'At least one structure item is required' });
    }

    const feeHeadIds = items.map((i) => i.fee_head_id);
    const foundHeads = await FeeHeadV1.findAll({ where: { id: feeHeadIds, is_active: true }, transaction });
    if (foundHeads.length !== feeHeadIds.length) {
      await transaction.rollback();
      return fail(res, { statusCode: 422, code: 'invalid_fee_heads', message: 'One or more fee heads are invalid or inactive' });
    }

    if (!Array.isArray(installments) || installments.length === 0) {
      await transaction.rollback();
      return fail(res, { statusCode: 422, code: 'invalid_installments', message: 'At least one installment is required' });
    }

    validateInstallmentPercentages(installments);

    if (structure_type === 'one_time') {
      if (installments.length !== 1 || Number(installments[0].percentage) !== 100) {
        await transaction.rollback();
        return fail(res, {
          statusCode: 422,
          code: 'invalid_one_time_installment',
          message: 'One-time structure must have exactly one installment with 100%.'
        });
      }
    }

    const structure = await FeeStructureV1.create({
      name,
      academic_year_id,
      applicable_to: applicable_to || null,
      class_ids: class_ids || null,
      description: description || null,
      structure_type,
      is_active: true,
      created_by: req.user.id
    }, { transaction });

    const itemRows = items.map((item, index) => ({
      fee_structure_id: structure.id,
      fee_head_id: item.fee_head_id,
      amount: Number(item.amount),
      is_mandatory: item.is_mandatory !== undefined ? Boolean(item.is_mandatory) : true,
      sort_order: item.sort_order || index + 1
    }));

    await FeeStructureItemV1.bulkCreate(itemRows, { transaction });

    const installmentRows = installments.map((item, index) => ({
      fee_structure_id: structure.id,
      name: item.name,
      installment_number: item.installment_number || index + 1,
      due_date: item.due_date,
      percentage: Number(item.percentage),
      late_fine_type: item.late_fine_type || 'none',
      late_fine_value: Number(item.late_fine_value || 0),
      max_late_fine: item.max_late_fine ?? null,
      grace_period_days: Number(item.grace_period_days || 0)
    }));

    await InstallmentPlanV1.bulkCreate(installmentRows, { transaction });

    await transaction.commit();

    const created = await FeeStructureV1.findByPk(structure.id, {
      include: [
        { model: FeeStructureItemV1, as: 'items', include: [{ model: FeeHeadV1, as: 'feeHead' }] },
        { model: InstallmentPlanV1, as: 'installments' }
      ]
    });

    return ok(res, created, null, 201);
  } catch (error) {
    await transaction.rollback();
    return fail(res, { statusCode: error.statusCode || 500, code: 'internal_error', message: error.message });
  }
};

const getStructureById = async (req, res) => {
  try {
    const row = await FeeStructureV1.findByPk(req.params.id, {
      include: [
        { model: FeeStructureItemV1, as: 'items', include: [{ model: FeeHeadV1, as: 'feeHead' }] },
        { model: InstallmentPlanV1, as: 'installments' }
      ]
    });

    if (!row) return fail(res, { statusCode: 404, code: 'not_found', message: 'Structure not found' });

    const assigned = await StudentFeeAssignmentV1.count({ where: { fee_structure_id: row.id, status: 'active' } });
    return ok(res, row, { assigned_students: assigned });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const updateStructure = async (req, res) => {
  try {
    const row = await FeeStructureV1.findByPk(req.params.id);
    if (!row) return fail(res, { statusCode: 404, code: 'not_found', message: 'Structure not found' });

    const assigned = await StudentFeeAssignmentV1.count({ where: { fee_structure_id: row.id, status: 'active' } });
    if (assigned > 0 && req.body.items) {
      return fail(res, {
        statusCode: 409,
        code: 'structure_locked',
        message: `Structure has ${assigned} active students - clone it to make amount changes.`
      });
    }

    await row.update({
      name: req.body.name ?? row.name,
      applicable_to: req.body.applicable_to ?? row.applicable_to,
      class_ids: req.body.class_ids ?? row.class_ids,
      description: req.body.description ?? row.description,
      is_active: req.body.is_active ?? row.is_active
    });

    return ok(res, row);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const cloneStructure = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const source = await FeeStructureV1.findByPk(req.params.id, {
      include: [
        { model: FeeStructureItemV1, as: 'items' },
        { model: InstallmentPlanV1, as: 'installments' }
      ],
      transaction
    });

    if (!source) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'not_found', message: 'Source structure not found' });
    }

    const targetYear = await AcademicYear.findByPk(req.body.academic_year_id, { transaction });
    if (!targetYear) {
      await transaction.rollback();
      return fail(res, { statusCode: 404, code: 'target_year_not_found', message: 'Target academic year not found' });
    }

    const cloned = await FeeStructureV1.create({
      name: req.body.name || `${source.name} (Copy)`,
      academic_year_id: req.body.academic_year_id,
      applicable_to: source.applicable_to,
      class_ids: source.class_ids,
      description: source.description,
      structure_type: source.structure_type,
      is_active: true,
      created_by: req.user.id
    }, { transaction });

    const itemRows = source.items.map((item) => ({
      fee_structure_id: cloned.id,
      fee_head_id: item.fee_head_id,
      amount: Number(item.amount),
      is_mandatory: item.is_mandatory,
      sort_order: item.sort_order
    }));

    await FeeStructureItemV1.bulkCreate(itemRows, { transaction });

    const installmentRows = source.installments.map((inst) => ({
      fee_structure_id: cloned.id,
      name: inst.name,
      installment_number: inst.installment_number,
      due_date: inst.due_date,
      percentage: Number(inst.percentage),
      late_fine_type: inst.late_fine_type,
      late_fine_value: Number(inst.late_fine_value),
      max_late_fine: inst.max_late_fine,
      grace_period_days: inst.grace_period_days
    }));

    await InstallmentPlanV1.bulkCreate(installmentRows, { transaction });

    await transaction.commit();
    return ok(res, { id: cloned.id, name: cloned.name }, null, 201);
  } catch (error) {
    await transaction.rollback();
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const structurePreview = async (req, res) => {
  try {
    const structure = await FeeStructureV1.findByPk(req.params.id);
    if (!structure) return fail(res, { statusCode: 404, code: 'not_found', message: 'Structure not found' });

    const classIds = Array.isArray(structure.class_ids) ? structure.class_ids : [];
    let students = [];

    if (classIds.length > 0) {
      students = await Student.findAll({ where: { class_section_id: { [Op.in]: classIds } } });
    }

    return ok(res, {
      structure_id: structure.id,
      class_ids: classIds,
      estimated_students: students.length,
      sample_student_ids: students.slice(0, 10).map((s) => s.id)
    });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

module.exports = {
  listStructures,
  createStructure,
  getStructureById,
  updateStructure,
  cloneStructure,
  structurePreview
};
