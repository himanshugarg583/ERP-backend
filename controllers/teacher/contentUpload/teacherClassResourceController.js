const { Resource, AudienceTarget, ClassSection, Teacher } = require('../../../models');
const sequelize = require('../../../config/db');

const buildResourceFileUrl = (fileUrl, scope = 'class') => {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  if (fileUrl.startsWith('/uploads/')) return `${process.env.BACKEND_URL}${fileUrl}`;

  const folderByScope = {
    class: 'classResources',
    subject: 'subjectResources',
    staff: 'staffResources',
  };

  const folder = folderByScope[scope] || 'resources';
  return `${process.env.BACKEND_URL}/uploads/${folder}/${fileUrl}`;
};

const classTargetInclude = (targetWhere = {}) => ({
  model: AudienceTarget,
  as: 'targets',
  required: true,
  attributes: ['id', 'target_type', 'class_section_id', 'subject_id'],
  where: {
    target_type: 'class',
    subject_id: null,
    ...targetWhere,
  },
  include: [
    {
      model: ClassSection,
      as: 'classSection',
      attributes: ['id', 'class_name', 'section_name'],
    },
  ],
});

// Upload class resource by teacher
const uploadClassResource = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { class_section_id, title, description, resource_type } = req.body;
    const user_id = req.user.id;

    if (!class_section_id || !title || !resource_type) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Class section ID, title, and resource type are required',
      });
    }

    if (!req.file) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'File is required',
      });
    }

    const teacher = await Teacher.findOne({ where: { user_id } });
    if (!teacher) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Teacher not found',
      });
    }

    const classSection = await ClassSection.findByPk(class_section_id);
    if (!classSection) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Class section not found',
      });
    }

    const classResource = await Resource.create(
      {
        resource_scope: 'class',
        title,
        description,
        file_url: req.file.filename,
        resource_type,
        uploaded_by_type: 'teacher',
        uploaded_by_id: teacher.id,
      },
      { transaction }
    );

    await AudienceTarget.create(
      {
        resource_id: classResource.id,
        target_type: 'class',
        class_section_id,
        subject_id: null,
      },
      { transaction }
    );

    await transaction.commit();

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Class resource uploaded successfully',
      data: {
        resource_id: classResource.id,
        class_section_id: Number(class_section_id),
        title: classResource.title,
        description: classResource.description,
        file_url: buildResourceFileUrl(classResource.file_url, classResource.resource_scope),
        resource_type: classResource.resource_type,
        created_at: classResource.created_at,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Teacher Upload Class Resource Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

// Get all class resources uploaded by teacher
const getMyClassResources = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { class_section_id, resource_type } = req.query;

    const teacher = await Teacher.findOne({ where: { user_id } });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Teacher not found',
      });
    }

    const whereCondition = {
      resource_scope: 'class',
      uploaded_by_type: 'teacher',
      uploaded_by_id: teacher.id,
    };
    if (resource_type) whereCondition.resource_type = resource_type;

    const targetWhere = {};
    if (class_section_id) targetWhere.class_section_id = class_section_id;

    const resources = await Resource.findAll({
      where: whereCondition,
      include: [classTargetInclude(targetWhere)],
      order: [['created_at', 'DESC']],
      attributes: ['id', 'title', 'description', 'file_url', 'resource_type', 'resource_scope', 'created_at', 'updated_at'],
    });

    const formattedResources = resources.map((resource) => {
      const target = resource.targets?.[0];
      const classInfo = target?.classSection;

      return {
        resource_id: resource.id,
        class_section_id: target?.class_section_id || null,
        class_display: classInfo ? `${classInfo.class_name} ${classInfo.section_name}` : 'N/A',
        title: resource.title,
        description: resource.description,
        file_url: buildResourceFileUrl(resource.file_url, resource.resource_scope),
        resource_type: resource.resource_type,
        created_at: resource.created_at,
        updated_at: resource.updated_at,
      };
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Class resources fetched successfully',
      data: {
        total_resources: formattedResources.length,
        resources: formattedResources,
      },
    });
  } catch (error) {
    console.error('Get Teacher Class Resources Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

// Get single class resource
const getClassResourceById = async (req, res) => {
  try {
    const { resource_id } = req.params;
    const user_id = req.user.id;

    const teacher = await Teacher.findOne({ where: { user_id } });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Teacher not found',
      });
    }

    const resource = await Resource.findOne({
      where: {
        id: resource_id,
        resource_scope: 'class',
        uploaded_by_type: 'teacher',
        uploaded_by_id: teacher.id,
      },
      include: [classTargetInclude()],
      attributes: ['id', 'title', 'description', 'file_url', 'resource_type', 'resource_scope', 'created_at', 'updated_at'],
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Class resource not found',
      });
    }

    const target = resource.targets?.[0];
    const classInfo = target?.classSection;

    const formattedResource = {
      resource_id: resource.id,
      class_section_id: target?.class_section_id || null,
      class_display: classInfo ? `${classInfo.class_name} ${classInfo.section_name}` : 'N/A',
      title: resource.title,
      description: resource.description,
      file_url: buildResourceFileUrl(resource.file_url, resource.resource_scope),
      resource_type: resource.resource_type,
      created_at: resource.created_at,
      updated_at: resource.updated_at,
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Class resource fetched successfully',
      data: formattedResource,
    });
  } catch (error) {
    console.error('Get Teacher Class Resource By ID Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

// Update class resource
const updateClassResource = async (req, res) => {
  try {
    const { resource_id } = req.params;
    const { title, description, resource_type } = req.body;
    const user_id = req.user.id;

    const teacher = await Teacher.findOne({ where: { user_id } });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Teacher not found',
      });
    }

    const resource = await Resource.findOne({
      where: {
        id: resource_id,
        resource_scope: 'class',
        uploaded_by_type: 'teacher',
        uploaded_by_id: teacher.id,
      },
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class resource not found or you don't have permission to update",
      });
    }

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
      message: 'Class resource updated successfully',
      data: {
        resource_id: resource.id,
        title: resource.title,
        description: resource.description,
        file_url: buildResourceFileUrl(resource.file_url, resource.resource_scope),
        resource_type: resource.resource_type,
        updated_at: resource.updated_at,
      },
    });
  } catch (error) {
    console.error('Update Teacher Class Resource Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

// Delete class resource
const deleteClassResource = async (req, res) => {
  try {
    const { resource_id } = req.params;
    const user_id = req.user.id;

    const teacher = await Teacher.findOne({ where: { user_id } });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Teacher not found',
      });
    }

    const resource = await Resource.findOne({
      where: {
        id: resource_id,
        resource_scope: 'class',
        uploaded_by_type: 'teacher',
        uploaded_by_id: teacher.id,
      },
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class resource not found or you don't have permission to delete",
      });
    }

    await resource.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Class resource deleted successfully',
    });
  } catch (error) {
    console.error('Delete Teacher Class Resource Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

module.exports = {
  uploadClassResource,
  getMyClassResources,
  getClassResourceById,
  updateClassResource,
  deleteClassResource,
};
