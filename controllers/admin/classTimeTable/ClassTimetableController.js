const { Op } = require('sequelize');
const sequelize = require('../../../config/db');
const {
  ClassSection,
  Subject,
  Teacher,
  User,
  ClassTimetable,
  ClassTimetableSetting,
  ClassTimeSlot
} = require('../../../models');
const {
  normalizeWorkingDays,
  validateTimingRules,
  generateSlotsFromSetting
} = require('../../../services/timetable/slotGeneratorService');

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const normalizeStoredWorkingDays = (rawWorkingDays) => {
  if (Array.isArray(rawWorkingDays)) {
    return normalizeWorkingDays(rawWorkingDays);
  }

  if (typeof rawWorkingDays === 'string' && rawWorkingDays.trim().length > 0) {
    try {
      const parsed = JSON.parse(rawWorkingDays);
      if (Array.isArray(parsed)) return normalizeWorkingDays(parsed);
    } catch (error) {
      // Fallback handles non-JSON strings like "Monday,Tuesday".
    }

    const normalized = rawWorkingDays
      .split(',')
      .map((value) => value.replace(/[\[\]"']/g, '').trim())
      .filter(Boolean);

    if (normalized.length > 0) {
      return normalizeWorkingDays(normalized);
    }
  }

  return [...dayOrder];
};

const sortByDayThenSlot = (rows) => rows.sort((a, b) => {
  const dayCompare = dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week);
  if (dayCompare !== 0) return dayCompare;
  return Number(a.timeSlot?.slot_number || 0) - Number(b.timeSlot?.slot_number || 0);
});

const timeToMinutes = (timeString) => {
  const [hh, mm] = String(timeString).split(':').map(Number);
  return (hh * 60) + mm;
};

const rangesOverlap = (startA, endA, startB, endB) => {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && aEnd > bStart;
};

const ensureClassExists = async (classId) => {
  const classSection = await ClassSection.findByPk(classId);
  if (!classSection) {
    const err = new Error('Class section not found');
    err.statusCode = 404;
    throw err;
  }
  return classSection;
};

const ensureSubjectExists = async (subjectId, classId, transaction) => {
  const subject = await Subject.findOne({ where: { id: subjectId, class_section_id: classId }, transaction });
  if (!subject) {
    const err = new Error(`Subject ${subjectId} is not mapped to class ${classId}`);
    err.statusCode = 422;
    throw err;
  }
  return subject;
};

const ensureTeacherExists = async (teacherId, transaction) => {
  const teacher = await Teacher.findByPk(teacherId, { transaction });
  if (!teacher) {
    const err = new Error(`Teacher ${teacherId} not found`);
    err.statusCode = 422;
    throw err;
  }
  return teacher;
};

const ensureSlotExists = async (slotId, classId, transaction) => {
  const slot = await ClassTimeSlot.findOne({ where: { id: slotId, class_section_id: classId }, transaction });
  if (!slot) {
    const err = new Error(`Time slot ${slotId} is not valid for class ${classId}`);
    err.statusCode = 422;
    throw err;
  }
  return slot;
};

const buildTimingConfigFromTotalPeriods = (payload) => {
  const start = timeToMinutes(payload.start_time);
  const end = timeToMinutes(payload.end_time);

  if (end <= start) {
    const err = new Error('end_time must be greater than start_time');
    err.statusCode = 422;
    throw err;
  }

  const totalPeriods = Number(payload.total_number_of_periods);
  if (!Number.isInteger(totalPeriods) || totalPeriods <= 0) {
    const err = new Error('total_number_of_periods must be a positive integer');
    err.statusCode = 422;
    throw err;
  }

  const hasBreak = Boolean(payload.is_break);
  let breakDuration = 0;
  let breakAfterPeriod = null;

  if (hasBreak) {
    breakDuration = Number(payload.break_duration_minutes);
    breakAfterPeriod = Number(payload.break_after_period);

    if (!Number.isInteger(breakDuration) || breakDuration <= 0) {
      const err = new Error('break_duration_minutes must be a positive integer when is_break is true');
      err.statusCode = 422;
      throw err;
    }

    if (!Number.isInteger(breakAfterPeriod) || breakAfterPeriod <= 0) {
      const err = new Error('break_after_period must be a positive integer when is_break is true');
      err.statusCode = 422;
      throw err;
    }

    if (breakAfterPeriod >= totalPeriods) {
      const err = new Error('break_after_period must be less than total_number_of_periods');
      err.statusCode = 422;
      throw err;
    }
  }

  const totalSchoolMinutes = end - start;
  const breakInsertions = hasBreak ? Math.floor((totalPeriods - 1) / breakAfterPeriod) : 0;
  const totalBreakMinutes = breakInsertions * breakDuration;
  const teachingMinutes = totalSchoolMinutes - totalBreakMinutes;

  if (teachingMinutes <= 0) {
    const err = new Error('Total school time is too small for requested periods and break configuration');
    err.statusCode = 422;
    throw err;
  }

  if (teachingMinutes % totalPeriods !== 0) {
    const err = new Error('School timing cannot be evenly divided into requested total_number_of_periods with the given break setup');
    err.statusCode = 422;
    throw err;
  }

  const periodDuration = teachingMinutes / totalPeriods;

  return {
    start_time: payload.start_time,
    end_time: payload.end_time,
    period_duration_minutes: periodDuration,
    break_duration_minutes: hasBreak ? breakDuration : 0,
    break_after_period: hasBreak ? breakAfterPeriod : null,
    working_days: normalizeWorkingDays(payload.working_days)
  };
};

const findTeacherConflict = async ({ teacherId, dayOfWeek, slot, excludeEntryId = null, transaction }) => {
  const where = {
    teacher_id: teacherId,
    day_of_week: dayOfWeek
  };

  if (excludeEntryId) where.id = { [Op.ne]: excludeEntryId };

  const assignedRows = await ClassTimetable.findAll({
    where,
    include: [{ model: ClassTimeSlot, as: 'timeSlot' }],
    transaction
  });

  const clash = assignedRows.find((row) => {
    if (!row.timeSlot) return false;
    return rangesOverlap(
      row.timeSlot.start_time,
      row.timeSlot.end_time,
      slot.start_time,
      slot.end_time
    );
  });

  return clash || null;
};

const upsertClassTimingConfiguration = async (req, res) => {
  try {
    const classId = Number(req.params.class_id);
    await ensureClassExists(classId);

    const payload = {
      class_section_id: classId,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      period_duration_minutes: Number(req.body.period_duration_minutes),
      break_duration_minutes: req.body.break_duration_minutes !== undefined ? Number(req.body.break_duration_minutes) : 0,
      break_after_period: req.body.break_after_period ?? null,
      working_days: normalizeWorkingDays(req.body.working_days)
    };

    validateTimingRules(payload);

    const [row, created] = await ClassTimetableSetting.findOrCreate({
      where: { class_section_id: classId },
      defaults: payload
    });

    if (!created) {
      await row.update(payload);
    }

    return res.status(created ? 201 : 200).json({
      success: true,
      statusCode: created ? 201 : 200,
      message: created ? 'Class timing configuration created' : 'Class timing configuration updated',
      data: row
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    });
  }
};

const bulkScheduleSchoolTimingForClasses = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const classIds = [...new Set((req.body.class_section_ids || []).map((id) => Number(id)))];
    const forceRegenerate = Boolean(req.body.force_regenerate);

    if (classIds.length === 0) {
      await transaction.rollback();
      return res.status(422).json({
        success: false,
        statusCode: 422,
        message: 'class_section_ids must contain at least one class id'
      });
    }

    const classRows = await ClassSection.findAll({
      where: { id: { [Op.in]: classIds } },
      attributes: ['id'],
      transaction
    });

    const foundClassIds = new Set(classRows.map((row) => Number(row.id)));
    const missingClassIds = classIds.filter((id) => !foundClassIds.has(id));

    if (missingClassIds.length > 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Class section not found for ids: ${missingClassIds.join(', ')}`
      });
    }

    const baseConfig = buildTimingConfigFromTotalPeriods(req.body);
    validateTimingRules(baseConfig);

    const summary = [];

    for (const classId of classIds) {
      const settingPayload = {
        ...baseConfig,
        class_section_id: classId
      };

      const [setting, created] = await ClassTimetableSetting.findOrCreate({
        where: { class_section_id: classId },
        defaults: settingPayload,
        transaction
      });

      if (!created) {
        await setting.update(settingPayload, { transaction });
      }

      const existingSlotCount = await ClassTimeSlot.count({
        where: { class_section_id: classId },
        transaction
      });

      if (existingSlotCount > 0 && !forceRegenerate) {
        const err = new Error(`Time slots already exist for class ${classId}. Set force_regenerate=true to replace them.`);
        err.statusCode = 409;
        throw err;
      }

      if (forceRegenerate) {
        await ClassTimetable.destroy({ where: { class_section_id: classId }, transaction });
        await ClassTimeSlot.destroy({ where: { class_section_id: classId }, transaction });
      }

      const generatedSlots = generateSlotsFromSetting(settingPayload);

      const createdSlots = await ClassTimeSlot.bulkCreate(
        generatedSlots.map((slot) => ({
          class_section_id: classId,
          slot_number: slot.slot_number,
          slot_label: slot.slot_label,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_break: slot.is_break
        })),
        { transaction }
      );

      summary.push({
        class_section_id: classId,
        configuration: {
          start_time: settingPayload.start_time,
          end_time: settingPayload.end_time,
          period_duration_minutes: settingPayload.period_duration_minutes,
          break_duration_minutes: settingPayload.break_duration_minutes,
          break_after_period: settingPayload.break_after_period,
          working_days: settingPayload.working_days
        },
        generated_slots_count: createdSlots.length
      });
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'School timing scheduled successfully for selected classes',
      data: {
        total_classes: summary.length,
        classes: summary
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(error.statusCode || 500).json({
      success: false,
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    });
  }
};

const listScheduledSchoolTimingForTable = async (req, res) => {
  try {
    const rows = await ClassTimetableSetting.findAll({
      include: [{
        model: ClassSection,
        as: 'classSection',
        attributes: ['id', 'class_name', 'section_name']
      }],
      order: [
        [{ model: ClassSection, as: 'classSection' }, 'class_name', 'ASC'],
        [{ model: ClassSection, as: 'classSection' }, 'section_name', 'ASC']
      ]
    });

    const classIds = rows.map((row) => Number(row.class_section_id));
    const slotRows = classIds.length > 0
      ? await ClassTimeSlot.findAll({
        where: { class_section_id: { [Op.in]: classIds } },
        attributes: ['class_section_id', 'is_break']
      })
      : [];

    const slotStats = new Map();
    for (const slot of slotRows) {
      const classId = Number(slot.class_section_id);
      if (!slotStats.has(classId)) {
        slotStats.set(classId, { total_slots: 0, teaching_slots: 0, break_slots: 0 });
      }

      const current = slotStats.get(classId);
      current.total_slots += 1;
      if (slot.is_break) current.break_slots += 1;
      else current.teaching_slots += 1;
    }

    const data = rows.map((row) => {
      const classId = Number(row.class_section_id);
      const stats = slotStats.get(classId) || { total_slots: 0, teaching_slots: 0, break_slots: 0 };

      let teachingPeriodCount = stats.teaching_slots;
      if (teachingPeriodCount === 0) {
        try {
          const simulatedSlots = generateSlotsFromSetting(row);
          teachingPeriodCount = simulatedSlots.filter((slot) => !slot.is_break).length;
        } catch (error) {
          teachingPeriodCount = null;
        }
      }

      return {
        class_section_id: classId,
        class_name: row.classSection?.class_name || null,
        section_name: row.classSection?.section_name || null,
        school_start_time: row.start_time,
        school_end_time: row.end_time,
        total_number_of_periods: teachingPeriodCount,
        is_break: Number(row.break_duration_minutes || 0) > 0 && Number(row.break_after_period || 0) > 0,
        break_duration_minutes: Number(row.break_duration_minutes || 0),
        break_after_period: row.break_after_period,
        period_duration_minutes: Number(row.period_duration_minutes),
        working_days: row.working_days,
        total_slots: stats.total_slots,
        updated_at: row.updated_at
      };
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Scheduled school timing list fetched successfully',
      data: {
        total_rows: data.length,
        rows: data
      }
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    });
  }
};

const editSchoolTimingForClass = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const classId = Number(req.params.class_id);
    await ensureClassExists(classId);

    const forceRegenerate = req.body.force_regenerate !== undefined ? Boolean(req.body.force_regenerate) : true;
    const configPayload = {
      ...buildTimingConfigFromTotalPeriods(req.body),
      class_section_id: classId
    };

    validateTimingRules(configPayload);

    const [setting, created] = await ClassTimetableSetting.findOrCreate({
      where: { class_section_id: classId },
      defaults: configPayload,
      transaction
    });

    if (!created) {
      await setting.update(configPayload, { transaction });
    }

    const existingSlotCount = await ClassTimeSlot.count({ where: { class_section_id: classId }, transaction });
    if (existingSlotCount > 0 && !forceRegenerate) {
      const err = new Error('Time slots already exist for this class. Set force_regenerate=true to replace them.');
      err.statusCode = 409;
      throw err;
    }

    if (forceRegenerate) {
      await ClassTimetable.destroy({ where: { class_section_id: classId }, transaction });
      await ClassTimeSlot.destroy({ where: { class_section_id: classId }, transaction });
    }

    const generatedSlots = generateSlotsFromSetting(configPayload);
    const createdSlots = await ClassTimeSlot.bulkCreate(
      generatedSlots.map((slot) => ({
        class_section_id: classId,
        slot_number: slot.slot_number,
        slot_label: slot.slot_label,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_break: slot.is_break
      })),
      { transaction }
    );

    await transaction.commit();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'School timing updated successfully',
      data: {
        class_section_id: classId,
        configuration: {
          start_time: configPayload.start_time,
          end_time: configPayload.end_time,
          total_number_of_periods: generatedSlots.filter((slot) => !slot.is_break).length,
          is_break: configPayload.break_duration_minutes > 0 && configPayload.break_after_period !== null,
          break_duration_minutes: configPayload.break_duration_minutes,
          break_after_period: configPayload.break_after_period,
          period_duration_minutes: configPayload.period_duration_minutes,
          working_days: configPayload.working_days
        },
        generated_slots_count: createdSlots.length
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(error.statusCode || 500).json({
      success: false,
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    });
  }
};

const getClassTimingConfiguration = async (req, res) => {
  try {
    const classId = Number(req.params.class_id);
    await ensureClassExists(classId);

    const row = await ClassTimetableSetting.findOne({ where: { class_section_id: classId } });
    if (!row) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Class timing configuration not found'
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Class timing configuration fetched successfully',
      data: row
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    });
  }
};

const generateSlotsForClass = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const classId = Number(req.params.class_id);
    await ensureClassExists(classId);

    const config = await ClassTimetableSetting.findOne({ where: { class_section_id: classId }, transaction });
    if (!config) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Class timing configuration not found. Please configure timing first.'
      });
    }

    const forceRegenerate = Boolean(req.body.force_regenerate);
    const existingCount = await ClassTimeSlot.count({ where: { class_section_id: classId }, transaction });

    if (existingCount > 0 && !forceRegenerate) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: 'Slots already exist. Set force_regenerate=true to replace existing slots.'
      });
    }

    if (forceRegenerate) {
      await ClassTimetable.destroy({ where: { class_section_id: classId }, transaction });
      await ClassTimeSlot.destroy({ where: { class_section_id: classId }, transaction });
    }

    const generated = generateSlotsFromSetting(config);

    const createdSlots = await ClassTimeSlot.bulkCreate(
      generated.map((slot) => ({
        class_section_id: classId,
        slot_number: slot.slot_number,
        slot_label: slot.slot_label,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_break: slot.is_break
      })),
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Time slots generated successfully',
      data: {
        class_section_id: classId,
        generated_count: createdSlots.length,
        slots: createdSlots
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(error.statusCode || 500).json({
      success: false,
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    });
  }
};

const listSlotsByClass = async (req, res) => {
  try {
    const classId = Number(req.params.class_id);
    await ensureClassExists(classId);

    const slots = await ClassTimeSlot.findAll({
      where: { class_section_id: classId },
      order: [['slot_number', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Time slots fetched successfully',
      data: {
        class_section_id: classId,
        total_slots: slots.length,
        slots
      }
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    });
  }
};

const updateSlotById = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const classId = Number(req.params.class_id);
    const slotId = Number(req.params.slot_id);

    await ensureClassExists(classId);

    const slot = await ensureSlotExists(slotId, classId, transaction);

    const nextPayload = {
      slot_number: req.body.slot_number ?? slot.slot_number,
      slot_label: req.body.slot_label ?? slot.slot_label,
      start_time: req.body.start_time ?? slot.start_time,
      end_time: req.body.end_time ?? slot.end_time,
      is_break: req.body.is_break ?? slot.is_break
    };

    if (timeToMinutes(nextPayload.end_time) <= timeToMinutes(nextPayload.start_time)) {
      await transaction.rollback();
      return res.status(422).json({
        success: false,
        statusCode: 422,
        message: 'end_time must be greater than start_time'
      });
    }

    const peerSlots = await ClassTimeSlot.findAll({
      where: {
        class_section_id: classId,
        id: { [Op.ne]: slotId }
      },
      transaction
    });

    const overlap = peerSlots.find((s) => rangesOverlap(s.start_time, s.end_time, nextPayload.start_time, nextPayload.end_time));
    if (overlap) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: 'Updated slot overlaps with another slot for this class'
      });
    }

    if (nextPayload.is_break === true) {
      const assignedCount = await ClassTimetable.count({ where: { time_slot_id: slotId }, transaction });
      if (assignedCount > 0) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          statusCode: 409,
          message: 'Cannot convert to break slot because timetable entries exist for this slot'
        });
      }
    }

    await slot.update(nextPayload, { transaction });
    await transaction.commit();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Slot updated successfully',
      data: slot
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(error.statusCode || 500).json({
      success: false,
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    });
  }
};

const assignSingleTimetableEntry = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const classId = Number(req.body.class_section_id);
    await ensureClassExists(classId);

    const slot = await ensureSlotExists(Number(req.body.time_slot_id), classId, transaction);
    if (slot.is_break) {
      await transaction.rollback();
      return res.status(422).json({
        success: false,
        statusCode: 422,
        message: 'Cannot assign subject/teacher to a break slot'
      });
    }

    await ensureSubjectExists(Number(req.body.subject_id), classId, transaction);
    await ensureTeacherExists(Number(req.body.teacher_id), transaction);

    const classDuplicate = await ClassTimetable.findOne({
      where: {
        class_section_id: classId,
        day_of_week: req.body.day_of_week,
        time_slot_id: Number(req.body.time_slot_id)
      },
      transaction
    });

    if (classDuplicate) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: 'This class/day/slot already has an assignment'
      });
    }

    const teacherClash = await findTeacherConflict({
      teacherId: Number(req.body.teacher_id),
      dayOfWeek: req.body.day_of_week,
      slot,
      transaction
    });

    if (teacherClash) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: 'Teacher is already assigned in an overlapping slot'
      });
    }

    const created = await ClassTimetable.create({
      class_section_id: classId,
      day_of_week: req.body.day_of_week,
      time_slot_id: Number(req.body.time_slot_id),
      subject_id: Number(req.body.subject_id),
      teacher_id: Number(req.body.teacher_id),
      is_break: false,
      notes: req.body.notes || null
    }, { transaction });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Timetable entry assigned successfully',
      data: created
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(error.statusCode || 500).json({
      success: false,
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    });
  }
};

const upsertDayTimetableEntries = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const classId = Number(req.body.class_section_id);
    const day = req.body.day_of_week;
    const entries = req.body.entries || [];

    await ensureClassExists(classId);

    const seenSlots = new Set();

    for (const entry of entries) {
      const slotId = Number(entry.time_slot_id);
      if (seenSlots.has(slotId)) {
        await transaction.rollback();
        return res.status(422).json({
          success: false,
          statusCode: 422,
          message: `Duplicate slot ${slotId} in request payload`
        });
      }
      seenSlots.add(slotId);

      const slot = await ensureSlotExists(slotId, classId, transaction);
      if (slot.is_break) {
        await transaction.rollback();
        return res.status(422).json({
          success: false,
          statusCode: 422,
          message: `Slot ${slotId} is a break slot and cannot be assigned`
        });
      }

      await ensureSubjectExists(Number(entry.subject_id), classId, transaction);
      await ensureTeacherExists(Number(entry.teacher_id), transaction);

      const teacherClash = await findTeacherConflict({
        teacherId: Number(entry.teacher_id),
        dayOfWeek: day,
        slot,
        transaction
      });

      if (teacherClash) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          statusCode: 409,
          message: `Teacher ${entry.teacher_id} has an overlapping assignment on ${day}`
        });
      }
    }

    await ClassTimetable.destroy({ where: { class_section_id: classId, day_of_week: day }, transaction });

    const created = await ClassTimetable.bulkCreate(
      entries.map((entry) => ({
        class_section_id: classId,
        day_of_week: day,
        time_slot_id: Number(entry.time_slot_id),
        subject_id: Number(entry.subject_id),
        teacher_id: Number(entry.teacher_id),
        is_break: false,
        notes: entry.notes || null
      })),
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Day timetable saved successfully',
      data: {
        class_section_id: classId,
        day_of_week: day,
        total_entries: created.length
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(error.statusCode || 500).json({
      success: false,
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    });
  }
};

const updateTimetableEntry = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const id = Number(req.params.id);
    const entry = await ClassTimetable.findByPk(id, { transaction });

    if (!entry) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Timetable entry not found'
      });
    }

    const classId = Number(req.body.class_section_id ?? entry.class_section_id);
    const day = req.body.day_of_week ?? entry.day_of_week;
    const slotId = Number(req.body.time_slot_id ?? entry.time_slot_id);
    const subjectId = Number(req.body.subject_id ?? entry.subject_id);
    const teacherId = Number(req.body.teacher_id ?? entry.teacher_id);

    await ensureClassExists(classId);
    const slot = await ensureSlotExists(slotId, classId, transaction);

    if (slot.is_break) {
      await transaction.rollback();
      return res.status(422).json({
        success: false,
        statusCode: 422,
        message: 'Cannot assign subject/teacher to a break slot'
      });
    }

    await ensureSubjectExists(subjectId, classId, transaction);
    await ensureTeacherExists(teacherId, transaction);

    const classDuplicate = await ClassTimetable.findOne({
      where: {
        id: { [Op.ne]: id },
        class_section_id: classId,
        day_of_week: day,
        time_slot_id: slotId
      },
      transaction
    });

    if (classDuplicate) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: 'This class/day/slot already has an assignment'
      });
    }

    const teacherClash = await findTeacherConflict({
      teacherId,
      dayOfWeek: day,
      slot,
      excludeEntryId: id,
      transaction
    });

    if (teacherClash) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: 'Teacher is already assigned in an overlapping slot'
      });
    }

    await entry.update({
      class_section_id: classId,
      day_of_week: day,
      time_slot_id: slotId,
      subject_id: subjectId,
      teacher_id: teacherId,
      is_break: false,
      notes: req.body.notes ?? entry.notes
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Timetable entry updated successfully',
      data: entry
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(error.statusCode || 500).json({
      success: false,
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    });
  }
};

const deleteTimetableEntry = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const entry = await ClassTimetable.findByPk(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Timetable entry not found'
      });
    }

    await entry.destroy();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Timetable entry deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || 'Internal Server Error'
    });
  }
};

const getClassTimetable = async (req, res) => {
  try {
    const classId = Number(req.params.class_id);
    const classSection = await ensureClassExists(classId);

    const config = await ClassTimetableSetting.findOne({ where: { class_section_id: classId } });
    const slots = await ClassTimeSlot.findAll({
      where: { class_section_id: classId },
      order: [['slot_number', 'ASC']]
    });

    const entries = await ClassTimetable.findAll({
      where: { class_section_id: classId },
      include: [
        { model: ClassTimeSlot, as: 'timeSlot' },
        { model: Subject, as: 'subject', attributes: ['id', 'subject_name', 'subject_code'] },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id'],
          include: [{ model: User, attributes: ['id', 'name'] }]
        }
      ]
    });

    const byDayAndSlot = new Map();
    for (const entry of entries) {
      byDayAndSlot.set(`${entry.day_of_week}:${entry.time_slot_id}`, entry);
    }

    const workingDays = normalizeStoredWorkingDays(config?.working_days);
    const timetable = {};

    for (const day of dayOrder) {
      if (!workingDays.includes(day)) {
        timetable[day] = null;
        continue;
      }

      timetable[day] = slots.map((slot) => {
        const found = byDayAndSlot.get(`${day}:${slot.id}`);
        return {
          slot_id: slot.id,
          slot_number: slot.slot_number,
          slot_label: slot.slot_label,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_break: slot.is_break,
          timetable_entry_id: found?.id || null,
          subject: found?.subject ? {
            id: found.subject.id,
            subject_name: found.subject.subject_name,
            subject_code: found.subject.subject_code
          } : null,
          teacher: found?.teacher ? {
            id: found.teacher.id,
            name: found.teacher.User?.name || 'N/A'
          } : null,
          notes: found?.notes || null
        };
      });
    }

    const configData = config
      ? { ...config.toJSON(), working_days: workingDays }
      : null;

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Class timetable fetched successfully',
      data: {
        class_info: {
          class_id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name
        },
        config: configData,
        timetable
      }
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    });
  }
};

const getTimetableByTeacher = async (req, res) => {
  try {
    const teacherId = Number(req.params.teacher_id);

    const teacher = await Teacher.findByPk(teacherId, {
      include: [{ model: User, attributes: ['name', 'email'] }]
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Teacher not found'
      });
    }

    const rows = await ClassTimetable.findAll({
      where: { teacher_id: teacherId },
      include: [
        { model: ClassTimeSlot, as: 'timeSlot' },
        { model: ClassSection, as: 'classSection', attributes: ['id', 'class_name', 'section_name'] },
        { model: Subject, as: 'subject', attributes: ['id', 'subject_name', 'subject_code'] }
      ]
    });

    sortByDayThenSlot(rows);

    const grouped = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: []
    };

    for (const row of rows) {
      grouped[row.day_of_week].push({
        id: row.id,
        class_info: row.classSection ? {
          id: row.classSection.id,
          class_name: row.classSection.class_name,
          section_name: row.classSection.section_name,
          display: `${row.classSection.class_name} ${row.classSection.section_name}`
        } : null,
        subject: row.subject ? {
          id: row.subject.id,
          subject_name: row.subject.subject_name,
          subject_code: row.subject.subject_code
        } : null,
        slot: row.timeSlot ? {
          id: row.timeSlot.id,
          slot_number: row.timeSlot.slot_number,
          slot_label: row.timeSlot.slot_label,
          start_time: row.timeSlot.start_time,
          end_time: row.timeSlot.end_time
        } : null,
        notes: row.notes
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Teacher timetable fetched successfully',
      data: {
        teacher_info: {
          id: teacher.id,
          name: teacher.User?.name,
          email: teacher.User?.email
        },
        timetable: grouped
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || 'Internal Server Error'
    });
  }
};

const checkTeacherClash = async (req, res) => {
  try {
    const classId = Number(req.body.class_section_id);
    const day = req.body.day_of_week;
    const teacherId = Number(req.body.teacher_id);
    const slotId = Number(req.body.time_slot_id);
    const excludeEntryId = req.body.entry_id ? Number(req.body.entry_id) : null;

    const slot = await ensureSlotExists(slotId, classId);

    if (slot.is_break) {
      return res.status(200).json({
        success: true,
        statusCode: 200,
        clash: false,
        valid: false,
        message: 'Break slots cannot be used for subject/teacher assignment'
      });
    }

    const classConflict = await ClassTimetable.findOne({
      where: {
        id: excludeEntryId ? { [Op.ne]: excludeEntryId } : { [Op.ne]: null },
        class_section_id: classId,
        day_of_week: day,
        time_slot_id: slotId
      }
    });

    const teacherConflict = await findTeacherConflict({
      teacherId,
      dayOfWeek: day,
      slot,
      excludeEntryId
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      clash: Boolean(classConflict || teacherConflict),
      class_conflict: Boolean(classConflict),
      teacher_conflict: Boolean(teacherConflict)
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error'
    });
  }
};

module.exports = {
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
};
