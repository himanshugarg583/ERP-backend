const {ClassSection, Teacher, User} = require("../../../models/index");

const createClass = async (req, res) => {
  try {
    const { class_name, section_name, room_No, room_no, capacity, teacher_id } = req.body;
    const normalizedRoomNo = room_No ?? room_no ?? null;

     if (!class_name || !section_name) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Class name and section name are required"
      });
    }

    // Check if class section already exists
    const existingClass = await ClassSection.findOne({
      where: { 
        class_name: class_name,
        section_name: section_name 
      }
    });

    if (existingClass) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Class section already exists"
      });
    }

    const newClass = await ClassSection.create({
      class_name,
      section_name,
      room_No: normalizedRoomNo,
      capacity: capacity ?? null,
      teacher_id: teacher_id ?? null
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Class section created successfully",
      data: newClass
    });

  } catch (error) {
    console.error("Create Class Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

const getAllClassSections = async (req, res) => {
  try {
    const classSections = await ClassSection.findAll({
      include: [
        {
          model: Teacher,
          as: 'classTeacher',
          include: [
            {
              model: User,
              attributes: ['id', 'name', 'email']
            }
          ]
        }
      ],
      order: [['class_name', 'ASC'], ['section_name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Class sections retrieved successfully",
      data: classSections
    });

  } catch (error) {
    console.error("Get All Class Sections Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

const updateClassSection = async (req, res) => {
  try {
    const id = req.params.id;
    const { class_name, section_name, room_No, room_no, capacity, teacher_id } = req.body;
    const normalizedRoomNo = room_No ?? room_no;

    const classSection = await ClassSection.findOne({
      where:{id:id}
      });

    if (!classSection) {
      return res.status(404).json({ 
        success: false,
        statusCode:404,
        message: "Class-section not found" 
      });
    }

    classSection.class_name = class_name || classSection.class_name;
    classSection.section_name = section_name || classSection.section_name;
    if (normalizedRoomNo !== undefined) classSection.room_No = normalizedRoomNo;
    if (capacity !== undefined) classSection.capacity = capacity;
    if (teacher_id !== undefined) classSection.teacher_id = teacher_id;
    
    await classSection.save();

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Class-section updated successfully",
      data: classSection,
    });

  } catch (error) {
    console.error("Update Class-Section Error:", error);
    res.status(500).json({ 
      success: false,
      statusCode:500,
      message: "Internal Server Error"
    });
  }
};

const DeleteClassSection = async (req, res) => {
  try {
    const id = req.params.id;

    const classSection = await ClassSection.findOne({
      where:{id:id}
    });

    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode:404,
        message: "Class-section not found"
      });
    }

    await classSection.destroy();

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Class-section deleted successfully"
    });

  } catch (error) {
    console.error("Delete Class-Section Error:", error);
    res.status(500).json({
      success:false,
      statusCode:500,
      message: "Internal Server Error"
    
    });
  }
};

const getClassDropdown = async (req, res) => {
  try {
    const classSections = await ClassSection.findAll({
      attributes: ['id', 'class_name', 'section_name'],
      order: [['class_name', 'ASC'], ['section_name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Class dropdown retrieved successfully",
      data: classSections
    });

  } catch (error) {
    console.error("Get Class Dropdown Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Assign or update class teacher
const assignClassTeacher = async (req, res) => {
  try {
    const { class_section_id, teacher_id } = req.body;

    // Validation
    if (!class_section_id || !teacher_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Class section ID and teacher ID are required"
      });
    }

    // Check if class section exists
    const classSection = await ClassSection.findByPk(class_section_id);

    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    // Check if teacher exists
    const teacher = await Teacher.findByPk(teacher_id, {
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Teacher not found"
      });
    }

    // Check if teacher is already assigned to another class as class teacher
    const existingAssignment = await ClassSection.findOne({
      where: {
        teacher_id: teacher_id,
        id: { [require('sequelize').Op.ne]: class_section_id }
      }
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Teacher is already assigned as class teacher to ${existingAssignment.class_name}-${existingAssignment.section_name}`
      });
    }

    // Assign teacher to class
    classSection.teacher_id = teacher_id;
    await classSection.save();

    // Fetch updated class section with teacher details
    const updatedClassSection = await ClassSection.findByPk(class_section_id, {
      include: [
        {
          model: Teacher,
          as: 'classTeacher',
          include: [
            {
              model: User,
              attributes: ['id', 'name', 'email']
            }
          ]
        }
      ]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Class teacher assigned successfully",
      data: {
        class_section_id: updatedClassSection.id,
        class_name: updatedClassSection.class_name,
        section_name: updatedClassSection.section_name,
        room_No: updatedClassSection.room_No,
        capacity: updatedClassSection.capacity,
        teacher: {
          teacher_id: teacher.id,
          name: teacher.User.name,
          email: teacher.User.email
        }
      }
    });

  } catch (error) {
    console.error("Assign Class Teacher Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = { createClass,getAllClassSections,updateClassSection,DeleteClassSection,getClassDropdown,assignClassTeacher};
