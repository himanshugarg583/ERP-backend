const { Student, User, ClassSection } = require('../../../models');

// Generate single student ID card
const generateStudentIdCard = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "User ID is required"
      });
    }

    // Find student with details
    const student = await Student.findOne({
      where: { user_id: user_id },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        },
        {
          model: ClassSection,
          attributes: ['id', 'class_name', 'section_name']
        }
      ],
      attributes: [
        'id',
        'roll_number',
        'admission_date',
        'dob',
        'gender',
        'phone_no',
        'address',
        'image',
        'aadhar_no'
      ]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Format ID card data
    const idCardData = {
      student_id: student.id,
      name: student.User?.name,
      email: student.User?.email,
      roll_number: student.roll_number,
      class_name: student.ClassSection?.class_name,
      section_name: student.ClassSection?.section_name,
      class_display: student.ClassSection 
        ? `${student.ClassSection.class_name} ${student.ClassSection.section_name}` 
        : 'N/A',
      admission_date: student.admission_date,
      dob: student.dob,
      gender: student.gender,
      phone_no: student.phone_no,
      address: student.address,
      image: student.image ? `${process.env.BACKEND_URL}/uploads/studentsDocument/${student.image}` : null,
      aadhar_no: student.aadhar_no
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student ID card data fetched successfully",
      data: idCardData
    });

  } catch (error) {
    console.error("Generate Student ID Card Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Generate multiple students ID cards
const generateMultipleIdCards = async (req, res) => {
  try {
    const { user_ids } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "User IDs array is required and must not be empty"
      });
    }

    // Find all students with details
    const students = await Student.findAll({
      where: { user_id: user_ids },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        },
        {
          model: ClassSection,
          attributes: ['id', 'class_name', 'section_name']
        }
      ],
      attributes: [
        'id',
        'user_id',
        'roll_number',
        'admission_date',
        'dob',
        'gender',
        'phone_no',
        'address',
        'image',
        'aadhar_no'
      ]
    });

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No students found"
      });
    }

    // Format ID card data for all students
    const idCardsData = students.map(student => ({
      student_id: student.id,
      name: student.User?.name,
      email: student.User?.email,
      roll_number: student.roll_number,
      class_name: student.ClassSection?.class_name,
      section_name: student.ClassSection?.section_name,
      class_display: student.ClassSection 
        ? `${student.ClassSection.class_name} ${student.ClassSection.section_name}` 
        : 'N/A',
      admission_date: student.admission_date,
      dob: student.dob,
      gender: student.gender,
      phone_no: student.phone_no,
      address: student.address,
      image: student.image ? `${process.env.BACKEND_URL}/uploads/studentsDocument/${student.image}` : null,
      aadhar_no: student.aadhar_no
    }));

    // Check for missing students
    const foundUserIds = students.map(s => s.user_id);
    const missingUserIds = user_ids.filter(id => !foundUserIds.includes(id));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Students ID card data fetched successfully",
      data: {
        total_requested: user_ids.length,
        total_found: students.length,
        missing_user_ids: missingUserIds.length > 0 ? missingUserIds : null,
        id_cards: idCardsData
      }
    });

  } catch (error) {
    console.error("Generate Multiple ID Cards Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  generateStudentIdCard,
  generateMultipleIdCards
};