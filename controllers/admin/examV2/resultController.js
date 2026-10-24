const { Op } = require('sequelize');
const { ResultV2, MarksEntryV2, ExamEventV2, ClassSection, Student, StudentParent, Subject, User } = require('../../../models');
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

const listPublishedResultsByExamTypes = async (req, res) => {
  try {
    const rawExamTypeIds = req.query.exam_type_ids;
    const rawStudentId = req.query.student_id;
    const rawStudentIds = req.query.student_ids;
    let examTypeIds = [];
    let studentIds = [];

    if (Array.isArray(rawExamTypeIds)) {
      examTypeIds = rawExamTypeIds.map((item) => Number(item));
    } else if (typeof rawExamTypeIds === 'string') {
      examTypeIds = rawExamTypeIds
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0);
    }

    examTypeIds = [...new Set(examTypeIds)];
    if (!examTypeIds.length) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_exam_type_ids',
        message: 'exam_type_ids is required and must contain valid positive integers'
      });
    }

    if (rawStudentId) {
      const studentId = Number(rawStudentId);
      if (Number.isInteger(studentId) && studentId > 0) {
        studentIds.push(studentId);
      }
    }

    if (Array.isArray(rawStudentIds)) {
      studentIds = studentIds.concat(rawStudentIds.map((item) => Number(item)));
    } else if (typeof rawStudentIds === 'string') {
      studentIds = studentIds.concat(
        rawStudentIds
          .split(',')
          .map((item) => Number(item.trim()))
          .filter((item) => Number.isInteger(item) && item > 0)
      );
    }

    studentIds = [...new Set(studentIds)].filter((item) => Number.isInteger(item) && item > 0);

    const events = await ExamEventV2.findAll({
      where: {
        exam_type_id: {
          [Op.in]: examTypeIds
        }
      },
      attributes: ['id', 'name', 'exam_type_id', 'academic_year', 'status', 'result_publish_at'],
      include: [
        {
          association: 'examType',
          attributes: ['id', 'name']
        }
      ],
      order: [['start_date', 'DESC'], ['id', 'DESC']]
    });

    const eventIds = events.map((event) => event.id);
    if (!eventIds.length) {
      return ok(res, [], {
        requested_exam_type_ids: examTypeIds,
        exam_event_count: 0,
        published_result_count: 0
      });
    }

    const resultWhere = {
      exam_event_id: {
        [Op.in]: eventIds
      },
      status: 'published'
    };

    if (studentIds.length) {
      resultWhere.student_id = {
        [Op.in]: studentIds
      };
    }

    const rows = await ResultV2.findAll({
      where: resultWhere,
      include: [
        {
          association: 'student',
          attributes: ['id', 'user_id', 'roll_number'],
          include: [
            {
              model: User,
              attributes: ['id', 'name']
            }
          ]
        },
        {
          association: 'details',
          attributes: ['id', 'exam_paper_id', 'marks_obtained', 'max_marks', 'percentage', 'grade', 'is_pass', 'is_absent', 'is_exempt'],
          include: [
            {
              association: 'paper',
              attributes: ['id', 'subject_id', 'class_id', 'max_marks', 'passing_marks'],
              include: [
                {
                  association: 'subject',
                  attributes: ['id', 'subject_name', 'subject_code']
                }
              ]
            }
          ]
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    const examTypeBucketMap = new Map();
    const eventBucketMap = new Map();
    const eventPaperBucketMap = new Map();

    events.forEach((eventInstance) => {
      const event = eventInstance.get({ plain: true });
      const examTypeId = event.exam_type_id;
      const examTypeName = event.examType ? event.examType.name : null;

      if (!examTypeBucketMap.has(examTypeId)) {
        examTypeBucketMap.set(examTypeId, {
          exam_type_id: examTypeId,
          exam_type_name: examTypeName,
          exam_events: []
        });
      }

      const eventBucket = {
        exam_event_id: event.id,
        exam_event_name: event.name,
        academic_year: event.academic_year,
        event_status: event.status,
        result_publish_at: event.result_publish_at,
        paper_wise_breakdown: [],
        published_results: []
      };

      examTypeBucketMap.get(examTypeId).exam_events.push(eventBucket);
      eventBucketMap.set(event.id, eventBucket);
    });

    rows.forEach((resultInstance) => {
      const result = resultInstance.get({ plain: true });
      const eventBucket = eventBucketMap.get(result.exam_event_id);
      if (!eventBucket) {
        return;
      }

      const subjectBreakdown = (result.details || []).map((detail) => ({
        marks_entry_id: detail.id,
        exam_paper_id: detail.exam_paper_id,
        subject_id: detail.paper ? detail.paper.subject_id : null,
        subject_name: detail.paper && detail.paper.subject ? detail.paper.subject.subject_name : null,
        subject_code: detail.paper && detail.paper.subject ? detail.paper.subject.subject_code : null,
        class_id: detail.paper ? detail.paper.class_id : null,
        marks_obtained: detail.marks_obtained,
        max_marks: detail.max_marks,
        percentage: detail.percentage,
        grade: detail.grade,
        is_pass: detail.is_pass,
        is_absent: detail.is_absent,
        is_exempt: detail.is_exempt
      }));

      (result.details || []).forEach((detail) => {
        const paper = detail.paper || null;
        const subject = paper && paper.subject ? paper.subject : null;

        const eventPaperKey = `${result.exam_event_id}:${detail.exam_paper_id}`;
        if (!eventPaperBucketMap.has(eventPaperKey)) {
          const paperBucket = {
            exam_paper_id: detail.exam_paper_id,
            subject_id: paper ? paper.subject_id : null,
            subject_name: subject ? subject.subject_name : null,
            subject_code: subject ? subject.subject_code : null,
            class_id: paper ? paper.class_id : null,
            max_marks: paper ? paper.max_marks : detail.max_marks,
            passing_marks: paper ? paper.passing_marks : null,
            student_results: []
          };

          eventPaperBucketMap.set(eventPaperKey, paperBucket);
          eventBucket.paper_wise_breakdown.push(paperBucket);
        }

        eventPaperBucketMap.get(eventPaperKey).student_results.push({
          result_id: result.id,
          marks_entry_id: detail.id,
          student_id: result.student_id,
          student_name: result.student && result.student.User ? result.student.User.name : null,
          roll_number: result.student ? result.student.roll_number : null,
          marks_obtained: detail.marks_obtained,
          max_marks: detail.max_marks,
          percentage: detail.percentage,
          grade: detail.grade,
          is_pass: detail.is_pass,
          is_absent: detail.is_absent,
          is_exempt: detail.is_exempt
        });
      });

      eventBucket.published_results.push({
        result_id: result.id,
        student_id: result.student_id,
        student_name: result.student && result.student.User ? result.student.User.name : null,
        roll_number: result.student ? result.student.roll_number : null,
        total_marks: result.total_marks,
        max_marks: result.max_marks,
        percentage: result.percentage,
        grade: result.grade,
        rank: result.rank,
        is_pass: result.is_pass,
        published_at: result.published_at,
        version: result.version,
        subject_wise_breakdown: subjectBreakdown
      });
    });

    const data = Array.from(examTypeBucketMap.values())
      .map((examTypeGroup) => ({
        ...examTypeGroup,
        exam_events: examTypeGroup.exam_events.filter((event) => event.published_results.length > 0)
      }))
      .filter((examTypeGroup) => examTypeGroup.exam_events.length > 0);

    return ok(res, data, {
      requested_exam_type_ids: examTypeIds,
      requested_student_ids: studentIds.length ? studentIds : null,
      exam_event_count: eventIds.length,
      published_result_count: rows.length
    });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'published_results_by_exam_types_failed',
      message: error.message
    });
  }
};

