const { FeeStructure, FeeStructureDetail, FeeHead, ClassSection, StudentFee } = require('../../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../../models');

// Create new fee structure
const createFeeStructure = async (req, res) => {
  try {
    const {
      name,
      class_section_id,
      academic_start_year,
      academic_end_year,
      due_date,
      late_fee_amount,
      late_fee_type,
      installment_allowed,
      max_installments,
      status = 'active',
      fee_details
    } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Fee structure name is required"
      });
    }

    if (academic_start_year >= academic_end_year) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Academic start year must be less than end year"
      });
    }

    if (!fee_details || !Array.isArray(fee_details) || fee_details.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Fee details are required with at least one fee head"
      });
    }


    // Validate fee heads in fee_details
    for (const detail of fee_details) {
      if (!detail.fee_head_id || !detail.amount || detail.amount <= 0) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Each fee detail must have valid fee_head_id and amount greater than 0"
        });
      }

      const feeHead = await FeeHead.findByPk(detail.fee_head_id);
      if (!feeHead) {
        return res.status(404).json({
          success: false,
          statusCode: 404,
          message: `Fee head with ID ${detail.fee_head_id} not found`
        });
      }
    }

    // Check for duplicate fee structure (MySQL case-insensitive)
    // Only select the primary key here to avoid model/DB column mismatches (e.g. created_by)
    const existingStructure = await FeeStructure.findOne({
      attributes: ['id'],
      where: {
        [Op.and]: [
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('name')),
            sequelize.fn('LOWER', name.trim())
          ),
          { class_section_id: class_section_id || null },
          { academic_start_year },
          { academic_end_year }
        ]
      }
    });

    if (existingStructure) {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: "Fee structure with this name already exists for the selected class and academic year"
      });
    }

    // Calculate total amount
    const total_amount = fee_details.reduce((sum, detail) => sum + parseFloat(detail.amount), 0);

    // Use transaction for creating fee structure and details
    const transaction = await sequelize.transaction();

    try {
      // Create fee structure
      const feeStructure = await FeeStructure.create({
        name: name.trim(),
        class_section_id: class_section_id || null,
        academic_start_year,
        academic_end_year,
        due_date: due_date || null,
        late_fee_amount: parseFloat(late_fee_amount) || 0,
        late_fee_type: late_fee_type || 'flat',
        installment_allowed: Boolean(installment_allowed),
        max_installments: parseInt(max_installments) || 1,
        status: status || 'active',
        total_amount
      }, { transaction });

      console.log("Created Fee Structure:", feeStructure.id, feeStructure.name);

      // Create fee structure details
      const feeDetailsData = fee_details.map((detail, index) => {
        const detailData = {
          fee_structure_id: feeStructure.id,
          fee_head_id: detail.fee_head_id,
          amount: parseFloat(detail.amount),
          is_mandatory: Boolean(detail.is_mandatory !== undefined ? detail.is_mandatory : true),
          sequence_order: detail.sequence_order || (index + 1)
        };
        
        return detailData;
      });

      console.log("All Fee Details Data:", feeDetailsData);

      const createdDetails = await FeeStructureDetail.bulkCreate(feeDetailsData, { transaction });
      console.log("Created Fee Details:", createdDetails.map(d => ({ id: d.id, fee_structure_id: d.fee_structure_id, fee_head_id: d.fee_head_id })));

      await transaction.commit();

      // Fetch created structure with details (explicit attributes to avoid selecting missing columns like `created_by`)
      const createdStructure = await FeeStructure.findByPk(feeStructure.id, {
        attributes: [
          'id', 'name', 'class_section_id', 'academic_start_year', 'academic_end_year',
          'due_date', 'late_fee_amount', 'late_fee_type', 'installment_allowed', 'max_installments',
          'status', 'total_amount', 'created_at', 'updated_at'
        ],
        include: [
          {
            model: ClassSection,
            as: 'classSection',
            attributes: ['id', 'class_name', 'section_name']
          },
          {
            model: FeeStructureDetail,
            as: 'feeDetails',
            include: [{
              model: FeeHead,
              as: 'feeHead',
              attributes: ['id', 'name', 'is_mandatory']
            }]
          }
        ]
      });

      res.status(201).json({
        success: true,
        statusCode: 201,
        message: "Fee structure created successfully",
        data: createdStructure
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error("Create Fee Structure Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

// Get all fee structures
const getAllFeeStructures = async (req, res) => {
  try {
    const feeStructures = await FeeStructure.findAll({
      attributes: [
        'id', 'name', 'class_section_id', 'academic_start_year', 'academic_end_year',
        'due_date', 'late_fee_amount', 'late_fee_type', 'installment_allowed', 'max_installments',
        'status', 'total_amount', 'created_at', 'updated_at'
      ],
      include: [
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name'],
          required: false
        },
        {
          model: FeeStructureDetail,
          as: 'feeDetails',
          include: [{
            model: FeeHead,
            as: 'feeHead',
            attributes: ['id', 'name', 'is_mandatory']
          }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee structures fetched successfully",
      data: {
        feeStructures,
        total_records: feeStructures.length
      }
    });

  } catch (error) {
    console.error("Get All Fee Structures Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get single fee structure by ID
const getSingleFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid fee structure ID is required"
      });
    }

    const feeStructure = await FeeStructure.findByPk(id, {
        attributes: [
          'id', 'name', 'class_section_id', 'academic_start_year', 'academic_end_year',
          'due_date', 'late_fee_amount', 'late_fee_type', 'installment_allowed', 'max_installments',
          'status', 'total_amount', 'created_at', 'updated_at'
        ],
        include: [
          {
            model: ClassSection,
            as: 'classSection',
            attributes: ['id', 'class_name', 'section_name'],
            required: false
          },
          {
            model: FeeStructureDetail,
            as: 'feeDetails',
            include: [{
              model: FeeHead,
              as: 'feeHead',
              attributes: ['id', 'name', 'is_mandatory']
            }],
            order: [['sequence_order', 'ASC']]
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

    // Count assigned students
      const assignedStudentsCount = await StudentFee.count({
        where: { fee_structure_id: id }
      });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee structure fetched successfully",
      data: {
        feeStructure,
        usage_statistics: {
          assigned_students: assignedStudentsCount,
          can_be_deleted: assignedStudentsCount === 0
        }
      }
    });

  } catch (error) {
    console.error("Get Single Fee Structure Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Update fee structure
const updateFeeStructure = async (req, res) => {
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
      installment_allowed,
      max_installments,
      status,
      fee_details
    } = req.body;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid fee structure ID is required"
      });
    }

    // Find existing fee structure (explicit attributes to avoid selecting non-existent columns)
    const feeStructure = await FeeStructure.findByPk(id, {
      attributes: [
        'id', 'name', 'class_section_id', 'academic_start_year', 'academic_end_year',
        'due_date', 'late_fee_amount', 'late_fee_type', 'installment_allowed', 'max_installments',
        'status', 'total_amount', 'created_at', 'updated_at'
      ]
    });
    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee structure not found"
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
          message: "Fee structure name cannot be empty"
        });
      }

      // Check for duplicate name (excluding current record) - MySQL case-insensitive
      const existingStructure = await FeeStructure.findOne({
        attributes: ['id'],
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

      if (existingStructure) {
        return res.status(409).json({
          success: false,
          statusCode: 409,
          message: "Fee structure with this name already exists"
        });
      }

      updateData.name = name.trim();
    }

    // Update class_section_id if provided
    if (class_section_id !== undefined) {
      if (class_section_id && class_section_id !== null) {
        const classSection = await ClassSection.findByPk(class_section_id);
        if (!classSection) {
          return res.status(404).json({
            success: false,
            statusCode: 404,
            message: "Class section not found"
          });
        }
      }
      updateData.class_section_id = class_section_id || null;
    }

    // Update academic years if provided
    if (academic_start_year !== undefined) {
      updateData.academic_start_year = academic_start_year;
    }
    if (academic_end_year !== undefined) {
      updateData.academic_end_year = academic_end_year;
    }

    // Validate academic years
    if (updateData.academic_start_year && updateData.academic_end_year) {
      if (updateData.academic_start_year >= updateData.academic_end_year) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Academic start year must be less than end year"
        });
      }
    }

    // Update other fields if provided
    if (due_date !== undefined) updateData.due_date = due_date || null;
    if (late_fee_amount !== undefined) updateData.late_fee_amount = parseFloat(late_fee_amount) || 0;
    if (late_fee_type !== undefined) updateData.late_fee_type = late_fee_type;
    if (installment_allowed !== undefined) updateData.installment_allowed = Boolean(installment_allowed);
    if (max_installments !== undefined) updateData.max_installments = parseInt(max_installments) || 1;
    if (status !== undefined) {
      if (!['active', 'inactive', 'draft'].includes(status)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Status must be 'active', 'inactive', or 'draft'"
        });
      }
      updateData.status = status;
    }

    // Start transaction for updating
    const transaction = await sequelize.transaction();

    try {
      // Update fee details if provided
      if (fee_details && Array.isArray(fee_details)) {
        // Validate fee details
        for (const detail of fee_details) {
          if (!detail.fee_head_id || !detail.amount || detail.amount <= 0) {
            return res.status(400).json({
              success: false,
              statusCode: 400,
              message: "Each fee detail must have valid fee_head_id and amount greater than 0"
            });
          }

          const feeHead = await FeeHead.findByPk(detail.fee_head_id);
          if (!feeHead) {
            return res.status(404).json({
              success: false,
              statusCode: 404,
              message: `Fee head with ID ${detail.fee_head_id} not found`
            });
          }
        }

        // Delete existing fee details
        await FeeStructureDetail.destroy({
          where: { fee_structure_id: id },
          transaction
        });

        // Create new fee details
        const feeDetailsData = fee_details.map((detail, index) => ({
          fee_structure_id: id,
          fee_head_id: detail.fee_head_id,
          amount: parseFloat(detail.amount),
          is_mandatory: Boolean(detail.is_mandatory !== undefined ? detail.is_mandatory : true),
          sequence_order: detail.sequence_order || (index + 1)
        }));

        await FeeStructureDetail.bulkCreate(feeDetailsData, { transaction });

        // Calculate new total amount
        updateData.total_amount = fee_details.reduce((sum, detail) => sum + parseFloat(detail.amount), 0);
      }

      // Only update if there are fields to update
      if (Object.keys(updateData).length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "No valid fields provided for update"
        });
      }

      // Update fee structure
      await feeStructure.update(updateData, { transaction });

      await transaction.commit();

      // Fetch updated structure with details (explicit attributes to avoid selecting missing columns)
      const updatedStructure = await FeeStructure.findByPk(id, {
        attributes: [
          'id', 'name', 'class_section_id', 'academic_start_year', 'academic_end_year',
          'due_date', 'late_fee_amount', 'late_fee_type', 'installment_allowed', 'max_installments',
          'status', 'total_amount', 'created_at', 'updated_at'
        ],
        include: [
          {
            model: ClassSection,
            as: 'classSection',
            attributes: ['id', 'class_name', 'section_name']
          },
          {
            model: FeeStructureDetail,
            as: 'feeDetails',
            include: [{
              model: FeeHead,
              as: 'feeHead',
              attributes: ['id', 'name', 'is_mandatory']
            }]
          }
        ]
      });

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Fee structure updated successfully",
        data: {
          feeStructure: updatedStructure,
          updated_fields: Object.keys(updateData)
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error("Update Fee Structure Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete fee structure
const deleteFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid fee structure ID is required"
      });
    }

    const feeStructure = await FeeStructure.findByPk(id, {
      attributes: [
        'id', 'name', 'class_section_id', 'academic_start_year', 'academic_end_year',
        'due_date', 'late_fee_amount', 'late_fee_type', 'installment_allowed', 'max_installments',
        'status', 'total_amount', 'created_at', 'updated_at'
      ]
    });
    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee structure not found"
      });
    }

    // Check if fee structure is assigned to any students
    const assignedStudentsCount = await StudentFee.count({
      where: { fee_structure_id: id }
    });

    if (assignedStudentsCount > 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Cannot delete fee structure. It is assigned to ${assignedStudentsCount} student(s). Please remove assignments first.`
      });
    }

    // Store structure data before deletion
    const deletedStructureData = {
      id: feeStructure.id,
      name: feeStructure.name,
      total_amount: feeStructure.total_amount
    };

    // Use transaction for deletion
    const transaction = await sequelize.transaction();

    try {
      // Delete fee structure details first (due to foreign key constraint)
      await FeeStructureDetail.destroy({
        where: { fee_structure_id: id },
        transaction
      });

      // Delete fee structure
      await feeStructure.destroy({ transaction });

      await transaction.commit();

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Fee structure deleted successfully",
        data: {
          deleted_structure: deletedStructureData
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error("Delete Fee Structure Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  createFeeStructure,
  getAllFeeStructures,
  getSingleFeeStructure,
  updateFeeStructure,
  deleteFeeStructure
};