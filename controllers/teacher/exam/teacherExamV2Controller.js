const { Op } = require('sequelize');
const {
  sequelize,
  User,
  ExamTypeV2,
  ExamEventV2,
  ExamPaperV2,
  ExamTimetableV2,
  MarksEntryV2,
  ExamAttendanceV2,
  ClassSection
} = require('../../../models');
const { Student } = require('../../../models/admin/Student');
const { ok, fail } = require('../../../utils/response');
const { upsertMarksEntry } = require('../../../services/exam/v2/marksService');

const parsePositiveInt = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

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

const ensureTeacherOwnsClassSection = async ({ teacherId, classId }) => {
  if (!Number.isInteger(classId) || classId <= 0) {
    return {
      error: {
        statusCode: 400,
        code: 'invalid_class_id',
        message: 'class_id must be a positive integer'
      }
    };
  }

  const classSection = await ClassSection.findOne({
    where: {
      id: classId,
      teacher_id: teacherId
    },
    attributes: ['id', 'class_name', 'section_name']
  });

  if (!classSection) {
    return {
      error: {
        statusCode: 403,
        code: 'teacher_not_assigned_to_class_section',
        message: 'You are not assigned as class teacher for this class section'
      }
    };
  }

  return { classSection };
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
    return {
      error: {
        statusCode: 400,
        code: 'invalid_exam_paper_ids',
        message: 'Some exam_paper_id values are invalid for the provided class',
        details: invalidPaperIds
      }
    };
  }

  const students = await Student.findAll({
    where: {
      id: { [Op.in]: uniqueStudentIds },
      class_section_id: classId
    },
    attributes: ['id']
  });

  if (students.length !== uniqueStudentIds.length) {
    const validStudentIds = new Set(students.map((student) => Number(student.id)));
    const invalidStudentIds = uniqueStudentIds.filter((id) => !validStudentIds.has(Number(id)));
    return {
      error: {
        statusCode: 400,
        code: 'invalid_student_ids',
        message: 'Some student_id values are invalid for the provided class',
        details: invalidStudentIds
      }
    };
  }

  return { papers };
};

const listDropdownExamTerms = async (req, res) => {
  try {
    const terms = await ExamTypeV2.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']]
    });

    return ok(res, terms.map((term) => ({
      id: term.id,
      name: term.name
    })));
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'teacher_exam_terms_fetch_failed',
      message: error.message
    });
  }
};

const listDropdownExamEvents = async (req, res) => {
  try {
    const examTypeId = parsePositiveInt(req.query.exam_type_id);
    if (req.query.exam_type_id && !examTypeId) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_exam_type_id',
        message: 'exam_type_id must be a positive integer'
      });
    }

    const events = await ExamEventV2.findAll({
      where: {
        ...(examTypeId ? { exam_type_id: examTypeId } : {})
      },
      include: [
        { association: 'examType', attributes: ['id', 'name'] }
      ],
      attributes: ['id', 'name', 'exam_type_id', 'status', 'academic_year', 'start_date', 'end_date'],
      order: [['start_date', 'DESC'], ['id', 'DESC']]
    });

    return ok(res, events);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'teacher_exam_events_fetch_failed',
      message: error.message
    });
  }
};

const listDropdownClassSections = async (req, res) => {
  try {
    const classSections = await ClassSection.findAll({
      where: { teacher_id: req.teacher.id },
      attributes: ['id', 'class_name', 'section_name'],
      order: [['class_name', 'ASC'], ['section_name', 'ASC']]
    });

    return ok(res, classSections.map((row) => ({
      id: row.id,
      class_name: row.class_name,
      section_name: row.section_name,
      display_name: `${row.class_name} ${row.section_name}`
    })));
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'teacher_class_sections_fetch_failed',
      message: error.message
    });
  }
};

