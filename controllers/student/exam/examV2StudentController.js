const { ok, fail } = require('../../../utils/response');
const { Op } = require('sequelize');
const {
  ExamTimetableV2,
  MarksEntryV2,
  ResultV2
} = require('../../../models');
const { Student } = require('../../../models/admin/Student');

const findStudentByUser = async (req) => {
  if (req.student) {
    return req.student;
  }

  return Student.findOne({ where: { user_id: req.user.id }, attributes: ['id', 'class_section_id', 'roll_number', 'user_id'] });
};

const getMyResults = async (req, res) => {
  try {
    const student = await findStudentByUser(req);
    if (!student) {
      return fail(res, { statusCode: 404, code: 'student_not_found', message: 'Student profile not found' });
    }

    const where = { student_id: student.id, status: 'published' };
    if (req.query.exam_event_id) {
      where.exam_event_id = req.query.exam_event_id;
    }

    const rows = await ResultV2.findAll({
      where,
      include: [
        { association: 'event', attributes: ['id', 'name', 'academic_year', 'status'] },
        {
          association: 'details',
          attributes: ['id', 'exam_paper_id', 'marks_obtained', 'max_marks', 'percentage', 'grade', 'is_pass', 'is_absent', 'is_exempt'],
          include: [
            { association: 'paper', attributes: ['id', 'subject_id', 'class_id'] }
          ]
        }
      ],
      order: [['published_at', 'DESC'], ['percentage', 'DESC']]
    });

    return ok(res, rows);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'student_results_fetch_failed', message: error.message });
  }
};

const getMyEventWiseSubjectMarks = async (req, res) => {
  try {
    const student = await findStudentByUser(req);
    if (!student) {
      return fail(res, { statusCode: 404, code: 'student_not_found', message: 'Student profile not found' });
    }

    const resultRows = await ResultV2.findAll({
      where: {
        student_id: student.id
      },
      attributes: ['id', 'exam_event_id', 'total_marks', 'max_marks', 'percentage', 'grade', 'status', 'is_pass', 'published_at'],
      include: [
        { association: 'event', attributes: ['id', 'name'] }
      ]
    });

    const marksRows = await MarksEntryV2.findAll({
      where: {
        student_id: student.id
      },
      attributes: ['id', 'exam_paper_id', 'marks_obtained', 'total_marks', 'max_marks', 'percentage', 'grade', 'is_pass', 'is_absent', 'is_exempt'],
      include: [
        {
          association: 'paper',
          required: true,
          attributes: ['id', 'exam_event_id', 'subject_id'],
          include: [
            { association: 'event', attributes: ['id', 'name'] },
            { association: 'subject', attributes: ['id', 'subject_name', 'subject_code'] }
          ]
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    const discoveredEventIds = new Set();
    resultRows.forEach((row) => discoveredEventIds.add(row.exam_event_id));
    marksRows.forEach((row) => {
      if (row.paper && row.paper.exam_event_id) {
        discoveredEventIds.add(row.paper.exam_event_id);
      }
    });

    const examEventIds = Array.from(discoveredEventIds)
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0)
      .sort((a, b) => a - b);

    const eventMap = new Map();
    examEventIds.forEach((eventId) => {
      eventMap.set(eventId, {
        exam_event_id: eventId,
        exam_event_name: null,
        result_total_marks: null,
        result_max_marks: null,
        result_percentage: null,
        result_grade: null,
        result_status: null,
        result_is_pass: null,
        published_at: null,
        subjects: []
      });
    });

    resultRows.forEach((row) => {
      const bucket = eventMap.get(row.exam_event_id);
      if (!bucket) {
        return;
      }

      bucket.exam_event_name = row.event ? row.event.name : bucket.exam_event_name;
      bucket.result_total_marks = row.total_marks;
      bucket.result_max_marks = row.max_marks;
      bucket.result_percentage = row.percentage;
      bucket.result_grade = row.grade;
      bucket.result_status = row.status;
      bucket.result_is_pass = row.is_pass;
      bucket.published_at = row.published_at;
    });

    marksRows.forEach((row) => {
      const paper = row.paper;
      if (!paper) {
        return;
      }

      const bucket = eventMap.get(paper.exam_event_id);
      if (!bucket) {
        return;
      }

      if (!bucket.exam_event_name && paper.event) {
        bucket.exam_event_name = paper.event.name;
      }

      bucket.subjects.push({
        marks_entry_id: row.id,
        exam_paper_id: row.exam_paper_id,
        subject_id: paper.subject_id,
        subject_name: paper.subject ? paper.subject.subject_name : null,
        subject_code: paper.subject ? paper.subject.subject_code : null,
        marks_obtained: row.marks_obtained,
        total_marks: row.total_marks,
        max_marks: row.max_marks,
        percentage: row.percentage,
        grade: row.grade,
        is_pass: row.is_pass,
        is_absent: row.is_absent,
        is_exempt: row.is_exempt
      });
    });

    return ok(res, Array.from(eventMap.values()), {
      discovered_exam_event_ids: examEventIds,
      student_id: student.id
    });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'student_event_wise_subject_marks_fetch_failed', message: error.message });
  }
};

const getMyExamSchedules = async (req, res) => {
  try {
    const student = await findStudentByUser(req);
    if (!student) {
      return fail(res, { statusCode: 404, code: 'student_not_found', message: 'Student profile not found' });
    }

    const rows = await ExamTimetableV2.findAll({
      where: { class_id: student.class_section_id },
      attributes: ['id', 'exam_event_id', 'exam_date', 'start_time'],
      include: [
        {
          association: 'event',
          attributes: ['id', 'name', 'exam_type_id'],
          include: [
            { association: 'examType', attributes: ['id', 'name'] }
          ]
        }
      ],
      order: [['exam_date', 'ASC'], ['start_time', 'ASC']]
    });

    const seenEventIds = new Set();
    const schedules = [];

    rows.forEach((row) => {
      const event = row.event;
      if (!event || seenEventIds.has(event.id)) {
        return;
      }

      seenEventIds.add(event.id);
      schedules.push({
        exam_event_id: event.id,
        exam_event_name: event.name,
        exam_type_id: event.examType?.id || event.exam_type_id || null,
        exam_type_name: event.examType?.name || null,
        exam_schedule_id: row.id
      });
    });

    return ok(res, schedules);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'student_exam_schedules_fetch_failed', message: error.message });
  }
};

