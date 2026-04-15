const { ok, fail } = require('../../../utils/response');
const {
  ExamTimetableV2,
  ResultV2,
  DocumentV2
} = require('../../../models');
const { Student } = require('../../../models/admin/Student');
const { buildSignedDocumentUrl } = require('../../../services/exam/v2/documentService');

const findStudentByUser = async (req) => {
  if (req.student) {
    return req.student;
  }

  return Student.findOne({ where: { user_id: req.user.id }, attributes: ['id', 'class_section_id', 'roll_number', 'user_id'] });
};

const getMyTimetable = async (req, res) => {
  try {
    const student = await findStudentByUser(req);
    if (!student) {
      return fail(res, { statusCode: 404, code: 'student_not_found', message: 'Student profile not found' });
    }

    const where = { class_id: student.class_section_id };
    if (req.query.exam_event_id) {
      where.exam_event_id = req.query.exam_event_id;
    }

    const rows = await ExamTimetableV2.findAll({
      where,
      include: [
        { association: 'event', attributes: ['id', 'name', 'status', 'academic_year'] },
        { association: 'subject', attributes: ['id', 'subject_name', 'subject_code'] },
        { association: 'paper', attributes: ['id', 'max_marks', 'passing_marks'] },
        { association: 'classSection', attributes: ['id', 'class_name', 'section_name'] }
      ],
      order: [['exam_date', 'ASC'], ['start_time', 'ASC']]
    });

    return ok(res, rows);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'student_timetable_fetch_failed', message: error.message });
  }
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

const getMyDocuments = async (req, res) => {
  try {
    const student = await findStudentByUser(req);
    if (!student) {
      return fail(res, { statusCode: 404, code: 'student_not_found', message: 'Student profile not found' });
    }

    const where = { student_id: student.id, is_valid: true, status: 'final' };
    if (req.query.document_type) {
      where.document_type = req.query.document_type;
    }
    if (req.query.reference_id) {
      where.reference_id = req.query.reference_id;
    }

    const rows = await DocumentV2.findAll({ where, order: [['generated_at', 'DESC']] });
    const mapped = rows.map((row) => ({
      ...row.toJSON(),
      signed_url: buildSignedDocumentUrl(row.file_url)
    }));

    return ok(res, mapped);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'student_documents_fetch_failed', message: error.message });
  }
};

const downloadMyDocument = async (req, res) => {
  try {
    const student = await findStudentByUser(req);
    if (!student) {
      return fail(res, { statusCode: 404, code: 'student_not_found', message: 'Student profile not found' });
    }

    const document = await DocumentV2.findOne({
      where: {
        id: req.params.id,
        student_id: student.id,
        is_valid: true,
        status: 'final'
      }
    });

    if (!document) {
      return fail(res, { statusCode: 404, code: 'document_not_found', message: 'Document not found' });
    }

    return ok(res, {
      id: document.id,
      document_type: document.document_type,
      reference_id: document.reference_id,
      generated_at: document.generated_at,
      signed_url: buildSignedDocumentUrl(document.file_url)
    });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'student_document_download_failed', message: error.message });
  }
};

module.exports = {
  getMyTimetable,
  getMyResults,
  getMyDocuments,
  downloadMyDocument
};
