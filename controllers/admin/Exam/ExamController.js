const { Exam, ExamTerm, ExamSchedule } = require('../../../models');
const { Op } = require('sequelize');

// Create exam
const createExam = async (req, res) => {
  try {
    const {
      term_id,
      exam_name,
      description,
      start_date,
      end_date,
      status
    } = req.body;

    // Validation
    if (!term_id || !exam_name) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Term ID and exam name are required"
      });
    }

    // Check if exam term exists
    const examTerm = await ExamTerm.findByPk(term_id);
    if (!examTerm) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam term not found"
      });
    }

    // Validate date range
    if (start_date && end_date) {
      const startDateObj = new Date(start_date);
      const endDateObj = new Date(end_date);
      
      if (endDateObj < startDateObj) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "End date must be after start date"
        });
      }
    }

    // Check if exam already exists for this term
    const existingExam = await Exam.findOne({
      where: {
        term_id: term_id,
        exam_name: exam_name
      }
    });

    if (existingExam) {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: "Exam with this name already exists for this term"
      });
    }

    // Create exam
    const exam = await Exam.create({
      term_id,
      exam_name,
      description: description || null,
      start_date: start_date || null,
      end_date: end_date || null,
      status: status || 'scheduled'
    });

    // Fetch created exam with term details
    const createdExam = await Exam.findByPk(exam.id, {
      include: [
        {
          model: ExamTerm,
          as: 'term',
          attributes: ['id', 'term_name', 'academic_year']
        }
      ]
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Exam created successfully",
      data: createdExam
    });

  } catch (error) {
    console.error("Create Exam Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all exams
const getAllExams = async (req, res) => {
  try {
    const {
      term_id,
      status,
      exam_name,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    // Build where conditions
    const whereConditions = {};

    if (term_id) whereConditions.term_id = term_id;
    if (status) whereConditions.status = status;
    if (exam_name) whereConditions.exam_name = { [Op.like]: `%${exam_name}%` };

    // Validate sort fields
    const allowedSortFields = ['exam_name', 'start_date', 'end_date', 'status', 'created_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = ['ASC', 'DESC'].includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

    const exams = await Exam.findAll({
      where: whereConditions,
      include: [
        {
          model: ExamTerm,
          as: 'term',
          attributes: ['id', 'term_name', 'academic_year', 'status']
        }
      ],
      order: [[sortField, sortDirection]]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exams fetched successfully",
      data: exams
    });

  } catch (error) {
    console.error("Get All Exams Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get single exam
const getSingleExam = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid exam ID is required"
      });
    }

    const exam = await Exam.findByPk(id, {
      include: [
        {
          model: ExamTerm,
          as: 'term',
          attributes: ['id', 'term_name', 'academic_year', 'start_date', 'end_date', 'status']
        },
        {
          model: ExamSchedule,
          as: 'examSchedules',
          attributes: ['id', 'class_section_id', 'subject_id', 'exam_date', 'start_time', 'end_time', 'max_marks']
        }
      ]
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam not found"
      });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam fetched successfully",
      data: exam
    });

  } catch (error) {
    console.error("Get Single Exam Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Update exam
const updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      term_id,
      exam_name,
      description,
      start_date,
      end_date,
      status
    } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid exam ID is required"
      });
    }

    const exam = await Exam.findByPk(id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam not found"
      });
    }

    // Build update object
    const updateData = {};

    if (term_id !== undefined) {
      // Check if exam term exists
      const examTerm = await ExamTerm.findByPk(term_id);
      if (!examTerm) {
        return res.status(404).json({
          success: false,
          statusCode: 404,
          message: "Exam term not found"
        });
      }
      updateData.term_id = term_id;
    }

    if (exam_name !== undefined) updateData.exam_name = exam_name;
    if (description !== undefined) updateData.description = description;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    
    if (status !== undefined) {
      if (!['scheduled', 'ongoing', 'completed'].includes(status)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Status must be 'scheduled', 'ongoing', or 'completed'"
        });
      }
      updateData.status = status;
    }

    // Validate date range if both dates are being updated
    if (updateData.start_date || updateData.end_date) {
      const newStartDate = updateData.start_date || exam.start_date;
      const newEndDate = updateData.end_date || exam.end_date;
      
      if (newStartDate && newEndDate) {
        const startDateObj = new Date(newStartDate);
        const endDateObj = new Date(newEndDate);
        
        if (endDateObj < startDateObj) {
          return res.status(400).json({
            success: false,
            statusCode: 400,
            message: "End date must be after start date"
          });
        }
      }
    }

    // Check for duplicate exam name in same term (if updating these fields)
    if (updateData.exam_name || updateData.term_id) {
      const checkExamName = updateData.exam_name || exam.exam_name;
      const checkTermId = updateData.term_id || exam.term_id;
      
      const existingExam = await Exam.findOne({
        where: {
          exam_name: checkExamName,
          term_id: checkTermId,
          id: { [Op.ne]: id }
        }
      });

      if (existingExam) {
        return res.status(409).json({
          success: false,
          statusCode: 409,
          message: "Another exam with this name already exists for this term"
        });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "No valid fields provided for update"
      });
    }

    await exam.update(updateData);

    // Fetch updated exam
    const updatedExam = await Exam.findByPk(id, {
      include: [
        {
          model: ExamTerm,
          as: 'term',
          attributes: ['id', 'term_name', 'academic_year', 'status']
        }
      ]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam updated successfully",
      data: {
        exam: updatedExam,
        updated_fields: Object.keys(updateData)
      }
    });

  } catch (error) {
    console.error("Update Exam Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete exam
const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid exam ID is required"
      });
    }

    const exam = await Exam.findByPk(id, {
      include: [
        {
          model: ExamSchedule,
          as: 'examSchedules',
          attributes: ['id']
        }
      ]
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam not found"
      });
    }

    // Check if there are associated schedules
    if (exam.examSchedules && exam.examSchedules.length > 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Cannot delete exam. There are ${exam.examSchedules.length} schedule(s) associated with this exam. Please delete the schedules first.`
      });
    }

    const deletedData = {
      id: exam.id,
      exam_name: exam.exam_name,
      status: exam.status
    };

    await exam.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam deleted successfully",
      data: {
        deleted_exam: deletedData
      }
    });

  } catch (error) {
    console.error("Delete Exam Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  createExam,
  getAllExams,
  getSingleExam,
  updateExam,
  deleteExam
};
