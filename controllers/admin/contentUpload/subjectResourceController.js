const { SubjectResource, ClassSection, Subject, Teacher, User } = require('../../../models');

// Upload subject resource (assignment, notes, etc.)
const uploadSubjectResource = async (req, res) => {
  try {
    const { class_section_id, subject_id, title, description, resource_type, due_date } = req.body;

    // Validate required fields
    if (!class_section_id || !subject_id || !title || !resource_type) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Class section ID, subject ID, title, and resource type are required"
      });
    }

    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "File is required"
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

    // Check if subject exists
    const subject = await Subject.findByPk(subject_id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Subject not found"
      });
    }

    // Prepare resource data
    const resourceData = {
      class_section_id,
      subject_id,
      title,
      description,
      file_url: req.file.filename,
      resource_type,
      teacher_id: null // Admin upload
    };

    // Add due_date if provided (for assignments)
    if (due_date) {
      resourceData.due_date = new Date(due_date);
    }

    // Create subject resource
    const subjectResource = await SubjectResource.create(resourceData);

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Subject resource uploaded successfully",
      data: {
        resource_id: subjectResource.id,
        class_section_id: subjectResource.class_section_id,
        subject_id: subjectResource.subject_id,
        title: subjectResource.title,
        description: subjectResource.description,
        file_url: `${process.env.BACKEND_URL}/uploads/subjectResources/${subjectResource.file_url}`,
        resource_type: subjectResource.resource_type,
        due_date: subjectResource.due_date,
        created_at: subjectResource.created_at
      }
    });

  } catch (error) {
    console.error("Upload Subject Resource Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all subject resources
const getAllSubjectResources = async (req, res) => {
  try {
    const { class_section_id, subject_id, resource_type } = req.query;

    // Build where condition
    const whereCondition = {};
    if (class_section_id) whereCondition.class_section_id = class_section_id;
    if (subject_id) whereCondition.subject_id = subject_id;
    if (resource_type) whereCondition.resource_type = resource_type;

    const resources = await SubjectResource.findAll({
      where: whereCondition,
      include: [
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name']
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name']
        },
        {
          model: Teacher,
          as: 'teacher',
          required: false,
          attributes: ['id'],
          include: [{
            model: User,
            attributes: ['name']
          }]
        }
      ],
      order: [['created_at', 'DESC']],
      attributes: ['id', 'title', 'description', 'file_url', 'resource_type', 'due_date', 'created_at', 'updated_at']
    });

    // Format response
    const formattedResources = resources.map(resource => ({
      resource_id: resource.id,
      class_section_id: resource.classSection?.id,
      class_display: resource.classSection ? `${resource.classSection.class_name} ${resource.classSection.section_name}` : 'N/A',
      subject_id: resource.subject?.id,
      subject_name: resource.subject?.subject_name || 'N/A',
      title: resource.title,
      description: resource.description,
      file_url: `${process.env.BACKEND_URL}/uploads/subjectResources/${resource.file_url}`,
      resource_type: resource.resource_type,
      due_date: resource.due_date,
      uploaded_by: resource.teacher ? resource.teacher.User?.name : 'Admin',
      created_at: resource.created_at,
      updated_at: resource.updated_at
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Subject resources fetched successfully",
      data: {
        total_resources: formattedResources.length,
        resources: formattedResources
      }
    });

  } catch (error) {
    console.error("Get All Subject Resources Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get single subject resource
const getSubjectResourceById = async (req, res) => {
  try {
    const { resource_id } = req.params;

    const resource = await SubjectResource.findOne({
      where: { id: resource_id },
      include: [
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name']
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name']
        },
        {
          model: Teacher,
          as: 'teacher',
          required: false,
          attributes: ['id'],
          include: [{
            model: User,
            attributes: ['name']
          }]
        }
      ],
      attributes: ['id', 'title', 'description', 'file_url', 'resource_type', 'due_date', 'created_at', 'updated_at']
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Subject resource not found"
      });
    }

    // Format response
    const formattedResource = {
      resource_id: resource.id,
      class_section_id: resource.classSection?.id,
      class_display: resource.classSection ? `${resource.classSection.class_name} ${resource.classSection.section_name}` : 'N/A',
      subject_id: resource.subject?.id,
      subject_name: resource.subject?.subject_name || 'N/A',
      title: resource.title,
      description: resource.description,
      file_url: `${process.env.BACKEND_URL}/uploads/subjectResources/${resource.file_url}`,
      resource_type: resource.resource_type,
      due_date: resource.due_date,
      uploaded_by: resource.teacher ? resource.teacher.User?.name : 'Admin',
      created_at: resource.created_at,
      updated_at: resource.updated_at
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Subject resource fetched successfully",
      data: formattedResource
    });

  } catch (error) {
    console.error("Get Subject Resource By ID Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Update subject resource
const updateSubjectResource = async (req, res) => {
  try {
    const { resource_id } = req.params;
    const { title, description, resource_type, due_date } = req.body;

    const resource = await SubjectResource.findByPk(resource_id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Subject resource not found"
      });
    }

    // Update fields
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (resource_type) updateData.resource_type = resource_type;
    if (due_date) updateData.due_date = new Date(due_date);
    if (req.file) updateData.file_url = req.file.filename;
    updateData.updated_at = new Date();

    await resource.update(updateData);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Subject resource updated successfully",
      data: {
        resource_id: resource.id,
        title: resource.title,
        description: resource.description,
        file_url: `${process.env.BACKEND_URL}/uploads/subjectResources/${resource.file_url}`,
        resource_type: resource.resource_type,
        due_date: resource.due_date,
        updated_at: resource.updated_at
      }
    });

  } catch (error) {
    console.error("Update Subject Resource Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete subject resource
const deleteSubjectResource = async (req, res) => {
  try {
    const { resource_id } = req.params;

    const resource = await SubjectResource.findByPk(resource_id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Subject resource not found"
      });
    }

    await resource.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Subject resource deleted successfully"
    });

  } catch (error) {
    console.error("Delete Subject Resource Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  uploadSubjectResource,
  getAllSubjectResources,
  getSubjectResourceById,
  updateSubjectResource,
  deleteSubjectResource
};
