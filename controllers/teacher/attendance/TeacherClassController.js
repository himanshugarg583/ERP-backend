const { Teacher, ClassSection, Student, User } = require('../../../models');

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

    const classes = assignedClasses.map(item => ({
      class_section_id: item.id,
      class_name: item.class_name,
      section_name: item.section_name,
      display_name: `${item.class_name} ${item.section_name}`
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
      user_id: student.user_id,
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

// Bulk mark student attendance
const markClassAttendance = async (req, res) => {
  try {
    const { class_section_id, date, marked_by, attendance } = req.body;

    // Validation
    if (!class_section_id || !date || !marked_by || !attendance || !Array.isArray(attendance)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "class_section_id, date, marked_by, and attendance array are required"
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
      const { user_id, status } = item;

      // Validate required fields
      if (!user_id || !status) {
        errors.push({
          user_id,
          error: "user_id and status are required"
        });
        continue;
      }

      // Validate status
      if (!['present', 'absent', 'leave'].includes(status)) {
        errors.push({
          user_id,
          error: "status must be present, absent, or leave"
        });
        continue;
      }

      // Find student by user_id and verify belongs to this class
      const student = await Student.findOne({
        where: {
          user_id: user_id,
          class_section_id: class_section_id
        }
      });

      if (!student) {
        errors.push({
          user_id,
          error: "Student not found or does not belong to this class"
        });
        continue;
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
            status: status,
            marked_by: marked_by
          }
        });

        if (!created) {
          // Update existing record
          await attendanceRecord.update({
            status: status,
            marked_by: marked_by,
            class_section_id: class_section_id
          });
        }

        results.push({
          user_id: user_id,
          student_id: student.id,
          status: status,
          action: created ? 'created' : 'updated'
        });

      } catch (error) {
        errors.push({
          user_id,
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
      user_id: record.student?.user_id,
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

module.exports = {
  getTeacherClasses,
  getClassStudentList,
  markClassAttendance,
  getClassAttendanceByDate
};