const listPublishedResultsByExamEventAndStudents = async (req, res) => {
  try {
    const examEventId = Number(req.query.exam_event_id);
    const studentId = Number(req.query.student_id);
    const studentIds = [studentId];

    if (!Number.isInteger(examEventId) || examEventId <= 0) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_exam_event_id',
        message: 'exam_event_id must be a valid positive integer'
      });
    }

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_student_id',
        message: 'student_id must be a valid positive integer'
      });
    }

    const eventRow = await ExamEventV2.findByPk(examEventId, {
      attributes: ['id', 'name', 'academic_year', 'result_publish_at']
    });

    if (!eventRow) {
      return fail(res, {
        statusCode: 404,
        code: 'exam_event_not_found',
        message: 'Exam event not found'
      });
    }

    const event = eventRow.get({ plain: true });

    const rows = await ResultV2.findAll({
      where: {
        exam_event_id: examEventId,
        status: 'published',
        student_id: {
          [Op.in]: studentIds
        }
      },
      include: [
        {
          association: 'student',
          attributes: ['id', 'user_id', 'roll_number'],
          include: [
            {
              model: User,
              attributes: ['id', 'name']
            }
          ]
        },
        {
          association: 'details',
          attributes: ['id', 'exam_paper_id', 'marks_obtained', 'max_marks', 'grade', 'is_pass', 'is_absent'],
          include: [
            {
              association: 'paper',
              attributes: ['id', 'subject_id', 'max_marks', 'passing_marks'],
              include: [
                {
                  association: 'subject',
                  attributes: ['id', 'subject_name', 'subject_code']
                }
              ]
            }
          ]
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    const data = {
      exam_event: {
        exam_event_id: event.id,
        exam_event_name: event.name,
        academic_year: event.academic_year,
        result_publish_at: event.result_publish_at
      },
      students: []
    };

    rows.forEach((resultInstance) => {
      const result = resultInstance.get({ plain: true });
      const detailsBreakdown = [];

      (result.details || []).forEach((detail) => {
        const paper = detail.paper || null;
        const subject = paper && paper.subject ? paper.subject : null;

        detailsBreakdown.push({
          marks_entry_id: detail.id,
          exam_paper_id: detail.exam_paper_id,
          subject_id: paper ? paper.subject_id : null,
          subject_name: subject ? subject.subject_name : null,
          subject_code: subject ? subject.subject_code : null,
          marks_obtained: detail.marks_obtained,
          max_marks: detail.max_marks,
          grade: detail.grade,
          is_pass: detail.is_pass,
          is_absent: detail.is_absent,
          published_status: 'published'
        });
      });

      data.students.push({
        student_id: result.student_id,
        student_name: result.student && result.student.User ? result.student.User.name : null,
        roll_number: result.student ? result.student.roll_number : null,
        result: {
          result_id: result.id,
          total_marks: result.total_marks,
          max_marks: result.max_marks,
          percentage: result.percentage,
          grade: result.grade,
          rank: result.rank,
          is_pass: result.is_pass,
          published_at: result.published_at,
          version: result.version,
          status: 'published'
        },
        details_breakdown: detailsBreakdown
      });
    });

    return ok(res, data, {
      exam_event_id: examEventId,
      requested_student_ids: studentIds,
      student_count: data.students.length,
      published_result_count: rows.length
    });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'published_results_by_event_students_failed',
      message: error.message
    });
  }
};

