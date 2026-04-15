const { FeeHeadV1, FeeStructureItemV1 } = require('../../../models/admin/fees_v1');
const { ok, fail } = require('../../../utils/response');

const listFeeHeads = async (req, res) => {
  try {
    const where = {};
    if (req.query.category) where.category = req.query.category;
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';

    const rows = await FeeHeadV1.findAll({ where, order: [['name', 'ASC']] });
    return ok(res, rows, { total: rows.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const getFeeHead = async (req, res) => {
  try {
    const row = await FeeHeadV1.findByPk(req.params.id);
    if (!row) return fail(res, { statusCode: 404, code: 'not_found', message: 'Fee head not found' });
    return ok(res, row);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const createFeeHead = async (req, res) => {
  try {
    const payload = {
      name: req.body.name.trim(),
      category: req.body.category,
      description: req.body.description || null,
      is_optional: Boolean(req.body.is_optional),
      is_refundable: Boolean(req.body.is_refundable),
      ledger_code: req.body.ledger_code || null,
      is_active: true
    };

    const exists = await FeeHeadV1.findOne({ where: { name: payload.name } });
    if (exists) return fail(res, { statusCode: 409, code: 'duplicate', message: 'Fee head already exists' });

    const row = await FeeHeadV1.create(payload);
    return ok(res, row, null, 201);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const updateFeeHead = async (req, res) => {
  try {
    const row = await FeeHeadV1.findByPk(req.params.id);
    if (!row) return fail(res, { statusCode: 404, code: 'not_found', message: 'Fee head not found' });

    await row.update({
      name: req.body.name ?? row.name,
      category: req.body.category ?? row.category,
      description: req.body.description ?? row.description,
      is_optional: req.body.is_optional ?? row.is_optional,
      is_refundable: req.body.is_refundable ?? row.is_refundable,
      ledger_code: req.body.ledger_code ?? row.ledger_code,
      is_active: req.body.is_active ?? row.is_active
    });

    return ok(res, row);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const deactivateFeeHead = async (req, res) => {
  try {
    const row = await FeeHeadV1.findByPk(req.params.id);
    if (!row) return fail(res, { statusCode: 404, code: 'not_found', message: 'Fee head not found' });

    const used = await FeeStructureItemV1.count({ where: { fee_head_id: row.id } });
    if (used > 0) {
      await row.update({ is_active: false });
      return ok(res, row, { message: 'Head deactivated because it is already used historically.' });
    }

    await row.destroy();
    return ok(res, { deleted: true, id: row.id });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

module.exports = {
  listFeeHeads,
  getFeeHead,
  createFeeHead,
  updateFeeHead,
  deactivateFeeHead
};
