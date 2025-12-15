const { ClassResource, ClassSection, Teacher, User } = require('../../../models');

// Upload class resource
const uploadClassResource = async (req, res) => {
  try {
    const { class_section_id, title, description, resource_type } = req.body;

    // Validate required fields
    if (!class_section_id || !title || !resource_type) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Class section ID, title, and resource type are required"
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

    // Create class resource (teacher_id will be null for admin)
    const classResource = await ClassResource.create({
      class_section_id,
      title,
      description,
      file_url: req.file.filename,
      resource_type,
      teacher_id: null // Admin upload
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Class resource uploaded successfully",
      data: {
        resource_id: classResource.id,
        class_section_id: classResource.class_section_id,
        title: classResource.title,
        description: classResource.description,
        file_url: `${process.env.BACKEND_URL}/uploads/classResources/${classResource.file_url}`,
        resource_type: classResource.resource_type,
        created_at: classResource.created_at
      }
    });

  } catch (error) {
    console.error("Upload Class Resource Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all class resources
const getAllClassResources = async (req, res) => {
  try {
    const { class_section_id, resource_type } = req.query;

    // Build where condition
    const whereCondition = {};
    if (class_section_id) whereCondition.class_section_id = class_section_id;
    if (resource_type) whereCondition.resource_type = resource_type;

    const resources = await ClassResource.findAll({
      where: whereCondition,
      include: [
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name']
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
      attributes: ['id', 'title', 'description', 'file_url', 'resource_type', 'created_at', 'updated_at']
    });

    // Format response
    const formattedResources = resources.map(resource => ({
      resource_id: resource.id,
      class_section_id: resource.classSection?.id,
      class_display: resource.classSection ? `${resource.classSection.class_name} ${resource.classSection.section_name}` : 'N/A',
      title: resource.title,
      description: resource.description,
      file_url: `${process.env.BACKEND_URL}/uploads/classResources/${resource.file_url}`,
      resource_type: resource.resource_type,
      uploaded_by: resource.teacher ? resource.teacher.User?.name : 'Admin',
      created_at: resource.created_at,
      updated_at: resource.updated_at
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Class resources fetched successfully",
      data: {
        total_resources: formattedResources.length,
        resources: formattedResources
      }
    });

  } catch (error) {
    console.error("Get All Class Resources Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get single class resource
const getClassResourceById = async (req, res) => {
  try {
    const { resource_id } = req.params;

    const resource = await ClassResource.findOne({
      where: { id: resource_id },
      include: [
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name']
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
      attributes: ['id', 'title', 'description', 'file_url', 'resource_type', 'created_at', 'updated_at']
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class resource not found"
      });
    }

    // Format response
    const formattedResource = {
      resource_id: resource.id,
      class_section_id: resource.classSection?.id,
      class_display: resource.classSection ? `${resource.classSection.class_name} ${resource.classSection.section_name}` : 'N/A',
      title: resource.title,
      description: resource.description,
      file_url: `${process.env.BACKEND_URL}/uploads/classResources/${resource.file_url}`,
      resource_type: resource.resource_type,
      uploaded_by: resource.teacher ? resource.teacher.User?.name : 'Admin',
      created_at: resource.created_at,
      updated_at: resource.updated_at
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Class resource fetched successfully",
      data: formattedResource
    });

  } catch (error) {
    console.error("Get Class Resource By ID Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Update class resource
const updateClassResource = async (req, res) => {
  try {
    const { resource_id } = req.params;
    const { title, description, resource_type } = req.body;

    const resource = await ClassResource.findByPk(resource_id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class resource not found"
      });
    }

    // Update fields
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (resource_type) updateData.resource_type = resource_type;
    if (req.file) updateData.file_url = req.file.filename;
    updateData.updated_at = new Date();

    await resource.update(updateData);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Class resource updated successfully",
      data: {
        resource_id: resource.id,
        title: resource.title,
        description: resource.description,
        file_url: `${process.env.BACKEND_URL}/uploads/classResources/${resource.file_url}`,
        resource_type: resource.resource_type,
        updated_at: resource.updated_at
      }
    });

  } catch (error) {
    console.error("Update Class Resource Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete class resource
const deleteClassResource = async (req, res) => {
  try {
    const { resource_id } = req.params;

    const resource = await ClassResource.findByPk(resource_id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class resource not found"
      });
    }

    await resource.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Class resource deleted successfully"
    });

  } catch (error) {
    console.error("Delete Class Resource Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  uploadClassResource,
  getAllClassResources,
  getClassResourceById,
  updateClassResource,
  deleteClassResource
};
