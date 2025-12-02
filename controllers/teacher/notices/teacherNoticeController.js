const { Notice, NoticeTarget, Teacher, ClassSection, Student, User } = require('../../../models');
const sequelize = require('../../../config/db');
const { Op } = require('sequelize');

// Create notice (Teacher)
const createNotice = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Get user_id from token
    const user_id = req.user.id;

    const { title, message, target_type, class_section_ids, student_ids } = req.body;

    // Validate required fields
    if (!title || !message || !target_type) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Title, message, and target type are required"
      });
    }

    // Find teacher by user_id
    const teacher = await Teacher.findOne({
      where: { user_id: user_id }
    });

    if (!teacher) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Teacher not found"
      });
    }

    // Validate target_type (teachers can only send to classes or students)
    const validTargetTypes = ['all_classes', 'class', 'student'];
    if (!validTargetTypes.includes(target_type)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid target type. Teachers can only send notices to classes or students"
      });
    }

    // Create notice with teacher_id
    const notice = await Notice.create({
      title,
      message,
      attachment: req.file ? req.file.filename : null,
      created_by: teacher.id // Teacher ID
    }, { transaction });

    // Create notice targets based on target_type
    let targets = [];

    if (target_type === 'all_classes') {
      // Send to all classes
      targets.push({ notice_id: notice.id, target_type: 'all_classes' });
      
    } else if (target_type === 'class') {
      // Send to specific classes
      if (!class_section_ids || !Array.isArray(class_section_ids) || class_section_ids.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Class section IDs are required for class target type"
        });
      }
      
      targets = class_section_ids.map(id => ({
        notice_id: notice.id,
        target_type: 'class',
        class_section_id: id
      }));
      
    } else if (target_type === 'student') {
      // Send to specific students
      if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Student IDs are required for student target type"
        });
      }
      
      targets = student_ids.map(id => ({
        notice_id: notice.id,
        target_type: 'student',
        student_id: id
      }));
    }

    // Bulk create targets
    await NoticeTarget.bulkCreate(targets, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Notice created successfully",
      data: {
        notice_id: notice.id,
        title: notice.title,
        message: notice.message,
        attachment: notice.attachment ? `${process.env.BACKEND_URL}/uploads/notices/${notice.attachment}` : null,
        target_type,
        targets_count: targets.length,
        created_at: notice.created_at
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Create Notice Error (Teacher):", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get teacher's own notices
const getMyNotices = async (req, res) => {
  try {
    // Get user_id from token
    const user_id = req.user.id;

    // Find teacher by user_id
    const teacher = await Teacher.findOne({
      where: { user_id: user_id }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Teacher not found"
      });
    }

    // Get all notices created by this teacher
    const notices = await Notice.findAll({
      where: { created_by: teacher.id },
      include: [
        {
          model: NoticeTarget,
          as: 'targets',
          attributes: ['id', 'target_type', 'class_section_id', 'student_id'],
          include: [
            {
              model: ClassSection,
              as: 'classSection',
              attributes: ['id', 'class_name', 'section_name']
            },
            {
              model: Student,
              as: 'student',
              attributes: ['id'],
              include: [{
                model: User,
                attributes: ['name']
              }]
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']],
      attributes: ['id', 'title', 'message', 'attachment', 'created_at', 'updated_at']
    });

    // Format response
    const formattedNotices = notices.map(notice => ({
      notice_id: notice.id,
      title: notice.title,
      message: notice.message,
      attachment: notice.attachment ? `${process.env.BACKEND_URL}/uploads/notices/${notice.attachment}` : null,
      created_at: notice.created_at,
      updated_at: notice.updated_at,
      targets: notice.targets.map(target => {
        let targetInfo = { target_type: target.target_type };
        
        if (target.target_type === 'class' && target.classSection) {
          targetInfo.class = `${target.classSection.class_name} ${target.classSection.section_name}`;
          targetInfo.class_section_id = target.class_section_id;
        } else if (target.target_type === 'student' && target.student) {
          targetInfo.student_name = target.student.User?.name;
          targetInfo.student_id = target.student_id;
        }
        
        return targetInfo;
      })
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
    console.error("Get My Notices Error (Teacher):", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Update teacher's own notice
const updateNotice = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Get user_id from token
    const user_id = req.user.id;
    const { notice_id } = req.params;
    const { title, message, target_type, class_section_ids, student_ids } = req.body;

    // Find teacher by user_id
    const teacher = await Teacher.findOne({
      where: { user_id: user_id }
    });

    if (!teacher) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Teacher not found"
      });
    }

    // Find notice and verify ownership
    const notice = await Notice.findOne({
      where: { 
        id: notice_id,
        created_by: teacher.id
      }
    });

    if (!notice) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Notice not found or you don't have permission to update it"
      });
    }

    // Update notice fields
    const updateData = {};
    if (title) updateData.title = title;
    if (message) updateData.message = message;
    if (req.file) updateData.attachment = req.file.filename;
    updateData.updated_at = new Date();

    await notice.update(updateData, { transaction });

    // If target_type is provided, update targets
    if (target_type) {
      // Validate target_type
      const validTargetTypes = ['all_classes', 'class', 'student'];
      if (!validTargetTypes.includes(target_type)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Invalid target type. Teachers can only send notices to classes or students"
        });
      }

      // Delete existing targets
      await NoticeTarget.destroy({ where: { notice_id: notice.id }, transaction });

      // Create new targets
      let targets = [];

      if (target_type === 'all_classes') {
        targets.push({ notice_id: notice.id, target_type: 'all_classes' });
      } else if (target_type === 'class' && class_section_ids) {
        targets = class_section_ids.map(id => ({
          notice_id: notice.id,
          target_type: 'class',
          class_section_id: id
        }));
      } else if (target_type === 'student' && student_ids) {
        targets = student_ids.map(id => ({
          notice_id: notice.id,
          target_type: 'student',
          student_id: id
        }));
      }

      await NoticeTarget.bulkCreate(targets, { transaction });
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Notice updated successfully",
      data: {
        notice_id: notice.id,
        title: notice.title,
        message: notice.message,
        attachment: notice.attachment ? `${process.env.BACKEND_URL}/uploads/notices/${notice.attachment}` : null,
        updated_at: notice.updated_at
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Update Notice Error (Teacher):", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete teacher's own notice
const deleteNotice = async (req, res) => {
  try {
    // Get user_id from token
    const user_id = req.user.id;
    const { notice_id } = req.params;

    // Find teacher by user_id
    const teacher = await Teacher.findOne({
      where: { user_id: user_id }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Teacher not found"
      });
    }

    // Find notice and verify ownership
    const notice = await Notice.findOne({
      where: { 
        id: notice_id,
        created_by: teacher.id
      }
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Notice not found or you don't have permission to delete it"
      });
    }

    // Delete notice (targets will be deleted automatically due to CASCADE)
    await notice.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Notice deleted successfully"
    });

  } catch (error) {
    console.error("Delete Notice Error (Teacher):", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get notices FOR this teacher (received notices)
const getNoticesForMe = async (req, res) => {
  try {
    // Get user_id from token
    const user_id = req.user.id;

    // Find teacher by user_id
    const teacher = await Teacher.findOne({
      where: { user_id: user_id }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Teacher not found"
      });
    }

    // Get all notices targeted to this teacher
    const notices = await Notice.findAll({
      include: [
        {
          model: NoticeTarget,
          as: 'targets',
          where: {
            [Op.or]: [
              { target_type: 'all' },
              { target_type: 'all_teachers' },
              { target_type: 'all_staff' },
              { 
                target_type: 'teacher',
                teacher_id: teacher.id
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
    console.error("Get Notices For Me Error (Teacher):", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  createNotice,
  getMyNotices,
  getNoticesForMe,
  updateNotice,
  deleteNotice
};
