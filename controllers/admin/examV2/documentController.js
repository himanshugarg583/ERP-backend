const {
  DocumentTemplateV2,
  DocumentV2,
  Student,
  User,
  ClassSection,
  ExamTimetableV2
} = require('../../../models');
const { ok, fail } = require('../../../utils/response');
const {
  createDocumentRecord,
  buildSignedDocumentUrl
} = require('../../../services/exam/v2/documentService');

const createTemplate = async (req, res) => {
  try {
    const row = await DocumentTemplateV2.create(req.body);
    return ok(res, row, null, 201);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'document_template_create_failed',
      message: error.message
    });
  }
};

const listTemplates = async (req, res) => {
  try {
    const where = {};
    if (req.query.document_type) where.document_type = req.query.document_type;
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';

    const rows = await DocumentTemplateV2.findAll({
      where,
      order: [['updated_at', 'DESC']]
    });

    return ok(res, rows);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'document_template_list_failed',
      message: error.message
    });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const row = await DocumentTemplateV2.findByPk(req.params.id);
    if (!row) {
      return fail(res, {
        statusCode: 404,
        code: 'document_template_not_found',
        message: 'Document template not found'
      });
    }

    await row.update(req.body);
    return ok(res, row);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'document_template_update_failed',
      message: error.message
    });
  }
};

const generateDocument = async (req, res) => {
  try {
    const row = await createDocumentRecord({
      ...req.body,
      generated_by: req.user.id
    });

    return ok(res, {
      ...row.toJSON(),
      signed_url: buildSignedDocumentUrl(row.file_url)
    }, null, 201);
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'document_generate_failed',
      message: error.message
    });
  }
};

const listDocuments = async (req, res) => {
  try {
    const where = {};
    if (req.query.student_id) where.student_id = Number(req.query.student_id);
    if (req.query.document_type) where.document_type = req.query.document_type;
    if (req.query.reference_id) where.reference_id = req.query.reference_id;
    if (req.query.status) where.status = req.query.status;

    const rows = await DocumentV2.findAll({
      where,
      include: [
        { association: 'student', attributes: ['id', 'user_id', 'roll_number'] },
        { association: 'generatedBy', attributes: ['id', 'name', 'role'] }
      ],
      order: [['generated_at', 'DESC']]
    });

    return ok(res, rows.map((row) => ({
      ...row.toJSON(),
      signed_url: buildSignedDocumentUrl(row.file_url)
    })));
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'document_list_failed',
      message: error.message
    });
  }
};

const getAdmitCardData = async (req, res) => {
  try {
    const studentId = Number(req.query.student_id);
    const examEventId = req.query.exam_event_id ? Number(req.query.exam_event_id) : null;

    const student = await Student.findByPk(studentId, {
      attributes: [
        'id',
        'user_id',
        'roll_number',
        'dob',
        'gender',
        'class_section_id',
        'phone_no',
        'admission_date'
      ]
    });

    if (!student) {
      return fail(res, {
        statusCode: 404,
        code: 'student_not_found',
        message: 'Student not found'
      });
    }

    const [user, classSection] = await Promise.all([
      User.findByPk(student.user_id, {
        attributes: ['id', 'name', 'email', 'status']
      }),
      ClassSection.findByPk(student.class_section_id, {
        attributes: ['id', 'class_name', 'section_name', 'room_No']
      })
    ]);

    const timetableWhere = {
      class_id: student.class_section_id
    };
    if (examEventId) {
      timetableWhere.exam_event_id = examEventId;
    }

    const rows = await ExamTimetableV2.findAll({
      where: timetableWhere,
      include: [
        { association: 'event', attributes: ['id', 'name', 'academic_year', 'start_date', 'end_date', 'status'] },
        { association: 'subject', attributes: ['id', 'subject_name', 'subject_code'] },
        { association: 'paper', attributes: ['id', 'max_marks', 'passing_marks'] }
      ],
      order: [['exam_date', 'ASC'], ['start_time', 'ASC']]
    });

    const eventsMap = new Map();
    for (const row of rows) {
      const eventKey = Number(row.exam_event_id);
      if (!eventsMap.has(eventKey)) {
        eventsMap.set(eventKey, {
          exam_event_id: eventKey,
          exam_event_name: row.event ? row.event.name : null,
          academic_year: row.event ? row.event.academic_year : null,
          start_date: row.event ? row.event.start_date : null,
          end_date: row.event ? row.event.end_date : null,
          status: row.event ? row.event.status : null,
          papers: []
        });
      }

      eventsMap.get(eventKey).papers.push({
        exam_paper_id: row.exam_paper_id,
        subject_id: row.subject ? row.subject.id : row.subject_id,
        subject_name: row.subject ? row.subject.subject_name : null,
        subject_code: row.subject ? row.subject.subject_code : null,
        max_marks: row.paper ? row.paper.max_marks : null,
        passing_marks: row.paper ? row.paper.passing_marks : null,
        exam_date: row.exam_date,
        start_time: row.start_time,
        end_time: row.end_time,
        duration_minutes: row.duration_minutes,
        room_label: row.room_label,
        slot_number: row.slot_number
      });
    }

    return ok(res, {
      student: {
        student_id: student.id,
        user_id: student.user_id,
        student_name: user ? user.name : null,
        email: user ? user.email : null,
        roll_number: student.roll_number,
        dob: student.dob,
        gender: student.gender,
        phone_no: student.phone_no,
        admission_date: student.admission_date,
        class_section_id: student.class_section_id,
        class_name: classSection ? classSection.class_name : null,
        section_name: classSection ? classSection.section_name : null,
        room_no: classSection ? classSection.room_No : null
      },
      admit_card: {
        requested_exam_event_id: examEventId,
        exam_events: [...eventsMap.values()],
        total_events: eventsMap.size,
        total_papers: rows.length,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'admit_card_data_fetch_failed',
      message: error.message
    });
  }
};

module.exports = {
  createTemplate,
  listTemplates,
  updateTemplate,
  generateDocument,
  listDocuments,
  getAdmitCardData
};
