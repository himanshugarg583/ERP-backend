const { Resource, AudienceTarget, ClassSection, Teacher, User } = require('../../../models');
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

const getTeacherNameMap = async (resources) => {
  const teacherIds = [
    ...new Set(
      resources
        .filter((resource) => resource.uploaded_by_type === 'teacher' && resource.uploaded_by_id)
        .map((resource) => resource.uploaded_by_id)
    ),
  ];

  if (teacherIds.length === 0) return new Map();

  const teachers = await Teacher.findAll({
    where: { id: teacherIds },
    attributes: ['id'],
    include: [{ model: User, attributes: ['name'] }],
  });

  return new Map(teachers.map((teacher) => [teacher.id, teacher.User?.name || 'Teacher']));
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

// Upload class resource
const uploadClassResource = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { class_section_id, title, description, resource_type } = req.body;

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
        uploaded_by_type: 'admin',
        uploaded_by_id: req.user?.id || 0,
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
    console.error('Upload Class Resource Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

// Get all class resources
const getAllClassResources = async (req, res) => {
  try {
    const { class_section_id, resource_type } = req.query;

    const whereCondition = { resource_scope: 'class' };
    if (resource_type) whereCondition.resource_type = resource_type;

    const targetWhere = {};
    if (class_section_id) targetWhere.class_section_id = class_section_id;

    const resources = await Resource.findAll({
      where: whereCondition,
      include: [classTargetInclude(targetWhere)],
      order: [['created_at', 'DESC']],
      attributes: [
        'id',
        'title',
        'description',
        'file_url',
        'resource_type',
        'resource_scope',
        'uploaded_by_type',
        'uploaded_by_id',
        'created_at',
        'updated_at',
      ],
    });

    const teacherNameMap = await getTeacherNameMap(resources);

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
        uploaded_by:
          resource.uploaded_by_type === 'teacher'
            ? teacherNameMap.get(resource.uploaded_by_id) || 'Teacher'
            : 'Admin',
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
    console.error('Get All Class Resources Error:', error);
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

    const resource = await Resource.findOne({
      where: { id: resource_id, resource_scope: 'class' },
      include: [classTargetInclude()],
      attributes: [
        'id',
        'title',
        'description',
        'file_url',
        'resource_type',
        'resource_scope',
        'uploaded_by_type',
        'uploaded_by_id',
        'created_at',
        'updated_at',
      ],
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Class resource not found',
      });
    }

    const teacherNameMap = await getTeacherNameMap([resource]);
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
      uploaded_by:
        resource.uploaded_by_type === 'teacher'
          ? teacherNameMap.get(resource.uploaded_by_id) || 'Teacher'
          : 'Admin',
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
    console.error('Get Class Resource By ID Error:', error);
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

    const resource = await Resource.findOne({ where: { id: resource_id, resource_scope: 'class' } });

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Class resource not found',
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
    console.error('Update Class Resource Error:', error);
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

    const resource = await Resource.findOne({ where: { id: resource_id, resource_scope: 'class' } });

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Class resource not found',
      });
    }

    await resource.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Class resource deleted successfully',
    });
  } catch (error) {
    console.error('Delete Class Resource Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

module.exports = {
  uploadClassResource,
  getAllClassResources,
  getClassResourceById,
  updateClassResource,
  deleteClassResource,
};
