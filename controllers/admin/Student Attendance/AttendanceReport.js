const { studentsAttendances, ClassSection, Student, User } = require('../../../models');

// Get class attendance list by class_section_id and date (admin)
const getClassAttendanceByDateForAdmin = async (req, res) => {
  try {
    const { class_section_id, date } = req.query;

    if (!class_section_id || !date) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'class_section_id and date are required'
      });
    }

    const classSection = await ClassSection.findByPk(class_section_id);
    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Class section not found'
      });
    }

    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid date format'
      });
    }

    const records = await studentsAttendances.findAll({
      where: {
        class_section_id,
        date
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'roll_number'],
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

    const attendance = records.map((record) => ({
      attendance_id: record.id,
      student_id: record.student?.id,
      student_name: record.student?.User?.name || 'N/A',
      roll_number: record.student?.roll_number,
      status: record.status,
      marked_by: record.marked_by,
      marked_at: record.updated_at
    }));

    const summary = {
      total: attendance.length,
      present: attendance.filter((a) => a.status === 'present').length,
      absent: attendance.filter((a) => a.status === 'absent').length,
      leave: attendance.filter((a) => a.status === 'leave').length
    };

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Class attendance fetched successfully',
      data: {
        class_info: {
          class_section_id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name,
          display_name: `${classSection.class_name} ${classSection.section_name}`
        },
        date,
        summary,
        attendance
      }
    });
  } catch (error) {
    console.error('Get Class Attendance By Date For Admin Error:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error'
    });
  }
};