const listFailedStudentsByExamEvent = async (req, res) => {
  try {
    const examEventId = Number(req.query.exam_event_id);

    if (!Number.isInteger(examEventId) || examEventId <= 0) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_exam_event_id',
        message: 'exam_event_id must be a valid positive integer'
      });
    }

    const eventRow = await ExamEventV2.findByPk(examEventId, {
      attributes: ['id', 'name', 'academic_year', 'result_publish_at']
    });

    if (!eventRow) {
      return fail(res, {
        statusCode: 404,
        code: 'exam_event_not_found',
        message: 'Exam event not found'
      });
    }

    const event = eventRow.get({ plain: true });

    const rows = await ResultV2.findAll({
      where: {
        exam_event_id: examEventId,
        status: 'published',
        is_pass: false
      },
      include: [
        {
          association: 'student',
          attributes: ['id', 'user_id', 'roll_number'],
          include: [
            {
              model: User,
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      attributes: ['id', 'student_id', 'total_marks', 'max_marks', 'percentage', 'grade', 'rank', 'is_pass', 'published_at', 'version'],
      order: [['percentage', 'ASC'], ['updated_at', 'DESC']]
    });

    const failedStudents = rows.map((resultInstance) => {
      const result = resultInstance.get({ plain: true });
      return {
        result_id: result.id,
        student_id: result.student_id,
        student_name: result.student && result.student.User ? result.student.User.name : null,
        roll_number: result.student ? result.student.roll_number : null,
        total_marks: result.total_marks,
        max_marks: result.max_marks,
        percentage: result.percentage,
        grade: result.grade,
        rank: result.rank,
        is_pass: result.is_pass,
        status: 'published',
        published_at: result.published_at,
        version: result.version
      };
    });

    return ok(res, {
      exam_event: {
        exam_event_id: event.id,
        exam_event_name: event.name,
        academic_year: event.academic_year,
        result_publish_at: event.result_publish_at
      },
      failed_students: failedStudents
    }, {
      exam_event_id: examEventId,
      failed_student_count: failedStudents.length
    });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'failed_student_report_fetch_failed',
      message: error.message
    });
  }
};

