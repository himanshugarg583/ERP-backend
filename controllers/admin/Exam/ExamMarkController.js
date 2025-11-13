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
      where: { id: { [Op.in]: subjectIds } }
    });

    if (subjectRecords.length !== subjectIds.length) {
      await transaction.rollback();
      const foundIds = subjectRecords.map(s => s.id);
      const missingIds = subjectIds.filter(id => !foundIds.includes(id));
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Subject(s) not found with ID(s): ${missingIds.join(', ')}`
      });
    }

    // Validate subjects data
    for (const subject of subjects) {
      if (!subject.subject_id || subject.marks_obtained === undefined) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Each subject entry must have subject_id and marks_obtained"
        });
      }
    }

    const createdMarks = [];
    const updatedMarks = [];

    // Create or update marks for each subject
    for (const subject of subjects) {
      const existingMark = await ExamMark.findOne({
        where: {
          exam_schedule_id,
          student_id,
          subject_id: subject.subject_id
        }
      });

      if (existingMark) {
        // Update existing mark
        await existingMark.update({
          marks_obtained: subject.marks_obtained,
          grade: subject.grade || null,
          remarks: subject.remarks || null
        }, { transaction });
        updatedMarks.push(existingMark.id);
      } else {
        // Create new mark
        const newMark = await ExamMark.create({
          exam_schedule_id,
          student_id,
          subject_id: subject.subject_id,
          marks_obtained: subject.marks_obtained,
          grade: subject.grade || null,
          remarks: subject.remarks || null
        }, { transaction });
        createdMarks.push(newMark.id);
      }
    }

    await transaction.commit();

    // Fetch all marks for this student
    const allMarks = await ExamMark.findAll({
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
      ],
      order: [[{ model: Subject, as: 'subject' }, 'subject_name', 'ASC']]
    });

    // Calculate totals
    const totalMarksObtained = allMarks.reduce((sum, mark) => sum + parseFloat(mark.marks_obtained || 0), 0);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student marks registered successfully",
      data: {
        created_count: createdMarks.length,
        updated_count: updatedMarks.length,
        total_marks_obtained: totalMarksObtained,
        marks: allMarks
      }
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

// 2. Update marks for ONE subject (all students in class)
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
      where: { id: { [Op.in]: studentIds } }
    });

    if (studentRecords.length !== studentIds.length) {
      await transaction.rollback();
      const foundIds = studentRecords.map(s => s.id);
      const missingIds = studentIds.filter(id => !foundIds.includes(id));
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Student(s) not found with ID(s): ${missingIds.join(', ')}`
      });
    }

    // Validate students data
    for (const student of students) {
      if (!student.student_id || student.marks_obtained === undefined) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Each student entry must have student_id and marks_obtained"
        });
      }
    }

    const createdMarks = [];
    const updatedMarks = [];

    // Create or update marks for each student
    for (const student of students) {
      const existingMark = await ExamMark.findOne({
        where: {
          exam_schedule_id,
          student_id: student.student_id,
          subject_id
        }
      });

      if (existingMark) {
        // Update existing mark
        await existingMark.update({
          marks_obtained: student.marks_obtained,
          grade: student.grade || null,
          remarks: student.remarks || null
        }, { transaction });
        updatedMarks.push(existingMark.id);
      } else {
        // Create new mark
        const newMark = await ExamMark.create({
          exam_schedule_id,
          student_id: student.student_id,
          subject_id,
          marks_obtained: student.marks_obtained,
          grade: student.grade || null,
          remarks: student.remarks || null
        }, { transaction });
        createdMarks.push(newMark.id);
      }
    }

    await transaction.commit();

    // Fetch all marks for this subject
    const allMarks = await ExamMark.findAll({
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
            attributes: ['name', 'email']
          }]
        }
      ],
      order: [[{ model: Student, as: 'student' }, 'roll_number', 'ASC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Subject marks updated successfully",
      data: {
        created_count: createdMarks.length,
        updated_count: updatedMarks.length,
        total_students: allMarks.length,
        marks: allMarks
      }
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

// 3. Bulk update marks for ALL students (all subjects)
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

    // Validate all student IDs exist
    const studentIds = [...new Set(marks_data.map(item => item.student_id))];
    const studentRecords = await Student.findAll({
      where: { id: { [Op.in]: studentIds } }
    });

    if (studentRecords.length !== studentIds.length) {
      await transaction.rollback();
      const foundIds = studentRecords.map(s => s.id);
      const missingIds = studentIds.filter(id => !foundIds.includes(id));
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Student(s) not found with ID(s): ${missingIds.join(', ')}`
      });
    }

    // Validate all subject IDs exist
    const subjectIds = [...new Set(marks_data.map(item => item.subject_id))];
    const subjectRecords = await Subject.findAll({
      where: { id: { [Op.in]: subjectIds } }
    });

    if (subjectRecords.length !== subjectIds.length) {
      await transaction.rollback();
      const foundIds = subjectRecords.map(s => s.id);
      const missingIds = subjectIds.filter(id => !foundIds.includes(id));
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Subject(s) not found with ID(s): ${missingIds.join(', ')}`
      });
    }

    // Validate marks data
    for (const mark of marks_data) {
      if (!mark.student_id || !mark.subject_id || mark.marks_obtained === undefined) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Each mark entry must have student_id, subject_id, and marks_obtained"
        });
      }
    }

    const createdMarks = [];
    const updatedMarks = [];

    // Create or update marks for each entry
    for (const mark of marks_data) {
      const existingMark = await ExamMark.findOne({
        where: {
          exam_schedule_id,
          student_id: mark.student_id,
          subject_id: mark.subject_id
        }
      });

      if (existingMark) {
        // Update existing mark
        await existingMark.update({
          marks_obtained: mark.marks_obtained,
          grade: mark.grade || null,
          remarks: mark.remarks || null
        }, { transaction });
        updatedMarks.push(existingMark.id);
      } else {
        // Create new mark
        const newMark = await ExamMark.create({
          exam_schedule_id,
          student_id: mark.student_id,
          subject_id: mark.subject_id,
          marks_obtained: mark.marks_obtained,
          grade: mark.grade || null,
          remarks: mark.remarks || null
        }, { transaction });
        createdMarks.push(newMark.id);
      }
    }

    await transaction.commit();

    // Fetch all marks for this exam schedule
    const allMarks = await ExamMark.findAll({
      where: { exam_schedule_id },
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

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Bulk marks updated successfully",
      data: {
        created_count: createdMarks.length,
        updated_count: updatedMarks.length,
        total_marks: allMarks.length,
        marks: allMarks
      }
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
            attributes: ['name', 'email']
          }]
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
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
    console.error("Get Marks Error:", error);
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
          model: Student,
          as: 'student',
          attributes: ['id', 'roll_number'],
          include: [{
            model: User,
            attributes: ['name', 'email']
          }]
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
        }
      ],
      order: [[{ model: Subject, as: 'subject' }, 'subject_name', 'ASC']]
    });

    // Calculate totals
    const totalMarksObtained = marks.reduce((sum, mark) => sum + parseFloat(mark.marks_obtained || 0), 0);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student marks fetched successfully",
      data: {
        marks: marks,
        total_marks_obtained: totalMarksObtained,
        subject_count: marks.length
      }
    });

  } catch (error) {
    console.error("Get Student Marks Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get complete marksheet for exam schedule
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

    const examSchedule = await ExamSchedule.findByPk(exam_schedule_id, {
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'exam_name', 'start_date', 'end_date']
        },
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name']
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

    const marks = await ExamMark.findAll({
      where: { exam_schedule_id },
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
          student_id: mark.student.id,
          roll_number: mark.student.roll_number,
          student_name: mark.student.User?.name,
          subjects: [],
          total_marks_obtained: 0
        };
      }
      studentMarks[studentId].subjects.push({
        subject_id: mark.subject.id,
        subject_name: mark.subject.subject_name,
        marks_obtained: mark.marks_obtained,
        grade: mark.grade
      });
      studentMarks[studentId].total_marks_obtained += parseFloat(mark.marks_obtained || 0);
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Complete marksheet fetched successfully",
      data: {
        exam_info: {
          exam_name: examSchedule.exam?.exam_name,
          class_name: examSchedule.classSection?.class_name,
          section_name: examSchedule.classSection?.section_name,
          total_marks: examSchedule.total_marks,
          passing_marks: examSchedule.passing_marks
        },
        marksheet: Object.values(studentMarks)
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
