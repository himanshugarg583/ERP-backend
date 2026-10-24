const { Op } = require('sequelize');
const { Resource, AudienceTarget, ClassSection, Subject, Teacher, User, Student } = require('../../../models');

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

const getStudentByUser = async (userId) => Student.findOne({ where: { user_id: userId } });

const classTargetInclude = (classSectionId) => ({
  model: AudienceTarget,
  as: 'targets',
  required: true,
  attributes: ['id', 'class_section_id', 'subject_id'],
  where: {
    target_type: 'class',
    class_section_id: classSectionId,
    subject_id: null,
  },
  include: [
    {
      model: ClassSection,
      as: 'classSection',
      attributes: ['id', 'class_name', 'section_name'],
    },
  ],
});

const subjectTargetInclude = (classSectionId, subjectId) => {
  const where = {
    target_type: 'class',
    class_section_id: classSectionId,
    subject_id: { [Op.ne]: null },
  };

  if (subjectId) {
    where.subject_id = subjectId;
  }

  return {
    model: AudienceTarget,
    as: 'targets',
    required: true,
    attributes: ['id', 'class_section_id', 'subject_id'],
    where,
    include: [
      {
        model: Subject,
        as: 'subject',
        attributes: ['id', 'subject_name'],
      },
    ],
  };
};

