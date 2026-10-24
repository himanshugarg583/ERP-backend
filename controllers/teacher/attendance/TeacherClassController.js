const { Teacher, ClassSection, Student, User, StudentLeave, Holiday } = require('../../../models');
const { Op } = require('sequelize');

// Get all classes assigned to a teacher by user_id
const getTeacherClasses = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;

    // Find teacher by user_id
    const teacher = await Teacher.findOne({
      where: { user_id: user_id }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Teacher not found with this user ID"
      });
    }

    // Get all classes where this teacher is assigned (teacher_id in class_sections table)
    const assignedClasses = await ClassSection.findAll({
      where: { teacher_id: teacher.id },
      attributes: ['id', 'class_name', 'section_name'],
      order: [['class_name', 'ASC'], ['section_name', 'ASC']]
    });

    if (assignedClasses.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No classes assigned to this teacher"
      });
    }

    const classes = await Promise.all(assignedClasses.map(async (item) => {
      const totalStudents = await Student.count({
        where: { class_section_id: item.id }
      });

      return {
        class_section_id: item.id,
        class_name: item.class_name,
        section_name: item.section_name,
        display_name: `${item.class_name} ${item.section_name}`,
        total_students: totalStudents
      };
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Teacher classes fetched successfully",
      data: {
        teacher_id: teacher.id,
        total_classes: classes.length,
        classes: classes
      }
    });

  } catch (error) {
    console.error("Get Teacher Classes Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get student list by class_section_id
const getClassStudentList = async (req, res) => {
  try {
    const { class_section_id } = req.params;

    // Validation
    if (!class_section_id || isNaN(parseInt(class_section_id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid class section ID is required"
      });
    }

    // Check if class exists
    const classSection = await ClassSection.findByPk(class_section_id);

    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    // Get all students in this class
    const students = await Student.findAll({
      where: { class_section_id: class_section_id },
      include: [
        {
          model: User,
          attributes: ['id', 'name']
        }
      ],
      attributes: ['id', 'user_id', 'roll_number'],
      order: [['roll_number', 'ASC']]
    });

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No students found in this class"
      });
    }

    const studentList = students.map(student => ({
      student_id: student.id,
      student_name: student.User?.name || 'N/A',
      roll_number: student.roll_number
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student list fetched successfully",
      data: {
        class_info: {
          class_section_id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name,
          display_name: `${classSection.class_name} ${classSection.section_name}`
        },
        total_students: studentList.length,
        students: studentList
      }
    });

  } catch (error) {
    console.error("Get Class Student List Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get student list by class_id (alias for class_section_id)
const getStudentsByClass = async (req, res) => {
  req.params.class_section_id = req.params.class_id;
  return getClassStudentList(req, res);
};

// Bulk mark student attendance
const markClassAttendance = async (req, res) => {
  try {
    const { class_section_id, date, attendance } = req.body;

    // Resolve teacher from authenticated user and use teacher.id for marked_by
    const teacher = await Teacher.findOne({
      where: { user_id: req.user.id }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Teacher not found with this user ID"
      });
    }

    // Validation
    if (!class_section_id || !date || !attendance || !Array.isArray(attendance)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "class_section_id, date, and attendance array are required"
      });
    }

    if (attendance.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Attendance array cannot be empty"
      });
    }

    // Check if class exists
    const classSection = await ClassSection.findByPk(class_section_id);
    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    // Verify teacher is assigned to this class
    if (classSection.teacher_id !== teacher.id) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You are not authorized to mark attendance for this class"
      });
    }

    const holiday = await Holiday.findOne({ where: { holiday_date: date } });
    if (holiday) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Cannot mark attendance on holiday: ${holiday.reason}`
      });
    }

    // Weekend (Sunday) Detection
    const dayOfWeek = attendanceDate.getUTCDay();
    if (dayOfWeek === 0) { // 0 is Sunday
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Cannot mark attendance on Sunday"
      });
    }

    // Validate date format
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid date format"
      });
    }

    const { studentsAttendances } = require('../../../models');
    const results = [];
    const errors = [];

    // Process each student attendance
    for (const item of attendance) {
      const { student_id, status } = item;

      let effectiveStatus = status;

      // Validate required fields
      if (!student_id || !status) {
        errors.push({
          student_id,
          error: "student_id and status are required"
        });
        continue;
      }

      // Validate status
      if (!['present', 'absent', 'leave'].includes(status)) {
        errors.push({
          student_id,
          error: "status must be present, absent, or leave"
        });
        continue;
      }

      // Find student by student_id and verify belongs to this class
      const student = await Student.findOne({
        where: {
          id: student_id,
          class_section_id: class_section_id
        }
      });

      if (!student) {
        errors.push({
          student_id,
          error: "Student not found or does not belong to this class"
        });
        continue;
      }

      // If leave is approved for this date, force attendance status to leave
      const approvedLeave = await StudentLeave.findOne({
        where: {
          student_id: student.id,
          status: 'approved',
          start_date: { [Op.lte]: date },
          end_date: { [Op.gte]: date }
        }
      });

      if (approvedLeave && status !== 'present') {
        effectiveStatus = 'leave';
      }

      try {
        // Create or update attendance record (using student.id in table)
        const [attendanceRecord, created] = await studentsAttendances.findOrCreate({
          where: {
            student_id: student.id,
            date: date
          },
          defaults: {
            class_section_id: class_section_id,
            status: effectiveStatus,
            marked_by: teacher.id
          }
        });

        if (!created) {
          // Update existing record
          await attendanceRecord.update({
            status: effectiveStatus,
            marked_by: teacher.id,
            class_section_id: class_section_id
          });
        }

        results.push({
          student_id: student.id,
          status: effectiveStatus,
          leave_auto_applied: !!approvedLeave,
          action: created ? 'created' : 'updated'
        });

      } catch (error) {
        errors.push({
          student_id,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Attendance marked successfully",
      data: {
        class_section_id: class_section_id,
        date: date,
        marked_by: teacher.id,
        total_processed: results.length,
        total_errors: errors.length,
        results: results,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error("Mark Class Attendance Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get class attendance by date
const getClassAttendanceByDate = async (req, res) => {
  try {
    const { class_section_id, date } = req.query;

    // Validation
    if (!class_section_id || !date) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "class_section_id and date are required"
      });
    }

    // Check if class exists
    const classSection = await ClassSection.findByPk(class_section_id);
    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    // Resolve teacher from authenticated user
    const teacher = await Teacher.findOne({
      where: { user_id: req.user.id }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Teacher not found for this user ID"
      });
    }

    // Verify teacher is assigned to this class
    if (classSection.teacher_id !== teacher.id) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You are not authorized to view attendance for this class"
      });
    }

    // Validate date format
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid date format"
      });
    }

    const holiday = await Holiday.findOne({ where: { holiday_date: date } });
    if (holiday) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Cannot update attendance on holiday: ${holiday.reason}`
      });
    }

    const { studentsAttendances } = require('../../../models');

    // Get all attendance records for this class and date
    const attendanceRecords = await studentsAttendances.findAll({
      where: {
        class_section_id: class_section_id,
        date: date
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'user_id', 'roll_number'],
          include: [
            {
              model: User,
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [[{ model: Student, as: 'student' }, 'roll_number', 'ASC']]
    });

    // Format the response
    const attendanceList = attendanceRecords.map(record => ({
      student_id: record.student?.id,
      student_name: record.student?.User?.name || 'N/A',
      roll_number: record.student?.roll_number,
      status: record.status,
      marked_at: record.updated_at
    }));

    // Calculate summary
    const summary = {
      total: attendanceList.length,
      present: attendanceList.filter(a => a.status === 'present').length,
      absent: attendanceList.filter(a => a.status === 'absent').length,
      leave: attendanceList.filter(a => a.status === 'leave').length
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Attendance fetched successfully",
      data: {
        class_info: {
          class_section_id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name,
          display_name: `${classSection.class_name} ${classSection.section_name}`
        },
        date: date,
        summary: summary,
        attendance: attendanceList
      }
    });

  } catch (error) {
    console.error("Get Class Attendance By Date Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Update class attendance for current date only
const updateClassAttendance = async (req, res) => {
  try {
    const { class_section_id, date, attendance } = req.body;

    const teacher = await Teacher.findOne({
      where: { user_id: req.user.id }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Teacher not found with this user ID"
      });
    }

    if (!class_section_id || !date || !attendance || !Array.isArray(attendance)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "class_section_id, date, and attendance array are required"
      });
    }

    if (attendance.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Attendance array cannot be empty"
      });
    }

    const classSection = await ClassSection.findByPk(class_section_id);
    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    // Verify teacher is assigned to this class
    if (classSection.teacher_id !== teacher.id) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You are not authorized to update attendance for this class"
      });
    }

    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid date format"
      });
    }

    // Allow updates only for current server date (YYYY-MM-DD)
    const today = new Date();
    const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (date !== currentDate) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Attendance can only be updated for current date"
      });
    }

    const { studentsAttendances } = require('../../../models');
    const results = [];
    const errors = [];

    for (const item of attendance) {
      const { student_id, status } = item;

      let effectiveStatus = status;

      if (!student_id || !status) {
        errors.push({
          student_id,
          error: "student_id and status are required"
        });
        continue;
      }

      if (!['present', 'absent', 'leave'].includes(status)) {
        errors.push({
          student_id,
          error: "status must be present, absent, or leave"
        });
        continue;
      }

      const student = await Student.findOne({
        where: {
          id: student_id,
          class_section_id: class_section_id
        }
      });

      if (!student) {
        errors.push({
          student_id,
          error: "Student not found or does not belong to this class"
        });
        continue;
      }

      // If leave is approved for this date, force attendance status to leave
      const approvedLeave = await StudentLeave.findOne({
        where: {
          student_id: student.id,
          status: 'approved',
          start_date: { [Op.lte]: date },
          end_date: { [Op.gte]: date }
        }
      });

      if (approvedLeave && status !== 'present') {
        effectiveStatus = 'leave';
      }

      const attendanceRecord = await studentsAttendances.findOne({
        where: {
          student_id: student.id,
          date: date
        }
      });

      if (!attendanceRecord) {
        await studentsAttendances.create({
          student_id: student.id,
          class_section_id: class_section_id,
          date: date,
          status: effectiveStatus,
          marked_by: teacher.id
        });

        results.push({
          student_id: student.id,
          status: effectiveStatus,
          leave_auto_applied: !!approvedLeave,
          action: 'created'
        });
        continue;
      }

      await attendanceRecord.update({
        status: effectiveStatus,
        marked_by: teacher.id,
        class_section_id: class_section_id
      });

      results.push({
        student_id: student.id,
        status: effectiveStatus,
        leave_auto_applied: !!approvedLeave,
        action: 'updated'
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Attendance updated successfully",
      data: {
        class_section_id,
        date,
        marked_by: teacher.id,
        total_updated: results.length,
        total_errors: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error("Update Class Attendance Error:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get monthly class attendance report (Grid View)
const getMonthlyClassReport = async (req, res) => {
  try {
    const { class_section_id, month, year } = req.query;

    if (!class_section_id || !month || !year) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "class_section_id, month, and year are required"
      });
    }

    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    const classSection = await ClassSection.findByPk(class_section_id);

    if (!classSection || classSection.teacher_id !== teacher.id) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "Unauthorized access to this class report"
      });
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { studentsAttendances } = require('../../../models');
    
    // Get all students in class
    const students = await Student.findAll({
      where: { class_section_id },
      include: [{ model: User, attributes: ['name'] }],
      order: [['roll_number', 'ASC']]
    });

    // Get all attendance for the month
    const attendanceRecords = await studentsAttendances.findAll({
      where: {
        class_section_id,
        date: { [Op.between]: [startDate, endDate] }
      }
    });

    // Format for Grid UI: { student_id: { "2026-04-01": "present" } }
    const attendanceMap = {};
    attendanceRecords.forEach(rec => {
      if (!attendanceMap[rec.student_id]) attendanceMap[rec.student_id] = {};
      attendanceMap[rec.student_id][rec.date] = rec.status;
    });

    const report = students.map(s => {
      const studentAttendance = attendanceMap[s.id] || {};
      const statusCounts = Object.values(studentAttendance).reduce((acc, status) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, { present: 0, absent: 0, leave: 0 });

      return {
        student_id: s.id,
        roll_number: s.roll_number,
        name: s.User?.name,
        attendance: studentAttendance,
        summary: statusCounts
      };
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        class_info: { class_name: classSection.class_name, section_name: classSection.section_name },
        month,
        year,
        students: report
      }
    });
  } catch (error) {
    console.error("Monthly Report Error:", error);
    res.status(500).json({ success: false, statusCode: 500, message: "Internal Server Error" });
  }
};

