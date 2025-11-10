const { User, Student, ClassSection } = require('../../../models');

const getStudentCredentials = async (req, res) => {
  try {
    const { class_id } = req.query;

    // Validate class_id
    if (!class_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Class ID is required"
      });
    }

    // Check if class exists
    const classSection = await ClassSection.findByPk(class_id);

    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    // Get all students with user credentials for the specific class
    const students = await User.findAll({
      where: { role: 'student' },
      attributes: ['id', 'name', 'email', 'password'],
      include: [
        {
          model: Student,
          as: 'studentDetails',
          where: { class_section_id: class_id },
          attributes: ['id', 'roll_number', 'class_section_id'],
          include: [
            {
              model: ClassSection,
              attributes: ['id', 'class_name', 'section_name']
            }
          ]
        }
      ],
      order: [[{ model: Student, as: 'studentDetails' }, 'roll_number', 'ASC']]
    });

    // Format the response
    const formattedStudents = students.map(student => ({
      user_id: student.id,
      name: student.name,
      email: student.email,
      password: student.password,
      student_id: student.studentDetails ? student.studentDetails.id : null,
      roll_number: student.studentDetails ? student.studentDetails.roll_number : null,
   
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Student credentials fetched successfully for ${classSection.class_name}-${classSection.section_name}`,
      data: {
        class_info: {
          class_id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name
        },
        total_students: formattedStudents.length,
        students: formattedStudents
      }
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