const listDropdownPapersByEventAndClass = async (req, res) => {
  try {
    const examEventId = parsePositiveInt(req.query.exam_event_id);
    const classSectionId = parsePositiveInt(req.query.class_section_id);

    if (!examEventId || !classSectionId) {
      return fail(res, {
        statusCode: 400,
        code: 'exam_event_id_and_class_section_id_required',
        message: 'exam_event_id and class_section_id are required as positive integers'
      });
    }

    const classSection = await ClassSection.findOne({
      where: {
        id: classSectionId,
        teacher_id: req.teacher.id
      },
      attributes: ['id']
    });

    if (!classSection) {
      return fail(res, {
        statusCode: 403,
        code: 'teacher_not_assigned_to_class_section',
        message: 'You are not assigned as class teacher for this class section'
      });
    }

    const rows = await ExamPaperV2.findAll({
      where: {
        exam_event_id: examEventId,
        class_id: classSectionId
      },
      include: [
        { association: 'subject', attributes: ['id', 'subject_name', 'subject_code'] }
      ],
      attributes: ['id', 'exam_event_id', 'class_id', 'subject_id'],
      order: [['subject_id', 'ASC'], ['id', 'ASC']]
    });

    return ok(res, rows.map((row) => ({
      exam_paper_id: row.id,
      exam_event_id: row.exam_event_id,
      class_section_id: row.class_id,
      subject_id: row.subject_id,
      paper_name: row.subject ? row.subject.subject_name : null,
      subject_code: row.subject ? row.subject.subject_code : null
    })));
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'teacher_exam_papers_fetch_failed',
      message: error.message
    });
  }
};

const listClassStudentsByClassTeacher = async (req, res) => {
  try {
    const classSectionId = parsePositiveInt(req.query.class_section_id || req.params.class_section_id);
    if (!classSectionId) {
      return fail(res, {
        statusCode: 400,
        code: 'class_section_id_required',
        message: 'class_section_id is required as a positive integer'
      });
    }

    const classSection = await ClassSection.findOne({
      where: {
        id: classSectionId,
        teacher_id: req.teacher.id
      },
      attributes: ['id', 'class_name', 'section_name']
    });

    if (!classSection) {
      return fail(res, {
        statusCode: 403,
        code: 'teacher_not_assigned_to_class_section',
        message: 'You are not assigned as class teacher for this class section'
      });
    }

    const rows = await Student.findAll({
      where: { class_section_id: classSectionId },
      attributes: ['id', 'roll_number', 'class_section_id'],
      include: [
        {
          model: User,
          attributes: ['name']
        }
      ],
      order: [['roll_number', 'ASC'], ['id', 'ASC']]
    });

    const students = rows.map((row) => ({
      id: row.id,
      student_name: row.User ? row.User.name : 'N/A',
      roll_number: row.roll_number,
      class_section_id: row.class_section_id
    }));

    return ok(res, {
      class_section: {
        id: classSection.id,
        class_name: classSection.class_name,
        section_name: classSection.section_name,
        display_name: `${classSection.class_name} ${classSection.section_name}`
      },
      total_students: students.length,
      students
    });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'teacher_class_students_fetch_failed',
      message: error.message
    });
  }
};

const listBulkMarksRegisterByClass = async (req, res) => {
  const classId = Number(req.query.class_id);

  try {
    const ownership = await ensureTeacherOwnsClassSection({
      teacherId: req.teacher.id,
      classId
    });
    if (ownership.error) {
      return fail(res, ownership.error);
    }

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
      code: 'teacher_marks_register_list_failed',
      message: error.message
    });
  }
};

const getBulkMarksRegisterByPaperForTeacher = async (req, res) => {
  const classId = Number(req.query.class_id);
  const examPaperId = Number(req.params.exam_paper_id);

  try {
    const ownership = await ensureTeacherOwnsClassSection({
      teacherId: req.teacher.id,
      classId
    });
    if (ownership.error) {
      return fail(res, ownership.error);
    }

    if (!Number.isInteger(examPaperId) || examPaperId <= 0) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_exam_paper_id',
        message: 'exam_paper_id param must be a positive integer'
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
      code: 'teacher_marks_register_fetch_failed',
      message: error.message
    });
  }
};

const updateBulkMarksRegisterForTeacher = async (req, res) => {
  const classId = Number(req.body.class_id);
  const pairs = mapPayloadPairs(req.body.entries);

  try {
    const ownership = await ensureTeacherOwnsClassSection({
      teacherId: req.teacher.id,
      classId
    });
    if (ownership.error) {
      return fail(res, ownership.error);
    }

    const validation = await ensureClassPapersAndStudents({ classId, pairs });
    if (validation.error) {
      return fail(res, validation.error);
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
      code: 'teacher_marks_register_update_failed',
      message: error.message
    });
  }
};

