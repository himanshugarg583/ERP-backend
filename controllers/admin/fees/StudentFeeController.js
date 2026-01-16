const { StudentFee, Student, FeeStructure, ClassSection, User, FeeInstallment } = require('../../../models');
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
      discount_reason
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
        'total_amount'
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
      status: 'pending'
    });

    // Fetch created assignment with related data
    const createdAssignment = await StudentFee.findByPk(studentFee.id, {
      attributes: [
        'id', 'student_id', 'fee_structure_id', 'academic_year', 'original_amount',
        'discount_amount', 'discount_reason', 'final_amount', 'paid_amount', 
        'due_amount', 'status', 'created_at', 'updated_at'
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
          attributes: ['id', 'name', 'total_amount']
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
          'academic_end_year', 'total_amount'
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
        'due_amount', 'status', 'created_at', 'updated_at'
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
        'due_amount', 'status', 'created_at', 'updated_at'
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
            'academic_end_year', 'total_amount'
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
        'due_amount', 'status'
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
        'due_amount', 'status', 'created_at', 'updated_at'
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
      discount_reason
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
      attributes: ['id', 'name', 'total_amount']
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

/**
 * Assign Fee to Multiple Students with Installments
 * Can select entire class or multiple student IDs
 * Same installments will be assigned to all selected students
 */
const assignFeeWithInstallments = async (req, res) => {
  try {
    const {
      student_ids,           // Array of student IDs
      class_section_id,      // OR class section ID to select all students
      fee_structure_id,
      discount_amount = 0,
      discount_reason = null,
      installments = []      // Array of installment details: [{amount, due_date}, ...]
    } = req.body;

    // Validation
    if (!fee_structure_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Fee structure ID is required"
      });
    }

    // Get fee structure with all details
    const feeStructure = await FeeStructure.findByPk(fee_structure_id, {
      attributes: [
        'id', 'name', 'academic_start_year', 'academic_end_year',
        'total_amount', 'late_fee_amount', 'late_fee_type'
      ]
    });
    
    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee structure not found"
      });
    }

    // Auto-generate academic_year from fee structure
    const academic_year = `${feeStructure.academic_start_year}-${feeStructure.academic_end_year}`;

    // Get student IDs
    let studentIds = [];
    
    if (class_section_id) {
      // Get all students from the class
      const students = await Student.findAll({
        where: { class_section_id },
        attributes: ['id']
      });
      
      if (students.length === 0) {
        return res.status(404).json({
          success: false,
          statusCode: 404,
          message: "No students found in the selected class"
        });
      }
      
      studentIds = students.map(s => s.id);
    } else if (student_ids && Array.isArray(student_ids) && student_ids.length > 0) {
      studentIds = student_ids;
    } else {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Either student_ids array or class_section_id is required"
      });
    }

    // Verify all students exist
    const existingStudents = await Student.findAll({
      where: { id: { [Op.in]: studentIds } },
      attributes: ['id']
    });

    if (existingStudents.length !== studentIds.length) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "One or more students not found"
      });
    }

    // Calculate amounts
    const original_amount = parseFloat(feeStructure.total_amount);
    const discount = parseFloat(discount_amount) || 0;
    const final_amount = original_amount - discount;

    // Validate installments if provided
    if (installments.length > 0) {
      const totalInstallmentAmount = installments.reduce((sum, inst) => sum + parseFloat(inst.amount), 0);
      
      if (Math.abs(totalInstallmentAmount - final_amount) > 0.01) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `Total installment amount (${totalInstallmentAmount}) must equal final fee amount (${final_amount})`
        });
      }

      // Validate each installment
      for (const inst of installments) {
        if (!inst.amount || !inst.due_date) {
          return res.status(400).json({
            success: false,
            statusCode: 400,
            message: "Each installment must have amount and due_date"
          });
        }
      }
    }

    // Check for existing fee assignments
    const existingFees = await StudentFee.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        fee_structure_id,
        academic_year
      },
      attributes: ['student_id']
    });

    if (existingFees.length > 0) {
      const existingStudentIds = existingFees.map(f => f.student_id);
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: `Fee already assigned to students: ${existingStudentIds.join(', ')}`
      });
    }

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      const createdFees = [];
      const createdInstallments = [];

      // Create student fees and installments for each student
      for (const student_id of studentIds) {
        // Create StudentFee record
        const studentFee = await StudentFee.create({
          student_id,
          fee_structure_id,
          academic_year,
          original_amount,
          discount_amount: discount,
          discount_reason,
          final_amount,
          paid_amount: 0,
          due_amount: final_amount,
          status: 'pending'
        }, { transaction });

        createdFees.push(studentFee);

        // Create installments if provided
        if (installments.length > 0) {
          const installmentData = installments.map((inst, index) => ({
            student_fee_id: studentFee.id,
            installment_number: index + 1,
            amount: parseFloat(inst.amount),
            due_date: inst.due_date,
            paid_amount: 0,
            payment_date: null,
            late_fee_applied: 0,
            late_fee: 0,
            status: 'pending'
          }));

          const studentInstallments = await FeeInstallment.bulkCreate(installmentData, { transaction });
          createdInstallments.push(...studentInstallments);
        }
      }

      await transaction.commit();

      return res.status(201).json({
        success: true,
        statusCode: 201,
        message: `Fee assigned successfully to ${studentIds.length} student(s)`,
        data: {
          total_students: studentIds.length,
          student_ids: studentIds,
          fee_structure_id,
          academic_year,
          original_amount,
          discount_amount: discount,
          final_amount,
          total_installments: installments.length,
          created_fees_count: createdFees.length,
          created_installments_count: createdInstallments.length
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error("Assign Fee with Installments Error:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to assign fee to students",
      error: error.message
    });
  }
};

