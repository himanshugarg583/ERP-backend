const { ExamTimetableV2 } = require('../../../models');
const { ok, fail } = require('../../../utils/response');

const createTimetableEntry = async (req, res) => {
  try {
    const row = await ExamTimetableV2.create(req.body);
    return ok(res, row, null, 201);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_timetable_create_failed',
      message: error.message
    });
  }
};

const listTimetable = async (req, res) => {
  try {
    const where = {};
    if (req.query.exam_event_id) where.exam_event_id = req.query.exam_event_id;
    if (req.query.class_id) where.class_id = Number(req.query.class_id);

    const rows = await ExamTimetableV2.findAll({
      where,
      include: [
        { association: 'event', attributes: ['id', 'name', 'status', 'academic_year'] },
        { association: 'paper', attributes: ['id', 'max_marks', 'passing_marks'] },
        { association: 'subject', attributes: ['id', 'subject_name', 'subject_code'] },
        { association: 'classSection', attributes: ['id', 'class_name', 'section_name'] },
        { association: 'invigilator', attributes: ['id', 'user_id'] }
      ],
      order: [['exam_date', 'ASC'], ['start_time', 'ASC']]
    });

    return ok(res, rows);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_timetable_list_failed',
      message: error.message
    });
  }
};

const updateTimetableEntry = async (req, res) => {
  try {
    const row = await ExamTimetableV2.findByPk(req.params.id);
    if (!row) {
      return fail(res, {
        statusCode: 404,
        code: 'exam_timetable_not_found',
        message: 'Timetable row not found'
      });
    }

    await row.update(req.body);
    return ok(res, row);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_timetable_update_failed',
      message: error.message
    });
  }
};

const deleteTimetableEntry = async (req, res) => {
  try {
    const row = await ExamTimetableV2.findByPk(req.params.id);
    if (!row) {
      return fail(res, {
        statusCode: 404,
        code: 'exam_timetable_not_found',
        message: 'Timetable row not found'
      });
    }

    await row.destroy();
    return ok(res, { deleted: true });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_timetable_delete_failed',
      message: error.message
    });
  }
};

module.exports = {
  createTimetableEntry,
  listTimetable,
  updateTimetableEntry,
  deleteTimetableEntry
};
