const { Teacher } = require('../../../models/admin/Teacher');
const { User } = require('../../../models/admin/user');
const { ClassSection } = require('../../../models/admin/Classsection');
const { Subject } = require('../../../models/admin/subject');
const { ClassTimetable } = require('../../../models/admin/ClassTimetable');
const { Student } = require('../../../models/admin/Student');
const { Resource } = require('../../../models/admin/content uploads/resource');
const { studentsAttendances } = require('../../../models/admin/studentsAttendances');
const { Op } = require('sequelize');
const { Sequelize } = require('sequelize');

/**
 * Get Teacher Dashboard Stats
 * Returns teacher's classes, students, subjects, and today's schedule
 */
const getTeacherDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find teacher associated with this user
    const teacher = await Teacher.findOne({
      where: { user_id: userId },
      include: [
        {
          model: User,
          attributes: ['name', 'email']
        }
      ]
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Teacher not found for this user"
      });
    }

    // Get today's date
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = daysOfWeek[today.getDay()];

    // 1. Get total subjects assigned to teacher
    const totalSubjects = await Subject.count({
      where: { teacher_id: teacher.id }
    });

    // 2. Get total students in teacher's classes
    const subjectsWithClasses = await Subject.findAll({
      where: { teacher_id: teacher.id },
      attributes: ['class_section_id'],
      raw: true
    });

    const classSectionIds = [...new Set(subjectsWithClasses.map(s => s.class_section_id))];
    
    const totalStudents = await Student.count({
      where: {
        class_section_id: {
          [Op.in]: classSectionIds
        }
      }
    });

    // 3. Get total classes/periods today
    const todayClasses = await ClassTimetable.count({
      where: {
        teacher_id: teacher.id,
        day_of_week: dayName,
        is_break: false
      }
    });

    // 4. Get pending assignments to review
    const pendingAssignments = await Resource.count({
      where: {
        resource_scope: 'subject',
        uploaded_by_type: 'teacher',
        uploaded_by_id: teacher.id,
        resource_type: 'assignment',
        due_date: {
          [Op.gte]: todayDate
        }
      }
    });

    // 5. Get today's attendance summary for teacher's classes
    const attendanceToday = await studentsAttendances.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        date: todayDate,
        class_section_id: {
          [Op.in]: classSectionIds
        }
      },
      group: ['status'],
      raw: true
    });

    let presentToday = 0;
    let absentToday = 0;
    let leaveToday = 0;

    attendanceToday.forEach(record => {
      const count = parseInt(record.count);
      if (record.status === 'present') {
        presentToday = count;
      } else if (record.status === 'absent') {
        absentToday = count;
      } else if (record.status === 'leave') {
        leaveToday = count;
      }
    });

    const totalMarked = presentToday + absentToday + leaveToday;
    const attendancePercentage = totalMarked > 0 
      ? ((presentToday / totalMarked) * 100).toFixed(2)
      : 0;

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Teacher dashboard stats fetched successfully",
      data: {
        teacher: {
          teacher_id: teacher.id,
          teacher_name: teacher.User?.name,
          email: teacher.User?.email
        },
        stats: {
          total_subjects: totalSubjects,
          total_students: totalStudents,
          total_classes_today: todayClasses,
          pending_assignments: pendingAssignments
        },
        today_attendance: {
          present: presentToday,
          absent: absentToday,
          leave: leaveToday,
          total_marked: totalMarked,
          attendance_percentage: parseFloat(attendancePercentage)
        }
      }
    });

  } catch (error) {
    console.error("Error fetching teacher dashboard stats:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

module.exports = {
  getTeacherDashboardStats
};
