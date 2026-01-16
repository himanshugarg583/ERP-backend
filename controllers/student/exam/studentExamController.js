const { ExamMark, ExamSchedule, Student, Subject, User, ClassSection, Exam, ExamTerm } = require('../../../models');
const { Op } = require('sequelize');

// Get exam-wise details for a student (all subjects)
const getStudentExamDetails = async (req, res) => {
  try {
    // Get student_id from authenticated user's token
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

    // Get all exam schedules for student's class
    const examSchedules = await ExamSchedule.findAll({
      where: { class_section_id },
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'exam_name', 'description', 'start_date', 'end_date', 'status'],
          include: [
            {
              model: ExamTerm,
              as: 'term',
              attributes: ['id', 'term_name', 'academic_year']
            }
          ]
        }
      ],
      order: [[{model: Exam, as: 'exam'}, 'start_date', 'DESC']]
    });

    if (!examSchedules || examSchedules.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No exams found for your class"
      });
    }

    // Get marks for all exams
    const examDetails = [];

    for (const schedule of examSchedules) {
      // Get all marks for this exam schedule and student
      const marks = await ExamMark.findAll({
        where: {
          exam_schedule_id: schedule.id,
          student_id: student_id
        },
        include: [
          {
            model: Subject,
            as: 'subject',
            attributes: ['id', 'subject_name', 'subject_code']
          }
        ],
        order: [[{model: Subject, as: 'subject'}, 'subject_name', 'ASC']]
      });

      // Calculate total marks obtained and total maximum marks
      let totalMarksObtained = 0;
      let totalMaximumMarks = 0;
      let subjectCount = marks.length;
      let passCount = 0;
      let failCount = 0;

      const subjectDetails = marks.map(mark => {
        const marksObtained = parseFloat(mark.marks_obtained) || 0;
        const maxMarks = parseFloat(schedule.total_marks) || 100;
        const passingMarks = parseFloat(schedule.passing_marks) || 33;
        
        totalMarksObtained += marksObtained;
        totalMaximumMarks += maxMarks;

        const isPassed = marksObtained >= passingMarks;
        if (isPassed) {
          passCount++;
        } else {
          failCount++;
        }

        const percentage = maxMarks > 0 ? ((marksObtained / maxMarks) * 100).toFixed(2) : 0;

        return {
          subject_id: mark.subject_id,
          subject_name: mark.subject?.subject_name,
          subject_code: mark.subject?.subject_code,
          marks_obtained: marksObtained,
          total_marks: maxMarks,
          passing_marks: passingMarks,
          percentage: parseFloat(percentage),
          grade: mark.grade,
          remarks: mark.remarks,
          status: isPassed ? 'Pass' : 'Fail'
        };
      });

      // Calculate overall percentage
      const overallPercentage = totalMaximumMarks > 0 
        ? ((totalMarksObtained / totalMaximumMarks) * 100).toFixed(2)
        : 0;

      // Determine overall result
      const overallResult = failCount === 0 && subjectCount > 0 ? 'Pass' : 'Fail';

      examDetails.push({
        exam_id: schedule.exam?.id,
        exam_name: schedule.exam?.exam_name,
        exam_description: schedule.exam?.description,
        exam_status: schedule.exam?.status,
        start_date: schedule.exam?.start_date,
        end_date: schedule.exam?.end_date,
        term: {
          term_id: schedule.exam?.term?.id,
          term_name: schedule.exam?.term?.term_name,
          academic_year: schedule.exam?.term?.academic_year
        },
        exam_schedule_id: schedule.id,
        total_marks: parseFloat(schedule.total_marks),
        passing_marks: parseFloat(schedule.passing_marks),
        summary: {
          total_subjects: subjectCount,
          subjects_passed: passCount,
          subjects_failed: failCount,
          total_marks_obtained: parseFloat(totalMarksObtained.toFixed(2)),
          total_maximum_marks: parseFloat(totalMaximumMarks),
          overall_percentage: parseFloat(overallPercentage),
          overall_result: overallResult
        },
        subjects: subjectDetails
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam details retrieved successfully",
      data: {
        student: {
          student_id: student.id,
          student_name: student.student_name,
          admission_number: student.admission_number,
          roll_number: student.roll_number,
          class: student.ClassSection?.class_name,
          section: student.ClassSection?.section_name
        },
        total_exams: examDetails.length,
        exams: examDetails
      }
    });

  } catch (error) {
    console.error("Error fetching student exam details:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get details for a specific exam
const getStudentSpecificExamDetails = async (req, res) => {
  try {
    const { exam_id } = req.query;
    const userId = req.user.id;

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
          attributes: ['id', 'exam_name', 'description', 'start_date', 'end_date', 'status'],
          include: [
            {
              model: ExamTerm,
              as: 'term',
              attributes: ['id', 'term_name', 'academic_year']
            }
          ]
        }
      ]
    });

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam schedule not found for this exam and your class"
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
          attributes: ['id', 'subject_name', 'subject_code']
        }
      ],
      order: [[{model: Subject, as: 'subject'}, 'subject_name', 'ASC']]
    });

    // Calculate statistics
    let totalMarksObtained = 0;
    let totalMaximumMarks = 0;
    let passCount = 0;
    let failCount = 0;

    const subjectDetails = marks.map(mark => {
      const marksObtained = parseFloat(mark.marks_obtained) || 0;
      const maxMarks = parseFloat(examSchedule.total_marks) || 100;
      const passingMarks = parseFloat(examSchedule.passing_marks) || 33;
      
      totalMarksObtained += marksObtained;
      totalMaximumMarks += maxMarks;

      const isPassed = marksObtained >= passingMarks;
      if (isPassed) {
        passCount++;
      } else {
        failCount++;
      }

      const percentage = maxMarks > 0 ? ((marksObtained / maxMarks) * 100).toFixed(2) : 0;

      return {
        subject_id: mark.subject_id,
        subject_name: mark.subject?.subject_name,
        subject_code: mark.subject?.subject_code,
        marks_obtained: marksObtained,
        total_marks: maxMarks,
        passing_marks: passingMarks,
        percentage: parseFloat(percentage),
        grade: mark.grade,
        remarks: mark.remarks,
        status: isPassed ? 'Pass' : 'Fail'
      };
    });

    const overallPercentage = totalMaximumMarks > 0 
      ? ((totalMarksObtained / totalMaximumMarks) * 100).toFixed(2)
      : 0;

    const overallResult = failCount === 0 && marks.length > 0 ? 'Pass' : 'Fail';

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam details retrieved successfully",
      data: {
        student: {
          student_id: student.id,
          student_name: student.student_name,
          admission_number: student.admission_number,
          roll_number: student.roll_number,
          class: student.ClassSection?.class_name,
          section: student.ClassSection?.section_name
        },
        exam: {
          exam_id: examSchedule.exam?.id,
          exam_name: examSchedule.exam?.exam_name,
          exam_description: examSchedule.exam?.description,
          exam_status: examSchedule.exam?.status,
          start_date: examSchedule.exam?.start_date,
          end_date: examSchedule.exam?.end_date,
          term: {
            term_id: examSchedule.exam?.term?.id,
            term_name: examSchedule.exam?.term?.term_name,
            academic_year: examSchedule.exam?.term?.academic_year
          }
        },
        summary: {
          total_subjects: marks.length,
          subjects_passed: passCount,
          subjects_failed: failCount,
          total_marks_obtained: parseFloat(totalMarksObtained.toFixed(2)),
          total_maximum_marks: parseFloat(totalMaximumMarks),
          overall_percentage: parseFloat(overallPercentage),
          overall_result: overallResult
        },
        subjects: subjectDetails
      }
    });

  } catch (error) {
    console.error("Error fetching specific exam details:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

module.exports = {
  getStudentExamDetails,
  getStudentSpecificExamDetails
};
