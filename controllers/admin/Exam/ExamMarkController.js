const { ExamMark, ExamSchedule, Student, Subject, User, ClassSection, Exam, ExamTimetable, ExamTerm } = require('../../../models');
const { Op } = require('sequelize');
const sequelize = require('../../../config/db');

// 1. Register marks for ONE student (all subjects)
const registerStudentMarks = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      exam_id,
      class_section_id,
      student_id,
      subjects // Array of { subject_id, marks_obtained }
    } = req.body;

    // Validation
    if (!exam_id || !class_section_id || !student_id || !subjects || !Array.isArray(subjects) || subjects.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam ID, class section ID, student ID, and subjects array are required"
      });
    }

    // Find exam schedule based on exam_id and class_section_id
    const examSchedule = await ExamSchedule.findOne({
      where: {
        exam_id: exam_id,
        class_section_id: class_section_id
      }
    });

    if (!examSchedule) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam schedule not found for the given exam and class"
      });
    }

    const exam_schedule_id = examSchedule.id;

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
          marks_obtained: subjectData.marks_obtained
        },
        transaction
      });

      if (!created) {
        // Update existing record
        await mark.update({
          marks_obtained: subjectData.marks_obtained
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
      exam_id,
      class_section_id,
      subject_id,
      students // Array of { student_id, marks_obtained }
    } = req.body;

    // Validation
    if (!exam_id || !class_section_id || !subject_id || !students || !Array.isArray(students) || students.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam ID, class section ID, subject ID, and students array are required"
      });
    }

    // Find exam schedule based on exam_id and class_section_id
    const examSchedule = await ExamSchedule.findOne({
      where: {
        exam_id: exam_id,
        class_section_id: class_section_id
      }
    });

    if (!examSchedule) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam schedule not found for the given exam and class"
      });
    }

    const exam_schedule_id = examSchedule.id;

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
          marks_obtained: studentData.marks_obtained
        },
        transaction
      });

      if (!created) {
        // Update existing record
        await mark.update({
          marks_obtained: studentData.marks_obtained
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
      exam_id,
      class_section_id,
      marks_data // Array of { student_id, subject_id, marks_obtained }
    } = req.body;

    // Validation
    if (!exam_id || !class_section_id || !marks_data || !Array.isArray(marks_data) || marks_data.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam ID, class section ID, and marks_data array are required"
      });
    }

    // Find exam schedule based on exam_id and class_section_id
    const examSchedule = await ExamSchedule.findOne({
      where: {
        exam_id: exam_id,
        class_section_id: class_section_id
      }
    });

    if (!examSchedule) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam schedule not found for the given exam and class"
      });
    }

    const exam_schedule_id = examSchedule.id;

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
          marks_obtained: markData.marks_obtained
        },
        transaction
      });

      if (!created) {
        // Update existing record
        await mark.update({
          marks_obtained: markData.marks_obtained
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
    const { exam_id, class_section_id, subject_id } = req.query;

    // Validation
    if (!exam_id || !class_section_id || !subject_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam ID, class section ID, and subject ID are required"
      });
    }

    // Find exam schedule based on exam_id and class_section_id
    const examSchedule = await ExamSchedule.findOne({
      where: {
        exam_id: exam_id,
        class_section_id: class_section_id
      }
    });

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam schedule not found for the given exam and class"
      });
    }

    const exam_schedule_id = examSchedule.id;

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
    const { exam_id, class_section_id, student_id } = req.query;

    // Validation
    if (!exam_id || !class_section_id || !student_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam ID, class section ID, and student ID are required"
      });
    }

    // Find exam schedule based on exam_id and class_section_id
    const examSchedule = await ExamSchedule.findOne({
      where: {
        exam_id: exam_id,
        class_section_id: class_section_id
      }
    });

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam schedule not found for the given exam and class"
      });
    }

    const exam_schedule_id = examSchedule.id;

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
    const { exam_id, class_section_id } = req.query;

    if (!exam_id || !class_section_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam ID and class section ID are required"
      });
    }

    // Find exam schedule based on exam_id and class_section_id
    const examSchedule = await ExamSchedule.findOne({
      where: {
        exam_id: exam_id,
        class_section_id: class_section_id
      },
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
        message: "Exam schedule not found for the given exam and class"
      });
    }

    const exam_schedule_id = examSchedule.id;

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

