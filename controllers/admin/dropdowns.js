const {User,Teacher,ClassSection,Student,ExamTerm,Exam} = require('../../models');

const getTeacherDropdown = async (req, res) => {
  try {
    const allTeachers = await User.findAll({
      where: {
        role: "teacher",
        status: "active",
      },
      attributes: ["name"],
      include: {
        model: Teacher,
        as: "teacherDetails",
        attributes: ["id"],
      },
    });

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Active teachers fetched successfully",
      data: allTeachers,
    });

  } catch (error) {
    console.error("Get Active Teachers Error:", error);
    res.status(500).json({
      success:false,
      statusCode:500,
      message: "Internal Server Error" });
  }
};

const getClassDropdown = async (req, res) => {
  try {

    const classSections = await ClassSection.findAll({
          attributes: ['id', 'class_name', 'section_name'], 
      order: [["class_name", "ASC"], ["section_name", "ASC"]],
    });

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Class-sections fetched successfully",
      data: classSections,
    });

  } catch (error) {
    console.error("Get Class-Sections Error:", error);
    res.status(500).json({ 
      success:false,
      statusCode:500,
      message: "Internal Server Error"
    
    });
  }
};

const getStudentsByClass = async (req, res) => {
  try {
    const { class_id } = req.params;

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

    // Get all students for this class
    const students = await Student.findAll({
      where: {
        class_section_id: class_id
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name']
        }
      ],
      attributes: [],
      order: [['roll_number', 'ASC']]
    });

    // Format response to show only user id and name
    const formattedStudents = students.map(student => ({
      id: student.User ? student.User.id : null,
      name: student.User ? student.User.name : 'N/A'
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Students fetched successfully for ${classSection.class_name}-${classSection.section_name}`,
      data: formattedStudents
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

const getExamTermDropdown = async (req, res) => {
  try {
    const examTerms = await ExamTerm.findAll({
      where: {
        status: 'active'
      },
      attributes: ['id', 'term_name', 'academic_year'],
      order: [['academic_year', 'DESC'], ['term_name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam terms fetched successfully",
      data: examTerms
    });

  } catch (error) {
    console.error("Get Exam Term Dropdown Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

const getExamDropdown = async (req, res) => {
  try {
    const { term_id } = req.query;

    const whereCondition = {};
    if (term_id) {
      whereCondition.term_id = term_id;
    }

    const exams = await Exam.findAll({
      where: whereCondition,
      include: [
        {
          model: ExamTerm,
          as: 'term',
          attributes: ['term_name', 'academic_year']
        }
      ],
      attributes: ['id', 'exam_name', 'status'],
      order: [['exam_name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exams fetched successfully",
      data: exams
    });

  } catch (error) {
    console.error("Get Exam Dropdown Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = { 
  getTeacherDropdown,
  getClassDropdown,
  getStudentsByClass,
  getExamTermDropdown,
  getExamDropdown
};