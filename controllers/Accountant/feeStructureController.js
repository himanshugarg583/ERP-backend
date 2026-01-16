const { FeeStructure } = require('../../models/admin/fees/FeeStructure');
const { FeeStructureDetail } = require('../../models/admin/fees/FeeStructureDetail');
const { FeeHead } = require('../../models/admin/fees/FeeHead');
const { ClassSection } = require('../../models/admin/Classsection');
const { Op } = require('sequelize');
const sequelize = require('../../config/db');

/**
 * Add Fee Structure
 * @route POST /accountant/fees/fee-structure
 */
const addFeeStructure = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      name,
      class_section_id,
      academic_start_year,
      academic_end_year,
      due_date,
      late_fee_amount,
      late_fee_type,
      fee_details // Array of { fee_head_id, amount, is_mandatory }
    } = req.body;

    // Validation
    if (!name || !academic_start_year || !academic_end_year || !fee_details || fee_details.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Name, academic years, and fee details are required"
      });
    }

    // Calculate total amount
    const total_amount = fee_details.reduce((sum, detail) => sum + parseFloat(detail.amount), 0);

    // Create fee structure
    const feeStructure = await FeeStructure.create({
      name,
      class_section_id,
      academic_start_year,
      academic_end_year,
      due_date,
      late_fee_amount: late_fee_amount || 0,
      late_fee_type: late_fee_type || 'flat',
      total_amount
    }, { transaction });

    // Create fee structure details
    const feeDetailsData = fee_details.map((detail, index) => ({
      fee_structure_id: feeStructure.id,
      fee_head_id: detail.fee_head_id,
      amount: detail.amount,
      is_mandatory: detail.is_mandatory !== undefined ? detail.is_mandatory : true,
      sequence_order: index + 1
    }));

    await FeeStructureDetail.bulkCreate(feeDetailsData, { transaction });

    await transaction.commit();

    // Fetch complete data with associations
    const completeFeeStructure = await FeeStructure.findByPk(feeStructure.id, {
      include: [
        {
          model: FeeStructureDetail,
          as: 'feeDetails',
          include: [{ model: FeeHead, as: 'feeHead' }]
        },
        {
          model: ClassSection,
          as: 'classSection'
        }
      ]
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Fee structure added successfully",
      data: completeFeeStructure
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error adding fee structure:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get All Fee Structures
 * @route GET /accountant/fees/fee-structure?class_section_id=1&status=active
 */
const getFeeStructures = async (req, res) => {
  try {
    const { class_section_id, status, academic_year } = req.query;

    let whereCondition = {};
    if (class_section_id) {
      whereCondition.class_section_id = class_section_id;
    }
    if (status) {
      whereCondition.status = status;
    }
    if (academic_year) {
      whereCondition.academic_start_year = academic_year;
    }

    const feeStructures = await FeeStructure.findAll({
      where: whereCondition,
      include: [
        {
          model: FeeStructureDetail,
          as: 'feeDetails',
          include: [{ model: FeeHead, as: 'feeHead' }]
        },
        {
          model: ClassSection,
          as: 'classSection'
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee structures fetched successfully",
      data: {
        total: feeStructures.length,
        fee_structures: feeStructures
      }
    });

  } catch (error) {
    console.error("Error fetching fee structures:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get Single Fee Structure
 * @route GET /accountant/fees/fee-structure/:id
 */
const getFeeStructureById = async (req, res) => {
  try {
    const { id } = req.params;

    const feeStructure = await FeeStructure.findByPk(id, {
      include: [
        {
          model: FeeStructureDetail,
          as: 'feeDetails',
          include: [{ model: FeeHead, as: 'feeHead' }]
        },
        {
          model: ClassSection,
          as: 'classSection'
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

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee structure fetched successfully",
      data: feeStructure
    });

  } catch (error) {
    console.error("Error fetching fee structure:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Update Fee Structure
 * @route PUT /accountant/fees/fee-structure/:id
 */
const updateFeeStructure = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const {
      name,
      class_section_id,
      academic_start_year,
      academic_end_year,
      due_date,
      late_fee_amount,
      late_fee_type,
      fee_details
    } = req.body;

    const feeStructure = await FeeStructure.findByPk(id);

    if (!feeStructure) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee structure not found"
      });
    }

    // Calculate new total if fee_details provided
    let total_amount = feeStructure.total_amount;
    if (fee_details && fee_details.length > 0) {
      total_amount = fee_details.reduce((sum, detail) => sum + parseFloat(detail.amount), 0);
      
      // Delete old details and create new ones
      await FeeStructureDetail.destroy({
        where: { fee_structure_id: id },
        transaction
      });

      const feeDetailsData = fee_details.map((detail, index) => ({
        fee_structure_id: id,
        fee_head_id: detail.fee_head_id,
        amount: detail.amount,
        is_mandatory: detail.is_mandatory !== undefined ? detail.is_mandatory : true,
        sequence_order: index + 1
      }));

      await FeeStructureDetail.bulkCreate(feeDetailsData, { transaction });
    }

    // Update fee structure
    await feeStructure.update({
      name: name || feeStructure.name,
      class_section_id: class_section_id !== undefined ? class_section_id : feeStructure.class_section_id,
      academic_start_year: academic_start_year || feeStructure.academic_start_year,
      academic_end_year: academic_end_year || feeStructure.academic_end_year,
      due_date: due_date !== undefined ? due_date : feeStructure.due_date,
      late_fee_amount: late_fee_amount !== undefined ? late_fee_amount : feeStructure.late_fee_amount,
      late_fee_type: late_fee_type || feeStructure.late_fee_type,
      total_amount
    }, { transaction });

    await transaction.commit();

    // Fetch updated data
    const updatedFeeStructure = await FeeStructure.findByPk(id, {
      include: [
        {
          model: FeeStructureDetail,
          as: 'feeDetails',
          include: [{ model: FeeHead, as: 'feeHead' }]
        },
        {
          model: ClassSection,
          as: 'classSection'
        }
      ]
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee structure updated successfully",
      data: updatedFeeStructure
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error updating fee structure:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Delete Fee Structure
 * @route DELETE /accountant/fees/fee-structure/:id
 */
const deleteFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;

    const feeStructure = await FeeStructure.findByPk(id);

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee structure not found"
      });
    }

    await feeStructure.destroy();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee structure deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting fee structure:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

module.exports = {
  addFeeStructure,
  getFeeStructures,
  getFeeStructureById,
  updateFeeStructure,
  deleteFeeStructure
};
