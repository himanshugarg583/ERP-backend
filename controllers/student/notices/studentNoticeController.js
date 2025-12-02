const { Notice, NoticeTarget, Teacher, ClassSection, Student, User } = require('../../../models');
const sequelize = require('../../../config/db');
const { Op } = require('sequelize');

// Get notices FOR this student (received notices)
const getNoticesForMe = async (req, res) => {
  try {
    // Get user_id from token
    const user_id = req.user.id;

    // Find student with class details
    const student = await Student.findOne({
      where: { user_id: user_id },
      attributes: ['id', 'class_section_id']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Get all notices targeted to this student
    const notices = await Notice.findAll({
      include: [
        {
          model: NoticeTarget,
          as: 'targets',
          where: {
            [Op.or]: [
              { target_type: 'all' },
              { target_type: 'all_classes' },
              { 
                target_type: 'class',
                class_section_id: student.class_section_id
              },
              { 
                target_type: 'student',
                student_id: student.id
              }
            ]
          },
          attributes: ['id', 'target_type'],
          required: true
        },
        {
          model: Teacher,
          as: 'createdByTeacher',
          required: false,
          include: [{
            model: User,
            attributes: ['name']
          }]
        }
      ],
      order: [['created_at', 'DESC']],
      attributes: ['id', 'title', 'message', 'attachment', 'created_by', 'created_at', 'updated_at']
    });

    // Format response
    const formattedNotices = notices.map(notice => ({
      notice_id: notice.id,
      title: notice.title,
      message: notice.message,
      attachment: notice.attachment ? `${process.env.BACKEND_URL}/uploads/notices/${notice.attachment}` : null,
      created_by: notice.created_by ? (notice.createdByTeacher?.User?.name || 'Teacher') : 'Admin',
      created_at: notice.created_at,
      target_type: notice.targets[0]?.target_type || 'N/A'
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Notices fetched successfully",
      data: {
        total_notices: formattedNotices.length,
        notices: formattedNotices
      }
    });

  } catch (error) {
    console.error("Get Notices For Me Error (Student):", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  getNoticesForMe
};
