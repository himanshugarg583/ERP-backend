const bcrypt = require('bcryptjs');
const { User } = require('../../models/admin/users');
const { Teacher } = require('../../models/admin/teachers');
const { Staff } = require('../../models/admin/staff');
const { successResponse, errorResponse } = require('../../utils/response');

/**
 * @desc    Get accountant profile details
 * @route   GET /api/accountant/profile/me
 * @access  Private (Accountant only)
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Prefer staff table for accountant details (accountants are stored as staff now)
    const staffAccountant = await Staff.findOne({
      where: { user_id: userId, role: 'accountant' },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'role', 'status']
        }
      ],
      attributes: [
        'id',
        'designation',
        'dob',
        'mobile_no',
        'permanent_address',
        'current_address',
        'role',
        'gender',
        'salary',
        'joining_date',
        'image'
      ]
    });

    if (staffAccountant) {
      const acc = staffAccountant;
      const profile = {
        personal_info: {
          accountant_id: acc.id,
          user_id: acc.User?.id,
          name: acc.User?.name,
          email: acc.User?.email,
          mobile_no: acc.mobile_no,
          gender: acc.gender,
          dob: acc.dob,
          image: acc.image ? `${process.env.BACKEND_URL}/uploads/staff/${acc.image}` : null,
          account_status: acc.User?.status
        },
        professional_info: {
          role: acc.role,
          qualification: acc.qualification,
          joining_date: acc.joining_date,
          salary: acc.salary
        },
        address_info: {
          current_address: acc.current_address,
          permanent_address: acc.permanent_address
        }
      };

      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Accountant profile fetched successfully",
        data: profile
      });
    }

    // Fallback: try to find accountant details in Teacher table (legacy)
    const accountant = await Teacher.findOne({
      where: { user_id: userId },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'role', 'status']
        }
      ],
      attributes: [
        'id',
        'qualification',
        'dob',
        'mobile_no',
        'permanent_address',
        'current_address',
        'role',
        'gender',
        'salary',
        'joining_date',
        'image'
      ]
    });

    // If found in Teacher table (legacy), return detailed profile
    if (accountant) {
      const profile = {
        personal_info: {
          accountant_id: accountant.id,
          user_id: accountant.User?.id,
          name: accountant.User?.name,
          email: accountant.User?.email,
          mobile_no: accountant.mobile_no,
          gender: accountant.gender,
          dob: accountant.dob,
          image: accountant.image ? `${process.env.BACKEND_URL}/uploads/teachers/${accountant.image}` : null,
          account_status: accountant.User?.status
        },
        professional_info: {
          role: accountant.role,
          qualification: accountant.qualification,
          joining_date: accountant.joining_date,
          salary: accountant.salary
        },
        address_info: {
          current_address: accountant.current_address,
          permanent_address: accountant.permanent_address
        }
      };

      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Accountant profile fetched successfully",
        data: profile
      });
    }

    // If not found in Teacher table, fetch basic user data
    const user = await User.findOne({
      where: { id: userId, role: 'accountant' },
      attributes: ['id', 'name', 'email', 'role', 'status', 'created_at', 'updated_at']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Accountant not found"
      });
    }

    // Return basic profile from User table
    const basicProfile = {
      personal_info: {
        user_id: user.id,
        name: user.name,
        email: user.email,
        mobile_no: null,
        gender: null,
        dob: null,
        image: null,
        account_status: user.status
      },
      professional_info: {
        role: user.role,
        qualification: null,
        joining_date: null,
        salary: null
      },
      address_info: {
        current_address: null,
        permanent_address: null
      }
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Accountant profile fetched successfully",
      data: basicProfile
    });

  } catch (error) {
    console.error('Error fetching accountant profile:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

/**
 * @desc    Change accountant password
 * @route   PUT /api/accountant/profile/change-password
 * @access  Private (Accountant only)
 */
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return errorResponse(res, 'All fields are required', 400);
    }

    // Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      return errorResponse(res, 'New password and confirm password do not match', 400);
    }

    // Check password length
    if (newPassword.length < 6) {
      return errorResponse(res, 'New password must be at least 6 characters long', 400);
    }

    // Check if new password is different from current password
    if (currentPassword === newPassword) {
      return errorResponse(res, 'New password must be different from current password', 400);
    }

    // Fetch user with password
    const user = await User.findOne({
      where: { id: userId, role: 'accountant' }
    });

    if (!user) {
      return errorResponse(res, 'Accountant not found', 404);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Current password is incorrect', 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await user.update({ password: hashedPassword });

    return successResponse(res, 'Password changed successfully', null, 200);

  } catch (error) {
    console.error('Error changing password:', error);
    return errorResponse(res, 'Failed to change password', 500);
  }
};