const listClassWisePublishedReport = async (req, res) => {
  try {
    const examEventId = Number(req.query.exam_event_id);
    const classId = Number(req.query.class_id);

    if (!Number.isInteger(examEventId) || examEventId <= 0) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_exam_event_id',
        message: 'exam_event_id must be a valid positive integer'
      });
    }

    if (!Number.isInteger(classId) || classId <= 0) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_class_id',
        message: 'class_id must be a valid positive integer'
      });
    }

    const [eventRow, classRow] = await Promise.all([
      ExamEventV2.findByPk(examEventId, {
        attributes: ['id', 'name', 'academic_year', 'result_publish_at']
      }),
      ClassSection.findByPk(classId, {
        attributes: ['id', 'class_name', 'section_name']
      })
    ]);

    if (!eventRow) {
      return fail(res, {
        statusCode: 404,
        code: 'exam_event_not_found',
        message: 'Exam event not found'
      });
    }

    if (!classRow) {
      return fail(res, {
        statusCode: 404,
        code: 'class_section_not_found',
        message: 'Class section not found'
      });
    }

    const event = eventRow.get({ plain: true });
    const classSection = classRow.get({ plain: true });

    const rows = await ResultV2.findAll({
      where: {
        exam_event_id: examEventId,
        status: 'published'
      },
      include: [
        {
          association: 'student',
          attributes: ['id', 'user_id', 'roll_number'],
          include: [
            {
              model: User,
              attributes: ['id', 'name']
            }
          ]
        },
        {
          association: 'details',
          required: true,
          attributes: ['id', 'exam_paper_id', 'marks_obtained', 'max_marks', 'grade', 'is_pass', 'is_absent'],
          include: [
            {
              association: 'paper',
              required: true,
              where: {
                class_id: classId
              },
              attributes: ['id', 'subject_id', 'class_id', 'max_marks', 'passing_marks'],
              include: [
                {
                  association: 'subject',
                  attributes: ['id', 'subject_name', 'subject_code']
                }
              ]
            }
          ]
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    const students = rows.map((resultInstance) => {
      const result = resultInstance.get({ plain: true });

      return {
        student_id: result.student_id,
        student_name: result.student && result.student.User ? result.student.User.name : null,
        roll_number: result.student ? result.student.roll_number : null,
        result: {
          result_id: result.id,
          total_marks: result.total_marks,
          max_marks: result.max_marks,
          percentage: result.percentage,
          grade: result.grade,
          rank: result.rank,
          is_pass: result.is_pass,
          published_at: result.published_at,
          version: result.version,
          status: 'published'
        },
        details_breakdown: (result.details || []).map((detail) => ({
          marks_entry_id: detail.id,
          exam_paper_id: detail.exam_paper_id,
          subject_id: detail.paper ? detail.paper.subject_id : null,
          subject_name: detail.paper && detail.paper.subject ? detail.paper.subject.subject_name : null,
          subject_code: detail.paper && detail.paper.subject ? detail.paper.subject.subject_code : null,
          marks_obtained: detail.marks_obtained,
          max_marks: detail.max_marks,
          grade: detail.grade,
          is_pass: detail.is_pass,
          is_absent: detail.is_absent,
          published_status: 'published'
        }))
      };
    });

    return ok(res, {
      exam_event: {
        exam_event_id: event.id,
        exam_event_name: event.name,
        academic_year: event.academic_year,
        result_publish_at: event.result_publish_at
      },
      class_section: {
        class_id: classSection.id,
        class_name: classSection.class_name,
        section_name: classSection.section_name,
        label: `${classSection.class_name}-${classSection.section_name}`
      },
      students
    }, {
      exam_event_id: examEventId,
      class_id: classId,
      student_count: students.length,
      published_result_count: students.length
    });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'class_wise_published_report_failed',
      message: error.message
    });
  }
};

