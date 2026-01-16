const { ExamTerm, Exam } = require('../../../models');
const { Op } = require('sequelize');

// Create exam term
const createExamTerm = async (req, res) => {
  try {
    const {
      term_name,
      academic_year
    } = req.body;

    // Validation
    if (!term_name || !academic_year) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Term name and academic year are required"
      });
    }

    // Check if term already exists for the academic year
    const existingTerm = await ExamTerm.findOne({
      where: {
        term_name: term_name,
        academic_year: academic_year
      }
    });

    if (existingTerm) {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: "Exam term already exists for this academic year"
      });
    }

    // Create exam term
    const examTerm = await ExamTerm.create({
      term_name,
      academic_year
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Exam term created successfully",
      data: examTerm
    });

  } catch (error) {
    console.error("Create Exam Term Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all exam terms
const getAllExamTerms = async (req, res) => {
  try {
    const {
      academic_year,
      term_name,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    // Build where conditions
    const whereConditions = {};

    if (academic_year) whereConditions.academic_year = academic_year;
    if (term_name) whereConditions.term_name = { [Op.like]: `%${term_name}%` };

    // Validate sort fields
    const allowedSortFields = ['term_name', 'academic_year', 'created_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = ['ASC', 'DESC'].includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

    const examTerms = await ExamTerm.findAll({
      where: whereConditions,
      include: [
        {
          model: Exam,
          as: 'exams',
          attributes: ['id', 'exam_name', 'start_date', 'end_date', 'status']
        }
      ],
      order: [[sortField, sortDirection]]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam terms fetched successfully",
      data: examTerms
    });

  } catch (error) {
    console.error("Get All Exam Terms Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get single exam term
const getSingleExamTerm = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid exam term ID is required"
      });
    }

    const examTerm = await ExamTerm.findByPk(id, {
      include: [
        {
          model: Exam,
          as: 'exams',
          attributes: ['id', 'exam_name', 'description', 'start_date', 'end_date', 'status']
        }
      ]
    });

    if (!examTerm) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam term not found"
      });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam term fetched successfully",
      data: examTerm
    });

  } catch (error) {
    console.error("Get Single Exam Term Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Update exam term
const updateExamTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      term_name,
      academic_year
    } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid exam term ID is required"
      });
    }

    const examTerm = await ExamTerm.findByPk(id);

    if (!examTerm) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam term not found"
      });
    }

    // Build update object
    const updateData = {};

    if (term_name !== undefined) updateData.term_name = term_name;
    if (academic_year !== undefined) updateData.academic_year = academic_year;

    // Check for duplicate term name in same academic year (if updating these fields)
    if (updateData.term_name || updateData.academic_year) {
      const checkTermName = updateData.term_name || examTerm.term_name;
      const checkAcademicYear = updateData.academic_year || examTerm.academic_year;
      
      const existingTerm = await ExamTerm.findOne({
        where: {
          term_name: checkTermName,
          academic_year: checkAcademicYear,
          id: { [Op.ne]: id }
        }
      });

      if (existingTerm) {
        return res.status(409).json({
          success: false,
          statusCode: 409,
          message: "Another exam term with this name already exists for this academic year"
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

    await examTerm.update(updateData);

    // Fetch updated exam term
    const updatedExamTerm = await ExamTerm.findByPk(id, {
      include: [
        {
          model: Exam,
          as: 'exams',
          attributes: ['id', 'exam_name', 'status']
        }
      ]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam term updated successfully",
      data: {
        exam_term: updatedExamTerm,
        updated_fields: Object.keys(updateData)
      }
    });

  } catch (error) {
    console.error("Update Exam Term Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete exam term
const deleteExamTerm = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid exam term ID is required"
      });
    }

    const examTerm = await ExamTerm.findByPk(id, {
      include: [
        {
          model: Exam,
          as: 'exams',
          attributes: ['id']
        }
      ]
    });

    if (!examTerm) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam term not found"
      });
    }

    // Check if there are associated exams
    if (examTerm.exams && examTerm.exams.length > 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Cannot delete exam term. There are ${examTerm.exams.length} exam(s) associated with this term. Please delete or reassign the exams first.`
      });
    }

    const deletedData = {
      id: examTerm.id,
      term_name: examTerm.term_name,
      academic_year: examTerm.academic_year,
      status: examTerm.status
    };

    await examTerm.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam term deleted successfully",
      data: {
        deleted_term: deletedData
      }
    });

  } catch (error) {
    console.error("Delete Exam Term Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};



module.exports = {
  createExamTerm,
  getAllExamTerms,
  getSingleExamTerm,
  updateExamTerm,
  deleteExamTerm,
 
};