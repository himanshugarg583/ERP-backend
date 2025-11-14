const { ExamTimetable, ExamSchedule, Exam, ExamTerm, ClassSection, Subject, Teacher, User } = require('../../../models');
const { Op } = require('sequelize');
const sequelize = require('../../../config/db');

// Create exam timetable for a class (creates ExamSchedule + ExamTimetable entries)
const createExamTimetable = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      exam_id,
      class_section_id,
      remarks,
      timetable // Array of subjects with their exam details
    } = req.body;

    // Validation
    if (!exam_id || !class_section_id || !timetable || !Array.isArray(timetable) || timetable.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam ID, class section ID, and timetable array are required"
      });
    }

    // Check if exam exists
    const exam = await Exam.findByPk(exam_id);
    if (!exam) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam not found"
      });
    }

    // Check if class section exists
    const classSection = await ClassSection.findByPk(class_section_id);
    if (!classSection) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    // Check if exam schedule already exists for this class and exam
    const existingSchedule = await ExamSchedule.findOne({
      where: {
        exam_id,
        class_section_id
      }
    });

    if (existingSchedule) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: "Exam schedule already exists for this class and exam"
      });
    }

    // Validate all subject IDs exist
    const subjectIds = timetable.map(item => item.subject_id);
    const subjects = await Subject.findAll({
      where: { id: { [Op.in]: subjectIds } }
    });

    if (subjects.length !== subjectIds.length) {
      await transaction.rollback();
      const foundIds = subjects.map(s => s.id);
      const missingIds = subjectIds.filter(id => !foundIds.includes(id));
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Subject(s) not found with ID(s): ${missingIds.join(', ')}`
      });
    }

    // Validate teacher IDs if provided
    const teacherIds = timetable
      .filter(item => item.invigilator_teacher_id)
      .map(item => item.invigilator_teacher_id);
    
    if (teacherIds.length > 0) {
      const teachers = await Teacher.findAll({
        where: { id: { [Op.in]: teacherIds } }
      });

      if (teachers.length !== teacherIds.length) {
        await transaction.rollback();
        const foundIds = teachers.map(t => t.id);
        const missingIds = teacherIds.filter(id => !foundIds.includes(id));
        return res.status(404).json({
          success: false,
          statusCode: 404,
          message: `Teacher(s) not found with ID(s): ${missingIds.join(', ')}`
        });
      }
    }

    // Validate timetable entries
    for (const entry of timetable) {
      if (!entry.subject_id || !entry.exam_date) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Each timetable entry must have subject_id and exam_date"
        });
      }

      // Validate time range
      if (entry.start_time && entry.end_time) {
        const start = new Date(`2000-01-01 ${entry.start_time}`);
        const end = new Date(`2000-01-01 ${entry.end_time}`);
        if (end <= start) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            statusCode: 400,
            message: "End time must be after start time"
          });
        }
      }
    }

    // Calculate total marks and passing marks from timetable
    const calculatedTotalMarks = timetable.reduce((sum, entry) => {
      return sum + (parseFloat(entry.max_marks) || 100);
    }, 0);

    const calculatedPassingMarks = timetable.reduce((sum, entry) => {
      return sum + (parseFloat(entry.passing_marks) || 33);
    }, 0);

    // Create exam schedule with calculated marks
    const examSchedule = await ExamSchedule.create({
      exam_id,
      class_section_id,
      total_marks: calculatedTotalMarks,
      passing_marks: calculatedPassingMarks,
      remarks: remarks || null
    }, { transaction });

    // Create exam timetable entries
    const timetableEntries = timetable.map(entry => ({
      exam_schedule_id: examSchedule.id,
      subject_id: entry.subject_id,
      exam_date: entry.exam_date,
      start_time: entry.start_time || null,
      end_time: entry.end_time || null,
      max_marks: entry.max_marks || 100,
      passing_marks: entry.passing_marks || 33,
      invigilator_teacher_id: entry.invigilator_teacher_id || null,
      room_no: entry.room_no || null
    }));

    const createdTimetables = await ExamTimetable.bulkCreate(timetableEntries, { transaction });

    await transaction.commit();

    // Fetch created data with associations
    const result = await ExamSchedule.findByPk(examSchedule.id, {
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
        },
        {
          model: ExamTimetable,
          as: 'examTimetables',
          include: [
            {
              model: Subject,
              as: 'subject',
              attributes: ['id', 'subject_name', 'subject_code']
            },
            {
              model: Teacher,
              as: 'invigilator',
              attributes: ['id'],
              include: [{
                model: User,
                attributes: ['name', 'email']
              }]
            }
          ]
        }
      ]
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Exam timetable created successfully",
      data: result
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Create Exam Timetable Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get exam timetable by exam schedule ID
const getExamTimetableBySchedule = async (req, res) => {
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
          attributes: ['id', 'exam_name', 'start_date', 'end_date', 'status']
        },
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name']
        },
        {
          model: ExamTimetable,
          as: 'examTimetables',
          include: [
            {
              model: Subject,
              as: 'subject',
              attributes: ['id', 'subject_name', 'subject_code']
            },
            {
              model: Teacher,
              as: 'invigilator',
              attributes: ['id'],
              include: [{
                model: User,
                attributes: ['name', 'email']
              }]
            }
          ],
          order: [['exam_date', 'ASC'], ['start_time', 'ASC']]
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

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam timetable fetched successfully",
      data: examSchedule
    });

  } catch (error) {
    console.error("Get Exam Timetable Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get exam timetable by class and exam
const getExamTimetableByClassAndExam = async (req, res) => {
  try {
    const { exam_id, class_section_id } = req.query;

    if (!exam_id || !class_section_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam ID and class section ID are required"
      });
    }

    const examSchedule = await ExamSchedule.findOne({
      where: {
        exam_id,
        class_section_id
      },
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'exam_name', 'start_date', 'end_date', 'status']
        },
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name']
        },
        {
          model: ExamTimetable,
          as: 'examTimetables',
          include: [
            {
              model: Subject,
              as: 'subject',
              attributes: ['id', 'subject_name', 'subject_code']
            },
            {
              model: Teacher,
              as: 'invigilator',
              attributes: ['id'],
              include: [{
                model: User,
                attributes: ['name', 'email']
              }]
            }
          ],
          order: [['exam_date', 'ASC'], ['start_time', 'ASC']]
        }
      ]
    });

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam timetable not found for this class and exam"
      });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam timetable fetched successfully",
      data: examSchedule
    });

  } catch (error) {
    console.error("Get Exam Timetable Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all exam schedules for an exam
const getAllExamSchedulesByExam = async (req, res) => {
  try {
    const { exam_id } = req.params;

    if (!exam_id || isNaN(parseInt(exam_id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid exam ID is required"
      });
    }

    const examSchedules = await ExamSchedule.findAll({
      where: { exam_id },
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'exam_name', 'start_date', 'end_date', 'status']
        },
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name']
        },
        {
          model: ExamTimetable,
          as: 'examTimetables',
          include: [
            {
              model: Subject,
              as: 'subject',
              attributes: ['id', 'subject_name', 'subject_code']
            }
          ]
        }
      ],
      order: [['class_section_id', 'ASC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam schedules fetched successfully",
      data: examSchedules
    });

  } catch (error) {
    console.error("Get Exam Schedules Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Update single exam timetable entry
const updateExamTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      subject_id,
      exam_date,
      start_time,
      end_time,
      max_marks,
      passing_marks,
      invigilator_teacher_id,
      room_no
    } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid exam timetable ID is required"
      });
    }

    const timetableEntry = await ExamTimetable.findByPk(id);

    if (!timetableEntry) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam timetable entry not found"
      });
    }

    // Build update object
    const updateData = {};

    if (subject_id !== undefined) {
      const subject = await Subject.findByPk(subject_id);
      if (!subject) {
        return res.status(404).json({
          success: false,
          statusCode: 404,
          message: "Subject not found"
        });
      }
      updateData.subject_id = subject_id;
    }

    if (exam_date !== undefined) updateData.exam_date = exam_date;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (max_marks !== undefined) updateData.max_marks = max_marks;
    if (passing_marks !== undefined) updateData.passing_marks = passing_marks;
    if (room_no !== undefined) updateData.room_no = room_no;

    if (invigilator_teacher_id !== undefined) {
      if (invigilator_teacher_id) {
        const teacher = await Teacher.findByPk(invigilator_teacher_id);
        if (!teacher) {
          return res.status(404).json({
            success: false,
            statusCode: 404,
            message: "Teacher not found"
          });
        }
      }
      updateData.invigilator_teacher_id = invigilator_teacher_id;
    }

    // Validate time range if updating times
    if (updateData.start_time || updateData.end_time) {
      const newStartTime = updateData.start_time || timetableEntry.start_time;
      const newEndTime = updateData.end_time || timetableEntry.end_time;
      
      if (newStartTime && newEndTime) {
        const start = new Date(`2000-01-01 ${newStartTime}`);
        const end = new Date(`2000-01-01 ${newEndTime}`);
        if (end <= start) {
          return res.status(400).json({
            success: false,
            statusCode: 400,
            message: "End time must be after start time"
          });
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "No valid fields provided for update"
      });
    }

    await timetableEntry.update(updateData);

    // Fetch updated entry
    const updatedEntry = await ExamTimetable.findByPk(id, {
      include: [
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
        },
        {
          model: Teacher,
          as: 'invigilator',
          attributes: ['id'],
          include: [{
            model: User,
            attributes: ['name', 'email']
          }]
        }
      ]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam timetable entry updated successfully",
      data: {
        timetable_entry: updatedEntry,
        updated_fields: Object.keys(updateData)
      }
    });

  } catch (error) {
    console.error("Update Exam Timetable Entry Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete exam timetable entry
const deleteExamTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid exam timetable ID is required"
      });
    }

    const timetableEntry = await ExamTimetable.findByPk(id);

    if (!timetableEntry) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam timetable entry not found"
      });
    }

    const deletedData = {
      id: timetableEntry.id,
      exam_schedule_id: timetableEntry.exam_schedule_id,
      subject_id: timetableEntry.subject_id,
      exam_date: timetableEntry.exam_date
    };

    await timetableEntry.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam timetable entry deleted successfully",
      data: {
        deleted_entry: deletedData
      }
    });

  } catch (error) {
    console.error("Delete Exam Timetable Entry Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete entire exam schedule with all timetable entries
const deleteExamSchedule = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { exam_schedule_id } = req.params;

    if (!exam_schedule_id || isNaN(parseInt(exam_schedule_id))) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid exam schedule ID is required"
      });
    }

    const examSchedule = await ExamSchedule.findByPk(exam_schedule_id, {
      include: [{
        model: ExamTimetable,
        as: 'examTimetables'
      }]
    });

    if (!examSchedule) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam schedule not found"
      });
    }

    const deletedData = {
      exam_schedule_id: examSchedule.id,
      exam_id: examSchedule.exam_id,
      class_section_id: examSchedule.class_section_id,
      timetable_entries_deleted: examSchedule.examTimetables?.length || 0
    };

    // Delete all timetable entries
    await ExamTimetable.destroy({
      where: { exam_schedule_id },
      transaction
    });

    // Delete exam schedule
    await examSchedule.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam schedule and all timetable entries deleted successfully",
      data: deletedData
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Delete Exam Schedule Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all scheduled exams for a class (only basic info)
const getClassScheduledExams = async (req, res) => {
  try {
    const { class_section_id } = req.params;

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

    // Get all exam schedules for this class
    const examSchedules = await ExamSchedule.findAll({
      where: { class_section_id },
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'exam_name'],
          include: [
            {
              model: ExamTerm,
              as: 'term',
              attributes: ['id', 'term_name', 'academic_year']
            }
          ]
        }
      ],
      attributes: ['id', 'total_marks', 'passing_marks', 'created_at'],
      order: [[{ model: Exam, as: 'exam' }, 'exam_name', 'ASC']]
    });

    // Format response
    const scheduledExams = examSchedules.map(schedule => ({
      exam_schedule_id: schedule.id,
      term_name: schedule.exam?.term?.term_name,
      academic_year: schedule.exam?.term?.academic_year,
      exam_name: schedule.exam?.exam_name,
      total_marks: schedule.total_marks,
      passing_marks: schedule.passing_marks,
      created_at: schedule.created_at
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Scheduled exams fetched successfully",
      data: {
        class_info: {
          class_id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name
        },
        total_scheduled_exams: scheduledExams.length,
        scheduled_exams: scheduledExams
      }
    });

  } catch (error) {
    console.error("Get Class Scheduled Exams Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  createExamTimetable,
  getExamTimetableBySchedule,
  getExamTimetableByClassAndExam,
  getAllExamSchedulesByExam,
  updateExamTimetableEntry,
  deleteExamTimetableEntry,
  deleteExamSchedule,
  getClassScheduledExams
};
