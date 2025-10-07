const {User,Teacher,ClassSection} = require('../../models');

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

module.exports = { getTeacherDropdown,getClassDropdown };