/**
 * Get Complete Fee Details of a Student
 * Returns all fee assignments, installments, payment history, and summary
 */
const getStudentCompleteeFeeDetails = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { academic_year } = req.query;

    // Validate student_id
    if (!student_id || isNaN(parseInt(student_id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid student ID is required"
      });
    }

    // Verify student exists
    const student = await Student.findByPk(student_id, {
      attributes: ['id', 'user_id', 'class_section_id', 'roll_number', 'phone_no'],
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
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Build where conditions
    const whereConditions = { student_id };
    if (academic_year) {
      whereConditions.academic_year = academic_year;
    }

    // Get all fee assignments for the student
    const studentFees = await StudentFee.findAll({
      where: whereConditions,
      attributes: [
        'id', 'student_id', 'fee_structure_id', 'academic_year', 
        'original_amount', 'discount_amount', 'discount_reason', 
        'final_amount', 'created_at', 'updated_at'
      ],
      include: [
        {
          model: FeeStructure,
          as: 'feeStructure',
          attributes: [
            'id', 'name', 'class_section_id', 'academic_start_year', 
            'academic_end_year', 'total_amount', 'due_date'
          ]
        },
        {
          model: FeeInstallment,
          as: 'installments',
          attributes: [
            'id', 'installment_number', 'amount', 'due_date', 
            'paid_amount', 'payment_date', 'late_fee_applied', 
            'late_fee', 'status'
          ],
          required: false
        }
      ],
      order: [
        ['academic_year', 'DESC'],
        ['created_at', 'DESC'],
        [{ model: FeeInstallment, as: 'installments' }, 'installment_number', 'ASC']
      ]
    });

    // Calculate summary statistics
    let totalAssignedFee = 0;
    let totalPaidFee = 0;
    let totalDueFee = 0;
    let totalDiscount = 0;
    let totalInstallments = 0;
    let paidInstallments = 0;
    let pendingInstallments = 0;
    let overdueInstallments = 0;

    const feesByAcademicYear = {};

    studentFees.forEach(fee => {
      const academicYear = fee.academic_year;
      
      // Calculate paid and due amounts from installments
      let feePaidAmount = 0;
      let feeDueAmount = 0;
      
      if (fee.installments && fee.installments.length > 0) {
        fee.installments.forEach(inst => {
          feePaidAmount += parseFloat(inst.paid_amount || 0);
          feeDueAmount += parseFloat(inst.amount || 0) - parseFloat(inst.paid_amount || 0);
        });
      } else {
        // If no installments, full amount is due
        feeDueAmount = parseFloat(fee.final_amount || 0);
      }
      
      // Initialize academic year summary if not exists
      if (!feesByAcademicYear[academicYear]) {
        feesByAcademicYear[academicYear] = {
          academic_year: academicYear,
          total_assigned: 0,
          total_paid: 0,
          total_due: 0,
          total_discount: 0,
          fee_structures: []
        };
      }

      // Add to totals
      totalAssignedFee += parseFloat(fee.final_amount);
      totalPaidFee += feePaidAmount;
      totalDueFee += feeDueAmount;
      totalDiscount += parseFloat(fee.discount_amount);

      // Add to academic year totals
      feesByAcademicYear[academicYear].total_assigned += parseFloat(fee.final_amount);
      feesByAcademicYear[academicYear].total_paid += feePaidAmount;
      feesByAcademicYear[academicYear].total_due += feeDueAmount;
      feesByAcademicYear[academicYear].total_discount += parseFloat(fee.discount_amount);

      // Count installments
      if (fee.installments && fee.installments.length > 0) {
        totalInstallments += fee.installments.length;
        
        fee.installments.forEach(inst => {
          if (inst.status === 'paid') paidInstallments++;
          else if (inst.status === 'pending') pendingInstallments++;
          else if (inst.status === 'overdue') overdueInstallments++;
        });
      }

      // Calculate fee status based on paid and due amounts
      let feeStatus = 'pending';
      if (feePaidAmount >= parseFloat(fee.final_amount)) {
        feeStatus = 'paid';
      } else if (feePaidAmount > 0) {
        feeStatus = 'partial';
      }

      // Add fee structure to academic year
      feesByAcademicYear[academicYear].fee_structures.push({
        student_fee_id: fee.id,
        fee_structure: fee.feeStructure,
        original_amount: fee.original_amount,
        discount_amount: fee.discount_amount,
        discount_reason: fee.discount_reason,
        final_amount: fee.final_amount,
        paid_amount: feePaidAmount,
        due_amount: feeDueAmount,
        status: feeStatus,
        installments: fee.installments || []
      });
    });

    // Prepare response
    const response = {
      student_info: {
        id: student.id,
        name: student.User?.name,
        email: student.User?.email,
        phone: student.phone_no,
        roll_number: student.roll_number,
        class: student.ClassSection ? 
          `${student.ClassSection.class_name} - ${student.ClassSection.section_name}` : null
      },
      summary: {
        total_assigned_fee: parseFloat(totalAssignedFee.toFixed(2)),
        total_discount: parseFloat(totalDiscount.toFixed(2)),
        total_paid_fee: parseFloat(totalPaidFee.toFixed(2)),
        total_due_fee: parseFloat(totalDueFee.toFixed(2)),
        payment_percentage: totalAssignedFee > 0 
          ? parseFloat(((totalPaidFee / totalAssignedFee) * 100).toFixed(2)) 
          : 0,
        total_fee_structures: studentFees.length,
        installments_summary: {
          total_installments: totalInstallments,
          paid_installments: paidInstallments,
          pending_installments: pendingInstallments,
          overdue_installments: overdueInstallments
        }
      },
      fees_by_academic_year: Object.values(feesByAcademicYear),
      all_fees: studentFees
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student fee details fetched successfully",
      data: response
    });

  } catch (error) {
    console.error("Get Student Complete Fee Details Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/**
 * Get Student Fee Report (For Admin)
 * Complete fee report of a student including all assignments, installments, paid and pending amounts
 */
const getStudentFeeReport = async (req, res) => {
  try {
    const { student_id } = req.params;

    // Validate student_id
    if (!student_id || isNaN(parseInt(student_id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid student ID is required"
      });
    }

    // Verify student exists with details
    const student = await Student.findByPk(student_id, {
      attributes: ['id', 'user_id', 'class_section_id', 'roll_number', 'phone_no'],
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
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Get all fee assignments for the student
    const studentFees = await StudentFee.findAll({
      where: { student_id },
      attributes: [
        'id', 'student_id', 'fee_structure_id', 'academic_year',
        'original_amount', 'discount_amount', 'discount_reason',
        'final_amount', 'created_at', 'updated_at'
      ],
      include: [
        {
          model: FeeStructure,
          as: 'feeStructure',
          attributes: [
            'id', 'name', 'class_section_id', 'academic_start_year',
            'academic_end_year', 'total_amount', 'late_fee_amount', 'late_fee_type'
          ]
        },
        {
          model: FeeInstallment,
          as: 'installments',
          attributes: [
            'id', 'installment_number', 'amount', 'due_date',
            'paid_amount', 'payment_date', 'late_fee_applied',
            'late_fee', 'status'
          ],
          order: [['installment_number', 'ASC']]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    if (studentFees.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No fee records found for this student"
      });
    }

    // Calculate summary
    let totalAssignedFee = 0;
    let totalDiscount = 0;
    let totalFinalAmount = 0;
    let totalPaidAmount = 0;
    let totalDueAmount = 0;
    let totalInstallments = 0;
    let paidInstallments = 0;
    let pendingInstallments = 0;
    let overdueInstallments = 0;

    // Process each fee assignment
    const feeDetails = studentFees.map(fee => {
      // Calculate paid and due amounts from installments
      let feePaidAmount = 0;
      let feeDueAmount = 0;
      
      if (fee.installments && fee.installments.length > 0) {
        fee.installments.forEach(inst => {
          feePaidAmount += parseFloat(inst.paid_amount || 0);
          feeDueAmount += parseFloat(inst.amount || 0) - parseFloat(inst.paid_amount || 0);
        });
      } else {
        // If no installments, full amount is due
        feeDueAmount = parseFloat(fee.final_amount || 0);
      }
      
      totalAssignedFee += parseFloat(fee.original_amount);
      totalDiscount += parseFloat(fee.discount_amount);
      totalFinalAmount += parseFloat(fee.final_amount);
      totalPaidAmount += feePaidAmount;
      totalDueAmount += feeDueAmount;

      // Process installments
      const installments = (fee.installments || []).map(inst => {
        totalInstallments++;
        
        if (inst.status === 'paid') {
          paidInstallments++;
        } else if (inst.status === 'pending') {
          pendingInstallments++;
        } else if (inst.status === 'overdue') {
          overdueInstallments++;
        }

        return {
          installment_number: inst.installment_number,
          amount: parseFloat(inst.amount),
          due_date: inst.due_date,
          paid_amount: parseFloat(inst.paid_amount),
          payment_date: inst.payment_date,
          pending_amount: parseFloat(inst.amount) - parseFloat(inst.paid_amount),
          late_fee_applied: parseFloat(inst.late_fee_applied),
          late_fee: parseFloat(inst.late_fee),
          status: inst.status
        };
      });

      // Calculate fee status based on paid and due amounts
      let feeStatus = 'pending';
      if (feePaidAmount >= parseFloat(fee.final_amount)) {
        feeStatus = 'paid';
      } else if (feePaidAmount > 0) {
        feeStatus = 'partial';
      }

      return {
        student_fee_id: fee.id,
        academic_year: fee.academic_year,
        fee_structure: {
          id: fee.feeStructure?.id,
          name: fee.feeStructure?.name,
          total_amount: parseFloat(fee.feeStructure?.total_amount || 0)
        },
        amounts: {
          original_amount: parseFloat(fee.original_amount),
          discount_amount: parseFloat(fee.discount_amount),
          discount_reason: fee.discount_reason,
          final_amount: parseFloat(fee.final_amount),
          paid_amount: feePaidAmount,
          due_amount: feeDueAmount
        },
        status: feeStatus,
        installments: {
          total_count: installments.length,
          paid_count: installments.filter(i => i.status === 'paid').length,
          pending_count: installments.filter(i => i.status === 'pending').length,
          overdue_count: installments.filter(i => i.status === 'overdue').length,
          details: installments
        },
        assigned_date: fee.created_at
      };
    });

    // Prepare response
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student fee report fetched successfully",
      data: {
        student_info: {
          id: student.id,
          name: student.User?.name,
          email: student.User?.email,
          phone: student.phone_no,
          roll_number: student.roll_number,
          class: student.ClassSection
            ? `${student.ClassSection.class_name} - ${student.ClassSection.section_name}`
            : null
        },
        summary: {
          total_assigned_fees: parseFloat(totalAssignedFee.toFixed(2)),
          total_discount: parseFloat(totalDiscount.toFixed(2)),
          total_final_amount: parseFloat(totalFinalAmount.toFixed(2)),
          total_paid: parseFloat(totalPaidAmount.toFixed(2)),
          total_pending: parseFloat(totalDueAmount.toFixed(2)),
          payment_percentage: totalFinalAmount > 0 
            ? parseFloat(((totalPaidAmount / totalFinalAmount) * 100).toFixed(2))
            : 0
        },
        installments_summary: {
          total_installments: totalInstallments,
          paid_installments: paidInstallments,
          pending_installments: pendingInstallments,
          overdue_installments: overdueInstallments
        },
        fee_assignments: feeDetails,
        total_fee_records: studentFees.length
      }
    });

  } catch (error) {
    console.error("Get Student Fee Report Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Get class fee assignment details (which class has how much fee assigned)
const getClassFeeAssignmentDetails = async (req, res) => {
  try {
    const { class_section_id, fee_structure_id, academic_year } = req.query;

    // Build where clause for filtering
    const whereClause = {};
    if (academic_year) {
      whereClause.academic_year = academic_year;
    }

    // Get all assigned fees with class and fee structure details
    const assignedFees = await StudentFee.findAll({
      where: whereClause,
      attributes: ['id', 'student_id', 'fee_structure_id', 'original_amount', 'discount_amount', 'final_amount', 'academic_year'],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'class_section_id'],
          where: class_section_id ? { class_section_id } : {},
          include: [{
            model: ClassSection,
            attributes: ['id', 'class_name', 'section_name']
          }]
        },
        {
          model: FeeStructure,
          as: 'feeStructure',
          where: fee_structure_id ? { id: fee_structure_id } : {},
          attributes: ['id', 'name', 'academic_start_year', 'academic_end_year', 'total_amount', 'late_fee_amount', 'late_fee_type', 'due_date']
        },
        {
          model: FeeInstallment,
          as: 'installments',
          attributes: ['id', 'installment_number', 'amount', 'due_date', 'paid_amount', 'status'],
          required: false
        }
      ]
    });

    if (assignedFees.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No fee assignments found"
      });
    }

    // Group by class_section_id and fee_structure_id
    const groupedData = {};
    
    assignedFees.forEach(fee => {
      const classId = fee.student?.class_section_id;
      const feeStructureId = fee.fee_structure_id;
      const key = `${classId}_${feeStructureId}`;

      if (!groupedData[key]) {
        groupedData[key] = {
          class_section: {
            id: fee.student?.ClassSection?.id,
            class_name: fee.student?.ClassSection?.class_name,
            section_name: fee.student?.ClassSection?.section_name
          },
          fee_structure: {
            id: fee.feeStructure?.id,
            name: fee.feeStructure?.name,
            academic_year: `${fee.feeStructure?.academic_start_year}-${fee.feeStructure?.academic_end_year}`,
            total_amount: fee.feeStructure?.total_amount,
            late_fee_amount: fee.feeStructure?.late_fee_amount,
            late_fee_type: fee.feeStructure?.late_fee_type,
            due_date: fee.feeStructure?.due_date
          },
          statistics: {
            total_students: 0,
            total_original_amount: 0,
            total_discount_amount: 0,
            total_final_amount: 0,
            total_paid: 0,
            total_due: 0,
            total_installments: 0
          },
          sample_installments: []
        };
      }

      // Update statistics
      groupedData[key].statistics.total_students++;
      groupedData[key].statistics.total_original_amount += parseFloat(fee.original_amount);
      groupedData[key].statistics.total_discount_amount += parseFloat(fee.discount_amount);
      groupedData[key].statistics.total_final_amount += parseFloat(fee.final_amount);
      groupedData[key].statistics.total_installments += fee.installments?.length || 0;

      // Calculate paid and due
      if (fee.installments && fee.installments.length > 0) {
        fee.installments.forEach(inst => {
          groupedData[key].statistics.total_paid += parseFloat(inst.paid_amount || 0);
          groupedData[key].statistics.total_due += parseFloat(inst.amount) - parseFloat(inst.paid_amount || 0);
        });

        // Store sample installments from first student
        if (groupedData[key].sample_installments.length === 0) {
          groupedData[key].sample_installments = fee.installments.map(inst => ({
            installment_number: inst.installment_number,
            amount: inst.amount,
            due_date: inst.due_date
          }));
        }
      } else {
        groupedData[key].statistics.total_due += parseFloat(fee.final_amount);
      }
    });

    // Convert to array and format
    const result = Object.values(groupedData).map(item => {
      const avgOriginalAmount = item.statistics.total_students > 0 ? 
        (item.statistics.total_original_amount / item.statistics.total_students) : 0;
      const avgDiscountAmount = item.statistics.total_students > 0 ? 
        (item.statistics.total_discount_amount / item.statistics.total_students) : 0;
      const avgFinalAmount = item.statistics.total_students > 0 ? 
        (item.statistics.total_final_amount / item.statistics.total_students) : 0;
      
      return {
        class_section: item.class_section,
        fee_structure: item.fee_structure,
        statistics: {
          total_students: item.statistics.total_students,
          original_amount_per_student: parseFloat(avgOriginalAmount.toFixed(2)),
          discount_amount_per_student: parseFloat(avgDiscountAmount.toFixed(2)),
          final_amount_per_student: parseFloat(avgFinalAmount.toFixed(2)),
          total_paid: parseFloat(item.statistics.total_paid.toFixed(2)),
          total_due: parseFloat(item.statistics.total_due.toFixed(2)),
          total_installments: item.statistics.total_installments,
          installments_per_student: item.statistics.total_students > 0 ? 
            (item.statistics.total_installments / item.statistics.total_students) : 0
        },
        installment_structure: item.sample_installments
      };
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Class fee assignments fetched successfully",
      data: {
        total_assignments: result.length,
        assignments: result
      }
    });

  } catch (error) {
    console.error("Get Class Fee Assignment Details Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Edit class fee assignment (bulk update for entire class)
const editClassFeeAssignment = async (req, res) => {
  try {
    const {
      class_section_id,
      fee_structure_id,
      discount_amount = 0,
      discount_reason = null,
      installments = []  // New installments structure for all students
    } = req.body;

    // Validation
    if (!class_section_id || !fee_structure_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Class section ID and Fee structure ID are required"
      });
    }

    // Get fee structure
    const feeStructure = await FeeStructure.findByPk(fee_structure_id, {
      attributes: ['id', 'name', 'academic_start_year', 'academic_end_year', 'total_amount']
    });

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee structure not found"
      });
    }

    const academic_year = `${feeStructure.academic_start_year}-${feeStructure.academic_end_year}`;

    // Calculate amounts
    const original_amount = parseFloat(feeStructure.total_amount);
    const discount = parseFloat(discount_amount) || 0;
    const final_amount = original_amount - discount;

    // Validate installments if provided
    if (installments.length > 0) {
      const totalInstallmentAmount = installments.reduce((sum, inst) => sum + parseFloat(inst.amount), 0);
      
      if (Math.abs(totalInstallmentAmount - final_amount) > 0.01) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `Total installment amount (${totalInstallmentAmount}) must equal final fee amount (${final_amount})`
        });
      }
    }

    // Get all students in this class
    const students = await Student.findAll({
      where: { class_section_id },
      attributes: ['id']
    });

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No students found in this class"
      });
    }

    const studentIds = students.map(s => s.id);

    // Get existing fee assignments
    const existingFees = await StudentFee.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        fee_structure_id,
        academic_year
      },
      attributes: ['id', 'student_id']
    });

    if (existingFees.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No fee assignments found for this class"
      });
    }

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // Update all student fees
      await StudentFee.update({
        original_amount,
        discount_amount: discount,
        discount_reason,
        final_amount
      }, {
        where: {
          student_id: { [Op.in]: studentIds },
          fee_structure_id,
          academic_year
        },
        transaction
      });

      // Delete old installments and create new ones
      if (installments.length > 0) {
        // Delete existing installments
        const studentFeeIds = existingFees.map(f => f.id);
        await FeeInstallment.destroy({
          where: {
            student_fee_id: { [Op.in]: studentFeeIds }
          },
          transaction
        });

        // Create new installments for each student
        const newInstallments = [];
        for (const fee of existingFees) {
          for (let i = 0; i < installments.length; i++) {
            newInstallments.push({
              student_fee_id: fee.id,
              installment_number: i + 1,
              amount: installments[i].amount,
              due_date: installments[i].due_date,
              paid_amount: 0,
              late_fee_applied: 0,
              status: 'pending'
            });
          }
        }

        await FeeInstallment.bulkCreate(newInstallments, { transaction });
      }

      await transaction.commit();

      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Class fee assignment updated successfully",
        data: {
          updated_students: existingFees.length,
          new_final_amount: final_amount,
          new_discount: discount,
          total_installments: installments.length
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error("Edit Class Fee Assignment Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to update class fee assignment",
      error: error.message
    });
  }
};

