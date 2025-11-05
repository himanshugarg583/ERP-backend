const { StudentFee, Student, FeeStructure, ClassSection, User } = require('../../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../../models');

// Assign fee structure to student
const assignFeeToStudent = async (req, res) => {
  try {
    const {
      student_id,
      fee_structure_id,
      academic_year,
      discount_amount,
      discount_reason,
      due_date
    } = req.body;

    // Validation
    if (!student_id || !fee_structure_id || !academic_year) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Student ID, Fee Structure ID, and Academic Year are required"
      });
    }

    // Validate student exists
    const student = await Student.findByPk(student_id, {
      attributes: ['id', 'user_id', 'class_section_id'],
      include: [{
        model: User,
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Validate fee structure exists
    const feeStructure = await FeeStructure.findByPk(fee_structure_id, {
      attributes: [
        'id', 'name', 'class_section_id', 'academic_start_year', 'academic_end_year',
        'due_date', 'status', 'total_amount'
      ]
    });

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee structure not found"
      });
    }

    if (feeStructure.status !== 'active') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Cannot assign inactive fee structure"
      });
    }

    // Check if fee is already assigned for this academic year
    const existingAssignment = await StudentFee.findOne({
      attributes: ['id'],
      where: {
        student_id,
        fee_structure_id,
        academic_year
      }
    });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: "Fee structure already assigned to this student for the academic year"
      });
    }

    // Calculate amounts
    const original_amount = parseFloat(feeStructure.total_amount);
    const discount = parseFloat(discount_amount) || 0;
    
    if (discount < 0 || discount > original_amount) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Discount amount must be between 0 and original amount"
      });
    }

    const final_amount = original_amount - discount;
    const due_amount = final_amount;

    // Create student fee assignment
    const studentFee = await StudentFee.create({
      student_id,
      fee_structure_id,
      academic_year,
      original_amount,
      discount_amount: discount,
      discount_reason: discount_reason || null,
      final_amount,
      paid_amount: 0,
      due_amount,
      due_date: due_date || feeStructure.due_date,
      status: 'pending'
    });

    // Fetch created assignment with related data
    const createdAssignment = await StudentFee.findByPk(studentFee.id, {
      attributes: [
        'id', 'student_id', 'fee_structure_id', 'academic_year', 'original_amount',
        'discount_amount', 'discount_reason', 'final_amount', 'paid_amount', 
        'due_amount', 'due_date', 'status', 'created_at', 'updated_at'
      ],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'user_id', 'class_section_id'],
          include: [{
            model: User,
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: FeeStructure,
          as: 'feeStructure',
          attributes: ['id', 'name', 'total_amount', 'due_date']
        }
      ]
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Fee assigned to student successfully",
      data: createdAssignment
    });

  } catch (error) {
    console.error("Assign Fee to Student Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all student fee assignments
const getAllStudentFees = async (req, res) => {
  try {
    const { 
      student_id, 
      fee_structure_id, 
      academic_year, 
      status,
      class_section_id,
      page = 1,
      limit = 50
    } = req.query;

    // Build where conditions
    const whereConditions = {};
    
    if (student_id) whereConditions.student_id = student_id;
    if (fee_structure_id) whereConditions.fee_structure_id = fee_structure_id;
    if (academic_year) whereConditions.academic_year = academic_year;
    if (status) whereConditions.status = status;

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build include conditions
    const includeConditions = [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'user_id', 'class_section_id'],
        include: [
          {
            model: User,
            attributes: ['id', 'name', 'email']
          },
          {
            model: ClassSection,
            attributes: ['id', 'class_name', 'section_name']
          }
        ]
      },
      {
        model: FeeStructure,
        as: 'feeStructure',
        attributes: [
          'id', 'name', 'class_section_id', 'academic_start_year', 
          'academic_end_year', 'total_amount', 'due_date'
        ]
      }
    ];

    // Add class section filter if provided
    if (class_section_id) {
      includeConditions[0].where = { class_section_id };
    }

    const studentFees = await StudentFee.findAndCountAll({
      attributes: [
        'id', 'student_id', 'fee_structure_id', 'academic_year', 'original_amount',
        'discount_amount', 'discount_reason', 'final_amount', 'paid_amount', 
        'due_amount', 'due_date', 'status', 'created_at', 'updated_at'
      ],
      where: whereConditions,
      include: includeConditions,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student fees fetched successfully",
      data: {
        student_fees: studentFees.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(studentFees.count / parseInt(limit)),
          total_records: studentFees.count,
          per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error("Get All Student Fees Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get single student fee assignment
const getSingleStudentFee = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid student fee ID is required"
      });
    }

    const studentFee = await StudentFee.findByPk(id, {
      attributes: [
        'id', 'student_id', 'fee_structure_id', 'academic_year', 'original_amount',
        'discount_amount', 'discount_reason', 'final_amount', 'paid_amount', 
        'due_amount', 'due_date', 'status', 'created_at', 'updated_at'
      ],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'user_id', 'class_section_id'],
          include: [
            {
              model: User,
              attributes: ['id', 'name', 'email']
            },
            {
              model: ClassSection,
              attributes: ['id', 'class_name', 'section_name']
            }
          ]
        },
        {
          model: FeeStructure,
          as: 'feeStructure',
          attributes: [
            'id', 'name', 'class_section_id', 'academic_start_year', 
            'academic_end_year', 'total_amount', 'due_date', 'status'
          ]
        }
      ]
    });

    if (!studentFee) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student fee assignment not found"
      });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student fee fetched successfully",
      data: studentFee
    });

  } catch (error) {
    console.error("Get Single Student Fee Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Update student fee assignment
const updateStudentFee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      discount_amount,
      discount_reason,
      due_date,
      status
    } = req.body;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid student fee ID is required"
      });
    }

    // Find existing student fee
    const studentFee = await StudentFee.findByPk(id, {
      attributes: [
        'id', 'student_id', 'fee_structure_id', 'academic_year', 'original_amount',
        'discount_amount', 'discount_reason', 'final_amount', 'paid_amount', 
        'due_amount', 'due_date', 'status'
      ]
    });

    if (!studentFee) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student fee assignment not found"
      });
    }

    // Build update object
    const updateData = {};

    // Update discount if provided
    if (discount_amount !== undefined) {
      const discount = parseFloat(discount_amount) || 0;
      const original = parseFloat(studentFee.original_amount);
      
      if (discount < 0 || discount > original) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Discount amount must be between 0 and original amount"
        });
      }

      updateData.discount_amount = discount;
      updateData.final_amount = original - discount;
      updateData.due_amount = updateData.final_amount - parseFloat(studentFee.paid_amount);
    }

    if (discount_reason !== undefined) updateData.discount_reason = discount_reason;
    if (due_date !== undefined) updateData.due_date = due_date;
    
    if (status !== undefined) {
      if (!['pending', 'partial', 'paid', 'overdue', 'waived'].includes(status)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Status must be 'pending', 'partial', 'paid', 'overdue', or 'waived'"
        });
      }
      updateData.status = status;
    }

    // Check if there are fields to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "No valid fields provided for update"
      });
    }

    // Update student fee
    await studentFee.update(updateData);

    // Fetch updated assignment with related data
    const updatedStudentFee = await StudentFee.findByPk(id, {
      attributes: [
        'id', 'student_id', 'fee_structure_id', 'academic_year', 'original_amount',
        'discount_amount', 'discount_reason', 'final_amount', 'paid_amount', 
        'due_amount', 'due_date', 'status', 'created_at', 'updated_at'
      ],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'user_id'],
          include: [{
            model: User,
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: FeeStructure,
          as: 'feeStructure',
          attributes: ['id', 'name', 'total_amount']
        }
      ]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student fee updated successfully",
      data: {
        student_fee: updatedStudentFee,
        updated_fields: Object.keys(updateData)
      }
    });

  } catch (error) {
    console.error("Update Student Fee Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete student fee assignment
const deleteStudentFee = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid student fee ID is required"
      });
    }

    const studentFee = await StudentFee.findByPk(id, {
      attributes: [
        'id', 'student_id', 'fee_structure_id', 'academic_year', 
        'final_amount', 'paid_amount', 'status'
      ]
    });

    if (!studentFee) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student fee assignment not found"
      });
    }

    // Check if any payment has been made
    if (parseFloat(studentFee.paid_amount) > 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Cannot delete fee assignment with payments. Please refund payments first."
      });
    }

    // Store data before deletion
    const deletedData = {
      id: studentFee.id,
      student_id: studentFee.student_id,
      fee_structure_id: studentFee.fee_structure_id,
      academic_year: studentFee.academic_year,
      final_amount: studentFee.final_amount
    };

    // Delete the assignment
    await studentFee.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student fee assignment deleted successfully",
      data: {
        deleted_assignment: deletedData
      }
    });

  } catch (error) {
    console.error("Delete Student Fee Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Bulk assign fee to multiple students
const bulkAssignFeeToStudents = async (req, res) => {
  try {
    const {
      student_ids,
      fee_structure_id,
      academic_year,
      discount_amount = 0,
      discount_reason,
      due_date
    } = req.body;

    // Validation
    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Student IDs array is required"
      });
    }

    if (!fee_structure_id || !academic_year) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Fee Structure ID and Academic Year are required"
      });
    }

    // Validate fee structure
    const feeStructure = await FeeStructure.findByPk(fee_structure_id, {
      attributes: ['id', 'name', 'status', 'total_amount', 'due_date']
    });

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee structure not found"
      });
    }

    if (feeStructure.status !== 'active') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Cannot assign inactive fee structure"
      });
    }

    // Validate students exist
    const students = await Student.findAll({
      attributes: ['id', 'user_id'],
      where: { id: { [Op.in]: student_ids } }
    });

    if (students.length !== student_ids.length) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "One or more students not found"
      });
    }

    // Check for existing assignments
    const existingAssignments = await StudentFee.findAll({
      attributes: ['student_id'],
      where: {
        student_id: { [Op.in]: student_ids },
        fee_structure_id,
        academic_year
      }
    });

    if (existingAssignments.length > 0) {
      const existingStudentIds = existingAssignments.map(a => a.student_id);
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: `Fee structure already assigned to students: ${existingStudentIds.join(', ')}`
      });
    }

    // Calculate amounts
    const original_amount = parseFloat(feeStructure.total_amount);
    const discount = parseFloat(discount_amount) || 0;
    
    if (discount < 0 || discount > original_amount) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Discount amount must be between 0 and original amount"
      });
    }

    const final_amount = original_amount - discount;

    // Prepare bulk insert data
    const studentFeeData = student_ids.map(student_id => ({
      student_id,
      fee_structure_id,
      academic_year,
      original_amount,
      discount_amount: discount,
      discount_reason: discount_reason || null,
      final_amount,
      paid_amount: 0,
      due_amount: final_amount,
      due_date: due_date || feeStructure.due_date,
      status: 'pending'
    }));

    // Bulk create assignments
    const createdAssignments = await StudentFee.bulkCreate(studentFeeData);

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: `Fee assigned to ${createdAssignments.length} students successfully`,
      data: {
        assigned_count: createdAssignments.length,
        fee_structure: {
          id: feeStructure.id,
          name: feeStructure.name
        },
        academic_year,
        assignments: createdAssignments.map(a => ({
          id: a.id,
          student_id: a.student_id,
          final_amount: a.final_amount
        }))
      }
    });

  } catch (error) {
    console.error("Bulk Assign Fee Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  assignFeeToStudent,
  getAllStudentFees,
  getSingleStudentFee,
  updateStudentFee,
  deleteStudentFee,
  bulkAssignFeeToStudents
};
