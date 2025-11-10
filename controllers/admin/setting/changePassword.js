const { User } = require("../../../models");

const changePassword = async (req, res) => {
  try {
    const userId = req.user.id; // Get from authenticated user token
    const { current_password, new_password, confirm_password } = req.body;

    // Validation
    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "All fields are required"
      });
    }

    // Check if new password and confirm password match
    if (new_password !== confirm_password) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "New password and confirm password do not match"
      });
    }

    // Check password strength
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Password must be at least 6 characters long"
      });
    }

    // Check if current password is same as new password
    if (current_password === new_password) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "New password cannot be the same as current password"
      });
    }

    // Find user
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "User not found"
      });
    }

    // Verify current password (direct comparison)
    if (current_password !== user.password) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Current password is incorrect"
      });
    }

    // Update password (save directly without hashing)
    user.password = new_password;
    await user.save();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = { changePassword };
