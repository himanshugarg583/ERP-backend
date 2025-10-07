const { Model } = require('sequelize');
const { Subject, ClassSection, User,sequelize,Teacher } = require('../../../models');


const addSubject = async (req, res) => {
  try {
    const { subject_name, subject_code, class_section_id, teacher_id } = req.body;

    if (
      !subject_name || !subject_code  || !class_section_id 
    ) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Please fill all required fields",
      });
    }

    //  Check if class_section exists
    const classSection = await ClassSection.findOne({
      where: { id: class_section_id }
    });
    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Class Section not found'
      });
    }

    //  Check if teacher exists and is a teacher
    if (teacher_id) {
      const teacher = await Teacher.findOne({
        where: {
          id: teacher_id
        }
      });
      if (!teacher) {
        return res.status(404).json({
          success: false,
          statusCode: 404,
          message: 'Teacher not found or invalid role'
        });
      }
    }

    //  Check for duplicate subject_code in same class_section
    const existingSubject = await Subject.findOne({
      where: {
        subject_name,
        class_section_id
      }
    });
    if (existingSubject) {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: 'Subject with same name already exists in this class section'
      });
    }

    //  Create subject
    const subject = await Subject.create({
      subject_name,
      subject_code,
      class_section_id,
      teacher_id: teacher_id || null
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Subject created successfully',
      subject
    });

  } catch (error) {
    console.error('Add subject error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Server error',
      error: error.message
    });
  }
};


const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_name, subject_code, class_section_id, teacher_id } = req.body;

    const subject = await Subject.findOne({
      where:{id:id}
    });
    if (!subject) {
      return res.status(404).json({ 
        success:false,  
        statusCode:404,
        message: 'Subject not found' 
      });
    }

    // Optional: Validate new class section or teacher
    if (class_section_id) {
      const section = await ClassSection.findOne({
        where:{
          id:class_section_id}});

      if (!section) return res.status(404).json({ 
         success:false,  
          statusCode:404,
        message: 'Class section not found' 
      });
    }

    if (teacher_id) {
      const teacher = await Teacher.findOne({where:{id:teacher_id}});
      if (!teacher) return res.status(404).json({
         success:false,  
          statusCode:404,
        message: 'Teacher not found'
       });
    }

    await subject.update({
    subject_name: subject_name || subject.subject_name,
    subject_code: subject_code || subject.subject_code,
    class_section_id: class_section_id || subject.class_section_id,
    teacher_id: teacher_id || subject.teacher_id
    });

    res.status(200).json({ 
       success:true,  
          statusCode:200,
      message: 'Subject updated successfully', subject });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ 
       success:false,  
          statusCode:500,
      message: 'Server error' });
  }
};

const getSingleSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findOne( {where:{id:id}} , {
      include: [
        {
          model: ClassSection,
          as: 'class_section',
          attributes: ['id', 'subject_name', 'subject_code']
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['user_id', 'name', 'email']
        },
        {
          model: ClassSection,
          as: 'class_section',
          attributes: ['id', 'class_name', 'section_name']
        }
      ]
    });

    if (!subject) {
      return res.status(404).json({ 
        success:false,  
        statusCode:404,
        message: 'Subject not found'
       });
    }

    res.status(200).json({ 
     success:true,  
     statusCode:200,
     subject 
    });
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ 
       success:false,  
       statusCode:500,
      message: 'Server error' });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findOne({where:{id:id}});
    if (!subject) {
      return res.status(404).json({
         success:false,  
          statusCode:404,
        message: 'Subject not found' });
    }

    await subject.destroy();

    res.status(200).json({ 
       success:true,  
       statusCode:200,
      message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({
       success:false,  
          statusCode:500,
      message: 'Server error'
    
    });
  }
};



const getSubjectsByClassSection = async (req, res) => {
  try {
    const { class_section_id } = req.params;

    const subjects = await Subject.findAll({
      where: { class_section_id }
    });

    res.status(200).json({
       success:true,  
          statusCode:200,
      subjects });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ 
       success:false,  
          statusCode:500,
      message: 'Server error' });
  }
};


const getAllSubjectsWithDetails = async (req, res) => {
  try {
    const subjects = await Subject.findAll({
      include: [
        {
          model: ClassSection,
          as: 'class_section',
          attributes: ['id', 'class_name', 'section_name']
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['user_id'] 
        }
      ]
    });

    res.status(200).json({
       success:true,  
          statusCode:200,
      subjects });
  } catch (error) {
    console.error('Error fetching subjects with details:', error);
    res.status(500).json({ 
       success:false,  
          statusCode:500,
      message: 'Server error' });
  }
};






module.exports ={addSubject,updateSubject,getSingleSubject,deleteSubject,getSubjectsByClassSection,getAllSubjectsWithDetails};