// Get custom date range report
const getCustomDateRangeReport = async (req, res) => {
  try {
    const { class_section_id, start_date, end_date } = req.query;

    if (!class_section_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "class_section_id, start_date, and end_date are required"
      });
    }

    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    const classSection = await ClassSection.findByPk(class_section_id);

    if (!classSection || classSection.teacher_id !== teacher.id) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "Unauthorized access to this class report"
      });
    }

    const { studentsAttendances } = require('../../../models');
    const students = await Student.findAll({
      where: { class_section_id },
      include: [{ model: User, attributes: ['name'] }],
      order: [['roll_number', 'ASC']]
    });

    const attendanceRecords = await studentsAttendances.findAll({
      where: {
        class_section_id,
        date: { [Op.between]: [start_date, end_date] }
      }
    });

    const attendanceMap = {};
    attendanceRecords.forEach(rec => {
      if (!attendanceMap[rec.student_id]) attendanceMap[rec.student_id] = {};
      attendanceMap[rec.student_id][rec.date] = rec.status;
    });

    const report = students.map(s => {
      const studentAttendance = attendanceMap[s.id] || {};
      const statusCounts = Object.values(studentAttendance).reduce((acc, status) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, { present: 0, absent: 0, leave: 0 });

      const totalDays = Object.keys(studentAttendance).length;
      const percentage = totalDays > 0 ? ((statusCounts.present / totalDays) * 100).toFixed(2) : 0;

      return {
        student_id: s.id,
        roll_number: s.roll_number,
        name: s.User?.name,
        summary: { ...statusCounts, total_working_days: totalDays, percentage }
      };
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        class_info: { class_name: classSection.class_name, section_name: classSection.section_name },
        range: { start_date, end_date },
        students: report
      }
    });
  } catch (error) {
    console.error("Custom Range Report Error:", error);
    res.status(500).json({ success: false, statusCode: 500, message: "Internal Server Error" });
  }
};