const listSubjectWisePublishedReport = async (req, res) => {
  try {
    const examEventId = Number(req.query.exam_event_id);
    const classId = Number(req.query.class_id);
    const subjectId = Number(req.query.subject_id);

    if (!Number.isInteger(examEventId) || examEventId <= 0) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_exam_event_id',
        message: 'exam_event_id must be a valid positive integer'
      });
    }

    if (!Number.isInteger(classId) || classId <= 0) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_class_id',
        message: 'class_id must be a valid positive integer'
      });
    }

    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_subject_id',
        message: 'subject_id must be a valid positive integer'
      });
    }

    const [eventRow, classRow, subjectRow] = await Promise.all([
      ExamEventV2.findByPk(examEventId, {
        attributes: ['id', 'name', 'academic_year', 'result_publish_at']
      }),
      ClassSection.findByPk(classId, {
        attributes: ['id', 'class_name', 'section_name']
      }),
      Subject.findOne({
        where: {
          id: subjectId,
          class_section_id: classId
        },
        attributes: ['id', 'subject_name', 'subject_code', 'class_section_id']
      })
    ]);

    if (!eventRow) {
      return fail(res, {
        statusCode: 404,
        code: 'exam_event_not_found',
        message: 'Exam event not found'
      });
    }

    if (!classRow) {
      return fail(res, {
        statusCode: 404,
        code: 'class_section_not_found',
        message: 'Class section not found'
      });
    }

    if (!subjectRow) {
      return fail(res, {
        statusCode: 404,
        code: 'subject_not_found_for_class',
        message: 'Subject not found for selected class section'
      });
    }

    const event = eventRow.get({ plain: true });
    const classSection = classRow.get({ plain: true });
    const subject = subjectRow.get({ plain: true });

    const rows = await ResultV2.findAll({
      where: {
        exam_event_id: examEventId,
        status: 'published'
      },
      include: [
        {
          association: 'student',
          attributes: ['id', 'user_id', 'roll_number'],
          include: [
            {
              model: User,
              attributes: ['id', 'name']
            }
          ]
        },
        {
          association: 'details',
          required: true,
          attributes: ['id', 'exam_paper_id', 'marks_obtained', 'max_marks', 'grade', 'is_pass', 'is_absent'],
          include: [
            {
              association: 'paper',
              required: true,
              where: {
                exam_event_id: examEventId,
                class_id: classId,
                subject_id: subjectId
              },
              attributes: ['id', 'subject_id', 'class_id', 'max_marks', 'passing_marks']
            }
          ]
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    const students = rows.map((resultInstance) => {
      const result = resultInstance.get({ plain: true });
      return {
        student_id: result.student_id,
        student_name: result.student && result.student.User ? result.student.User.name : null,
        roll_number: result.student ? result.student.roll_number : null,
        result: {
          result_id: result.id,
          total_marks: result.total_marks,
          max_marks: result.max_marks,
          percentage: result.percentage,
          grade: result.grade,
          rank: result.rank,
          is_pass: result.is_pass,
          published_at: result.published_at,
          version: result.version,
          status: 'published'
        },
        details_breakdown: (result.details || []).map((detail) => ({
          marks_entry_id: detail.id,
          exam_paper_id: detail.exam_paper_id,
          subject_id: subject.id,
          subject_name: subject.subject_name,
          subject_code: subject.subject_code,
          marks_obtained: detail.marks_obtained,
          max_marks: detail.max_marks,
          grade: detail.grade,
          is_pass: detail.is_pass,
          is_absent: detail.is_absent,
          published_status: 'published'
        }))
      };
    });

    return ok(res, {
      exam_event: {
        exam_event_id: event.id,
        exam_event_name: event.name,
        academic_year: event.academic_year,
        result_publish_at: event.result_publish_at
      },
      class_section: {
        class_id: classSection.id,
        class_name: classSection.class_name,
        section_name: classSection.section_name,
        label: `${classSection.class_name}-${classSection.section_name}`
      },
      subject: {
        subject_id: subject.id,
        subject_name: subject.subject_name,
        subject_code: subject.subject_code
      },
      students
    }, {
      exam_event_id: examEventId,
      class_id: classId,
      subject_id: subjectId,
      student_count: students.length,
      published_result_count: students.length
    });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'subject_wise_published_report_failed',
      message: error.message
    });
  }
};

