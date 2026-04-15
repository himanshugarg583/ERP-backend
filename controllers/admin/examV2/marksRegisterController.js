const { Op } = require('sequelize');
const {
  sequelize,
  ExamPaperV2,
  MarksEntryV2,
  Student
} = require('../../../models');
const { ok, fail } = require('../../../utils/response');

const mapPayloadPairs = (entries = []) => {
  const pairsByKey = new Map();
  for (const entry of entries) {
    for (const row of entry.students) {
      const pair = {
        exam_paper_id: Number(entry.exam_paper_id),
        student_id: Number(row.student_id),
        marks: row.marks,
        total_marks: row.total_marks,
        is_absent: Boolean(row.is_absent),
        is_exempt: Boolean(row.is_exempt),
        meta_data: row.meta_data ?? null
      };

      pairsByKey.set(`${pair.exam_paper_id}:${pair.student_id}`, pair);
    }
  }
  return [...pairsByKey.values()];
};

const ensureClassPapersAndStudents = async ({ classId, pairs }) => {
  const uniquePaperIds = [...new Set(pairs.map((item) => item.exam_paper_id))];
  const uniqueStudentIds = [...new Set(pairs.map((item) => item.student_id))];

  const papers = await ExamPaperV2.findAll({
    where: {
      id: { [Op.in]: uniquePaperIds },
      class_id: classId
    },
    attributes: ['id', 'class_id', 'subject_id', 'exam_event_id']
  });

  if (papers.length !== uniquePaperIds.length) {
    const validPaperIds = new Set(papers.map((paper) => Number(paper.id)));
    const invalidPaperIds = uniquePaperIds.filter((id) => !validPaperIds.has(Number(id)));
    return { error: { code: 'invalid_exam_paper_ids', message: 'Some exam_paper_id values are invalid for the provided class', details: invalidPaperIds } };
  }

  const students = await Student.findAll({
    where: {
      id: { [Op.in]: uniqueStudentIds },
      class_section_id: classId
    },
    attributes: ['id', 'class_section_id', 'roll_number']
  });

  if (students.length !== uniqueStudentIds.length) {
    const validStudentIds = new Set(students.map((student) => Number(student.id)));
    const invalidStudentIds = uniqueStudentIds.filter((id) => !validStudentIds.has(Number(id)));
    return { error: { code: 'invalid_student_ids', message: 'Some student_id values are invalid for the provided class', details: invalidStudentIds } };
  }

  return { papers };
};

const createBulkMarksRegister = async (req, res) => {
  const classId = Number(req.body.class_id);
  const pairs = mapPayloadPairs(req.body.entries);

  try {
    if (!Number.isInteger(classId) || classId <= 0) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_class_id',
        message: 'class_id must be a positive integer'
      });
    }

    const validation = await ensureClassPapersAndStudents({ classId, pairs });
    if (validation.error) {
      return fail(res, {
        statusCode: 400,
        code: validation.error.code,
        message: validation.error.message,
        details: validation.error.details
      });
    }

    const existing = await MarksEntryV2.findAll({
      where: {
        [Op.or]: pairs.map((pair) => ({
          exam_paper_id: pair.exam_paper_id,
          student_id: pair.student_id
        }))
      },
      attributes: ['exam_paper_id', 'student_id']
    });

    if (existing.length) {
      return fail(res, {
        statusCode: 409,
        code: 'marks_entries_already_exist',
        message: 'Some marks entries already exist; use update API for existing rows',
        details: existing.map((row) => ({
          exam_paper_id: row.exam_paper_id,
          student_id: row.student_id
        }))
      });
    }

    const created = await sequelize.transaction(async (transaction) => {
      return MarksEntryV2.bulkCreate(
        pairs.map((pair) => ({
          ...pair,
          result_id: null,
          marks_obtained: pair.total_marks,
          max_marks: 0,
          percentage: 0,
          grade: 'N/A',
          is_pass: false,
          entered_by: req.user.id,
          entered_at: new Date()
        })),
        { transaction }
      );
    });

    return ok(res, {
      class_id: classId,
      created_count: created.length,
      entries: created
    }, null, 201);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'marks_register_create_failed',
      message: error.message
    });
  }
};

const listBulkMarksRegister = async (req, res) => {
  const classId = Number(req.query.class_id);

  try {
    const paperWhere = { class_id: classId };
    if (req.query.exam_event_id) {
      paperWhere.exam_event_id = Number(req.query.exam_event_id);
    }
    if (req.query.exam_paper_id) {
      paperWhere.id = Number(req.query.exam_paper_id);
    }

    const papers = await ExamPaperV2.findAll({
      where: paperWhere,
      attributes: ['id', 'subject_id', 'class_id', 'exam_event_id', 'max_marks', 'passing_marks'],
      include: [
        { association: 'subject', attributes: ['id', 'subject_name', 'subject_code'] },
        { association: 'event', attributes: ['id', 'name', 'academic_year', 'status'] }
      ],
      order: [['id', 'ASC']]
    });

    if (!papers.length) {
      return ok(res, {
        class_id: classId,
        total_registers: 0,
        registers: []
      });
    }

    const paperIds = papers.map((paper) => Number(paper.id));

    const rows = await MarksEntryV2.findAll({
      where: {
        exam_paper_id: { [Op.in]: paperIds }
      },
      include: [
        { association: 'student', attributes: ['id', 'roll_number', 'user_id'] }
      ],
      order: [['exam_paper_id', 'ASC'], ['student_id', 'ASC']]
    });

    const registers = papers.map((paper) => ({
      exam_paper: paper,
      marks_entries: rows.filter((row) => Number(row.exam_paper_id) === Number(paper.id))
    }));

    return ok(res, {
      class_id: classId,
      total_registers: registers.length,
      registers
    });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'marks_register_list_failed',
      message: error.message
    });
  }
};