// Get all class resources for student's class
const getMyClassResources = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { resource_type } = req.query;

    const student = await getStudentByUser(user_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Student not found',
      });
    }

    const whereCondition = { resource_scope: 'class' };
    if (resource_type) whereCondition.resource_type = resource_type;

    const resources = await Resource.findAll({
      where: whereCondition,
      include: [classTargetInclude(student.class_section_id)],
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
      ],
    });

    const teacherNameMap = await getTeacherNameMap(resources);

    const formattedResources = resources.map((resource) => ({
      resource_id: resource.id,
      title: resource.title,
      description: resource.description,
      file_url: buildResourceFileUrl(resource.file_url, resource.resource_scope),
      resource_type: resource.resource_type,
      uploaded_by:
        resource.uploaded_by_type === 'teacher'
          ? teacherNameMap.get(resource.uploaded_by_id) || 'Teacher'
          : 'Admin',
      created_at: resource.created_at,
    }));

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
    console.error('Get Student Class Resources Error:', error);
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

    const student = await getStudentByUser(user_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Student not found',
      });
    }

    const resource = await Resource.findOne({
      where: {
        id: resource_id,
        resource_scope: 'class',
      },
      include: [classTargetInclude(student.class_section_id)],
      attributes: ['id', 'title', 'description', 'file_url', 'resource_type', 'resource_scope', 'uploaded_by_type', 'uploaded_by_id', 'created_at'],
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Class resource not found',
      });
    }

    const teacherNameMap = await getTeacherNameMap([resource]);

    const formattedResource = {
      resource_id: resource.id,
      title: resource.title,
      description: resource.description,
      file_url: buildResourceFileUrl(resource.file_url, resource.resource_scope),
      resource_type: resource.resource_type,
      uploaded_by:
        resource.uploaded_by_type === 'teacher'
          ? teacherNameMap.get(resource.uploaded_by_id) || 'Teacher'
          : 'Admin',
      created_at: resource.created_at,
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Class resource fetched successfully',
      data: formattedResource,
    });
  } catch (error) {
    console.error('Get Student Class Resource By ID Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

// Get all subject resources for student's class
const getMySubjectResources = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { subject_id, resource_type } = req.query;

    const student = await getStudentByUser(user_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Student not found',
      });
    }

    const whereCondition = { resource_scope: 'subject' };
    if (resource_type) whereCondition.resource_type = resource_type;

    const resources = await Resource.findAll({
      where: whereCondition,
      include: [subjectTargetInclude(student.class_section_id, subject_id)],
      order: [['created_at', 'DESC']],
      attributes: [
        'id',
        'title',
        'description',
        'file_url',
        'resource_type',
        'due_date',
        'resource_scope',
        'uploaded_by_type',
        'uploaded_by_id',
        'created_at',
      ],
    });

    const teacherNameMap = await getTeacherNameMap(resources);

    const formattedResources = resources.map((resource) => {
      const target = resource.targets?.[0];
      const subject = target?.subject;

      return {
        resource_id: resource.id,
        subject_id: target?.subject_id || null,
        subject_name: subject?.subject_name || 'N/A',
        title: resource.title,
        description: resource.description,
        file_url: buildResourceFileUrl(resource.file_url, resource.resource_scope),
        resource_type: resource.resource_type,
        due_date: resource.due_date,
        uploaded_by:
          resource.uploaded_by_type === 'teacher'
            ? teacherNameMap.get(resource.uploaded_by_id) || 'Teacher'
            : 'Admin',
        created_at: resource.created_at,
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
    console.error('Get Student Subject Resources Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

// Get subject resources by subject (for specific subject)
const getSubjectResourcesBySubject = async (req, res) => {
  try {
    const { subject_id } = req.params;
    const user_id = req.user.id;
    const { resource_type } = req.query;

    const student = await getStudentByUser(user_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Student not found',
      });
    }

    const whereCondition = { resource_scope: 'subject' };
    if (resource_type) whereCondition.resource_type = resource_type;

    const resources = await Resource.findAll({
      where: whereCondition,
      include: [subjectTargetInclude(student.class_section_id, subject_id)],
      order: [['created_at', 'DESC']],
      attributes: [
        'id',
        'title',
        'description',
        'file_url',
        'resource_type',
        'due_date',
        'resource_scope',
        'uploaded_by_type',
        'uploaded_by_id',
        'created_at',
      ],
    });

    const teacherNameMap = await getTeacherNameMap(resources);

    const formattedResources = resources.map((resource) => ({
      resource_id: resource.id,
      title: resource.title,
      description: resource.description,
      file_url: buildResourceFileUrl(resource.file_url, resource.resource_scope),
      resource_type: resource.resource_type,
      due_date: resource.due_date,
      uploaded_by:
        resource.uploaded_by_type === 'teacher'
          ? teacherNameMap.get(resource.uploaded_by_id) || 'Teacher'
          : 'Admin',
      created_at: resource.created_at,
    }));

    const subjectName = resources[0]?.targets?.[0]?.subject?.subject_name || 'N/A';

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Subject resources fetched successfully',
      data: {
        subject_name: subjectName,
        total_resources: formattedResources.length,
        resources: formattedResources,
      },
    });
  } catch (error) {
    console.error('Get Subject Resources By Subject Error:', error);
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

    const student = await getStudentByUser(user_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Student not found',
      });
    }

    const resource = await Resource.findOne({
      where: {
        id: resource_id,
        resource_scope: 'subject',
      },
      include: [subjectTargetInclude(student.class_section_id)],
      attributes: [
        'id',
        'title',
        'description',
        'file_url',
        'resource_type',
        'due_date',
        'resource_scope',
        'uploaded_by_type',
        'uploaded_by_id',
        'created_at',
      ],
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Subject resource not found',
      });
    }

    const teacherNameMap = await getTeacherNameMap([resource]);
    const target = resource.targets?.[0];
    const subject = target?.subject;

    const formattedResource = {
      resource_id: resource.id,
      subject_id: target?.subject_id || null,
      subject_name: subject?.subject_name || 'N/A',
      title: resource.title,
      description: resource.description,
      file_url: buildResourceFileUrl(resource.file_url, resource.resource_scope),
      resource_type: resource.resource_type,
      due_date: resource.due_date,
      uploaded_by:
        resource.uploaded_by_type === 'teacher'
          ? teacherNameMap.get(resource.uploaded_by_id) || 'Teacher'
          : 'Admin',
      created_at: resource.created_at,
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Subject resource fetched successfully',
      data: formattedResource,
    });
  } catch (error) {
    console.error('Get Student Subject Resource By ID Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

// Get all assignments for student
const getMyAssignments = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { subject_id } = req.query;

    const student = await getStudentByUser(user_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Student not found',
      });
    }

    const whereCondition = {
      resource_scope: 'subject',
      resource_type: 'assignment',
    };

    const assignments = await Resource.findAll({
      where: whereCondition,
      include: [subjectTargetInclude(student.class_section_id, subject_id)],
      order: [['due_date', 'ASC'], ['created_at', 'DESC']],
      attributes: ['id', 'title', 'description', 'file_url', 'due_date', 'resource_scope', 'uploaded_by_type', 'uploaded_by_id', 'created_at'],
    });

    const teacherNameMap = await getTeacherNameMap(assignments);

    const currentDate = new Date();
    const formattedAssignments = assignments.map((assignment) => {
      const target = assignment.targets?.[0];
      const subject = target?.subject;
      const isPending = assignment.due_date && new Date(assignment.due_date) > currentDate;

      return {
        assignment_id: assignment.id,
        subject_id: target?.subject_id || null,
        subject_name: subject?.subject_name || 'N/A',
        title: assignment.title,
        description: assignment.description,
        file_url: buildResourceFileUrl(assignment.file_url, assignment.resource_scope),
        due_date: assignment.due_date,
        status: isPending ? 'pending' : 'overdue',
        uploaded_by:
          assignment.uploaded_by_type === 'teacher'
            ? teacherNameMap.get(assignment.uploaded_by_id) || 'Teacher'
            : 'Admin',
        created_at: assignment.created_at,
      };
    });

    const pending = formattedAssignments.filter((a) => a.status === 'pending');
    const overdue = formattedAssignments.filter((a) => a.status === 'overdue');

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Assignments fetched successfully',
      data: {
        total_assignments: formattedAssignments.length,
        pending_count: pending.length,
        overdue_count: overdue.length,
        assignments: {
          pending,
          overdue,
        },
      },
    });
  } catch (error) {
    console.error('Get Student Assignments Error:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

module.exports = {
  getMyClassResources,
  getClassResourceById,
  getMySubjectResources,
  getSubjectResourcesBySubject,
  getSubjectResourceById,
  getMyAssignments,
};