// Get attendance report by class
const getAttendanceReportByClass = async (req, res) => {
  try {
    const { class_name, section_name, date } = req.query;

    // Validation
    if (!class_name || !section_name || !date) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Class name, section name, and date are required"
      });
    }

    // Find the class section
    const classSection = await ClassSection.findOne({
      where: {
        class_name: class_name,
        section_name: section_name
      },
      attributes: ['id', 'class_name', 'section_name', 'room_No']
    });

    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    // Get all students in the class with their attendance
    const students = await Student.findAll({
      where: {
        class_section_id: classSection.id
      },
      attributes: ['id', 'roll_number'],
      include: [
        {
          model: User,
          attributes: ['id', 'name']
        },
        {
          model: studentsAttendances,
          as: 'studentsAttendances',
          where: {
            date: date
          },
          attributes: ['id', 'date', 'status', 'marked_by'],
          required: false
        }
      ],
      order: [['roll_number', 'ASC']]
    });

    // Format the response
    const attendanceReport = students.map(student => ({
      student_id: student.id,
      student_name: student.User.name,
      roll_number: student.roll_number,
      class_name: classSection.class_name,
      section_name: classSection.section_name,
      attendance_status: student.studentsAttendances && student.studentsAttendances.length > 0
        ? student.studentsAttendances[0].status
        : 'not_marked'
    }));

    // Calculate summary
    const presentCount = attendanceReport.filter(s => s.attendance_status === 'present').length;
    const absentCount = attendanceReport.filter(s => s.attendance_status === 'absent').length;
    const lateCount = attendanceReport.filter(s => s.attendance_status === 'late').length;
    const notMarkedCount = attendanceReport.filter(s => s.attendance_status === 'not_marked').length;

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Attendance report fetched successfully",
      data: {
        class_info: {
          class_name: classSection.class_name,
          section_name: classSection.section_name,
          room_No: classSection.room_No,
          date: date
        },
        summary: {
          total_students: students.length,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          not_marked: notMarkedCount
        },
        attendance_records: attendanceReport
      }
    });

  } catch (error) {
    console.error("Get Attendance Report Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get monthly attendance report by class
const getMonthlyAttendanceReport = async (req, res) => {
  try {
    const { class_name, section_name, month, year } = req.query;

    // Validation
    if (!class_name || !section_name || !month || !year) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Class name, section name, month, and year are required"
      });
    }

    // Validate month (1-12)
    const monthNum = parseInt(month);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Month must be a number between 1 and 12"
      });
    }

    // Validate year
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid year"
      });
    }

    // Find the class section
    const classSection = await ClassSection.findOne({
      where: {
        class_name: class_name,
        section_name: section_name
      },
      attributes: ['id', 'class_name', 'section_name', 'room_No']
    });

    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    // Calculate date range for the month
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${lastDay}`;

    // Get all students in the class
    const students = await Student.findAll({
      where: {
        class_section_id: classSection.id
      },
      attributes: ['id', 'roll_number'],
      include: [
        {
          model: User,
          attributes: ['id', 'name']
        },
        {
          model: studentsAttendances,
          as: 'studentsAttendances',
          where: {
            date: {
              [require('sequelize').Op.between]: [startDate, endDate]
            }
          },
          attributes: ['id', 'date', 'status'],
          required: false
        }
      ],
      order: [['roll_number', 'ASC']]
    });

    // Format the response with attendance statistics
    const monthlyReport = students.map(student => {
      const attendanceRecords = student.studentsAttendances || [];
      
      const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
      const absentCount = attendanceRecords.filter(a => a.status === 'absent').length;
      const lateCount = attendanceRecords.filter(a => a.status === 'late').length;
      const totalMarked = attendanceRecords.length;

      return {
        student_id: student.id,
        student_name: student.User.name,
        roll_number: student.roll_number,
        attendance_summary: {
          total_days_marked: totalMarked,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          attendance_percentage: totalMarked > 0 
            ? ((presentCount + lateCount) / totalMarked * 100).toFixed(2) 
            : '0.00'
        }
      };
    });

    // Calculate class-level summary
    const totalStudents = students.length;
    const classAvgAttendance = monthlyReport.reduce((sum, student) => {
      return sum + parseFloat(student.attendance_summary.attendance_percentage);
    }, 0) / (totalStudents || 1);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Monthly attendance report fetched successfully",
      data: {
        report_info: {
          class_name: classSection.class_name,
          section_name: classSection.section_name,
          room_No: classSection.room_No,
          month: monthNames[monthNum - 1],
          year: yearNum,
          date_range: {
            from: startDate,
            to: endDate
          }
        },
        class_summary: {
          total_students: totalStudents,
          average_attendance_percentage: classAvgAttendance.toFixed(2)
        },
        student_reports: monthlyReport
      }
    });

  } catch (error) {
    console.error("Get Monthly Attendance Report Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get class-wise attendance summary for a specific date
const getClassWiseAttendanceSummary = async (req, res) => {
  try {
    const { date } = req.query;

    // Validation
    if (!date) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Date is required"
      });
    }

    // Get all class sections
    const classSections = await ClassSection.findAll({
      attributes: ['id', 'class_name', 'section_name', 'room_No'],
      order: [['class_name', 'ASC'], ['section_name', 'ASC']]
    });

    if (!classSections || classSections.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No class sections found"
      });
    }

    // Process each class section
    const classWiseReport = await Promise.all(
      classSections.map(async (classSection) => {
        // Get all students in this class
        const students = await Student.findAll({
          where: {
            class_section_id: classSection.id
          },
          attributes: ['id'],
          include: [
            {
              model: studentsAttendances,
              as: 'studentsAttendances',
              where: {
                date: date
              },
              attributes: ['status'],
              required: false
            }
          ]
        });

        const totalStudents = students.length;
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        let notMarkedCount = 0;

        students.forEach(student => {
          if (student.studentsAttendances && student.studentsAttendances.length > 0) {
            const status = student.studentsAttendances[0].status;
            if (status === 'present') presentCount++;
            else if (status === 'absent') absentCount++;
            else if (status === 'late') lateCount++;
          } else {
            notMarkedCount++;
          }
        });

        const attendancePercentage = totalStudents > 0
          ? ((presentCount + lateCount) / totalStudents * 100).toFixed(2)
          : '0.00';

        return {
          class_id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name,
          room_No: classSection.room_No,
          summary: {
            total_students: totalStudents,
            present: presentCount,
            absent: absentCount,
            late: lateCount,
            not_marked: notMarkedCount,
            attendance_percentage: attendancePercentage
          }
        };
      })
    );

    // Calculate overall summary
    const overallSummary = classWiseReport.reduce(
      (acc, classReport) => {
        acc.total_students += classReport.summary.total_students;
        acc.present += classReport.summary.present;
        acc.absent += classReport.summary.absent;
        acc.late += classReport.summary.late;
        acc.not_marked += classReport.summary.not_marked;
        return acc;
      },
      { total_students: 0, present: 0, absent: 0, late: 0, not_marked: 0 }
    );

    const overallAttendancePercentage = overallSummary.total_students > 0
      ? ((overallSummary.present + overallSummary.late) / overallSummary.total_students * 100).toFixed(2)
      : '0.00';

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Class-wise attendance summary fetched successfully",
      data: {
        date: date,
        overall_summary: {
          ...overallSummary,
          attendance_percentage: overallAttendancePercentage
        },
        total_classes: classSections.length,
        class_wise_reports: classWiseReport
      }
    });

  } catch (error) {
    console.error("Get Class-wise Attendance Summary Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  getAttendanceReportByClass,
  getMonthlyAttendanceReport,
  getClassWiseAttendanceSummary,
  getClassAttendanceByDateForAdmin
};