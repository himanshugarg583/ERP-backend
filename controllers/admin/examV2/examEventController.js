const { ExamEventV2 } = require('../../../models');
const { ok, fail } = require('../../../utils/response');

const createExamEvent = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      created_by: req.user.id
    };
    const row = await ExamEventV2.create(payload);
    return ok(res, row, null, 201);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_event_create_failed',
      message: error.message
    });
  }
};

const listExamEvents = async (req, res) => {
  try {
    const where = {};
    if (req.query.exam_type_id) where.exam_type_id = req.query.exam_type_id;
    if (req.query.status) where.status = req.query.status;
    if (req.query.academic_year) where.academic_year = req.query.academic_year;

    const rows = await ExamEventV2.findAll({
      where,
      include: [
        { association: 'examType', attributes: ['id', 'name'] }
      ],
      order: [['start_date', 'DESC']]
    });

    return ok(res, rows);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_event_list_failed',
      message: error.message
    });
  }
};

const getExamEventById = async (req, res) => {
  try {
    const row = await ExamEventV2.findByPk(req.params.id, {
      include: [
        { association: 'examType', attributes: ['id', 'name', 'grading_config'] },
        { association: 'papers', attributes: ['id', 'subject_id', 'class_id', 'max_marks', 'passing_marks'] }
      ]
    });

    if (!row) {
      return fail(res, {
        statusCode: 404,
        code: 'exam_event_not_found',
        message: 'Exam event not found'
      });
    }

    return ok(res, row);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_event_fetch_failed',
      message: error.message
    });
  }
};

const updateExamEvent = async (req, res) => {
  try {
    const row = await ExamEventV2.findByPk(req.params.id);
    if (!row) {
      return fail(res, {
        statusCode: 404,
        code: 'exam_event_not_found',
        message: 'Exam event not found'
      });
    }

    await row.update(req.body);
    return ok(res, row);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_event_update_failed',
      message: error.message
    });
  }
};

const deleteExamEvent = async (req, res) => {
  try {
    const row = await ExamEventV2.findByPk(req.params.id);
    if (!row) {
      return fail(res, {
        statusCode: 404,
        code: 'exam_event_not_found',
        message: 'Exam event not found'
      });
    }

    await row.destroy();
    return ok(res, { deleted: true });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_event_delete_failed',
      message: error.message
    });
  }
};

module.exports = {
  createExamEvent,
  listExamEvents,
  getExamEventById,
  updateExamEvent,
  deleteExamEvent
};
