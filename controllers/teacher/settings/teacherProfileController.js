const { Teacher, User } = require('../../../models');

// Get teacher profile
const getTeacherProfile = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;

    // Find teacher with user details
    const teacher = await Teacher.findOne({
      where: { user_id: user_id },
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

    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Teacher not found"
      });
    }

    // Format response
    const profile = {
      personal_info: {
        teacher_id: teacher.id,
        user_id: teacher.User?.id,
        name: teacher.User?.name,
        email: teacher.User?.email,
        mobile_no: teacher.mobile_no,
        gender: teacher.gender,
        dob: teacher.dob,
        image: teacher.image ? `${process.env.BACKEND_URL}/uploads/teachers/${teacher.image}` : null,
        account_status: teacher.User?.status
      },
      professional_info: {
        role: teacher.role,
        qualification: teacher.qualification,
        joining_date: teacher.joining_date,
        salary: teacher.salary
      },
      address_info: {
        current_address: teacher.current_address,
        permanent_address: teacher.permanent_address
      }
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Teacher profile fetched successfully",
      data: profile
    });

  } catch (error) {
    console.error("Get Teacher Profile Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Change teacher password
const changeTeacherPassword = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;
    const { current_password, new_password, confirm_new_password } = req.body;

    // Validate input
    if (!current_password || !new_password || !confirm_new_password) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Current password, new password and confirm new password are required"
      });
    }

    // Check if new passwords match
    if (new_password !== confirm_new_password) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "New password and confirm new password do not match"
      });
    }

    // Validate new password length
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "New password must be at least 6 characters long"
      });
    }

    // Find user
    const user = await User.findOne({ where: { id: user_id } });

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "User not found"
      });
    }

    // Verify current password (direct comparison, no encryption)
    if (current_password !== user.password) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Current password is incorrect"
      });
    }

    // Update password (direct save without encryption)
    await user.update({ password: new_password });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error("Change Teacher Password Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  getTeacherProfile,
  changeTeacherPassword
};
