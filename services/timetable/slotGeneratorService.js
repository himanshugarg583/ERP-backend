const allowedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toMinutes = (time) => {
  const [hh, mm] = String(time).split(':').map(Number);
  return (hh * 60) + mm;
};

const toTimeString = (totalMinutes) => {
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  return `${hh}:${mm}:00`;
};

const normalizeWorkingDays = (days) => {
  if (!Array.isArray(days) || days.length === 0) return [...allowedDays];
  return days.filter((d) => allowedDays.includes(d));
};

const validateTimingRules = ({ start_time, end_time, period_duration_minutes, break_duration_minutes, break_after_period }) => {
  const start = toMinutes(start_time);
  const end = toMinutes(end_time);

  if (end <= start) {
    const err = new Error('end_time must be greater than start_time');
    err.statusCode = 422;
    throw err;
  }

  if (!Number.isInteger(Number(period_duration_minutes)) || Number(period_duration_minutes) <= 0) {
    const err = new Error('period_duration_minutes must be a positive integer');
    err.statusCode = 422;
    throw err;
  }

  if (break_duration_minutes !== undefined && break_duration_minutes !== null) {
    if (!Number.isInteger(Number(break_duration_minutes)) || Number(break_duration_minutes) < 0) {
      const err = new Error('break_duration_minutes must be zero or a positive integer');
      err.statusCode = 422;
      throw err;
    }
  }

  if (break_after_period !== undefined && break_after_period !== null) {
    if (!Number.isInteger(Number(break_after_period)) || Number(break_after_period) <= 0) {
      const err = new Error('break_after_period must be a positive integer when provided');
      err.statusCode = 422;
      throw err;
    }
  }
};

const generateSlotsFromSetting = ({ start_time, end_time, period_duration_minutes, break_duration_minutes = 0, break_after_period = null }) => {
  validateTimingRules({ start_time, end_time, period_duration_minutes, break_duration_minutes, break_after_period });

  const start = toMinutes(start_time);
  const end = toMinutes(end_time);

  const periodDuration = Number(period_duration_minutes);
  const breakDuration = Number(break_duration_minutes || 0);
  const breakAfter = break_after_period ? Number(break_after_period) : null;

  const slots = [];
  let pointer = start;
  let periodCount = 0;
  let slotNumber = 1;

  while (pointer + periodDuration <= end) {
    const periodStart = pointer;
    const periodEnd = pointer + periodDuration;

    slots.push({
      slot_number: slotNumber,
      slot_label: `Period ${periodCount + 1}`,
      start_time: toTimeString(periodStart),
      end_time: toTimeString(periodEnd),
      is_break: false
    });

    slotNumber += 1;
    periodCount += 1;
    pointer = periodEnd;

    if (breakAfter && breakDuration > 0 && periodCount % breakAfter === 0 && pointer + breakDuration <= end) {
      const breakStart = pointer;
      const breakEnd = pointer + breakDuration;

      slots.push({
        slot_number: slotNumber,
        slot_label: 'Break',
        start_time: toTimeString(breakStart),
        end_time: toTimeString(breakEnd),
        is_break: true
      });

      slotNumber += 1;
      pointer = breakEnd;
    }
  }

  if (slots.filter((s) => !s.is_break).length === 0) {
    const err = new Error('No valid teaching period can be generated in the given time range');
    err.statusCode = 422;
    throw err;
  }

  return slots;
};

module.exports = {
  allowedDays,
  normalizeWorkingDays,
  validateTimingRules,
  generateSlotsFromSetting
};
