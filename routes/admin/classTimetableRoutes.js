const express = require('express');
const router = express.Router();
const { authMiddleware, isAdmin } = require('../../middlewares/authMiddleware');
const { Joi, validateBody } = require('../../middlewares/timetable/timetableSecurityMiddleware');
const { 
  upsertClassTimingConfiguration,
  bulkScheduleSchoolTimingForClasses,
  listScheduledSchoolTimingForTable,
  editSchoolTimingForClass,
  getClassTimingConfiguration,
  generateSlotsForClass,
  listSlotsByClass,
  updateSlotById,
  assignSingleTimetableEntry,
  upsertDayTimetableEntries,
  updateTimetableEntry,
  deleteTimetableEntry,
  getClassTimetable,
  getTimetableByTeacher,
  checkTeacherClash
} = require('../../controllers/admin/classTimeTable/ClassTimetableController');

const dayEnum = Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');

const classTimingSchema = Joi.object({
  start_time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  end_time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  period_duration_minutes: Joi.number().integer().positive().required(),
  break_duration_minutes: Joi.number().integer().min(0).optional(),
  break_after_period: Joi.number().integer().positive().allow(null).optional(),
  working_days: Joi.array().items(dayEnum).min(1).optional()
});

const bulkSchoolTimingSchema = Joi.object({
  class_section_ids: Joi.array().items(Joi.number().integer().positive()).min(1).unique().required(),
  start_time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  end_time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  total_number_of_periods: Joi.number().integer().positive().required(),
  is_break: Joi.boolean().required(),
  break_duration_minutes: Joi.when('is_break', {
    is: true,
    then: Joi.number().integer().positive().required(),
    otherwise: Joi.number().integer().min(0).optional()
  }),
  break_after_period: Joi.when('is_break', {
    is: true,
    then: Joi.number().integer().positive().required(),
    otherwise: Joi.number().integer().positive().allow(null).optional()
  }),
  working_days: Joi.array().items(dayEnum).min(1).optional(),
  force_regenerate: Joi.boolean().optional()
});

const editSchoolTimingSchema = Joi.object({
  start_time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  end_time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  total_number_of_periods: Joi.number().integer().positive().required(),
  is_break: Joi.boolean().required(),
  break_duration_minutes: Joi.when('is_break', {
    is: true,
    then: Joi.number().integer().positive().required(),
    otherwise: Joi.number().integer().min(0).optional()
  }),
  break_after_period: Joi.when('is_break', {
    is: true,
    then: Joi.number().integer().positive().required(),
    otherwise: Joi.number().integer().positive().allow(null).optional()
  }),
  working_days: Joi.array().items(dayEnum).min(1).optional(),
  force_regenerate: Joi.boolean().optional()
});

const assignEntrySchema = Joi.object({
  class_section_id: Joi.number().integer().positive().required(),
  day_of_week: dayEnum.required(),
  time_slot_id: Joi.number().integer().positive().required(),
  subject_id: Joi.number().integer().positive().required(),
  teacher_id: Joi.number().integer().positive().required(),
  notes: Joi.string().max(255).allow(null, '').optional()
});

const dayUpsertSchema = Joi.object({
  class_section_id: Joi.number().integer().positive().required(),
  day_of_week: dayEnum.required(),
  entries: Joi.array().items(
    Joi.object({
      time_slot_id: Joi.number().integer().positive().required(),
      subject_id: Joi.number().integer().positive().required(),
      teacher_id: Joi.number().integer().positive().required(),
      notes: Joi.string().max(255).allow(null, '').optional()
    })
  ).required()
});

const conflictCheckSchema = Joi.object({
  class_section_id: Joi.number().integer().positive().required(),
  day_of_week: dayEnum.required(),
  time_slot_id: Joi.number().integer().positive().required(),
  teacher_id: Joi.number().integer().positive().required(),
  entry_id: Joi.number().integer().positive().optional()
});

router.put('/classes/:class_id/configuration', authMiddleware, isAdmin, validateBody(classTimingSchema), upsertClassTimingConfiguration);
router.post('/classes/schedule/bulk', authMiddleware, isAdmin, validateBody(bulkSchoolTimingSchema), bulkScheduleSchoolTimingForClasses);
router.get('/classes/schedule/table-data', authMiddleware, isAdmin, listScheduledSchoolTimingForTable);
router.put('/classes/schedule/:class_id', authMiddleware, isAdmin, validateBody(editSchoolTimingSchema), editSchoolTimingForClass);
router.get('/classes/configuration/:class_id', authMiddleware, isAdmin, getClassTimingConfiguration);

router.post('/classes/:class_id/slots/generate', authMiddleware, isAdmin, validateBody(Joi.object({
  force_regenerate: Joi.boolean().optional()
})), generateSlotsForClass);
router.get('/classes/:class_id/slots', authMiddleware, isAdmin, listSlotsByClass);
router.put('/classes/:class_id/slots/:slot_id', authMiddleware, isAdmin, validateBody(Joi.object({
  slot_number: Joi.number().integer().positive().optional(),
  slot_label: Joi.string().max(50).optional(),
  start_time: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  end_time: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  is_break: Joi.boolean().optional()
})), updateSlotById);

router.post('/entries', authMiddleware, isAdmin, validateBody(assignEntrySchema), assignSingleTimetableEntry);
router.post('/entries/day-upsert', authMiddleware, isAdmin, validateBody(dayUpsertSchema), upsertDayTimetableEntries);
router.put('/entries/:id', authMiddleware, isAdmin, validateBody(assignEntrySchema), updateTimetableEntry);
router.delete('/entries/:id', authMiddleware, isAdmin, deleteTimetableEntry);

router.post('/conflicts/check', authMiddleware, isAdmin, validateBody(conflictCheckSchema), checkTeacherClash);

router.get('/classes/timetable/:class_id', authMiddleware, isAdmin, getClassTimetable);
router.get('/teachers/timetable/:teacher_id', authMiddleware, isAdmin, getTimetableByTeacher);

module.exports = router;
