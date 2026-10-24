const { ExamPaperV2 } = require('../../../models');
const { ok, fail } = require('../../../utils/response');

const createExamPaper = async (req, res) => {
  try {
    const row = await ExamPaperV2.create(req.body);
    return ok(res, row, null, 201);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_paper_create_failed',
      message: error.message
    });
  }
};

const listExamPapers = async (req, res) => {
  try {
    const where = {};
    if (req.query.exam_event_id) where.exam_event_id = req.query.exam_event_id;
    if (req.query.class_id) where.class_id = Number(req.query.class_id);
    if (req.query.subject_id) where.subject_id = Number(req.query.subject_id);
    if (req.query.assigned_teacher_id) where.assigned_teacher_id = Number(req.query.assigned_teacher_id);

    const rows = await ExamPaperV2.findAll({
      where,
      include: [
        { association: 'event', attributes: ['id', 'name', 'status', 'academic_year'] },
        { association: 'subject', attributes: ['id', 'subject_name', 'subject_code'] },
        { association: 'classSection', attributes: ['id', 'class_name', 'section_name'] },
        { association: 'assignedTeacher', attributes: ['id', 'user_id'] }
      ],
      order: [['created_at', 'DESC']]
    });

    return ok(res, rows);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_paper_list_failed',
      message: error.message
    });
  }
};

const updateExamPaper = async (req, res) => {
  try {
    const row = await ExamPaperV2.findByPk(req.params.id);
    if (!row) {
      return fail(res, {
        statusCode: 404,
        code: 'exam_paper_not_found',
        message: 'Exam paper not found'
      });
    }

    await row.update(req.body);
    return ok(res, row);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_paper_update_failed',
      message: error.message
    });
  }
};

const deleteExamPaper = async (req, res) => {
  try {
    const row = await ExamPaperV2.findByPk(req.params.id);
    if (!row) {
      return fail(res, {
        statusCode: 404,
        code: 'exam_paper_not_found',
        message: 'Exam paper not found'
      });
    }

    await row.destroy();
    return ok(res, { deleted: true });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_paper_delete_failed',
      message: error.message
    });
  }
};

module.exports = {
  createExamPaper,
  listExamPapers,
  updateExamPaper,
  deleteExamPaper
};
