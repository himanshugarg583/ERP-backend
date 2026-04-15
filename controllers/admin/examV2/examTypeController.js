const { ExamTypeV2 } = require('../../../models');
const { ok, fail } = require('../../../utils/response');

const createExamType = async (req, res) => {
  try {
    const row = await ExamTypeV2.create(req.body);
    return ok(res, row, null, 201);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_type_create_failed',
      message: error.message
    });
  }
};

const listExamTypes = async (_req, res) => {
  try {
    const rows = await ExamTypeV2.findAll({
      order: [['name', 'ASC']]
    });
    return ok(res, rows);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_type_list_failed',
      message: error.message
    });
  }
};

const updateExamType = async (req, res) => {
  try {
    const row = await ExamTypeV2.findByPk(req.params.id);
    if (!row) {
      return fail(res, {
        statusCode: 404,
        code: 'exam_type_not_found',
        message: 'Exam type not found'
      });
    }

    await row.update(req.body);
    return ok(res, row);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_type_update_failed',
      message: error.message
    });
  }
};

const deleteExamType = async (req, res) => {
  try {
    const row = await ExamTypeV2.findByPk(req.params.id);
    if (!row) {
      return fail(res, {
        statusCode: 404,
        code: 'exam_type_not_found',
        message: 'Exam type not found'
      });
    }

    await row.destroy();
    return ok(res, { deleted: true });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'exam_type_delete_failed',
      message: error.message
    });
  }
};

module.exports = {
  createExamType,
  listExamTypes,
  updateExamType,
  deleteExamType
};
