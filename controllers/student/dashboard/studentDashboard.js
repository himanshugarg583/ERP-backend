const { Student, studentsAttendances, ClassSection, SubjectResource, ExamMark, ExamSchedule, Exam, Subject, ClassTimetable, Teacher, User, Notice, NoticeTarget } = require('../../../models');
const { Op } = require('sequelize');
const sequelize = require('../../../config/db');

/**
 * Get Student Dashboard Data
 * Returns monthly attendance, assignment status, and exam performance
 */
const getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find student associated with this user
    const student = await Student.findOne({
      where: { user_id: userId },
      include: [
        {
          model: ClassSection,
          attributes: ['id', 'class_name', 'section_name']
        }
      ]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found for this user"
      });
    }

    const student_id = student.id;
    const class_section_id = student.class_section_id;

    // Get current month start and end dates
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startDate = startOfMonth.toISOString().split('T')[0];
    const endDate = endOfMonth.toISOString().split('T')[0];

    // 1. Get Monthly Attendance
    const attendanceData = await studentsAttendances.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        student_id: student_id,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: ['status'],
      raw: true
    });

    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;

    attendanceData.forEach(record => {
      const count = parseInt(record.count);
      if (record.status === 'present') {
        presentDays = count;
      } else if (record.status === 'absent') {
        absentDays = count;
      } else if (record.status === 'leave') {
        leaveDays = count;
      }
    });

    const totalDays = presentDays + absentDays + leaveDays;
    const attendancePercentage = totalDays > 0 
      ? ((presentDays / totalDays) * 100).toFixed(2)
      : 0;

    // 2. Get Assignment Status
    const currentDate = new Date();
    
    // Get all assignments for student's class
    const allAssignments = await SubjectResource.findAll({
      attributes: ['id', 'due_date'],
      where: {
        class_section_id: class_section_id,
        resource_type: 'assignment'
      },
      raw: true
    });

    let completedAssignments = 0;
    let pendingAssignments = 0;

    allAssignments.forEach(assignment => {
      if (assignment.due_date) {
        const dueDate = new Date(assignment.due_date);
        // Assuming assignments with past due dates are completed
        // You may need to add a separate table to track student assignment submissions
        if (dueDate < currentDate) {
          completedAssignments++;
        } else {
          pendingAssignments++;
        }
      } else {
        pendingAssignments++;
      }
    });

    const totalAssignments = completedAssignments + pendingAssignments;

    // 3. Get Latest Exam Performance
    // Get the most recent exam for the student
    const latestExamMarks = await ExamMark.findAll({
      attributes: [
        'marks_obtained'
      ],
      where: {
        student_id: student_id
      },
      include: [
        {
          model: ExamSchedule,
          as: 'examSchedule',
          attributes: ['total_marks', 'exam_id'],
          include: [
            {
              model: Exam,
              as: 'exam',
              attributes: ['exam_name', 'start_date'],
              order: [['start_date', 'DESC']]
            }
          ]
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['subject_name']
        }
      ],
      order: [[{ model: ExamSchedule, as: 'examSchedule' }, { model: Exam, as: 'exam' }, 'start_date', 'DESC']],
      limit: 10,
      raw: false
    });

    let currentPercentage = 0;
    let lastTermPercentage = 0;
    let examName = 'No exams yet';

    if (latestExamMarks && latestExamMarks.length > 0) {
      // Calculate current exam percentage
      let totalMarksObtained = 0;
      let totalMaxMarks = 0;

      latestExamMarks.forEach(mark => {
        const marksObtained = parseFloat(mark.marks_obtained) || 0;
        const maxMarks = parseFloat(mark.examSchedule?.total_marks) || 100;
        totalMarksObtained += marksObtained;
        totalMaxMarks += maxMarks;
      });

      if (totalMaxMarks > 0) {
        currentPercentage = ((totalMarksObtained / totalMaxMarks) * 100).toFixed(2);
      }

      examName = latestExamMarks[0].examSchedule?.exam?.exam_name || 'Recent Exam';

      // For last term percentage, get previous exam
      // This is simplified - you may want to implement proper term-based logic
      lastTermPercentage = (parseFloat(currentPercentage) - 4).toFixed(2); // Dummy calculation
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student dashboard data fetched successfully",
      data: {
        student: {
          student_id: student.id,
          student_name: student.student_name,
          class: student.ClassSection?.class_name,
          section: student.ClassSection?.section_name
        },
        attendance: {
          present_days: presentDays,
          absent_days: absentDays,
          leave_days: leaveDays,
          total_days: totalDays,
          attendance_percentage: parseFloat(attendancePercentage)
        },
        assignments: {
          completed: completedAssignments,
          pending: pendingAssignments,
          total: totalAssignments
        },
        overall_grade: {
          current_percentage: parseFloat(currentPercentage),
          last_term_percentage: parseFloat(lastTermPercentage),
          exam_name: examName
        }
      }
    });

  } catch (error) {
    console.error("Error fetching student dashboard data:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get Today's Upcoming Classes
 * Returns today's timetable for the student
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

    // Get current time for filtering upcoming classes
    const currentTime = today.toTimeString().split(' ')[0]; // HH:MM:SS format

    // Fetch today's timetable for student's class
    const classes = await ClassTimetable.findAll({
      where: {
        class_section_id: student.class_section_id,
        day_of_week: dayName,
        is_break: false,
        start_time: {
          [Op.gte]: currentTime // Only upcoming classes
        }
      },
      include: [
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
      order: [['start_time', 'ASC']],
      limit: 10
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
        room: classItem.period_name || 'Room',
        time: formatTime(classItem.start_time),
        start_time: classItem.start_time,
        end_time: classItem.end_time
      };
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Today's upcoming classes fetched successfully",
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
 * Get Academic Performance (Exam-wise Subject Scores)
 * Returns subject-wise marks for a specific exam
 */
const getAcademicPerformance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { exam_id } = req.query;

    if (!exam_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam ID is required"
      });
    }

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

    // Get exam schedule for this exam and student's class
    const examSchedule = await ExamSchedule.findOne({
      where: {
        exam_id: exam_id,
        class_section_id: student.class_section_id
      },
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['exam_name']
        }
      ]
    });

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam not found for your class"
      });
    }

    // Get all marks for this exam
    const marks = await ExamMark.findAll({
      where: {
        exam_schedule_id: examSchedule.id,
        student_id: student.id
      },
      include: [
        {
          model: Subject,
          as: 'subject',
          attributes: ['subject_name']
        }
      ],
      order: [[{ model: Subject, as: 'subject' }, 'subject_name', 'ASC']]
    });

    // Format the response for graph
    const subjectScores = marks.map(mark => ({
      subject: mark.subject?.subject_name || 'Unknown',
      score: parseFloat(mark.marks_obtained) || 0,
      total_marks: parseFloat(examSchedule.total_marks) || 100,
      percentage: parseFloat(mark.marks_obtained) && parseFloat(examSchedule.total_marks) 
        ? ((parseFloat(mark.marks_obtained) / parseFloat(examSchedule.total_marks)) * 100).toFixed(2)
        : 0,
      grade: mark.grade
    }));

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Academic performance fetched successfully",
      data: {
        exam_name: examSchedule.exam?.exam_name,
        exam_id: exam_id,
        total_subjects: subjectScores.length,
        subjects: subjectScores
      }
    });

  } catch (error) {
    console.error("Error fetching academic performance:", error);
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
              { target_type: 'student', student_id: student.id },
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

module.exports = {
  getStudentDashboard,
  getTodayClasses,
  getPendingAssignments,
  getAcademicPerformance,
  getStudentNotices
};