const getBulkMarksRegisterByPaper = async (req, res) => {
  const classId = Number(req.query.class_id);
  const examPaperId = Number(req.params.exam_paper_id);

  try {
    if (!Number.isInteger(classId) || classId <= 0 || !Number.isInteger(examPaperId) || examPaperId <= 0) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_ids',
        message: 'class_id query and exam_paper_id param must be positive integers'
      });
    }

    const paper = await ExamPaperV2.findOne({
      where: {
        id: examPaperId,
        class_id: classId
      },
      include: [
        { association: 'subject', attributes: ['id', 'subject_name', 'subject_code'] },
        { association: 'event', attributes: ['id', 'name', 'academic_year', 'status'] }
      ]
    });

    if (!paper) {
      return fail(res, {
        statusCode: 404,
        code: 'exam_paper_not_found',
        message: 'Exam paper not found for provided class'
      });
    }

    const marks = await MarksEntryV2.findAll({
      where: { exam_paper_id: examPaperId },
      include: [
        { association: 'student', attributes: ['id', 'roll_number', 'user_id'] }
      ],
      order: [['student_id', 'ASC']]
    });

    return ok(res, {
      class_id: classId,
      exam_paper: paper,
      marks_entries: marks
    });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'marks_register_fetch_failed',
      message: error.message
    });
  }
};

const updateBulkMarksRegister = async (req, res) => {
  const classId = Number(req.body.class_id);
  const pairs = mapPayloadPairs(req.body.entries);

  try {
    if (!Number.isInteger(classId) || classId <= 0) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_class_id',
        message: 'class_id must be a positive integer'
      });
    }

    const validation = await ensureClassPapersAndStudents({ classId, pairs });
    if (validation.error) {
      return fail(res, {
        statusCode: 400,
        code: validation.error.code,
        message: validation.error.message,
        details: validation.error.details
      });
    }

    const existing = await MarksEntryV2.findAll({
      where: {
        [Op.or]: pairs.map((pair) => ({
          exam_paper_id: pair.exam_paper_id,
          student_id: pair.student_id
        }))
      },
      attributes: ['id', 'exam_paper_id', 'student_id']
    });

    const existingSet = new Set(existing.map((row) => `${row.exam_paper_id}:${row.student_id}`));
    const toUpdate = pairs.filter((pair) => existingSet.has(`${pair.exam_paper_id}:${pair.student_id}`));
    const toCreate = pairs.filter((pair) => !existingSet.has(`${pair.exam_paper_id}:${pair.student_id}`));

    await sequelize.transaction(async (transaction) => {
      for (const pair of toUpdate) {
        // eslint-disable-next-line no-await-in-loop
        await MarksEntryV2.update(
          {
            marks: pair.marks,
            total_marks: pair.total_marks,
            marks_obtained: pair.total_marks,
            max_marks: 0,
            percentage: 0,
            grade: 'N/A',
            is_pass: false,
            result_id: null,
            is_absent: pair.is_absent,
            is_exempt: pair.is_exempt,
            meta_data: pair.meta_data,
            entered_by: req.user.id,
            entered_at: new Date()
          },
          {
            where: {
              exam_paper_id: pair.exam_paper_id,
              student_id: pair.student_id
            },
            transaction
          }
        );
      }

      if (toCreate.length) {
        await MarksEntryV2.bulkCreate(
          toCreate.map((pair) => ({
            ...pair,
            result_id: null,
            marks_obtained: pair.total_marks,
            max_marks: 0,
            percentage: 0,
            grade: 'N/A',
            is_pass: false,
            entered_by: req.user.id,
            entered_at: new Date()
          })),
          { transaction }
        );
      }
    });

    const updated = await MarksEntryV2.findAll({
      where: {
        [Op.or]: pairs.map((pair) => ({
          exam_paper_id: pair.exam_paper_id,
          student_id: pair.student_id
        }))
      }
    });

    return ok(res, {
      class_id: classId,
      created_count: toCreate.length,
      updated_count: toUpdate.length,
      upserted_count: updated.length,
      entries: updated
    });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'marks_register_update_failed',
      message: error.message
    });
  }
};

const deleteBulkMarksRegister = async (req, res) => {
  const classId = Number(req.body.class_id);
  const examPaperIds = req.body.exam_paper_ids.map(Number);
  const studentIds = req.body.student_ids ? req.body.student_ids.map(Number) : null;

  try {
    if (!Number.isInteger(classId) || classId <= 0) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_class_id',
        message: 'class_id must be a positive integer'
      });
    }

    const papers = await ExamPaperV2.findAll({
      where: {
        id: { [Op.in]: examPaperIds },
        class_id: classId
      },
      attributes: ['id']
    });

    if (papers.length !== examPaperIds.length) {
      const valid = new Set(papers.map((paper) => Number(paper.id)));
      const invalid = examPaperIds.filter((id) => !valid.has(Number(id)));
      return fail(res, {
        statusCode: 400,
        code: 'invalid_exam_paper_ids',
        message: 'Some exam_paper_ids are invalid for the provided class',
        details: invalid
      });
    }

    const where = {
      exam_paper_id: { [Op.in]: examPaperIds }
    };
    if (studentIds && studentIds.length) {
      where.student_id = { [Op.in]: studentIds };
    }

    const deletedCount = await MarksEntryV2.destroy({ where });

    return ok(res, {
      class_id: classId,
      deleted_count: deletedCount
    });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'marks_register_delete_failed',
      message: error.message
    });
  }
};

module.exports = {
  createBulkMarksRegister,
  listBulkMarksRegister,
  getBulkMarksRegisterByPaper,
  updateBulkMarksRegister,
  deleteBulkMarksRegister
};
