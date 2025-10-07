const {ClassSection} = require("../../../models/index");

const createClass = async (req, res) => {
  try {
    const { class_name, section_name,room_No,capacity,teacher_id } = req.body;

     if (!class_name || !section_name) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "class_name section_name must be required",
      });
    }
    // Check if class already exists
    const existing = await ClassSection.findOne({ 
        where: { class_name, section_name } 
    
    });
    
    if (existing) {
      return res.status(400).json({
        success:false,
        statusCode:400,
        message: "Class already exists" 
      
      });
    }

    const newClass = await ClassSection.create({
      class_name,
      section_name, 
      room_No,
      capacity,
      teacher_id
    });

    res.status(201).json({
      success: true,
      statusCode:201,
      message: "Class created successfully",
      data: newClass,
    });

  } catch (error) {
    console.error("Create Class Error:", error);
    res.status(500).json({ 
      success:false,
      statusCode:500,
      message: "Internal Server Error" 
    });
  }
};



const getAllClassSections = async (req, res) => {
  try {

    const classSections = await ClassSection.findAll({
          attributes: ['id', 'class_name', 'section_name', 'room_No', 'capacity'], 
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





const updateClassSection = async (req, res) => {
  try {
    const id = req.params.id;
    const { class_name, section_name,room_No,capacity,teacher_id } = req.body;

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
    classSection.room_No = room_No || classSection.room_No;
    classSection.capacity = capacity || classSection.capacity;
    classSection.teacher_id = teacher_id || classSection.teacher_id;
    
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
      success:false,
      statusCode:500,
      message: "Internal Server Error" });
  }
};

const DeleteClassSection = async (req, res) => {
  try {
    const id = req.params.id;

    const classSection = await ClassSection.findOne(
      {
        where:{id:id}
      }
      );

    if (!classSection) {
      return res.status(404).json({
         success: false,
         statusCode:404,
         message: "Class-section not found"
         });
    }


await ClassSection.destroy({ where: { id } });
    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Class-section deactivated successfully",
    });

  } catch (error) {
    console.error("Soft Delete Class-Section Error:", error);
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




module.exports = { createClass,getAllClassSections,updateClassSection,DeleteClassSection,getClassDropdown};
