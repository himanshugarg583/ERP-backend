const { ClassSection, Teacher, User, Student } = require('../../../models');

// Get all available classes with details
const getAllAvailableClasses = async (req, res) => {
  try {
    const classes = await ClassSection.findAll({
      attributes: ['id', 'class_name', 'section_name', 'room_No', 'capacity'],
      include: [
        {
          model: Teacher,
          as: 'classTeacher',
          attributes: ['id'],
          include: [{
            model: User,
            attributes: ['id', 'name',]
          }],
          required: false
        }
      ],
      order: [['class_name', 'ASC'], ['section_name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Classes fetched successfully",
      data: {
        classes: classes,
        total_classes: classes.length
      }
    });

  } catch (error) {
    console.error("Get All Available Classes Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all students of a specific class
const getStudentsByClass = async (req, res) => {
  try {
    const { class_id } = req.params;

    // Validate class_id
    if (!class_id || isNaN(parseInt(class_id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid class ID is required"
      });
    }

    // Check if class exists
    const classSection = await ClassSection.findByPk(class_id, {
      attributes: ['id', 'class_name', 'section_name']
    });

    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class not found"
      });
    }

    // Get all students of the class
    const students = await Student.findAll({
      attributes: ['id', 'roll_number'],
      where: {
        class_section_id: class_id
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name']
        }
      ],
      order: [['roll_number', 'ASC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Students fetched successfully",
      data: {
        class_info: {
          id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name
        },
        students: students,
        total_students: students.length
      }
    });

  } catch (error) {
    console.error("Get Students By Class Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  getAllAvailableClasses,
  getStudentsByClass
};