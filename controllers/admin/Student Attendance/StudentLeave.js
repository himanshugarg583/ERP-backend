const { StudentLeave, Student, User, ClassSection } = require('../../../models');
const { Op } = require('sequelize');

// Apply for leave (for students and admin)
const applyLeave = async (req, res) => {
  try {
    const { student_id, leave_type, start_date, end_date, reason } = req.body;
    const attachment = req.file ? req.file.filename : null;

    // Validation
    if (!student_id || !start_date || !end_date || !reason) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Student ID, start date, end date, and reason are required"
      });
    }

    // Validate leave_type if provided
    const validLeaveTypes = ['sick', 'casual', 'emergency', 'other'];
    if (leave_type && !validLeaveTypes.includes(leave_type)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid leave type. Must be one of: sick, casual, emergency, other"
      });
    }

    // Validate dates
    const fromDate = new Date(start_date);
    const toDate = new Date(end_date);

    if (fromDate > toDate) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Start date cannot be after end date"
      });
    }

    // Check if student exists
    const student = await Student.findByPk(student_id, {
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

    // Check if leave already exists for overlapping dates
    const existingLeave = await StudentLeave.findOne({
      where: {
        student_id: student_id,
        [Op.or]: [
          {
            start_date: {
              [Op.between]: [start_date, end_date]
            }
          },
          {
            end_date: {
              [Op.between]: [start_date, end_date]
            }
          },
          {
            [Op.and]: [
              { start_date: { [Op.lte]: start_date } },
              { end_date: { [Op.gte]: end_date } }
            ]
          }
        ]
      }
    });

    if (existingLeave) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Leave application already exists for overlapping dates (${existingLeave.start_date} to ${existingLeave.end_date})`
      });
    }

    // Calculate total days
    const totalDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

    // Create leave application
    const newLeave = await StudentLeave.create({
      student_id: student_id,
      leave_type: leave_type || 'casual',
      start_date: start_date,
      end_date: end_date,
      reason: reason,
      status: 'pending',
      attachment: attachment || null
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Leave application submitted successfully",
      data: {
        leave: newLeave,
        total_days: totalDays,
        student_info: {
          student_id: student.id,
          student_name: student.User.name,
          roll_number: student.roll_number,
          class_name: student.ClassSection.class_name,
          section_name: student.ClassSection.section_name
        }
      }
    });

  } catch (error) {
    console.error("Apply Leave Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all leaves with filters
const getAllLeaves = async (req, res) => {
  try {
    const { student_id, status, leave_type, class_name, section_name } = req.query;

    // Build where clause
    const whereClause = {};
    if (student_id) whereClause.student_id = student_id;
    if (status) whereClause.status = status;
    if (leave_type) whereClause.leave_type = leave_type;

    // Build include for filtering by class
    const includeClause = [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'roll_number'],
        include: [
          {
            model: User,
            attributes: ['id', 'name', 'email']
          },
          {
            model: ClassSection,
            attributes: ['id', 'class_name', 'section_name'],
            where: {}
          }
        ]
      }
    ];

    // Add class filters
    if (class_name) {
      includeClause[0].include[1].where.class_name = class_name;
    }
    if (section_name) {
      includeClause[0].include[1].where.section_name = section_name;
    }

    const leaves = await StudentLeave.findAll({
      where: whereClause,
      include: includeClause,
      order: [['start_date', 'DESC'], ['created_at', 'DESC']]
    });

    // Format the output
    const formattedLeaves = leaves.map(leave => {
      // Calculate total days
      const startDate = new Date(leave.start_date);
      const endDate = new Date(leave.end_date);
      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      
      // Generate full URL for attachment
      const attachmentUrl = leave.attachment 
        ? `${process.env.BACKEND_URL}/uploads/studentLeaveDocuments/${leave.attachment}`
        : null;
      
      return {
        leave_id: leave.id,
        student_name: leave.student.User.name,
        student_id: leave.student_id,
        class: `${leave.student.ClassSection.class_name}-${leave.student.ClassSection.section_name}`,
        from: leave.start_date,
        to: leave.end_date,
        total_days: totalDays,
        leave_type: leave.leave_type,
        reason: leave.reason,
        status: leave.status,
        approved_by: leave.approved_by,
        rejection_reason: leave.rejection_reason,
        attachment: attachmentUrl,
        created_at: leave.created_at
      };
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Leaves fetched successfully",
      data: {
        total_applications: formattedLeaves.length,
        leaves: formattedLeaves
      }
    });

  } catch (error) {
    console.error("Get All Leaves Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get single leave by ID
const getSingleLeave = async (req, res) => {
  try {
    const { id } = req.params;

    const leave = await StudentLeave.findByPk(id, {
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'roll_number'],
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
        }
      ]
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Leave not found"
      });
    }

    // Generate full URL for attachment
    const attachmentUrl = leave.attachment 
      ? `${process.env.BACKEND_URL}/uploads/studentLeaveDocuments/${leave.attachment}`
      : null;

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Leave fetched successfully",
      data: {
        ...leave.toJSON(),
        attachment: attachmentUrl
      }
    });

  } catch (error) {
    console.error("Get Single Leave Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Update leave status (approve or reject)
const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    const approved_by = req.user?.id || null;

    // Validation
    if (!status) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Status is required"
      });
    }

    // Validate status value
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Status must be either 'approved' or 'rejected'"
      });
    }

    // If rejecting, rejection_reason is required
    if (status === 'rejected' && !rejection_reason) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Rejection reason is required when rejecting leave"
      });
    }

    const leave = await StudentLeave.findByPk(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Leave not found"
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Leave is already ${leave.status}`
      });
    }

    // Update leave status
    await leave.update({
      status: status,
      approved_by: approved_by,
      rejection_reason: status === 'rejected' ? rejection_reason : null
    });

    const updatedLeave = await StudentLeave.findByPk(id, {
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'roll_number'],
          include: [
            {
              model: User,
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });

    const message = status === 'approved' 
      ? "Leave approved successfully" 
      : "Leave rejected successfully";

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: message,
      data: updatedLeave
    });

  } catch (error) {
    console.error("Update Leave Status Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Cancel leave (only for pending leaves)
const cancelLeave = async (req, res) => {
  try {
    const { id } = req.params;

    const leave = await StudentLeave.findByPk(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Leave not found"
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Only pending leaves can be cancelled"
      });
    }

    await leave.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Leave cancelled successfully"
    });

  } catch (error) {
    console.error("Cancel Leave Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  applyLeave,
  getAllLeaves,
  getSingleLeave,
  updateLeaveStatus,
  cancelLeave
};
