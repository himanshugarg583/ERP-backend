const { Teacher, ClassSection, Student, User, StudentLeave } = require('../../../models');
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

    // Validate date format
    const attendanceDate = new Date(date);
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

      if (approvedLeave) {
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

    // Validate date format
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid date format"
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

      if (approvedLeave) {
        effectiveStatus = 'leave';
      }

      const attendanceRecord = await studentsAttendances.findOne({
        where: {
          student_id: student.id,
          class_section_id: class_section_id,
          date: date
        }
      });

      if (!attendanceRecord) {
        errors.push({
          student_id,
          error: "Attendance record not found for this student on current date"
        });
        continue;
      }

      await attendanceRecord.update({
        status: effectiveStatus,
        marked_by: teacher.id
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

module.exports = {
  getTeacherClasses,
  getClassStudentList,
  getStudentsByClass,
  markClassAttendance,
  getClassAttendanceByDate,
  updateClassAttendance
};
