const { User, Student, ClassSection } = require('../../../models');

const getStudentCredentials = async (req, res) => {
  try {
    // Get all students with user credentials and class info
    const students = await User.findAll({
      where: { role: 'student' },
      attributes: ['id', 'name', 'email', 'password'],
      include: [
        {
          model: Student,
          as: 'studentDetails',
          attributes: ['class_section_id'],
          include: [
            {
              model: ClassSection,
              attributes: ['class_name', 'section_name']
            }
          ]
        }
      ]
    });

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Student credentials with class fetched successfully",
      data: students
    });

  } catch (error) {
    console.error("Error fetching student data:", error);
    res.status(500).json({
      success: false,
      statusCode:500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

module.exports = {getStudentCredentials};