const getMyExamEventTimetable = async (req, res) => {
  try {
    const examEventId = Number(req.params.exam_event_id);
    if (!Number.isInteger(examEventId) || examEventId <= 0) {
      return fail(res, { statusCode: 400, code: 'validation_error', message: 'exam_event_id must be a positive integer' });
    }

    const student = await findStudentByUser(req);
    if (!student) {
      return fail(res, { statusCode: 404, code: 'student_not_found', message: 'Student profile not found' });
    }

    const rows = await ExamTimetableV2.findAll({
      where: {
        exam_event_id: examEventId,
        class_id: student.class_section_id
      },
      attributes: [
        'id',
        'exam_event_id',
        'exam_paper_id',
        'subject_id',
        'exam_date',
        'start_time',
        'end_time',
        'duration_minutes',
        'slot_number',
        'room_label',
        'is_rescheduled',
        'original_date'
      ],
      include: [
        {
          association: 'event',
          attributes: ['id', 'name', 'exam_type_id'],
          include: [
            { association: 'examType', attributes: ['id', 'name'] }
          ]
        },
        { association: 'subject', attributes: ['id', 'subject_name', 'subject_code'] },
        { association: 'paper', attributes: ['id', 'max_marks', 'passing_marks'] }
      ],
      order: [['exam_date', 'ASC'], ['start_time', 'ASC']]
    });

    const timetable = rows.map((row) => ({
      exam_schedule_id: row.id,
      exam_event_id: row.exam_event_id,
      exam_event_name: row.event?.name || null,
      exam_type_id: row.event?.examType?.id || row.event?.exam_type_id || null,
      exam_type_name: row.event?.examType?.name || null,
      exam_paper_id: row.exam_paper_id,
      subject_id: row.subject_id,
      subject_name: row.subject?.subject_name || null,
      subject_code: row.subject?.subject_code || null,
      exam_date: row.exam_date,
      start_time: row.start_time,
      end_time: row.end_time,
      duration_minutes: row.duration_minutes,
      slot_number: row.slot_number,
      room_label: row.room_label,
      is_rescheduled: row.is_rescheduled,
      original_date: row.original_date,
      max_marks: row.paper?.max_marks || null,
      passing_marks: row.paper?.passing_marks || null
    }));

    return ok(res, timetable);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'student_exam_event_timetable_fetch_failed', message: error.message });
  }
};

module.exports = {
  getMyResults,
  getMyExamSchedules,
  getMyExamEventTimetable,
  getMyEventWiseSubjectMarks
};
