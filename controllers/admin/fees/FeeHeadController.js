const { FeeHead, FeeStructureDetail } = require('../../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../../models');

// Create new fee head
const createFeeHead = async (req, res) => {
  try {
    const {
      name,
      description,
      is_mandatory = true,
      status = 'active'
    } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Fee head name is required and cannot be empty"
      });
    }

    // Check name length
    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Fee head name cannot exceed 100 characters"
      });
    }

    // Check for duplicate name (MySQL case-insensitive)
    const existingFeeHead = await FeeHead.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('name')),
        sequelize.fn('LOWER', name.trim())
      )
    });

    if (existingFeeHead) {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: "Fee head with this name already exists"
      });
    }

    

    // Validate status
    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Status must be either 'active' or 'inactive'"
      });
    }

    // Create fee head
    const feeHead = await FeeHead.create({
      name: name.trim(),
      description: description?.trim() || null,
      is_mandatory: Boolean(is_mandatory),
     
      status: status || 'active'
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Fee head created successfully",
      data: feeHead
    });

  } catch (error) {
    console.error("Create Fee Head Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get all fee heads
const getAllFeeHeads = async (req, res) => {
  try {
    const feeHeads = await FeeHead.findAll({
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee heads fetched successfully",
      data: {
        feeHeads,
        total_records: feeHeads.length
      }
    });

  } catch (error) {
    console.error("Get All Fee Heads Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};



// Update fee head
const updateFeeHead = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      is_mandatory,
      status
    } = req.body;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid fee head ID is required"
      });
    }

    // Find existing fee head
    const feeHead = await FeeHead.findByPk(id);
    if (!feeHead) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee head not found"
      });
    }

    // Build update object with only provided fields
    const updateData = {};

    // Update name if provided
    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Fee head name cannot be empty"
        });
      }

      if (name.length > 100) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Fee head name cannot exceed 100 characters"
        });
      }

      // Check for duplicate name (excluding current record) - MySQL case-insensitive
      const existingFeeHead = await FeeHead.findOne({
        where: {
          [Op.and]: [
            sequelize.where(
              sequelize.fn('LOWER', sequelize.col('name')),
              sequelize.fn('LOWER', name.trim())
            ),
            { id: { [Op.ne]: id } }
          ]
        }
      });

      if (existingFeeHead) {
        return res.status(409).json({
          success: false,
          statusCode: 409,
          message: "Fee head with this name already exists"
        });
      }

      updateData.name = name.trim();
    }

    // Update description if provided
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    // Update is_mandatory if provided
    if (is_mandatory !== undefined) {
      updateData.is_mandatory = Boolean(is_mandatory);
    }

    // Update status if provided
    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Status must be either 'active' or 'inactive'"
        });
      }
      updateData.status = status;
    }

    // Only update if there are fields to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "No valid fields provided for update"
      });
    }

    // Update fee head with only provided fields
    await feeHead.update(updateData);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee head updated successfully",
      data: {
        id: feeHead.id,
        name: feeHead.name,
        description: feeHead.description,
        is_mandatory: feeHead.is_mandatory,
        status: feeHead.status,
        updated_fields: Object.keys(updateData)
      }
    });

  } catch (error) {
    console.error("Update Fee Head Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Delete fee head
const deleteFeeHead = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid fee head ID is required"
      });
    }

    const feeHead = await FeeHead.findByPk(id);
    if (!feeHead) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee head not found"
      });
    }

    // Check if fee head is being used in any fee structure details
    const usageCount = await FeeStructureDetail.count({
      where: { fee_head_id: id }
    });

    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Cannot delete fee head. It is being used in ${usageCount} fee structure(s). Please remove it from fee structures first.`
      });
    }

    // Store fee head data before deletion
    const deletedFeeHeadData = {
      id: feeHead.id,
      name: feeHead.name,
      description: feeHead.description
    };

    await feeHead.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee head deleted successfully",
      data: {
        deleted_fee_head: deletedFeeHeadData
      }
    });

  } catch (error) {
    console.error("Delete Fee Head Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};






module.exports = {
  createFeeHead,
  getAllFeeHeads,
  
  updateFeeHead,
  deleteFeeHead,
  

  
};
