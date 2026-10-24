const { ClassSection, Subject, Teacher, User } = require('../../models');
const { Student, studentsAttendances } = require('../../models');
const { Op } = require('sequelize');

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatTimeWithAMPM = (timeString) => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

// Get student monthly attendance
const getStudentMonthlyAttendance = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;

    const { month, year } = req.query;

    // Validation
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Month and year are required"
      });
    }

    // Validate month (1-12) and year
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid month. Must be between 1 and 12"
      });
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid year"
      });
    }

    // Find student by user_id
    const student = await Student.findOne({
      where: { user_id: user_id }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Calculate start and end date of the month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0);

    // Format dates for query (YYYY-MM-DD)
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all attendance records for this student in the given month
    const attendanceRecords = await studentsAttendances.findAll({
      where: {
        student_id: student.id,
        date: {
          [Op.between]: [startDateStr, endDateStr]
        }
      },
      attributes: ['date', 'status', 'marked_by', 'created_at'],
      order: [['date', 'ASC']]
    });

    // Format attendance data
    const attendanceList = attendanceRecords.map(record => ({
      date: record.date,
      status: record.status,
      marked_at: record.created_at
    }));

    // Calculate summary
    const summary = {
      total_days_marked: attendanceList.length,
      present: attendanceList.filter(a => a.status === 'present').length,
      absent: attendanceList.filter(a => a.status === 'absent').length,
      leave: attendanceList.filter(a => a.status === 'leave').length
    };

    // Calculate attendance percentage
    if (summary.total_days_marked > 0) {
      summary.attendance_percentage = ((summary.present / summary.total_days_marked) * 100).toFixed(2);
    } else {
      summary.attendance_percentage = 0;
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Monthly attendance fetched successfully",
      data: {
        student_id: student.id,
        month: monthNum,
        year: yearNum,
        month_name: new Date(yearNum, monthNum - 1).toLocaleString('default', { month: 'long' }),
        summary: summary,
        attendance: attendanceList
      }
    });

  } catch (error) {
    console.error("Get Student Monthly Attendance Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get student class and subjects
const getStudentClassAndSubjects = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;


    // Find student by user_id with class details
    const student = await Student.findOne({
      where: { user_id: user_id },
      include: [
        {
          model: ClassSection,
          attributes: ['id', 'class_name', 'section_name', 'room_No', 'capacity']
        }
      ],
      attributes: ['id', 'roll_number', 'class_section_id']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    if (!student.ClassSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class not assigned to this student"
      });
    }

    // Get all subjects for this class
    const subjects = await Subject.findAll({
      where: { class_section_id: student.class_section_id },
      attributes: ['id', 'subject_name', 'subject_code', 'subject_type'],
      include: [
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'mobile_no'],
          required: false,
          include: [
            {
              model: User,
              attributes: ['name'],
              required: false
            }
          ]
        }
      ],
      order: [['subject_name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student class and subjects fetched successfully",
      data: {
        student_info: {
          student_id: student.id,
          roll_number: student.roll_number
        },
        class_info: {
          class_section_id: student.ClassSection.id,
          class_name: student.ClassSection.class_name,
          section_name: student.ClassSection.section_name,
          display_name: `${student.ClassSection.class_name} ${student.ClassSection.section_name}`,
          room_no: student.ClassSection.room_No,
          capacity: student.ClassSection.capacity
        },
        subjects: subjects.map(subject => ({
          subject_id: subject.id,
          subject_name: subject.subject_name,
          subject_code: subject.subject_code,
          subject_type: subject.subject_type,
          teacher_name: subject.teacher?.User?.name || null,
          teacher_phone_number: subject.teacher?.mobile_no || null
        })),
        total_subjects: subjects.length
      }
    });

  } catch (error) {
    console.error("Get Student Class And Subjects Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get student timetable
const getStudentTimetable = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;

    const { ClassSection, Subject, ClassTimetable, Teacher, User, ClassTimeSlot } = require('../../models');

    // Find student by user_id
    const student = await Student.findOne({
      where: { user_id: user_id },
      attributes: ['id', 'roll_number', 'class_section_id']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Get class details
    const classSection = await ClassSection.findByPk(student.class_section_id);

    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class not found"
      });
    }

    // Get timetable for this class
    const timetable = await ClassTimetable.findAll({
      where: { class_section_id: student.class_section_id },
      include: [
        {
          model: ClassTimeSlot,
          as: 'timeSlot',
          attributes: ['id', 'slot_number', 'slot_label', 'start_time', 'end_time', 'is_break']
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id'],
          include: [
            {
              model: User,
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });

    if (timetable.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No timetable found for this class"
      });
    }

    // Group by day of week
    const groupedTimetable = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: []
    };

    timetable
      .sort((a, b) => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayDiff = days.indexOf(a.day_of_week) - days.indexOf(b.day_of_week);
        if (dayDiff !== 0) return dayDiff;
        return Number(a.timeSlot?.slot_number || 0) - Number(b.timeSlot?.slot_number || 0);
      })
      .forEach(entry => {
      const dayData = {
        id: entry.id,
        slot: entry.timeSlot ? {
          id: entry.timeSlot.id,
          slot_number: entry.timeSlot.slot_number,
          slot_label: entry.timeSlot.slot_label,
          start_time: formatTimeWithAMPM(entry.timeSlot.start_time),
          end_time: formatTimeWithAMPM(entry.timeSlot.end_time),
          is_break: entry.timeSlot.is_break
        } : null,
        subject: entry.subject ? {
          id: entry.subject.id,
          subject_name: entry.subject.subject_name,
          subject_code: entry.subject.subject_code
        } : null,
        teacher: entry.teacher ? {
          id: entry.teacher.id,
          name: entry.teacher.User?.name || 'N/A'
        } : null
      };

      if (groupedTimetable[entry.day_of_week]) {
        groupedTimetable[entry.day_of_week].push(dayData);
      }
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student timetable fetched successfully",
      data: {
        student_info: {
          student_id: student.id,
          roll_number: student.roll_number
        },
        class_info: {
          class_section_id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name,
          display_name: `${classSection.class_name} ${classSection.section_name}`
        },
        timetable: groupedTimetable
      }
    });

  } catch (error) {
    console.error("Get Student Timetable Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  getStudentMonthlyAttendance,
  getStudentClassAndSubjects,
  getStudentTimetable
};
