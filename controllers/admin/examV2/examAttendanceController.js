const { Op } = require('sequelize');
const {
  sequelize,
  ExamPaperV2,
  ExamAttendanceV2,
  Student
} = require('../../../models');
const { ok, fail } = require('../../../utils/response');

const ensurePaperAndStudentMatchClass = async ({ examPaperId, studentId }) => {
  const paper = await ExamPaperV2.findByPk(examPaperId, {
    attributes: ['id', 'class_id', 'subject_id', 'exam_event_id']
  });

  if (!paper) {
    return {
      error: {
        statusCode: 404,
        code: 'exam_paper_not_found',
        message: 'Exam paper not found'
      }
    };
  }

  const student = await Student.findOne({
    where: {
      id: studentId,
      class_section_id: paper.class_id
    },
    attributes: ['id', 'class_section_id', 'roll_number']
  });

  if (!student) {
    return {
      error: {
        statusCode: 400,
        code: 'student_not_in_paper_class',
        message: 'Student does not belong to the class of provided exam paper'
      }
    };
  }

  return { paper, student };
};

const createAttendance = async (req, res) => {
  try {
    const examPaperId = Number(req.body.exam_paper_id);
    const studentId = Number(req.body.student_id);

    const validation = await ensurePaperAndStudentMatchClass({
      examPaperId,
      studentId
    });

    if (validation.error) {
      return fail(res, validation.error);
    }

    const existing = await ExamAttendanceV2.findOne({
      where: {
        exam_paper_id: examPaperId,
        student_id: studentId
      }
    });

    if (existing) {
      return fail(res, {
        statusCode: 409,
        code: 'attendance_already_exists',
        message: 'Attendance already exists for this student and exam paper'
      });
    }

    const row = await ExamAttendanceV2.create({
      exam_paper_id: examPaperId,
      student_id: studentId,
      status: req.body.status,
      marked_by: req.user.id,
      marked_at: new Date(),
      remarks: req.body.remarks || null,
      malpractice_flag: Boolean(req.body.malpractice_flag),
      is_locked: Boolean(req.body.is_locked)
    });

    return ok(res, row, null, 201);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'attendance_create_failed',
      message: error.message
    });
  }
};

const createAttendanceBulk = async (req, res) => {
  try {
    const examPaperId = Number(req.body.exam_paper_id);

    const paper = await ExamPaperV2.findByPk(examPaperId, {
      attributes: ['id', 'class_id']
    });

    if (!paper) {
      return fail(res, {
        statusCode: 404,
        code: 'exam_paper_not_found',
        message: 'Exam paper not found'
      });
    }

    const studentIds = [...new Set(req.body.records.map((item) => Number(item.student_id)))];
    const students = await Student.findAll({
      where: {
        id: { [Op.in]: studentIds },
        class_section_id: paper.class_id
      },
      attributes: ['id']
    });

    if (students.length !== studentIds.length) {
      const validStudentIds = new Set(students.map((item) => Number(item.id)));
      const invalidStudentIds = studentIds.filter((id) => !validStudentIds.has(Number(id)));
      return fail(res, {
        statusCode: 400,
        code: 'invalid_student_ids',
        message: 'Some students do not belong to the class of provided exam paper',
        details: invalidStudentIds
      });
    }

    const result = await sequelize.transaction(async (transaction) => {
      const upserted = [];
      const skipped_locked = [];

      for (const record of req.body.records) {
        // eslint-disable-next-line no-await-in-loop
        const existing = await ExamAttendanceV2.findOne({
          where: {
            exam_paper_id: examPaperId,
            student_id: Number(record.student_id)
          },
          transaction
        });

        if (!existing) {
          // eslint-disable-next-line no-await-in-loop
          const created = await ExamAttendanceV2.create({
            exam_paper_id: examPaperId,
            student_id: Number(record.student_id),
            status: record.status,
            marked_by: req.user.id,
            marked_at: new Date(),
            remarks: record.remarks || null,
            malpractice_flag: Boolean(record.malpractice_flag)
          }, { transaction });
          upserted.push(created);
          continue;
        }

        if (existing.is_locked) {
          skipped_locked.push({
            id: existing.id,
            student_id: existing.student_id
          });
          continue;
        }

        existing.status = record.status;
        existing.marked_by = req.user.id;
        existing.marked_at = new Date();
        existing.remarks = record.remarks || null;
        existing.malpractice_flag = Boolean(record.malpractice_flag);
        // eslint-disable-next-line no-await-in-loop
        await existing.save({ transaction });
        upserted.push(existing);
      }

      return { upserted, skipped_locked };
    });

    return ok(res, {
      exam_paper_id: examPaperId,
      upserted_count: result.upserted.length,
      skipped_locked_count: result.skipped_locked.length,
      entries: result.upserted,
      skipped_locked: result.skipped_locked
    });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'attendance_bulk_create_failed',
      message: error.message
    });
  }
};