// Get all students with marks for a specific subject in an exam
const getStudentsWithMarksBySubject = async (req, res) => {
  try {
    const { exam_id, class_section_id, subject_id } = req.query;

    // Validation
    if (!exam_id || !class_section_id || !subject_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam ID, class section ID, and subject ID are required"
      });
    }

    // Find exam schedule
    const examSchedule = await ExamSchedule.findOne({
      where: {
        exam_id: exam_id,
        class_section_id: class_section_id
      },
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
        message: "Exam schedule not found for the given exam and class"
      });
    }

    const exam_schedule_id = examSchedule.id;

    // Get subject details
    const subject = await Subject.findByPk(subject_id, {
      attributes: ['id', 'subject_name', 'subject_code']
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Subject not found"
      });
    }

    // Get all students from the class section
    const allStudents = await Student.findAll({
      where: {
        class_section_id: class_section_id
      },
      include: [{
        model: User,
        attributes: ['name', 'email']
      }],
      attributes: ['id', 'roll_number'],
      order: [['roll_number', 'ASC']]
    });

    // Get existing marks for these students
    const studentIds = allStudents.map(student => student.id);
    const existingMarks = await ExamMark.findAll({
      where: {
        exam_schedule_id,
        subject_id,
        student_id: studentIds
      }
    });

    // Create a map of student_id to marks
    const marksMap = {};
    existingMarks.forEach(mark => {
      marksMap[mark.student_id] = {
        id: mark.id,
        marks_obtained: mark.marks_obtained
      };
    });

    // Combine students with their marks
    const studentsWithMarks = allStudents.map(student => {
      const marks = marksMap[student.id] || null;
      return {
        student_id: student.id,
        roll_number: student.roll_number,
        student_name: student.User?.name,
        email: student.User?.email,
        marks_obtained: marks ? marks.marks_obtained : null,
        mark_id: marks ? marks.id : null,
        is_marked: marks !== null
      };
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Students with marks fetched successfully",
      data: {
        exam_info: {
          exam_id: exam_id,
          exam_name: examSchedule.exam?.exam_name,
          class: `${examSchedule.classSection?.class_name} ${examSchedule.classSection?.section_name}`,
          class_section_id: class_section_id
        },
        subject_info: {
          subject_id: subject.id,
          subject_name: subject.subject_name,
          subject_code: subject.subject_code
        },
        total_students: studentsWithMarks.length,
        marked_students: studentsWithMarks.filter(s => s.is_marked).length,
        students: studentsWithMarks
      }
    });

  } catch (error) {
    console.error("Get Students With Marks By Subject Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get complete exam history for a student with all terms, exams, and marks
const getStudentCompleteExamHistory = async (req, res) => {
  try {
    const { student_id } = req.query;

    // Validation
    if (!student_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Student ID is required"
      });
    }

    // Get student details
    const student = await Student.findByPk(student_id, {
      include: [{
        model: User,
        attributes: ['name', 'email']
      }],
      attributes: ['id', 'roll_number', 'class_section_id']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Get class section details
    const classSection = await ClassSection.findByPk(student.class_section_id, {
      attributes: ['id', 'class_name', 'section_name']
    });

    // Get all exam terms
    const examTerms = await ExamTerm.findAll({
      order: [['academic_year', 'DESC']],
      attributes: ['id', 'term_name', 'academic_year']
    });

    // Build complete exam history
    const examHistory = [];

    for (const term of examTerms) {
      // Get all exams for this term
      const exams = await Exam.findAll({
        where: { term_id: term.id },
        attributes: ['id', 'exam_name', 'description', 'start_date', 'end_date', 'status'],
        order: [['start_date', 'ASC']]
      });

      const termExams = [];

      for (const exam of exams) {
        // Get exam schedule for this student's class
        const examSchedule = await ExamSchedule.findOne({
          where: {
            exam_id: exam.id,
            class_section_id: student.class_section_id
          },
          attributes: ['id', 'total_marks', 'passing_marks', 'remarks']
        });

        if (examSchedule) {
          // Get exam timetable entries
          const timetableEntries = await ExamTimetable.findAll({
            where: {
              exam_schedule_id: examSchedule.id
            },
            include: [{
              model: Subject,
              as: 'subject',
              attributes: ['id', 'subject_name', 'subject_code']
            }],
            attributes: ['id', 'exam_date', 'start_time', 'end_time', 'max_marks', 'room_no'],
            order: [['exam_date', 'ASC'], ['start_time', 'ASC']]
          });

          // Get marks for this student in this exam
          const studentMarks = await ExamMark.findAll({
            where: {
              exam_schedule_id: examSchedule.id,
              student_id: student_id
            },
            include: [{
              model: Subject,
              as: 'subject',
              attributes: ['id', 'subject_name', 'subject_code']
            }],
            attributes: ['id', 'subject_id', 'marks_obtained']
          });

          // Create marks map by subject_id
          const marksMap = {};
          studentMarks.forEach(mark => {
            marksMap[mark.subject_id] = {
              marks_obtained: mark.marks_obtained
            };
          });

          // Combine timetable with marks
          const subjects = timetableEntries.map(entry => {
            const marks = marksMap[entry.subject?.id];
            return {
              subject_id: entry.subject?.id,
              subject_name: entry.subject?.subject_name,
              subject_code: entry.subject?.subject_code,
              exam_date: entry.exam_date,
              start_time: entry.start_time,
              end_time: entry.end_time,
              max_marks: entry.max_marks,
              room_no: entry.room_no,
              marks_obtained: marks ? marks.marks_obtained : null,
              is_marked: marks !== undefined
            };
          });

          // Calculate total marks
          const totalMarksObtained = studentMarks.reduce((sum, mark) => 
            sum + (parseFloat(mark.marks_obtained) || 0), 0
          );

          const markedSubjects = subjects.filter(s => s.is_marked).length;
          const isPassed = totalMarksObtained >= parseFloat(examSchedule.passing_marks);

          termExams.push({
            exam_id: exam.id,
            exam_name: exam.exam_name,
            description: exam.description,
            start_date: exam.start_date,
            end_date: exam.end_date,
            status: exam.status,
            total_marks: examSchedule.total_marks,
            passing_marks: examSchedule.passing_marks,
            total_marks_obtained: totalMarksObtained,
            total_subjects: subjects.length,
            marked_subjects: markedSubjects,
            is_passed: markedSubjects === subjects.length ? isPassed : null,
            subjects: subjects
          });
        }
      }

      if (termExams.length > 0) {
        examHistory.push({
          term_id: term.id,
          term_name: term.term_name,
          academic_year: term.academic_year,
          total_exams: termExams.length,
          exams: termExams
        });
      }
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student complete exam history fetched successfully",
      data: {
        student_info: {
          student_id: student.id,
          student_name: student.User?.name,
          email: student.User?.email,
          roll_number: student.roll_number,
          class: `${classSection?.class_name} ${classSection?.section_name}`,
          class_section_id: student.class_section_id
        },
        total_terms: examHistory.length,
        total_exams: examHistory.reduce((sum, term) => sum + term.total_exams, 0),
        exam_history: examHistory
      }
    });

  } catch (error) {
    console.error("Get Student Complete Exam History Error:", error);
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
  getCompleteMarksheet,
  getStudentsWithMarksBySubject,
  getStudentCompleteExamHistory
};
