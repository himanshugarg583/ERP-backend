const { StudentLeave, Student, User } = require('../../../models');
const { Op } = require('sequelize');

// Apply for leave
const applyLeave = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;

    // Get leave details from request body
    const { leave_type, start_date, end_date, reason } = req.body;

    // Validate required fields
    if (!leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Leave type, start date, end date, and reason are required"
      });
    }

    // Convert dates from DD-MM-YYYY to YYYY-MM-DD format
    const formatDate = (dateStr) => {
      // Check if already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      // Convert from DD-MM-YYYY to YYYY-MM-DD
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('-');
        return `${year}-${month}-${day}`;
      }
      return dateStr;
    };

    const formattedStartDate = formatDate(start_date);
    const formattedEndDate = formatDate(end_date);

    // Validate date range
    if (new Date(formattedStartDate) > new Date(formattedEndDate)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Start date cannot be after end date"
      });
    }

    // Find student
    const student = await Student.findOne({
      where: { user_id: user_id }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Create leave application with formatted dates
    const leaveApplication = await StudentLeave.create({
      student_id: student.id,
      leave_type,
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      reason,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Leave application submitted successfully",
      data: {
        leave_id: leaveApplication.id,
        leave_type: leaveApplication.leave_type,
        start_date: leaveApplication.start_date,
        end_date: leaveApplication.end_date,
        reason: leaveApplication.reason,
        status: leaveApplication.status,
        applied_on: leaveApplication.created_at
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

// View all leave applications
const getMyLeaves = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;

    // Find student
    const student = await Student.findOne({
      where: { user_id: user_id }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Get all leave applications for this student
    const leaves = await StudentLeave.findAll({
      where: { student_id: student.id },
      order: [['created_at', 'DESC']],
      attributes: [
        'id',
        'leave_type',
        'start_date',
        'end_date',
        'reason',
        'status',
        'approved_by',
        'rejection_reason',
        'created_at',
        'updated_at'
      ]
    });

    // Group leaves by status
    const groupedLeaves = {
      pending: leaves.filter(leave => leave.status === 'pending'),
      approved: leaves.filter(leave => leave.status === 'approved'),
      rejected: leaves.filter(leave => leave.status === 'rejected')
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Leave applications fetched successfully",
      data: {
        total_leaves: leaves.length,
        pending_count: groupedLeaves.pending.length,
        approved_count: groupedLeaves.approved.length,
        rejected_count: groupedLeaves.rejected.length,
        leaves: leaves
      }
    });

  } catch (error) {
    console.error("Get My Leaves Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete leave application (only pending leaves can be deleted)
const deleteLeave = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;
    const { leave_id } = req.params;

    // Validate leave_id
    if (!leave_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Leave ID is required"
      });
    }

    // Find student
    const student = await Student.findOne({
      where: { user_id: user_id }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Find leave application
    const leave = await StudentLeave.findOne({
      where: {
        id: leave_id,
        student_id: student.id
      }
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Leave application not found"
      });
    }

    // Check if leave is pending (only pending leaves can be deleted)
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Cannot delete ${leave.status} leave application. Only pending leaves can be deleted.`
      });
    }

    // Delete the leave application
    await leave.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Leave application deleted successfully"
    });

  } catch (error) {
    console.error("Delete Leave Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  deleteLeave
};
