const { ClassResource, SubjectResource, ClassSection, Subject, Teacher, User, Student } = require('../../../models');

// Get all class resources for student's class
const getMyClassResources = async (req, res) => {
  try {
    console.log("Fetching class resources for student...");
    const user_id = req.user.id;
    console.log("User ID:", user_id);
    const { resource_type } = req.query;

    // Get student details
    const student = await Student.findOne({ where: { user_id } });
    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Build where condition
    const whereCondition = { class_section_id: student.class_section_id };
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
      attributes: ['id', 'title', 'description', 'file_url', 'resource_type', 'created_at']
    });

    // Format response
    const formattedResources = resources.map(resource => ({
      resource_id: resource.id,
      title: resource.title,
      description: resource.description,
      file_url: `${process.env.BACKEND_URL}/uploads/classResources/${resource.file_url}`,
      resource_type: resource.resource_type,
      uploaded_by: resource.teacher ? resource.teacher.User?.name : 'Admin',
      created_at: resource.created_at
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
    console.error("Get Student Class Resources Error:", error);
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
    const user_id = req.user.id;

    // Get student details
    const student = await Student.findOne({ where: { user_id } });
    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    const resource = await ClassResource.findOne({
      where: { id: resource_id, class_section_id: student.class_section_id },
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
      attributes: ['id', 'title', 'description', 'file_url', 'resource_type', 'created_at']
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
      title: resource.title,
      description: resource.description,
      file_url: `${process.env.BACKEND_URL}/uploads/classResources/${resource.file_url}`,
      resource_type: resource.resource_type,
      uploaded_by: resource.teacher ? resource.teacher.User?.name : 'Admin',
      created_at: resource.created_at
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Class resource fetched successfully",
      data: formattedResource
    });

  } catch (error) {
    console.error("Get Student Class Resource By ID Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all subject resources for student's class
const getMySubjectResources = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { subject_id, resource_type } = req.query;

    // Get student details
    const student = await Student.findOne({ where: { user_id } });
    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Build where condition
    const whereCondition = { class_section_id: student.class_section_id };
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
      attributes: ['id', 'title', 'description', 'file_url', 'resource_type', 'due_date', 'created_at']
    });

    // Format response
    const formattedResources = resources.map(resource => ({
      resource_id: resource.id,
      subject_id: resource.subject?.id,
      subject_name: resource.subject?.subject_name || 'N/A',
      title: resource.title,
      description: resource.description,
      file_url: `${process.env.BACKEND_URL}/uploads/subjectResources/${resource.file_url}`,
      resource_type: resource.resource_type,
      due_date: resource.due_date,
      uploaded_by: resource.teacher ? resource.teacher.User?.name : 'Admin',
      created_at: resource.created_at
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
    console.error("Get Student Subject Resources Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get subject resources by subject (for specific subject)
const getSubjectResourcesBySubject = async (req, res) => {
  try {
    const { subject_id } = req.params;
    const user_id = req.user.id;
    const { resource_type } = req.query;

    // Get student details
    const student = await Student.findOne({ where: { user_id } });
    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Build where condition
    const whereCondition = { 
      class_section_id: student.class_section_id,
      subject_id: subject_id
    };
    if (resource_type) whereCondition.resource_type = resource_type;

    const resources = await SubjectResource.findAll({
      where: whereCondition,
      include: [
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
      attributes: ['id', 'title', 'description', 'file_url', 'resource_type', 'due_date', 'created_at']
    });

    // Format response
    const formattedResources = resources.map(resource => ({
      resource_id: resource.id,
      title: resource.title,
      description: resource.description,
      file_url: `${process.env.BACKEND_URL}/uploads/subjectResources/${resource.file_url}`,
      resource_type: resource.resource_type,
      due_date: resource.due_date,
      uploaded_by: resource.teacher ? resource.teacher.User?.name : 'Admin',
      created_at: resource.created_at
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Subject resources fetched successfully",
      data: {
        subject_name: resources[0]?.subject?.subject_name || 'N/A',
        total_resources: formattedResources.length,
        resources: formattedResources
      }
    });

  } catch (error) {
    console.error("Get Subject Resources By Subject Error:", error);
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
    const user_id = req.user.id;

    // Get student details
    const student = await Student.findOne({ where: { user_id } });
    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    const resource = await SubjectResource.findOne({
      where: { id: resource_id, class_section_id: student.class_section_id },
      include: [
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
      attributes: ['id', 'title', 'description', 'file_url', 'resource_type', 'due_date', 'created_at']
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
      subject_id: resource.subject?.id,
      subject_name: resource.subject?.subject_name || 'N/A',
      title: resource.title,
      description: resource.description,
      file_url: `${process.env.BACKEND_URL}/uploads/subjectResources/${resource.file_url}`,
      resource_type: resource.resource_type,
      due_date: resource.due_date,
      uploaded_by: resource.teacher ? resource.teacher.User?.name : 'Admin',
      created_at: resource.created_at
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Subject resource fetched successfully",
      data: formattedResource
    });

  } catch (error) {
    console.error("Get Student Subject Resource By ID Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all assignments for student
const getMyAssignments = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { subject_id } = req.query;

    // Get student details
    const student = await Student.findOne({ where: { user_id } });
    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Build where condition for assignments only
    const whereCondition = { 
      class_section_id: student.class_section_id,
      resource_type: 'assignment'
    };
    if (subject_id) whereCondition.subject_id = subject_id;

    const assignments = await SubjectResource.findAll({
      where: whereCondition,
      include: [
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
      order: [['due_date', 'ASC'], ['created_at', 'DESC']],
      attributes: ['id', 'title', 'description', 'file_url', 'due_date', 'created_at']
    });

    // Format response with pending/completed status based on due_date
    const currentDate = new Date();
    const formattedAssignments = assignments.map(assignment => {
      const isPending = assignment.due_date && new Date(assignment.due_date) > currentDate;
      
      return {
        assignment_id: assignment.id,
        subject_id: assignment.subject?.id,
        subject_name: assignment.subject?.subject_name || 'N/A',
        title: assignment.title,
        description: assignment.description,
        file_url: `${process.env.BACKEND_URL}/uploads/subjectResources/${assignment.file_url}`,
        due_date: assignment.due_date,
        status: isPending ? 'pending' : 'overdue',
        uploaded_by: assignment.teacher ? assignment.teacher.User?.name : 'Admin',
        created_at: assignment.created_at
      };
    });

    // Group by status
    const pending = formattedAssignments.filter(a => a.status === 'pending');
    const overdue = formattedAssignments.filter(a => a.status === 'overdue');

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Assignments fetched successfully",
      data: {
        total_assignments: formattedAssignments.length,
        pending_count: pending.length,
        overdue_count: overdue.length,
        assignments: {
          pending: pending,
          overdue: overdue
        }
      }
    });

  } catch (error) {
    console.error("Get Student Assignments Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  getMyClassResources,
  getClassResourceById,
  getMySubjectResources,
  getSubjectResourcesBySubject,
  getSubjectResourceById,
  getMyAssignments
};
