const {
  Student,
  SubjectResource,
  Subject,
  ClassTimetable,
  ClassTimeSlot,
  studentsAttendances,
  Teacher,
  User,
  Notice,
  NoticeTarget,
} = require('../../../models');
const { Op } = require('sequelize');

/**
 * Get Today's Classes
 * Returns full timetable for today's weekday for the student
 */
const getTodayClasses = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find student associated with this user
    const student = await Student.findOne({
      where: { user_id: userId },
      attributes: ['id', 'class_section_id']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found for this user"
      });
    }

    // Get current day name
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const dayName = daysOfWeek[today.getDay()];

    // Fetch today's timetable for student's class using slot-based entries.
    const classes = await ClassTimetable.findAll({
      where: {
        class_section_id: student.class_section_id,
        day_of_week: dayName,
        is_break: false
      },
      include: [
        {
          model: ClassTimeSlot,
          as: 'timeSlot',
          required: true,
          attributes: ['slot_label', 'start_time', 'end_time', 'is_break'],
          where: {
            is_break: false
          }
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
              attributes: ['name']
            }
          ]
        }
      ],
      order: [[{ model: ClassTimeSlot, as: 'timeSlot' }, 'start_time', 'ASC']]
    });

    // Format the response
    const upcomingClasses = classes.map(classItem => {
      // Format time from HH:MM:SS to 12-hour format
      const formatTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      };

      return {
        subject: classItem.subject?.subject_name || 'N/A',
        teacher: classItem.teacher?.User?.name || 'TBA',
        room: classItem.timeSlot?.slot_label || 'Room',
        time: classItem.timeSlot?.start_time ? formatTime(classItem.timeSlot.start_time) : null,
        start_time: classItem.timeSlot?.start_time || null,
        end_time: classItem.timeSlot?.end_time || null
      };
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Today's classes fetched successfully",
      data: {
        day: dayName,
        total_classes: upcomingClasses.length,
        classes: upcomingClasses
      }
    });

  } catch (error) {
    console.error("Error fetching today's classes:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get Weekly Timetable
 * Returns Monday-Saturday timetable for the student class
 */
const getWeeklyTimetable = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find student associated with this user
    const student = await Student.findOne({
      where: { user_id: userId },
      attributes: ['id', 'class_section_id']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found for this user"
      });
    }

    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const timetableRows = await ClassTimetable.findAll({
      where: {
        class_section_id: student.class_section_id,
        day_of_week: {
          [Op.in]: weekDays
        },
        is_break: false
      },
      include: [
        {
          model: ClassTimeSlot,
          as: 'timeSlot',
          required: true,
          attributes: ['slot_label', 'start_time', 'end_time', 'is_break'],
          where: {
            is_break: false
          }
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
              attributes: ['name']
            }
          ]
        }
      ],
      order: [[{ model: ClassTimeSlot, as: 'timeSlot' }, 'start_time', 'ASC']]
    });

    const formatTime = (timeStr) => {
      if (!timeStr) return null;
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    const grouped = weekDays.reduce((acc, day) => {
      acc[day] = [];
      return acc;
    }, {});

    timetableRows.forEach((row) => {
      grouped[row.day_of_week].push({
        subject: row.subject?.subject_name || 'N/A',
        subject_code: row.subject?.subject_code || null,
        teacher: row.teacher?.User?.name || 'TBA',
        room: row.timeSlot?.slot_label || 'Room',
        time: row.timeSlot?.start_time ? formatTime(row.timeSlot.start_time) : null,
        start_time: row.timeSlot?.start_time || null,
        end_time: row.timeSlot?.end_time || null
      });
    });

    const weeklyTimetable = weekDays.map((day) => ({
      day,
      total_classes: grouped[day].length,
      classes: grouped[day]
    }));

    const totalWeekClasses = weeklyTimetable.reduce((sum, dayRow) => sum + dayRow.total_classes, 0);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Weekly timetable fetched successfully",
      data: {
        total_week_classes: totalWeekClasses,
        timetable: weeklyTimetable
      }
    });
  } catch (error) {
    console.error("Error fetching weekly timetable:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get Pending Assignments
 * Returns assignments that are not yet due for the student
 */
const getPendingAssignments = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find student associated with this user
    const student = await Student.findOne({
      where: { user_id: userId },
      attributes: ['id', 'class_section_id']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found for this user"
      });
    }

    // Get current date
    const currentDate = new Date();

    // Fetch pending assignments for student's class
    const assignments = await SubjectResource.findAll({
      where: {
        class_section_id: student.class_section_id,
        resource_type: 'assignment',
        due_date: {
          [Op.gte]: currentDate // Only future/today assignments
        }
      },
      include: [
        {
          model: Subject,
          as: 'subject',
          attributes: ['subject_name']
        }
      ],
      order: [['due_date', 'ASC']],
      raw: false
    });

    // Format the response
    const pendingAssignments = assignments.map(assignment => {
      // Format due date
      const formatDueDate = (dueDate) => {
        const date = new Date(dueDate);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Check if due date is today
        if (date.toDateString() === today.toDateString()) {
          const hours = date.getHours();
          const minutes = date.getMinutes();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHour = hours % 12 || 12;
          const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
          return `Today, ${displayHour}:${displayMinutes} ${ampm}`;
        }
        
        // Check if due date is tomorrow
        if (date.toDateString() === tomorrow.toDateString()) {
          const hours = date.getHours();
          const minutes = date.getMinutes();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHour = hours % 12 || 12;
          const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
          return `Tomorrow, ${displayHour}:${displayMinutes} ${ampm}`;
        }

        // Format for other dates
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = daysOfWeek[date.getDay()];
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours % 12 || 12;
        const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
        
        return `${dayName}, ${displayHour}:${displayMinutes} ${ampm}`;
      };

      return {
        id: assignment.id,
        title: assignment.title,
        subject: assignment.subject?.subject_name || 'N/A',
        description: assignment.description,
        due: formatDueDate(assignment.due_date),
        due_date: assignment.due_date
      };
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Pending assignments fetched successfully",
      data: {
        total_pending: pendingAssignments.length,
        assignments: pendingAssignments
      }
    });

  } catch (error) {
    console.error("Error fetching pending assignments:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get Student Notices
 * Returns all notices for the student (targeted to student, their class, or all)
 */
const getStudentNotices = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find student associated with this user
    const student = await Student.findOne({
      where: { user_id: userId },
      attributes: ['id', 'class_section_id']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found for this user"
      });
    }

    // Fetch notices targeted for this student
    const notices = await Notice.findAll({
      attributes: ['id', 'title', 'message', 'attachment', 'created_at'],
      include: [
        {
          model: NoticeTarget,
          as: 'targets',
          attributes: ['target_type'],
          where: {
            [Op.or]: [
              { target_type: 'all' },
              { target_type: 'all_classes' },
              { target_type: 'class', class_section_id: student.class_section_id }
            ]
          },
          required: true
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 20
    });

    // Format the response
    const formattedNotices = notices.map(notice => {
      const noticeData = notice.toJSON();
      return {
        id: noticeData.id,
        title: noticeData.title,
        message: noticeData.message,
        attachment: noticeData.attachment,
        created_at: noticeData.created_at,
        target: noticeData.targets && noticeData.targets.length > 0 
          ? noticeData.targets[0].target_type 
          : null
      };
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student notices fetched successfully",
      data: {
        total_notices: formattedNotices.length,
        notices: formattedNotices
      }
    });

  } catch (error) {
    console.error("Error fetching student notices:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get Student Dashboard Stats
 * Returns top-level counters for student dashboard home
 */
const getStudentDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const student = await Student.findOne({
      where: { user_id: userId },
      attributes: ['id', 'class_section_id', 'roll_number']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Student not found for this user'
      });
    }

    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = daysOfWeek[now.getDay()];

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    const [todayClasses, pendingAssignments, totalNotices, monthlyAttendance] = await Promise.all([
      ClassTimetable.count({
        where: {
          class_section_id: student.class_section_id,
          day_of_week: dayName,
          is_break: false
        }
      }),
      SubjectResource.count({
        where: {
          class_section_id: student.class_section_id,
          resource_type: 'assignment',
          due_date: {
            [Op.gte]: todayDate
          }
        }
      }),
      NoticeTarget.count({
        where: {
          [Op.or]: [
            { target_type: 'all' },
            { target_type: 'all_classes' },
            { target_type: 'class', class_section_id: student.class_section_id }
          ]
        },
        distinct: true,
        col: 'notice_id'
      }),
      studentsAttendances.findAll({
        attributes: ['status'],
        where: {
          student_id: student.id,
          date: {
            [Op.between]: [monthStartStr, monthEndStr]
          }
        },
        raw: true
      })
    ]);

    const totalDaysMarked = monthlyAttendance.length;
    const totalPresent = monthlyAttendance.filter((entry) => entry.status === 'present').length;
    const attendancePercentage = totalDaysMarked > 0
      ? Number(((totalPresent / totalDaysMarked) * 100).toFixed(2))
      : 0;

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Student dashboard stats fetched successfully',
      data: {
        student: {
          student_id: student.id,
          roll_number: student.roll_number,
          class_section_id: student.class_section_id
        },
        stats: {
          total_classes_today: todayClasses,
          pending_assignments: pendingAssignments,
          total_notices: totalNotices,
          attendance_percentage_this_month: attendancePercentage,
          attendance_marked_days_this_month: totalDaysMarked
        },
        meta: {
          day: dayName,
          date: todayDate
        }
      }
    });
  } catch (error) {
    console.error('Error fetching student dashboard stats:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getStudentDashboardStats,
  getTodayClasses,
  getWeeklyTimetable,
  getPendingAssignments,
  getStudentNotices
};