const listAssignedPapers = async (req, res) => {
  try {
    const rows = await ExamPaperV2.findAll({
      where: {
        assigned_teacher_id: req.teacher.id,
        ...(req.query.exam_event_id ? { exam_event_id: req.query.exam_event_id } : {})
      },
      include: [
        { association: 'event', attributes: ['id', 'name', 'status', 'academic_year'] },
        { association: 'subject', attributes: ['id', 'subject_name', 'subject_code'] },
        { association: 'classSection', attributes: ['id', 'class_name', 'section_name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    return ok(res, rows);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'teacher_papers_fetch_failed',
      message: error.message
    });
  }
};

const listMyTimetable = async (req, res) => {
  try {
    const where = {
      invigilator_teacher_id: req.teacher.id
    };
    if (req.query.exam_event_id) where.exam_event_id = req.query.exam_event_id;

    const rows = await ExamTimetableV2.findAll({
      where,
      include: [
        { association: 'event', attributes: ['id', 'name', 'status', 'academic_year'] },
        { association: 'paper', attributes: ['id', 'max_marks', 'passing_marks'] },
        { association: 'subject', attributes: ['id', 'subject_name', 'subject_code'] },
        { association: 'classSection', attributes: ['id', 'class_name', 'section_name'] }
      ],
      order: [['exam_date', 'ASC'], ['start_time', 'ASC']]
    });

    return ok(res, rows);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'teacher_timetable_fetch_failed',
      message: error.message
    });
  }
};

const listPaperStudents = async (req, res) => {
  try {
    const paper = req.examPaper;
    const students = await Student.findAll({
      where: {
        class_section_id: paper.class_id
      },
      attributes: ['id', 'user_id', 'roll_number', 'class_section_id'],
      order: [['roll_number', 'ASC']]
    });

    return ok(res, students);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'paper_students_fetch_failed',
      message: error.message
    });
  }
};

const upsertMarks = async (req, res) => {
  try {
    const payload = {
      exam_paper_id: req.examPaper.id,
      student_id: req.body.student_id,
      entered_by: req.user.id,
      marks: req.body.marks,
      total_marks: req.body.total_marks,
      is_absent: req.body.is_absent,
      is_exempt: req.body.is_exempt,
      meta_data: req.body.meta_data
    };

    const row = await upsertMarksEntry(payload);
    return ok(res, row);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'teacher_marks_upsert_failed',
      message: error.message
    });
  }
};

const submitMarks = async (req, res) => {
  try {
    return upsertMarks(req, res);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'teacher_marks_submit_failed',
      message: error.message
    });
  }
};

const markAttendanceBulk = async (req, res) => {
  try {
    const rows = [];

    for (const record of req.body.records) {
      const existing = await ExamAttendanceV2.findOne({
        where: {
          exam_paper_id: req.examPaper.id,
          student_id: record.student_id
        }
      });

      if (!existing) {
        const created = await ExamAttendanceV2.create({
          exam_paper_id: req.examPaper.id,
          student_id: record.student_id,
          status: record.status,
          marked_by: req.user.id,
          marked_at: new Date(),
          remarks: record.remarks || null,
          malpractice_flag: Boolean(record.malpractice_flag)
        });
        rows.push(created);
        continue;
      }

      if (existing.is_locked) {
        rows.push(existing);
        continue;
      }

      existing.status = record.status;
      existing.marked_by = req.user.id;
      existing.marked_at = new Date();
      existing.remarks = record.remarks || null;
      existing.malpractice_flag = Boolean(record.malpractice_flag);
      await existing.save();
      rows.push(existing);
    }

    return ok(res, rows);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'attendance_mark_failed',
      message: error.message
    });
  }
};

const listMarksByPaper = async (req, res) => {
  try {
    const rows = await MarksEntryV2.findAll({
      where: {
        exam_paper_id: req.examPaper.id
      },
      include: [
        { association: 'student', attributes: ['id', 'user_id', 'roll_number'] }
      ],
      order: [['updated_at', 'DESC']]
    });

    return ok(res, rows);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'teacher_marks_fetch_failed',
      message: error.message
    });
  }
};

module.exports = {
  listDropdownExamTerms,
  listDropdownExamEvents,
  listDropdownClassSections,
  listDropdownPapersByEventAndClass,
  listClassStudentsByClassTeacher,
  listBulkMarksRegisterByClass,
  getBulkMarksRegisterByPaperForTeacher,
  updateBulkMarksRegisterForTeacher,
  listAssignedPapers,
  listMyTimetable,
  listPaperStudents,
  upsertMarks,
  submitMarks,
  markAttendanceBulk,
  listMarksByPaper
};
