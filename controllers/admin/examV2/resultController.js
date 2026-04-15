const { ResultV2, MarksEntryV2 } = require('../../../models');
const { ok, fail } = require('../../../utils/response');
const {
  computeResultsForEvent,
  publishResultsForEvent
} = require('../../../services/exam/v2/resultService');

const listResults = async (req, res) => {
  try {
    const where = {};
    if (req.query.exam_event_id) where.exam_event_id = req.query.exam_event_id;
    if (req.query.status) where.status = req.query.status;

    const rows = await ResultV2.findAll({
      where,
      include: [
        { association: 'event', attributes: ['id', 'name', 'academic_year', 'status'] },
        { association: 'student', attributes: ['id', 'user_id', 'roll_number'] },
        {
          association: 'details',
          attributes: ['id', 'exam_paper_id', 'marks_obtained', 'max_marks', 'percentage', 'grade', 'is_pass', 'is_absent', 'is_exempt'],
          include: [
            { association: 'paper', attributes: ['id', 'subject_id', 'class_id', 'max_marks', 'passing_marks'] }
          ]
        }
      ],
      order: [['percentage', 'DESC']]
    });

    return ok(res, rows);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'result_list_failed',
      message: error.message
    });
  }
};

const recomputeResults = async (req, res) => {
  try {
    const out = await computeResultsForEvent(req.body.exam_event_id);
    const publishedCount = await publishResultsForEvent(req.body.exam_event_id, false);
    return ok(res, {
      recomputed_count: out.count,
      published_count: publishedCount,
      results: out.rows
    });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'result_recompute_failed',
      message: error.message
    });
  }
};

const publishResults = async (req, res) => {
  try {
    const count = await publishResultsForEvent(req.body.exam_event_id, Boolean(req.body.version_bump));
    return ok(res, { published_count: count });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'result_publish_failed',
      message: error.message
    });
  }
};

const listMarksEntries = async (req, res) => {
  try {
    const where = {};
    if (req.query.exam_paper_id) where.exam_paper_id = req.query.exam_paper_id;
    if (req.query.student_id) where.student_id = Number(req.query.student_id);

    const rows = await MarksEntryV2.findAll({
      where,
      include: [
        { association: 'paper', attributes: ['id', 'exam_event_id', 'max_marks', 'passing_marks'] },
        { association: 'student', attributes: ['id', 'user_id', 'roll_number'] }
      ],
      order: [['updated_at', 'DESC']]
    });

    return ok(res, rows);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'marks_entry_list_failed',
      message: error.message
    });
  }
};

module.exports = {
  listResults,
  recomputeResults,
  publishResults,
  listMarksEntries
};