const listStudentsByClassSectionForReports = async (req, res) => {
  try {
    const classId = Number(req.query.class_id);

    if (!Number.isInteger(classId) || classId <= 0) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_class_id',
        message: 'class_id must be a valid positive integer'
      });
    }

    const classRow = await ClassSection.findByPk(classId, {
      attributes: ['id', 'class_name', 'section_name']
    });

    if (!classRow) {
      return fail(res, {
        statusCode: 404,
        code: 'class_section_not_found',
        message: 'Class section not found'
      });
    }

    const classSection = classRow.get({ plain: true });

    const rows = await Student.findAll({
      where: {
        class_section_id: classId
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        },
        {
          model: StudentParent,
          as: 'parentDetails',
          attributes: ['father_name']
        }
      ],
      attributes: ['id', 'roll_number', 'gender', 'phone_no'],
      order: [['roll_number', 'ASC'], ['id', 'ASC']]
    });

    const students = rows.map((row, index) => {
      const student = row.get({ plain: true });
      return {
        s_no: index + 1,
        student_id: student.id,
        roll_no: student.roll_number,
        student_name: student.User ? student.User.name : null,
        email: student.User ? student.User.email : null,
        phone: student.phone_no,
        gender: student.gender,
        father_name: student.parentDetails ? student.parentDetails.father_name : null
      };
    });

    return ok(res, {
      class_section: {
        class_id: classSection.id,
        class_name: classSection.class_name,
        section_name: classSection.section_name,
        label: `${classSection.class_name}-${classSection.section_name}`
      },
      total_students: students.length,
      students
    }, {
      class_id: classId,
      total_students: students.length
    });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'student_list_by_class_failed',
      message: error.message
    });
  }
};