// Get Individual Student History (Teacher View)
const getStudentHistory = async (req, res) => {
  try {
    const { student_id } = req.params;
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });

    const student = await Student.findByPk(student_id, {
      include: [
        { model: User, attributes: ['name'] },
        { model: ClassSection, attributes: ['id', 'teacher_id'] }
      ]
    });

    if (!student) {
      return res.status(404).json({ success: false, statusCode: 404, message: "Student not found" });
    }

    if (student.ClassSection?.teacher_id !== teacher.id) {
      return res.status(403).json({ success: false, statusCode: 403, message: "Unauthorized: This student is not in your assigned class" });
    }

    const { studentsAttendances } = require('../../../models');
    const history = await studentsAttendances.findAll({
      where: { student_id },
      order: [['date', 'DESC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        student_info: { name: student.User?.name, roll_number: student.roll_number },
        total_records: history.length,
        history: history.map(h => ({ date: h.date, status: h.status }))
      }
    });
  } catch (error) {
    console.error("Student History Error:", error);
    res.status(500).json({ success: false, statusCode: 500, message: "Internal Server Error" });
  }
};

// Check Attendance Marking Status for Dashboard
const checkMarkingStatus = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });

    const assignedClasses = await ClassSection.findAll({
      where: { teacher_id: teacher.id },
      attributes: ['id', 'class_name', 'section_name']
    });

    const { studentsAttendances } = require('../../../models');
    
    const statusReport = await Promise.all(assignedClasses.map(async (cls) => {
      const record = await studentsAttendances.findOne({
        where: { class_section_id: cls.id, date: today }
      });

      return {
        class_section_id: cls.id,
        display_name: `${cls.class_name} ${cls.section_name}`,
        is_marked: !!record,
        date: today
      };
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: statusReport
    });
  } catch (error) {
    console.error("Check Marking Status Error:", error);
    res.status(500).json({ success: false, statusCode: 500, message: "Internal Server Error" });
  }
};

module.exports = {
  getTeacherClasses,
  getClassStudentList,
  getStudentsByClass,
  markClassAttendance,
  getClassAttendanceByDate,
  updateClassAttendance,
  getMonthlyClassReport,
  getCustomDateRangeReport,
  getStudentHistory,
  checkMarkingStatus
};
