const { fee_structures, ClassSection } = require('../../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../../models');


const createFeeStructure = async (req, res) => {
  try {
    const {
      class_section_id,
      academic_year,
      fee_name,
      head1_name,
      head1_amount,
      head2_name,
      head2_amount,
      head3_name,
      head3_amount
    } = req.body;

    // Validation
    if (!fee_name) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Fee name is required"
      });
    }

    // Validate amounts
    const amount1 = parseFloat(head1_amount) || 0;
    const amount2 = parseFloat(head2_amount) || 0;
    const amount3 = parseFloat(head3_amount) || 0;

    // Calculate total amount
    const total_amount = amount1 + amount2 + amount3;

    if (total_amount <= 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Total amount must be greater than 0"
      });
    }

    // Check if class section exists (if provided)
    if (class_section_id) {
      const classSection = await ClassSection.findByPk(class_section_id);
      if (!classSection) {
        return res.status(404).json({
          success: false,
          statusCode: 404,
          message: "Class section not found"
        });
      }
    }

    // Check for duplicate fee structure
    const existingFee = await fee_structures.findOne({
      where: {
        class_section_id: class_section_id || null,
        academic_year: academic_year || null,
        fee_name: fee_name
      }
    });

    if (existingFee) {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: "Fee structure with this name already exists for the selected class and academic year"
      });
    }

    // Create fee structure
    const feeStructure = await fee_structures.create({
      class_section_id: class_section_id || null,
      academic_year: academic_year || null,
      fee_name,
      head1_name: head1_name || null,
      head1_amount: amount1,
      head2_name: head2_name || null,
      head2_amount: amount2,
      head3_name: head3_name || null,
      head3_amount: amount3,
      total_amount,
      created_at: new Date(),
      updated_at: new Date()
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Fee structure created successfully",
      data: feeStructure
    });

  } catch (error) {
    console.error("Create Fee Structure Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

const getAllFeeStructures = async (req, res) => {
  try {
    const { class_section_id, academic_year, page = 1, limit = 10 } = req.query;

    // Build where clause
    const whereClause = {};
    if (class_section_id) {
      whereClause.class_section_id = class_section_id;
    }
    if (academic_year) {
      whereClause.academic_year = academic_year;
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: feeStructures } = await fee_structures.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee structures fetched successfully",
      data: {
        feeStructures,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: count,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error("Get All Fee Structures Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};


const getSingleFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;

    const feeStructure = await fee_structures.findOne({
      where: { id },
      include: [
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name'],
          required: false
        }
      ]
    });

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee structure not found"
      });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee structure fetched successfully",
      data: feeStructure
    });

  } catch (error) {
    console.error("Get Single Fee Structure Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};


const updateFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      class_section_id,
      academic_year,
      fee_name,
      head1_name,
      head1_amount,
      head2_name,
      head2_amount,
      head3_name,
      head3_amount
    } = req.body;

    // Find existing fee structure
    const feeStructure = await fee_structures.findByPk(id);
    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee structure not found"
      });
    }

    // Validation
    if (fee_name && fee_name.trim() === '') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Fee name cannot be empty"
      });
    }

    // Validate amounts
    const amount1 = head1_amount !== undefined ? parseFloat(head1_amount) || 0 : feeStructure.head1_amount;
    const amount2 = head2_amount !== undefined ? parseFloat(head2_amount) || 0 : feeStructure.head2_amount;
    const amount3 = head3_amount !== undefined ? parseFloat(head3_amount) || 0 : feeStructure.head3_amount;

    // Calculate total amount
    const total_amount = amount1 + amount2 + amount3;

    if (total_amount <= 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Total amount must be greater than 0"
      });
    }

    // Check if class section exists (if provided)
    if (class_section_id && class_section_id !== feeStructure.class_section_id) {
      const classSection = await ClassSection.findByPk(class_section_id);
      if (!classSection) {
        return res.status(404).json({
          success: false,
          statusCode: 404,
          message: "Class section not found"
        });
      }
    }

    // Check for duplicate fee structure (excluding current one)
    if (fee_name && fee_name !== feeStructure.fee_name) {
      const existingFee = await fee_structures.findOne({
        where: {
          id: { [Op.ne]: id },
          class_section_id: class_section_id || feeStructure.class_section_id,
          academic_year: academic_year || feeStructure.academic_year,
          fee_name: fee_name
        }
      });

      if (existingFee) {
        return res.status(409).json({
          success: false,
          statusCode: 409,
          message: "Fee structure with this name already exists for the selected class and academic year"
        });
      }
    }

    // Update fee structure
    await feeStructure.update({
      class_section_id: class_section_id !== undefined ? class_section_id : feeStructure.class_section_id,
      academic_year: academic_year !== undefined ? academic_year : feeStructure.academic_year,
      fee_name: fee_name || feeStructure.fee_name,
      head1_name: head1_name !== undefined ? head1_name : feeStructure.head1_name,
      head1_amount: amount1,
      head2_name: head2_name !== undefined ? head2_name : feeStructure.head2_name,
      head2_amount: amount2,
      head3_name: head3_name !== undefined ? head3_name : feeStructure.head3_name,
      head3_amount: amount3,
      total_amount,
      updated_at: new Date()
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee structure updated successfully",
      data: feeStructure
    });

  } catch (error) {
    console.error("Update Fee Structure Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};


const deleteFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;

    const feeStructure = await fee_structures.findByPk(id);
    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee structure not found"
      });
    }

    // Check if fee structure is being used by any student fees
    // You can uncomment this when StudentFee model is ready
    /*
    const studentFeeCount = await StudentFee.count({
      where: { fee_structure_id: id }
    });

    if (studentFeeCount > 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Cannot delete fee structure. It is being used by student fees."
      });
    }
    */

    await feeStructure.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee structure deleted successfully"
    });

  } catch (error) {
    console.error("Delete Fee Structure Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};


const getFeeStructuresByClass = async (req, res) => {
  try {
    const { class_section_id } = req.params;
    const { academic_year } = req.query;

    // Check if class section exists
    const classSection = await ClassSection.findByPk(class_section_id);
    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    const whereClause = { class_section_id };
    if (academic_year) {
      whereClause.academic_year = academic_year;
    }

    const feeStructures = await fee_structures.findAll({
      where: whereClause,
      include: [
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee structures fetched successfully",
      data: {
        classSection: {
          id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name
        },
        feeStructures
      }
    });

  } catch (error) {
    console.error("Get Fee Structures by Class Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};


const getFeeStructureStats = async (req, res) => {
  try {
    const { academic_year } = req.query;

    let whereClause = {};
    if (academic_year) {
      whereClause.academic_year = academic_year;
    }

    // Total fee structures
    const totalStructures = await fee_structures.count({ where: whereClause });

    // Fee structures by class
    const structuresByClass = await fee_structures.count({
      where: {
        ...whereClause,
        class_section_id: { [Op.ne]: null }
      },
      group: ['class_section_id'],
      include: [
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['class_name', 'section_name']
        }
      ]
    });

    // General fee structures (not class specific)
    const generalStructures = await fee_structures.count({
      where: {
        ...whereClause,
        class_section_id: null
      }
    });

    // Average total amount
    const avgAmount = await fee_structures.findOne({
      where: whereClause,
      attributes: [
        [sequelize.fn('AVG', sequelize.col('total_amount')), 'average_amount'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_sum'],
        [sequelize.fn('MIN', sequelize.col('total_amount')), 'min_amount'],
        [sequelize.fn('MAX', sequelize.col('total_amount')), 'max_amount']
      ],
      raw: true
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee structure statistics fetched successfully",
      data: {
        totalStructures,
        generalStructures,
        classSpecificStructures: totalStructures - generalStructures,
        statistics: {
          averageAmount: parseFloat(avgAmount?.average_amount || 0).toFixed(2),
          totalSum: parseFloat(avgAmount?.total_sum || 0).toFixed(2),
          minAmount: parseFloat(avgAmount?.min_amount || 0).toFixed(2),
          maxAmount: parseFloat(avgAmount?.max_amount || 0).toFixed(2)
        }
      }
    });

  } catch (error) {
    console.error("Get Fee Structure Stats Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

module.exports = {
  createFeeStructure,
  getAllFeeStructures,
  getSingleFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  getFeeStructuresByClass,
  getFeeStructureStats
};