// View detailed student list for a specific class fee assignment
const viewClassFeeAssignmentStudents = async (req, res) => {
  try {
    const { class_section_id, fee_structure_id, academic_year } = req.query;

    // Validation
    if (!class_section_id || !fee_structure_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Class section ID and Fee structure ID are required"
      });
    }

    // Get class section details
    const classSection = await ClassSection.findByPk(class_section_id, {
      attributes: ['id', 'class_name', 'section_name']
    });

    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    // Get fee structure details
    const feeStructure = await FeeStructure.findByPk(fee_structure_id, {
      attributes: ['id', 'name', 'academic_start_year', 'academic_end_year', 'total_amount', 'late_fee_amount', 'late_fee_type', 'due_date']
    });

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee structure not found"
      });
    }

    const academicYear = academic_year || `${feeStructure.academic_start_year}-${feeStructure.academic_end_year}`;

    // Get all students with assigned fees
    const assignedFees = await StudentFee.findAll({
      where: {
        fee_structure_id,
        academic_year: academicYear
      },
      attributes: ['id', 'student_id', 'original_amount', 'discount_amount', 'discount_reason', 'final_amount', 'academic_year'],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'roll_number', 'class_section_id', 'user_id'],
          where: { class_section_id },
          include: [{
            model: User,
            attributes: ['id', 'name', 'email']
          }]
        }
      ],
      order: [
        [{ model: Student, as: 'student' }, 'roll_number', 'ASC']
      ]
    });

    if (assignedFees.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No students found with this fee assignment"
      });
    }

    // Format student list for table
    const studentList = assignedFees.map(fee => ({
      student_fee_id: fee.id,
      student_id: fee.student.id,
      roll_number: fee.student.roll_number,
      student_name: fee.student.User?.name,
      email: fee.student.User?.email,
      original_amount: parseFloat(fee.original_amount),
      discount_amount: parseFloat(fee.discount_amount),
      discount_reason: fee.discount_reason,
      final_amount: parseFloat(fee.final_amount)
    }));

    // Calculate summary statistics
    const totalOriginalAmount = studentList.reduce((sum, student) => sum + student.original_amount, 0);
    const totalDiscountAmount = studentList.reduce((sum, student) => sum + student.discount_amount, 0);
    const totalFinalAmount = studentList.reduce((sum, student) => sum + student.final_amount, 0);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student fee assignment details fetched successfully",
      data: {
        class_section: {
          id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name,
          full_name: `${classSection.class_name} ${classSection.section_name}`
        },
        fee_structure: {
          id: feeStructure.id,
          name: feeStructure.name,
          academic_year: academicYear,
          total_amount: feeStructure.total_amount
        },
        summary: {
          total_students: studentList.length,
          total_original_amount: parseFloat(totalOriginalAmount.toFixed(2)),
          total_discount: parseFloat(totalDiscountAmount.toFixed(2)),
          total_final_amount: parseFloat(totalFinalAmount.toFixed(2))
        },
        students: studentList
      }
    });
  } catch (error) {
    console.error("Error fetching class fee assignment students:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Delete class fee assignment (with validation)
const deleteClassFeeAssignment = async (req, res) => {
  try {
    const { class_section_id, fee_structure_id, academic_year } = req.query;

    // Validation
    if (!class_section_id || !fee_structure_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Class section ID and Fee structure ID are required"
      });
    }

    // Get fee structure to determine academic year
    const feeStructure = await FeeStructure.findByPk(fee_structure_id, {
      attributes: ['id', 'academic_start_year', 'academic_end_year']
    });

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee structure not found"
      });
    }

    const academicYear = academic_year || `${feeStructure.academic_start_year}-${feeStructure.academic_end_year}`;

    // Get all students in this class
    const students = await Student.findAll({
      where: { class_section_id },
      attributes: ['id']
    });

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No students found in this class"
      });
    }

    const studentIds = students.map(s => s.id);

    // Get all fee assignments for this class
    const assignedFees = await StudentFee.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        fee_structure_id,
        academic_year: academicYear
      },
      attributes: ['id']
    });

    if (assignedFees.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No fee assignments found for this class"
      });
    }

    const studentFeeIds = assignedFees.map(f => f.id);

    // Check if any installment has been paid
    const paidInstallments = await FeeInstallment.findOne({
      where: {
        student_fee_id: { [Op.in]: studentFeeIds },
        paid_amount: { [Op.gt]: 0 }
      },
      attributes: ['id', 'paid_amount']
    });

    if (paidInstallments) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Cannot delete fee assignment. Some students have already paid installments. Please refund the payments first."
      });
    }

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // Delete all installments first
      const deletedInstallments = await FeeInstallment.destroy({
        where: {
          student_fee_id: { [Op.in]: studentFeeIds }
        },
        transaction
      });

      // Delete all student fees
      const deletedFees = await StudentFee.destroy({
        where: {
          student_id: { [Op.in]: studentIds },
          fee_structure_id,
          academic_year: academicYear
        },
        transaction
      });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Class fee assignment deleted successfully",
        data: {
          deleted_students: deletedFees,
          deleted_installments: deletedInstallments
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error("Delete Class Fee Assignment Error:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

module.exports = {
  assignFeeToStudent,
  getAllStudentFees,
  getSingleStudentFee,
  updateStudentFee,
  deleteStudentFee,
  bulkAssignFeeToStudents,
  assignFeeWithInstallments,
  getStudentCompleteeFeeDetails,
  getStudentFeeReport,
  getClassFeeAssignmentDetails,
  editClassFeeAssignment,
  viewClassFeeAssignmentStudents,
  deleteClassFeeAssignment
};