const listAttendance = async (req, res) => {
  try {
    let paperIds = null;

    if (req.query.exam_event_id || req.query.class_id || req.query.subject_id || req.query.exam_paper_id) {
      const paperWhere = {};
      if (req.query.exam_event_id) paperWhere.exam_event_id = Number(req.query.exam_event_id);
      if (req.query.class_id) paperWhere.class_id = Number(req.query.class_id);
      if (req.query.subject_id) paperWhere.subject_id = Number(req.query.subject_id);
      if (req.query.exam_paper_id) paperWhere.id = Number(req.query.exam_paper_id);

      const papers = await ExamPaperV2.findAll({
        where: paperWhere,
        attributes: ['id']
      });
      paperIds = papers.map((paper) => Number(paper.id));

      if (!paperIds.length) {
        return ok(res, []);
      }
    }

    const where = {};
    if (paperIds) where.exam_paper_id = { [Op.in]: paperIds };
    if (req.query.student_id) where.student_id = Number(req.query.student_id);
    if (req.query.status) where.status = req.query.status;

    const rows = await ExamAttendanceV2.findAll({
      where,
      include: [
        {
          association: 'paper',
          attributes: ['id', 'exam_event_id', 'class_id', 'subject_id'],
          include: [
            { association: 'event', attributes: ['id', 'name', 'academic_year', 'status'] },
            { association: 'classSection', attributes: ['id', 'class_name', 'section_name'] },
            { association: 'subject', attributes: ['id', 'subject_name', 'subject_code'] }
          ]
        },
        { association: 'student', attributes: ['id', 'user_id', 'roll_number'] },
        { association: 'markedBy', attributes: ['id', 'name', 'role'] }
      ],
      order: [['marked_at', 'DESC'], ['id', 'DESC']]
    });

    return ok(res, rows);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'attendance_list_failed',
      message: error.message
    });
  }
};

const getAttendanceById = async (req, res) => {
  try {
    const row = await ExamAttendanceV2.findByPk(req.params.id, {
      include: [
        {
          association: 'paper',
          attributes: ['id', 'exam_event_id', 'class_id', 'subject_id']
        },
        { association: 'student', attributes: ['id', 'user_id', 'roll_number'] },
        { association: 'markedBy', attributes: ['id', 'name', 'role'] }
      ]
    });

    if (!row) {
      return fail(res, {
        statusCode: 404,
        code: 'attendance_not_found',
        message: 'Attendance record not found'
      });
    }

    return ok(res, row);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'attendance_fetch_failed',
      message: error.message
    });
  }
};

const updateAttendance = async (req, res) => {
  try {
    const row = await ExamAttendanceV2.findByPk(req.params.id);
    if (!row) {
      return fail(res, {
        statusCode: 404,
        code: 'attendance_not_found',
        message: 'Attendance record not found'
      });
    }

    if (row.is_locked && req.body.is_locked !== false) {
      return fail(res, {
        statusCode: 409,
        code: 'attendance_locked',
        message: 'Attendance is locked and cannot be modified'
      });
    }

    const payload = {
      ...req.body,
      marked_by: req.user.id,
      marked_at: new Date()
    };

    await row.update(payload);
    return ok(res, row);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'attendance_update_failed',
      message: error.message
    });
  }
};

const deleteAttendance = async (req, res) => {
  try {
    const row = await ExamAttendanceV2.findByPk(req.params.id);
    if (!row) {
      return fail(res, {
        statusCode: 404,
        code: 'attendance_not_found',
        message: 'Attendance record not found'
      });
    }

    if (row.is_locked) {
      return fail(res, {
        statusCode: 409,
        code: 'attendance_locked',
        message: 'Locked attendance cannot be deleted'
      });
    }

    await row.destroy();
    return ok(res, { deleted: true });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'attendance_delete_failed',
      message: error.message
    });
  }
};

module.exports = {
  createAttendance,
  createAttendanceBulk,
  listAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance
};
