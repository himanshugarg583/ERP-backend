const Joi = require('joi');
const { fail } = require('../../utils/response');

const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return fail(res, {
      statusCode: 400,
      code: 'validation_error',
      message: 'Validation failed',
      details: error.details.map((item) => item.message)
    });
  }

  req[source] = value;
  return next();
};

const id = Joi.number().integer().positive();

const schemas = {
  examTypeCreate: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().allow('', null),
    grading_config: Joi.alternatives().try(Joi.object(), Joi.array()).required(),
    is_active: Joi.boolean().optional()
  }),

  examTypeUpdate: Joi.object({
    name: Joi.string().min(2).max(100),
    description: Joi.string().allow('', null),
    grading_config: Joi.alternatives().try(Joi.object(), Joi.array()),
    is_active: Joi.boolean()
  }).min(1),

  examEventCreate: Joi.object({
    name: Joi.string().min(2).max(150).required(),
    exam_type_id: id.required(),
    academic_year: Joi.string().max(20).required(),
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
    status: Joi.string().valid('draft', 'scheduled', 'ongoing', 'completed', 'published').optional(),
    group_id: id.allow(null),
    marks_entry_deadline: Joi.date().iso().allow(null),
    result_publish_at: Joi.date().iso().allow(null)
  }),

  examEventUpdate: Joi.object({
    name: Joi.string().min(2).max(150),
    exam_type_id: id,
    academic_year: Joi.string().max(20),
    start_date: Joi.date().iso(),
    end_date: Joi.date().iso(),
    status: Joi.string().valid('draft', 'scheduled', 'ongoing', 'completed', 'published'),
    group_id: id.allow(null),
    marks_entry_deadline: Joi.date().iso().allow(null),
    result_publish_at: Joi.date().iso().allow(null)
  }).min(1),

  examPaperCreate: Joi.object({
    exam_event_id: id.required(),
    subject_id: Joi.number().integer().positive().required(),
    class_id: Joi.number().integer().positive().required(),
    max_marks: Joi.number().min(0).required(),
    passing_marks: Joi.number().min(0).max(Joi.ref('max_marks')).required(),
    marks_config: Joi.alternatives().try(Joi.object(), Joi.array()).required(),
    assigned_teacher_id: Joi.number().integer().positive().allow(null),
    is_active: Joi.boolean().optional()
  }),

  examPaperUpdate: Joi.object({
    max_marks: Joi.number().min(0),
    passing_marks: Joi.number().min(0),
    marks_config: Joi.alternatives().try(Joi.object(), Joi.array()),
    assigned_teacher_id: Joi.number().integer().positive().allow(null),
    is_active: Joi.boolean()
  }).min(1),

  timetableCreate: Joi.object({
    exam_event_id: id.required(),
    exam_paper_id: id.required(),
    class_id: Joi.number().integer().positive().required(),
    subject_id: Joi.number().integer().positive().required(),
    exam_date: Joi.date().iso().required(),
    start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/).required(),
    end_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/).required(),
    duration_minutes: Joi.number().integer().positive().required(),
    slot_number: Joi.number().integer().positive().optional(),
    room_label: Joi.string().max(80).allow('', null),
    invigilator_teacher_id: Joi.number().integer().positive().allow(null),
    is_rescheduled: Joi.boolean().optional(),
    original_date: Joi.date().iso().allow(null)
  }),

  timetableUpdate: Joi.object({
    exam_date: Joi.date().iso(),
    start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/),
    end_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/),
    duration_minutes: Joi.number().integer().positive(),
    slot_number: Joi.number().integer().positive(),
    room_label: Joi.string().max(80).allow('', null),
    invigilator_teacher_id: Joi.number().integer().positive().allow(null),
    is_rescheduled: Joi.boolean(),
    original_date: Joi.date().iso().allow(null)
  }).min(1),

  marksUpsert: Joi.object({
    student_id: Joi.number().integer().positive().required(),
    marks: Joi.alternatives().try(Joi.object(), Joi.array(), Joi.number()).allow(null),
    total_marks: Joi.number().min(0).required(),
    is_absent: Joi.boolean().optional(),
    is_exempt: Joi.boolean().optional(),
    meta_data: Joi.alternatives().try(Joi.object(), Joi.array()).allow(null)
  }),

  marksRegisterCreate: Joi.object({
    class_id: id.required(),
    entries: Joi.array().items(
      Joi.object({
        exam_paper_id: id.required(),
        students: Joi.array().items(
          Joi.object({
            student_id: id.required(),
            marks: Joi.alternatives().try(Joi.object(), Joi.array(), Joi.number()).allow(null),
            total_marks: Joi.number().min(0).required(),
            is_absent: Joi.boolean().optional(),
            is_exempt: Joi.boolean().optional(),
            meta_data: Joi.alternatives().try(Joi.object(), Joi.array()).allow(null)
          })
        ).min(1).required()
      })
    ).min(1).required()
  }),

  marksRegisterUpdate: Joi.object({
    class_id: id.required(),
    entries: Joi.array().items(
      Joi.object({
        exam_paper_id: id.required(),
        students: Joi.array().items(
          Joi.object({
            student_id: id.required(),
            marks: Joi.alternatives().try(Joi.object(), Joi.array(), Joi.number()).allow(null),
            total_marks: Joi.number().min(0).required(),
            is_absent: Joi.boolean().optional(),
            is_exempt: Joi.boolean().optional(),
            meta_data: Joi.alternatives().try(Joi.object(), Joi.array()).allow(null)
          })
        ).min(1).required()
      })
    ).min(1).required()
  }),

  marksRegisterDelete: Joi.object({
    class_id: id.required(),
    exam_paper_ids: Joi.array().items(id.required()).min(1).required(),
    student_ids: Joi.array().items(id.required()).min(1).optional()
  }),

  marksRegisterListQuery: Joi.object({
    class_id: id.required(),
    exam_event_id: id.optional(),
    exam_paper_id: id.optional()
  }),

  attendanceCreate: Joi.object({
    exam_paper_id: id.required(),
    student_id: id.required(),
    status: Joi.string().valid('present', 'absent', 'late').required(),
    remarks: Joi.string().allow('', null),
    malpractice_flag: Joi.boolean().optional(),
    is_locked: Joi.boolean().optional()
  }),

  attendanceBulkAdmin: Joi.object({
    exam_paper_id: id.required(),
    records: Joi.array().items(
      Joi.object({
        student_id: id.required(),
        status: Joi.string().valid('present', 'absent', 'late').required(),
        remarks: Joi.string().allow('', null),
        malpractice_flag: Joi.boolean().optional()
      })
    ).min(1).required()
  }),

  attendanceUpdate: Joi.object({
    status: Joi.string().valid('present', 'absent', 'late'),
    remarks: Joi.string().allow('', null),
    malpractice_flag: Joi.boolean(),
    is_locked: Joi.boolean()
  }).min(1),

  attendanceListQuery: Joi.object({
    exam_event_id: id.optional(),
    exam_paper_id: id.optional(),
    class_id: id.optional(),
    subject_id: id.optional(),
    student_id: id.optional(),
    status: Joi.string().valid('present', 'absent', 'late').optional()
  }),

  attendanceBulk: Joi.object({
    records: Joi.array().items(
      Joi.object({
        student_id: Joi.number().integer().positive().required(),
        status: Joi.string().valid('present', 'absent', 'late').required(),
        remarks: Joi.string().allow('', null),
        malpractice_flag: Joi.boolean().optional()
      })
    ).min(1).required()
  }),

  resultRecompute: Joi.object({
    exam_event_id: id.required()
  }),

  resultPublish: Joi.object({
    exam_event_id: id.required(),
    version_bump: Joi.boolean().optional()
  }),

  documentTemplateCreate: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    document_type: Joi.string().valid('admit_card', 'report_card', 'marksheet', 'tc', 'timetable_pdf').required(),
    template_config: Joi.alternatives().try(Joi.object(), Joi.array()).required(),
    is_active: Joi.boolean().optional()
  }),

  documentTemplateUpdate: Joi.object({
    name: Joi.string().min(2).max(100),
    template_config: Joi.alternatives().try(Joi.object(), Joi.array()),
    is_active: Joi.boolean()
  }).min(1),

  generateDocument: Joi.object({
    student_id: Joi.number().integer().positive().required(),
    document_type: Joi.string().valid('admit_card', 'report_card', 'marksheet', 'tc', 'timetable_pdf').required(),
    reference_id: id.required(),
    file_url: Joi.string().uri().required(),
    status: Joi.string().valid('draft', 'final').optional(),
    meta_data: Joi.alternatives().try(Joi.object(), Joi.array()).allow(null)
  }),

  admitCardDataQuery: Joi.object({
    student_id: id.required(),
    exam_event_id: id.optional()
  }),

  listByEventQuery: Joi.object({
    exam_event_id: id.optional(),
    status: Joi.string().optional(),
    class_id: Joi.number().integer().positive().optional(),
    subject_id: Joi.number().integer().positive().optional(),
    document_type: Joi.string().optional(),
    reference_id: id.optional()
  })
};

module.exports = {
  validate,
  schemas
};
