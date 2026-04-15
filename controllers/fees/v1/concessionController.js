const {
  ConcessionV1,
  StudentConcessionV1,
  FeeHeadV1,
  AcademicYear
} = require('../../../models/admin/fees_v1');
const { Student } = require('../../../models/admin/Student');
const { ok, fail } = require('../../../utils/response');

const resolveStudentIdForUser = async (userId) => {
  const student = await Student.findOne({ where: { user_id: userId }, attributes: ['id'] });
  return student ? Number(student.id) : null;
};

const listConcessions = async (req, res) => {
  try {
    const where = {};
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';
    const rows = await ConcessionV1.findAll({ where, order: [['created_at', 'DESC']] });
    return ok(res, rows, { total: rows.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const createConcession = async (req, res) => {
  try {
    const row = await ConcessionV1.create({
      name: req.body.name,
      type: req.body.type,
      value: Number(req.body.value || 0),
      applies_to: req.body.applies_to,
      requires_approval: Boolean(req.body.requires_approval),
      valid_from: req.body.valid_from || null,
      valid_until: req.body.valid_until || null,
      is_active: req.body.is_active !== undefined ? Boolean(req.body.is_active) : true
    });

    return ok(res, row, null, 201);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const updateConcession = async (req, res) => {
  try {
    const row = await ConcessionV1.findByPk(req.params.id);
    if (!row) return fail(res, { statusCode: 404, code: 'not_found', message: 'Concession not found' });

    const where = { concession_id: row.id };
    if (req.query.academic_year_id) where.academic_year_id = req.query.academic_year_id;

    const inUse = await StudentConcessionV1.count({
      where
    });

    if (inUse > 0) {
      return fail(res, {
        statusCode: 409,
        code: 'concession_locked',
        message: 'Concession is already applied in current scope and cannot be modified.'
      });
    }

    await row.update({
      name: req.body.name ?? row.name,
      type: req.body.type ?? row.type,
      value: req.body.value ?? row.value,
      applies_to: req.body.applies_to ?? row.applies_to,
      requires_approval: req.body.requires_approval ?? row.requires_approval,
      valid_from: req.body.valid_from ?? row.valid_from,
      valid_until: req.body.valid_until ?? row.valid_until,
      is_active: req.body.is_active ?? row.is_active
    });

    return ok(res, row);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const applyConcessionToStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { concession_id, academic_year_id, fee_head_id, note } = req.body;

    const concession = await ConcessionV1.findByPk(concession_id);
    if (!concession || !concession.is_active) {
      return fail(res, { statusCode: 404, code: 'concession_not_found', message: 'Concession not found or inactive' });
    }

    const year = await AcademicYear.findByPk(academic_year_id);
    if (!year) {
      return fail(res, { statusCode: 404, code: 'year_not_found', message: 'Academic year not found' });
    }

    if (concession.applies_to === 'specific_head' && !fee_head_id) {
      return fail(res, {
        statusCode: 422,
        code: 'fee_head_required',
        message: 'fee_head_id is required for specific_head concessions.'
      });
    }

    if (fee_head_id) {
      const head = await FeeHeadV1.findByPk(fee_head_id);
      if (!head) return fail(res, { statusCode: 404, code: 'fee_head_not_found', message: 'Fee head not found' });
    }

    const row = await StudentConcessionV1.create({
      student_id: Number(studentId),
      concession_id,
      fee_head_id: fee_head_id || null,
      academic_year_id,
      approval_status: concession.requires_approval ? 'pending' : 'approved',
      approved_by: concession.requires_approval ? null : req.user.id,
      approved_at: concession.requires_approval ? null : new Date(),
      note: note || null
    });

    return ok(res, row, null, 201);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const listPendingConcessionRequests = async (req, res) => {
  try {
    const rows = await StudentConcessionV1.findAll({
      where: { approval_status: 'pending' },
      include: [{ model: ConcessionV1, as: 'concession' }],
      order: [['created_at', 'ASC']]
    });

    return ok(res, rows, { total: rows.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const approveConcessionRequest = async (req, res) => {
  try {
    const row = await StudentConcessionV1.findByPk(req.params.id);
    if (!row) return fail(res, { statusCode: 404, code: 'not_found', message: 'Concession request not found' });

    await row.update({
      approval_status: 'approved',
      approved_by: req.user.id,
      approved_at: new Date(),
      rejection_reason: null
    });

    return ok(res, row);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const rejectConcessionRequest = async (req, res) => {
  try {
    const row = await StudentConcessionV1.findByPk(req.params.id);
    if (!row) return fail(res, { statusCode: 404, code: 'not_found', message: 'Concession request not found' });

    await row.update({
      approval_status: 'rejected',
      approved_by: req.user.id,
      approved_at: new Date(),
      rejection_reason: req.body.reason || 'Rejected by principal'
    });

    return ok(res, row);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

const listStudentConcessions = async (req, res) => {
  try {
    const requestedStudentId = Number(req.params.studentId);
    if (req.user?.role === 'student') {
      const authenticatedStudentId = await resolveStudentIdForUser(req.user.id);
      if (!authenticatedStudentId || authenticatedStudentId !== requestedStudentId) {
        return fail(res, { statusCode: 403, code: 'forbidden', message: 'You can only access your own concessions.' });
      }
    }

    const rows = await StudentConcessionV1.findAll({
      where: { student_id: requestedStudentId },
      include: [{ model: ConcessionV1, as: 'concession' }],
      order: [['created_at', 'DESC']]
    });

    return ok(res, rows, { total: rows.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'internal_error', message: error.message });
  }
};

module.exports = {
  listConcessions,
  createConcession,
  updateConcession,
  applyConcessionToStudent,
  listPendingConcessionRequests,
  approveConcessionRequest,
  rejectConcessionRequest,
  listStudentConcessions
};
