const { Student, StudentFee, FeeStructure, FeeInstallment, ClassSection } = require('../../../models');

// Get student fee details (user_id from token)
const getStudentFeeDetails = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;

    // Find student by user_id
    const student = await Student.findOne({
      where: { user_id: user_id },
      attributes: ['id', 'user_id']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Get all student fees with fee structure details
    const studentFees = await StudentFee.findAll({
      where: { student_id: student.id },
      include: [
        {
          model: FeeStructure,
          as: 'feeStructure',
          attributes: [
            'id',
            'name',
            'academic_start_year',
            'academic_end_year',
            'due_date',
            'late_fee_amount',
            'late_fee_type',
            'installment_allowed',
            'max_installments'
          ],
          include: [
            {
              model: ClassSection,
              as: 'classSection',
              attributes: ['id', 'class_name', 'section_name']
            }
          ]
        }
      ],
      attributes: [
        'id',
        'student_id',
        'fee_structure_id',
        'academic_year',
        'original_amount',
        'discount_amount',
        'discount_reason',
        'final_amount',
        'paid_amount',
        'due_amount',
        'due_date',
        'status',
        'created_at',
        'updated_at'
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

    // Format response
    const formattedFees = studentFees.map(fee => ({
      student_fee_id: fee.id,
      fee_structure: {
        id: fee.feeStructure?.id,
        name: fee.feeStructure?.name,
        academic_year: `${fee.feeStructure?.academic_start_year}-${fee.feeStructure?.academic_end_year}`,
        class_name: fee.feeStructure?.classSection?.class_name,
        section_name: fee.feeStructure?.classSection?.section_name,
        installment_allowed: fee.feeStructure?.installment_allowed,
        max_installments: fee.feeStructure?.max_installments,
        late_fee_amount: fee.feeStructure?.late_fee_amount,
        late_fee_type: fee.feeStructure?.late_fee_type
      },
      fee_details: {
        academic_year: fee.academic_year,
        original_amount: fee.original_amount,
        discount_amount: fee.discount_amount,
        discount_reason: fee.discount_reason,
        final_amount: fee.final_amount,
        paid_amount: fee.paid_amount,
        due_amount: fee.due_amount,
        due_date: fee.due_date,
        status: fee.status
      },
      created_at: fee.created_at,
      updated_at: fee.updated_at
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student fee details fetched successfully",
      data: {
        student_id: student.id,
        user_id: user_id,
        total_fees: studentFees.length,
        fees: formattedFees
      }
    });

  } catch (error) {
    console.error("Get Student Fee Details Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get student installments (user_id from token)
const getStudentInstallments = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;

    // Find student by user_id
    const student = await Student.findOne({
      where: { user_id: user_id },
      attributes: ['id', 'user_id']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Get all student fees to find their installments
    const studentFees = await StudentFee.findAll({
      where: { student_id: student.id },
      attributes: ['id', 'fee_structure_id', 'academic_year', 'final_amount'],
      include: [
        {
          model: FeeStructure,
          as: 'feeStructure',
          attributes: ['id', 'name', 'academic_start_year', 'academic_end_year']
        },
        {
          model: FeeInstallment,
          as: 'installments',
          attributes: [
            'id',
            'installment_number',
            'amount',
            'due_date',
            'paid_amount',
            'payment_date',
            'late_fee_applied',
            'late_fee',
            'status',
            'created_at',
            'updated_at'
          ]
        }
      ]
    });

    if (studentFees.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No fee records found for this student"
      });
    }

    // Format response
    const formattedData = studentFees.map(fee => ({
      student_fee_id: fee.id,
      fee_structure_name: fee.feeStructure?.name,
      academic_year: `${fee.feeStructure?.academic_start_year}-${fee.feeStructure?.academic_end_year}`,
      total_amount: fee.final_amount,
      total_installments: fee.installments?.length || 0,
      installments: fee.installments?.map(inst => ({
        installment_id: inst.id,
        installment_number: inst.installment_number,
        amount: inst.amount,
        due_date: inst.due_date,
        paid_amount: inst.paid_amount,
        payment_date: inst.payment_date,
        late_fee_applied: inst.late_fee_applied,
        late_fee: inst.late_fee,
        remaining_amount: parseFloat(inst.amount) - parseFloat(inst.paid_amount),
        status: inst.status,
        created_at: inst.created_at,
        updated_at: inst.updated_at
      })) || []
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student installments fetched successfully",
      data: {
        student_id: student.id,
        user_id: user_id,
        fee_records: formattedData
      }
    });

  } catch (error) {
    console.error("Get Student Installments Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  getStudentFeeDetails,
  getStudentInstallments
};
