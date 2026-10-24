const { Op } = require('sequelize');
const { Resource, AudienceTarget, ClassSection, Subject, Teacher } = require('../../../models');
const sequelize = require('../../../config/db');

const buildResourceFileUrl = (fileUrl, scope = 'subject') => {
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

const subjectTargetInclude = (targetWhere = {}) => ({
  model: AudienceTarget,
  as: 'targets',
  required: true,
  attributes: ['id', 'target_type', 'class_section_id', 'subject_id'],
  where: {
    target_type: 'class',
    subject_id: { [Op.ne]: null },
    ...targetWhere,
  },
  include: [
    {
      model: ClassSection,
      as: 'classSection',
      attributes: ['id', 'class_name', 'section_name'],
    },
    {
      model: Subject,
      as: 'subject',
      attributes: ['id', 'subject_name'],
    },
  ],
});

// Upload subject resource by teacher
const uploadSubjectResource = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { class_section_id, subject_id, title, description, resource_type, due_date } = req.body;
    const user_id = req.user.id;

    if (!class_section_id || !subject_id || !title || !resource_type) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Class section ID, subject ID, title, and resource type are required',
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

    const subject = await Subject.findByPk(subject_id);
    if (!subject) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Subject not found',
      });
    }

    const resourceData = {
      resource_scope: 'subject',
      title,
      description,
      file_url: req.file.filename,
      resource_type,
      uploaded_by_type: 'teacher',
      uploaded_by_id: teacher.id,
    };

    if (due_date) {
      resourceData.due_date = new Date(due_date);
    }

    const subjectResource = await Resource.create(resourceData, { transaction });

    await AudienceTarget.create(
      {
        resource_id: subjectResource.id,
        target_type: 'class',
        class_section_id,
        subject_id,
      },
      { transaction }
    );

    await transaction.commit();

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Subject resource uploaded successfully',
      data: {
        resource_id: subjectResource.id,
        class_section_id: Number(class_section_id),
        subject_id: Number(subject_id),
        title: subjectResource.title,
        description: subjectResource.description,
        file_url: buildResourceFileUrl(subjectResource.file_url, subjectResource.resource_scope),
        resource_type: subjectResource.resource_type,
        due_date: subjectResource.due_date,
        created_at: subjectResource.created_at,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Teacher Upload Subject Resource Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

// Get all subject resources uploaded by teacher
const getMySubjectResources = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { class_section_id, subject_id, resource_type } = req.query;

    const teacher = await Teacher.findOne({ where: { user_id } });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Teacher not found',
      });
    }

    const whereCondition = {
      resource_scope: 'subject',
      uploaded_by_type: 'teacher',
      uploaded_by_id: teacher.id,
    };
    if (resource_type) whereCondition.resource_type = resource_type;

    const targetWhere = {};
    if (class_section_id) targetWhere.class_section_id = class_section_id;
    if (subject_id) targetWhere.subject_id = subject_id;

    const resources = await Resource.findAll({
      where: whereCondition,
      include: [subjectTargetInclude(targetWhere)],
      order: [['created_at', 'DESC']],
      attributes: ['id', 'title', 'description', 'file_url', 'resource_type', 'due_date', 'resource_scope', 'created_at', 'updated_at'],
    });

    const formattedResources = resources.map((resource) => {
      const target = resource.targets?.[0];
      const classInfo = target?.classSection;
      const subjectInfo = target?.subject;

      return {
        resource_id: resource.id,
        class_section_id: target?.class_section_id || null,
        class_display: classInfo ? `${classInfo.class_name} ${classInfo.section_name}` : 'N/A',
        subject_id: target?.subject_id || null,
        subject_name: subjectInfo?.subject_name || 'N/A',
        title: resource.title,
        description: resource.description,
        file_url: buildResourceFileUrl(resource.file_url, resource.resource_scope),
        resource_type: resource.resource_type,
        due_date: resource.due_date,
        created_at: resource.created_at,
        updated_at: resource.updated_at,
      };
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Subject resources fetched successfully',
      data: {
        total_resources: formattedResources.length,
        resources: formattedResources,
      },
    });
  } catch (error) {
    console.error('Get Teacher Subject Resources Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

// Get single subject resource
const getSubjectResourceById = async (req, res) => {
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
        resource_scope: 'subject',
        uploaded_by_type: 'teacher',
        uploaded_by_id: teacher.id,
      },
      include: [subjectTargetInclude()],
      attributes: ['id', 'title', 'description', 'file_url', 'resource_type', 'due_date', 'resource_scope', 'created_at', 'updated_at'],
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Subject resource not found',
      });
    }

    const target = resource.targets?.[0];
    const classInfo = target?.classSection;
    const subjectInfo = target?.subject;

    const formattedResource = {
      resource_id: resource.id,
      class_section_id: target?.class_section_id || null,
      class_display: classInfo ? `${classInfo.class_name} ${classInfo.section_name}` : 'N/A',
      subject_id: target?.subject_id || null,
      subject_name: subjectInfo?.subject_name || 'N/A',
      title: resource.title,
      description: resource.description,
      file_url: buildResourceFileUrl(resource.file_url, resource.resource_scope),
      resource_type: resource.resource_type,
      due_date: resource.due_date,
      created_at: resource.created_at,
      updated_at: resource.updated_at,
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Subject resource fetched successfully',
      data: formattedResource,
    });
  } catch (error) {
    console.error('Get Teacher Subject Resource By ID Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

// Update subject resource
const updateSubjectResource = async (req, res) => {
  try {
    const { resource_id } = req.params;
    const { title, description, resource_type, due_date } = req.body;
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
        resource_scope: 'subject',
        uploaded_by_type: 'teacher',
        uploaded_by_id: teacher.id,
      },
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Subject resource not found or you don't have permission to update",
      });
    }

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
      message: 'Subject resource updated successfully',
      data: {
        resource_id: resource.id,
        title: resource.title,
        description: resource.description,
        file_url: buildResourceFileUrl(resource.file_url, resource.resource_scope),
        resource_type: resource.resource_type,
        due_date: resource.due_date,
        updated_at: resource.updated_at,
      },
    });
  } catch (error) {
    console.error('Update Teacher Subject Resource Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

// Delete subject resource
const deleteSubjectResource = async (req, res) => {
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
        resource_scope: 'subject',
        uploaded_by_type: 'teacher',
        uploaded_by_id: teacher.id,
      },
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Subject resource not found or you don't have permission to delete",
      });
    }

    await resource.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Subject resource deleted successfully',
    });
  } catch (error) {
    console.error('Delete Teacher Subject Resource Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

module.exports = {
  uploadSubjectResource,
  getMySubjectResources,
  getSubjectResourceById,
  updateSubjectResource,
  deleteSubjectResource,
};