const getStudentAllExamHistoryForReports = async (req, res) => {
  try {
    const studentId = Number(req.query.student_id);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return fail(res, {
        statusCode: 400,
        code: 'invalid_student_id',
        message: 'student_id must be a valid positive integer'
      });
    }

    const studentRow = await Student.findByPk(studentId, {
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        },
        {
          model: ClassSection,
          attributes: ['id', 'class_name', 'section_name']
        },
        {
          model: StudentParent,
          as: 'parentDetails',
          attributes: ['father_name']
        }
      ],
      attributes: ['id', 'roll_number', 'gender', 'phone_no', 'class_section_id']
    });

    if (!studentRow) {
      return fail(res, {
        statusCode: 404,
        code: 'student_not_found',
        message: 'Student not found'
      });
    }

    const student = studentRow.get({ plain: true });

    const resultRows = await ResultV2.findAll({
      where: {
        student_id: studentId,
        status: 'published'
      },
      include: [
        {
          association: 'event',
          attributes: ['id', 'name', 'academic_year', 'status', 'result_publish_at'],
          include: [
            {
              association: 'examType',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          association: 'details',
          attributes: ['id', 'exam_paper_id', 'marks_obtained', 'max_marks', 'grade', 'is_pass', 'is_absent', 'is_exempt'],
          include: [
            {
              association: 'paper',
              attributes: ['id', 'subject_id', 'class_id', 'max_marks', 'passing_marks'],
              include: [
                {
                  association: 'subject',
                  attributes: ['id', 'subject_name', 'subject_code']
                },
                {
                  association: 'classSection',
                  attributes: ['id', 'class_name', 'section_name']
                }
              ]
            }
          ]
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    const examHistory = resultRows.map((resultInstance) => {
      const result = resultInstance.get({ plain: true });
      const event = result.event || null;
      const examType = event && event.examType ? event.examType : null;

      return {
        exam_term: {
          exam_type_id: examType ? examType.id : null,
          exam_type_name: examType ? examType.name : null
        },
        exam_event: {
          exam_event_id: event ? event.id : null,
          exam_event_name: event ? event.name : null,
          academic_year: event ? event.academic_year : null,
          event_status: event ? event.status : null,
          result_publish_at: event ? event.result_publish_at : null
        },
        result: {
          result_id: result.id,
          total_marks: result.total_marks,
          max_marks: result.max_marks,
          percentage: result.percentage,
          grade: result.grade,
          rank: result.rank,
          is_pass: result.is_pass,
          status: result.status,
          published_at: result.published_at,
          version: result.version
        },
        details_breakdown: (result.details || []).map((detail) => ({
          marks_entry_id: detail.id,
          exam_paper_id: detail.exam_paper_id,
          class_id: detail.paper ? detail.paper.class_id : null,
          class_name: detail.paper && detail.paper.classSection ? detail.paper.classSection.class_name : null,
          section_name: detail.paper && detail.paper.classSection ? detail.paper.classSection.section_name : null,
          subject_id: detail.paper ? detail.paper.subject_id : null,
          subject_name: detail.paper && detail.paper.subject ? detail.paper.subject.subject_name : null,
          subject_code: detail.paper && detail.paper.subject ? detail.paper.subject.subject_code : null,
          marks_obtained: detail.marks_obtained,
          max_marks: detail.max_marks,
          passing_marks: detail.paper ? detail.paper.passing_marks : null,
          grade: detail.grade,
          is_pass: detail.is_pass,
          is_absent: detail.is_absent,
          is_exempt: detail.is_exempt
        }))
      };
    });

    return ok(res, {
      student: {
        student_id: student.id,
        student_name: student.User ? student.User.name : null,
        email: student.User ? student.User.email : null,
        roll_number: student.roll_number,
        phone: student.phone_no,
        gender: student.gender,
        father_name: student.parentDetails ? student.parentDetails.father_name : null,
        class_id: student.class_section_id,
        class_name: student.ClassSection ? student.ClassSection.class_name : null,
        section_name: student.ClassSection ? student.ClassSection.section_name : null,
        class_label: student.ClassSection ? `${student.ClassSection.class_name}-${student.ClassSection.section_name}` : null
      },
      exam_history: examHistory
    }, {
      student_id: studentId,
      total_exam_records: examHistory.length
    });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'student_exam_history_failed',
      message: error.message
    });
  }
};

module.exports = {
  listResults,
  recomputeResults,
  publishResults,
  listMarksEntries,
  listPublishedResultsByExamTypes,
  listPublishedResultsByExamEventAndStudents,
  listFailedStudentsByExamEvent,
  listClassWisePublishedReport,
  listSubjectWisePublishedReport,
  listStudentsByClassSectionForReports,
  getStudentAllExamHistoryForReports
};
