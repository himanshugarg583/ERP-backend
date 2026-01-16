const { FeeHead } = require('../../models/admin/fees/FeeHead');
const { Op } = require('sequelize');

/**
 * Add Fee Head
 * @route POST /accountant/fee-head
 */
const addFeeHead = async (req, res) => {
  try {
    const { name, description, is_mandatory, status } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Fee head name is required"
      });
    }

    // Check if fee head already exists
    const existingFeeHead = await FeeHead.findOne({
      where: { name: { [Op.like]: name } }
    });

    if (existingFeeHead) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Fee head with this name already exists"
      });
    }

    // Create fee head
    const feeHead = await FeeHead.create({
      name,
      description,
      is_mandatory: is_mandatory !== undefined ? is_mandatory : true,
      status: status || 'active'
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Fee head added successfully",
      data: feeHead
    });

  } catch (error) {
    console.error("Error adding fee head:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get All Fee Heads
 * @route GET /accountant/fee-head?status=active
 */
const getFeeHeads = async (req, res) => {
  try {
    const { status } = req.query;

    let whereCondition = {};
    if (status) {
      whereCondition.status = status;
    }

    const feeHeads = await FeeHead.findAll({
      where: whereCondition,
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee heads fetched successfully",
      data: {
        total: feeHeads.length,
        fee_heads: feeHeads
      }
    });

  } catch (error) {
    console.error("Error fetching fee heads:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get Single Fee Head
 * @route GET /accountant/fee-head/:id
 */
const getFeeHeadById = async (req, res) => {
  try {
    const { id } = req.params;

    const feeHead = await FeeHead.findByPk(id);

    if (!feeHead) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee head not found"
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee head fetched successfully",
      data: feeHead
    });

  } catch (error) {
    console.error("Error fetching fee head:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Update Fee Head
 * @route PUT /accountant/fee-head/:id
 */
const updateFeeHead = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_mandatory, status } = req.body;

    const feeHead = await FeeHead.findByPk(id);

    if (!feeHead) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee head not found"
      });
    }

    // Check if name already exists for another fee head
    if (name && name !== feeHead.name) {
      const existingFeeHead = await FeeHead.findOne({
        where: {
          name: { [Op.like]: name },
          id: { [Op.ne]: id }
        }
      });

      if (existingFeeHead) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Fee head with this name already exists"
        });
      }
    }

    await feeHead.update({
      name: name || feeHead.name,
      description: description !== undefined ? description : feeHead.description,
      is_mandatory: is_mandatory !== undefined ? is_mandatory : feeHead.is_mandatory,
      status: status || feeHead.status
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee head updated successfully",
      data: feeHead
    });

  } catch (error) {
    console.error("Error updating fee head:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Delete Fee Head
 * @route DELETE /accountant/fee-head/:id
 */
const deleteFeeHead = async (req, res) => {
  try {
    const { id } = req.params;

    const feeHead = await FeeHead.findByPk(id);

    if (!feeHead) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee head not found"
      });
    }

    await feeHead.destroy();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee head deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting fee head:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

module.exports = {
  addFeeHead,
  getFeeHeads,
  getFeeHeadById,
  updateFeeHead,
  deleteFeeHead
};
