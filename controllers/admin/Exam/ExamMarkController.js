const { ExamMark, ExamSchedule, Student, Subject, User, ClassSection, Exam, ExamTimetable } = require('../../../models');
const { Op } = require('sequelize');
const sequelize = require('../../../config/db');

// 1. Register marks for ONE student (all subjects)
const registerStudentMarks = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      exam_schedule_id,
      student_id,
      subjects // Array of { subject_id, marks_obtained, grade, remarks }
    } = req.body;

    // Validation
    if (!exam_schedule_id || !student_id || !subjects || !Array.isArray(subjects) || subjects.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam schedule ID, student ID, and subjects array are required"
      });
    }

    // Check if exam schedule exists
    const examSchedule = await ExamSchedule.findByPk(exam_schedule_id);
    if (!examSchedule) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam schedule not found"
      });
    }

    // Check if student exists
    const student = await Student.findByPk(student_id);
    if (!student) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Validate all subject IDs exist
    const subjectIds = subjects.map(item => item.subject_id);
    const subjectRecords = await Subject.findAll({
      where: { id: subjectIds }
    });

    if (subjectRecords.length !== subjectIds.length) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "One or more subjects not found"
      });
    }

    // Create or update marks for each subject
    const marksData = [];
    for (const subjectData of subjects) {
      const [mark, created] = await ExamMark.findOrCreate({
        where: {
          exam_schedule_id,
          student_id,
          subject_id: subjectData.subject_id
        },
        defaults: {
          marks_obtained: subjectData.marks_obtained,
          grade: subjectData.grade || null,
          remarks: subjectData.remarks || null
        },
        transaction
      });

      if (!created) {
        // Update existing record
        await mark.update({
          marks_obtained: subjectData.marks_obtained,
          grade: subjectData.grade || null,
          remarks: subjectData.remarks || null
        }, { transaction });
      }

      marksData.push(mark);
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student marks registered successfully",
      data: marksData
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Register Student Marks Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// 2. Update marks for ONE subject (all students)
const updateSubjectMarks = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      exam_schedule_id,
      subject_id,
      students // Array of { student_id, marks_obtained, grade, remarks }
    } = req.body;

    // Validation
    if (!exam_schedule_id || !subject_id || !students || !Array.isArray(students) || students.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam schedule ID, subject ID, and students array are required"
      });
    }

    // Check if exam schedule exists
    const examSchedule = await ExamSchedule.findByPk(exam_schedule_id);
    if (!examSchedule) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam schedule not found"
      });
    }

    // Check if subject exists
    const subject = await Subject.findByPk(subject_id);
    if (!subject) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Subject not found"
      });
    }

    // Validate all student IDs exist
    const studentIds = students.map(item => item.student_id);
    const studentRecords = await Student.findAll({
      where: { id: studentIds }
    });

    if (studentRecords.length !== studentIds.length) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "One or more students not found"
      });
    }

    // Create or update marks for each student
    const marksData = [];
    for (const studentData of students) {
      const [mark, created] = await ExamMark.findOrCreate({
        where: {
          exam_schedule_id,
          student_id: studentData.student_id,
          subject_id
        },
        defaults: {
          marks_obtained: studentData.marks_obtained,
          grade: studentData.grade || null,
          remarks: studentData.remarks || null
        },
        transaction
      });

      if (!created) {
        // Update existing record
        await mark.update({
          marks_obtained: studentData.marks_obtained,
          grade: studentData.grade || null,
          remarks: studentData.remarks || null
        }, { transaction });
      }

      marksData.push(mark);
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Subject marks updated successfully",
      data: marksData
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Update Subject Marks Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// 3. Bulk update marks for ALL students and ALL subjects
const bulkUpdateAllMarks = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      exam_schedule_id,
      marks_data // Array of { student_id, subject_id, marks_obtained, grade, remarks }
    } = req.body;

    // Validation
    if (!exam_schedule_id || !marks_data || !Array.isArray(marks_data) || marks_data.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam schedule ID and marks_data array are required"
      });
    }

    // Check if exam schedule exists
    const examSchedule = await ExamSchedule.findByPk(exam_schedule_id);
    if (!examSchedule) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam schedule not found"
      });
    }

    // Create or update marks
    const marksResults = [];
    for (const markData of marks_data) {
      if (!markData.student_id || !markData.subject_id || markData.marks_obtained === undefined) {
        continue; // Skip invalid entries
      }

      const [mark, created] = await ExamMark.findOrCreate({
        where: {
          exam_schedule_id,
          student_id: markData.student_id,
          subject_id: markData.subject_id
        },
        defaults: {
          marks_obtained: markData.marks_obtained,
          grade: markData.grade || null,
          remarks: markData.remarks || null
        },
        transaction
      });

      if (!created) {
        // Update existing record
        await mark.update({
          marks_obtained: markData.marks_obtained,
          grade: markData.grade || null,
          remarks: markData.remarks || null
        }, { transaction });
      }

      marksResults.push(mark);
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Bulk marks update completed. ${marksResults.length} records processed.`,
      data: marksResults
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Bulk Update All Marks Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get marks by exam schedule and subject
const getMarksByScheduleAndSubject = async (req, res) => {
  try {
    const { exam_schedule_id, subject_id } = req.query;

    // Validation
    if (!exam_schedule_id || !subject_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam schedule ID and subject ID are required"
      });
    }

    const marks = await ExamMark.findAll({
      where: {
        exam_schedule_id,
        subject_id
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'roll_number'],
          include: [{
            model: User,
            attributes: ['name']
          }]
        }
      ],
      order: [[{ model: Student, as: 'student' }, 'roll_number', 'ASC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Marks fetched successfully",
      data: marks
    });

  } catch (error) {
    console.error("Get Marks By Schedule And Subject Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all marks for a student in an exam
const getStudentMarksByExam = async (req, res) => {
  try {
    const { exam_schedule_id, student_id } = req.query;

    // Validation
    if (!exam_schedule_id || !student_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam schedule ID and student ID are required"
      });
    }

    const marks = await ExamMark.findAll({
      where: {
        exam_schedule_id,
        student_id
      },
      include: [
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
        }
      ]
    });

    // Calculate total marks
    const totalMarks = marks.reduce((sum, mark) => sum + (parseFloat(mark.marks_obtained) || 0), 0);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student marks fetched successfully",
      data: {
        marks,
        total_marks: totalMarks,
        total_subjects: marks.length
      }
    });

  } catch (error) {
    console.error("Get Student Marks By Exam Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get complete marksheet for exam schedule (all students, all subjects)
const getCompleteMarksheet = async (req, res) => {
  try {
    const { exam_schedule_id } = req.params;

    if (!exam_schedule_id || isNaN(parseInt(exam_schedule_id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid exam schedule ID is required"
      });
    }

    // Get exam schedule details
    const examSchedule = await ExamSchedule.findByPk(exam_schedule_id, {
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['exam_name']
        },
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['class_name', 'section_name']
        }
      ]
    });

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam schedule not found"
      });
    }

    // Get all marks for this exam
    const marks = await ExamMark.findAll({
      where: {
        exam_schedule_id
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'roll_number'],
          include: [{
            model: User,
            attributes: ['name']
          }]
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
        }
      ],
      order: [
        [{ model: Student, as: 'student' }, 'roll_number', 'ASC'],
        [{ model: Subject, as: 'subject' }, 'subject_name', 'ASC']
      ]
    });

    // Group marks by student
    const studentMarks = {};
    marks.forEach(mark => {
      const studentId = mark.student_id;
      if (!studentMarks[studentId]) {
        studentMarks[studentId] = {
          student_id: studentId,
          student_name: mark.student?.User?.name,
          roll_number: mark.student?.roll_number,
          subjects: [],
          total_marks: 0
        };
      }
      
      studentMarks[studentId].subjects.push({
        subject_id: mark.subject?.id,
        subject_name: mark.subject?.subject_name,
        subject_code: mark.subject?.subject_code,
        marks_obtained: mark.marks_obtained,
        grade: mark.grade,
        remarks: mark.remarks
      });
      
      studentMarks[studentId].total_marks += parseFloat(mark.marks_obtained) || 0;
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Complete marksheet fetched successfully",
      data: {
        exam_info: {
          exam_name: examSchedule.exam?.exam_name,
          class: `${examSchedule.classSection?.class_name} ${examSchedule.classSection?.section_name}`,
          total_marks: examSchedule.total_marks,
          passing_marks: examSchedule.passing_marks
        },
        students: Object.values(studentMarks)
      }
    });

  } catch (error) {
    console.error("Get Complete Marksheet Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  registerStudentMarks,
  updateSubjectMarks,
  bulkUpdateAllMarks,
  getMarksByScheduleAndSubject,
  getStudentMarksByExam,
  getCompleteMarksheet
};
