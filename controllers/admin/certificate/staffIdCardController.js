const { Teacher, User } = require('../../../models');

// Generate single staff/teacher ID card
const generateStaffIdCard = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "User ID is required"
      });
    }

    // Find teacher with details
    const teacher = await Teacher.findOne({
      where: { user_id: user_id },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
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
        'joining_date',
        'image'
      ]
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Staff/Teacher not found"
      });
    }

    // Format ID card data
    const idCardData = {
      teacher_id: teacher.id,
      user_id: teacher.User?.id,
      name: teacher.User?.name,
      email: teacher.User?.email,
      role: teacher.role,
      qualification: teacher.qualification,
      dob: teacher.dob,
      gender: teacher.gender,
      mobile_no: teacher.mobile_no,
      current_address: teacher.current_address,
      permanent_address: teacher.permanent_address,
      joining_date: teacher.joining_date,
      image: teacher.image
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Staff ID card data fetched successfully",
      data: idCardData
    });

  } catch (error) {
    console.error("Generate Staff ID Card Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Generate multiple staff/teachers ID cards
const generateMultipleStaffIdCards = async (req, res) => {
  try {
    const { user_ids } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "User IDs array is required and must not be empty"
      });
    }

    // Find all teachers with details
    const teachers = await Teacher.findAll({
      where: { user_id: user_ids },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ],
      attributes: [
        'id',
        'user_id',
        'qualification',
        'dob',
        'mobile_no',
        'permanent_address',
        'current_address',
        'role',
        'gender',
        'joining_date',
        'image'
      ]
    });

    if (teachers.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No staff/teachers found"
      });
    }

    // Format ID card data for all teachers
    const idCardsData = teachers.map(teacher => ({
      teacher_id: teacher.id,
      user_id: teacher.user_id,
      name: teacher.User?.name,
      email: teacher.User?.email,
      role: teacher.role,
      qualification: teacher.qualification,
      dob: teacher.dob,
      gender: teacher.gender,
      mobile_no: teacher.mobile_no,
      current_address: teacher.current_address,
      permanent_address: teacher.permanent_address,
      joining_date: teacher.joining_date,
      image: teacher.image
    }));

    // Check for missing teachers
    const foundUserIds = teachers.map(t => t.user_id);
    const missingUserIds = user_ids.filter(id => !foundUserIds.includes(id));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Staff ID cards data fetched successfully",
      data: {
        total_requested: user_ids.length,
        total_found: teachers.length,
        missing_user_ids: missingUserIds.length > 0 ? missingUserIds : null,
        id_cards: idCardsData
      }
    });

  } catch (error) {
    console.error("Generate Multiple Staff ID Cards Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  generateStaffIdCard,
  generateMultipleStaffIdCards
};
