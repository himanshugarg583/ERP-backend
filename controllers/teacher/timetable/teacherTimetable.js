const { Teacher, ClassTimetable, ClassSection, Subject, User, ClassTimeSlot } = require('../../../models');

const baseDayMap = () => ({
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: []
});

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatTimeWithAMPM = (timeString) => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

const sortRows = (rows) => rows.sort((a, b) => {
  const dayCompare = dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week);
  if (dayCompare !== 0) return dayCompare;
  return Number(a.timeSlot?.slot_number || 0) - Number(b.timeSlot?.slot_number || 0);
});

const getTeacherTimetable = async (req, res) => {
  try {
    const userId = req.user.id;

    const teacher = await Teacher.findOne({
      where: { user_id: userId },
      include: [{ model: User, attributes: ['name', 'email'] }]
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Teacher not found with this user ID'
      });
    }

    const rows = await ClassTimetable.findAll({
      where: { teacher_id: teacher.id },
      include: [
        { model: ClassTimeSlot, as: 'timeSlot', attributes: ['id', 'slot_number', 'slot_label', 'start_time', 'end_time', 'is_break'] },
        { model: ClassSection, as: 'classSection', attributes: ['id', 'class_name', 'section_name'] },
        { model: Subject, as: 'subject', attributes: ['id', 'subject_name', 'subject_code'] }
      ]
    });

    sortRows(rows);

    const grouped = baseDayMap();
    for (const row of rows) {
      grouped[row.day_of_week].push({
        id: row.id,
        slot: row.timeSlot ? {
          ...row.timeSlot.toJSON(),
          start_time: formatTimeWithAMPM(row.timeSlot.start_time),
          end_time: formatTimeWithAMPM(row.timeSlot.end_time)
        } : null,
        class_info: row.classSection ? {
          id: row.classSection.id,
          class_name: row.classSection.class_name,
          section_name: row.classSection.section_name,
          display: `${row.classSection.class_name} ${row.classSection.section_name}`
        } : null,
        subject_info: row.subject ? {
          id: row.subject.id,
          subject_name: row.subject.subject_name,
          subject_code: row.subject.subject_code
        } : null,
        notes: row.notes || null
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Teacher timetable fetched successfully',
      data: {
        teacher_info: {
          teacher_id: teacher.id,
          name: teacher.User?.name,
          email: teacher.User?.email,
          qualification: teacher.qualification,
          role: teacher.role
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

const getClassTimetable = async (req, res) => {
  try {
    const classSectionId = Number(req.params.class_section_id);

    if (!classSectionId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Valid class section ID is required'
      });
    }

    const classSection = await ClassSection.findByPk(classSectionId);
    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Class section not found'
      });
    }

    const rows = await ClassTimetable.findAll({
      where: { class_section_id: classSectionId },
      include: [
        { model: ClassTimeSlot, as: 'timeSlot', attributes: ['id', 'slot_number', 'slot_label', 'start_time', 'end_time', 'is_break'] },
        { model: Subject, as: 'subject', attributes: ['id', 'subject_name', 'subject_code'] },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id'],
          include: [{ model: User, attributes: ['id', 'name'] }]
        }
      ]
    });

    sortRows(rows);

    const grouped = baseDayMap();
    for (const row of rows) {
      grouped[row.day_of_week].push({
        id: row.id,
        slot: row.timeSlot ? {
          ...row.timeSlot.toJSON(),
          start_time: formatTimeWithAMPM(row.timeSlot.start_time),
          end_time: formatTimeWithAMPM(row.timeSlot.end_time)
        } : null,
        subject: row.subject ? {
          id: row.subject.id,
          subject_name: row.subject.subject_name,
          subject_code: row.subject.subject_code
        } : null,
        teacher: row.teacher ? {
          id: row.teacher.id,
          name: row.teacher.User?.name || 'N/A'
        } : null,
        notes: row.notes || null
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Class timetable fetched successfully',
      data: {
        class_info: {
          class_section_id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name,
          display_name: `${classSection.class_name} ${classSection.section_name}`
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

/**
 * Get all classes for the logged-in teacher for today
 */
const getTodayClasses = async (req, res) => {
  try {
    const userId = req.user.id;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];

    if (today === 'Sunday') {
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: "No classes scheduled for Sunday",
        data: { today, total_classes: 0, classes: [] }
      });
    }

    const teacher = await Teacher.findOne({
      where: { user_id: userId }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Teacher not found'
      });
    }

    const rows = await ClassTimetable.findAll({
      where: {
        teacher_id: teacher.id,
        day_of_week: today
      },
      include: [
        {
          model: ClassTimeSlot,
          as: 'timeSlot',
          attributes: ['id', 'slot_number', 'slot_label', 'start_time', 'end_time', 'is_break']
        },
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name']
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
        }
      ]
    });

    // Sort by slot number
    const sortedRows = [...rows].sort((a, b) => Number(a.timeSlot?.slot_number || 0) - Number(b.timeSlot?.slot_number || 0));

    const todayClasses = sortedRows.map(row => ({
      id: row.id,
      slot: row.timeSlot ? {
        ...row.timeSlot.toJSON(),
        start_time: formatTimeWithAMPM(row.timeSlot.start_time),
        end_time: formatTimeWithAMPM(row.timeSlot.end_time)
      } : null,
      class_info: row.classSection ? {
        id: row.classSection.id,
        display: `${row.classSection.class_name} ${row.classSection.section_name}`
      } : null,
      subject_info: row.subject ? {
        id: row.subject.id,
        name: row.subject.subject_name
      } : null
    }));

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Successfully fetched ${todayClasses.length} classes for today`,
      data: {
        today,
        total_classes: todayClasses.length,
        classes: todayClasses
      }
    });

  } catch (error) {
    console.error("Get Today's Classes Error:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error'
    });
  }
};

module.exports = {
  getTeacherTimetable,
  getClassTimetable,
  getTodayClasses
};
