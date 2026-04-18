const { Notice, NoticeTarget, Teacher, ClassSection, User } = require('../../../models');
const sequelize = require('../../../config/db');

// Create notice
const createNotice = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { title, message, target_type, class_section_ids } = req.body;

    // Validate required fields
    if (!title || !message || !target_type) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Title, message, and target type are required"
      });
    }

    // Validate target_type
    const validTargetTypes = ['all', 'all_classes', 'all_teachers', 'all_staff', 'class'];
    if (!validTargetTypes.includes(target_type)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid target type"
      });
    }

    // Create notice (created_by is null for admin)
    const notice = await Notice.create({
      title,
      message,
      attachment: req.file ? req.file.filename : null,
      created_by: null // Admin
    }, { transaction });

    // Create notice targets based on target_type
    let targets = [];

    if (target_type === 'all') {
      // Send to everyone
      targets.push({ notice_id: notice.id, target_type: 'all' });
      
    } else if (target_type === 'all_classes') {
      // Send to all classes
      targets.push({ notice_id: notice.id, target_type: 'all_classes' });
      
    } else if (target_type === 'all_teachers') {
      // Send to all teachers
      targets.push({ notice_id: notice.id, target_type: 'all_teachers' });
      
    } else if (target_type === 'all_staff') {
      // Send to all staff
      targets.push({ notice_id: notice.id, target_type: 'all_staff' });
      
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
    console.error("Create Notice Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all notices (admin view)
const getAllNotices = async (req, res) => {
  try {
    const notices = await Notice.findAll({
      include: [
        {
          model: NoticeTarget,
          as: 'targets',
          attributes: ['id', 'target_type', 'class_section_id'],
          include: [
            {
              model: ClassSection,
              as: 'classSection',
              attributes: ['id', 'class_name', 'section_name']
            }
          ]
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
      created_by: notice.created_by ? 'Teacher' : 'Admin',
      created_at: notice.created_at,
      updated_at: notice.updated_at,
      targets: notice.targets.map(target => {
        let targetInfo = { target_type: target.target_type };
        
        if (target.target_type === 'class' && target.classSection) {
          targetInfo.class = `${target.classSection.class_name} ${target.classSection.section_name}`;
          targetInfo.class_section_id = target.class_section_id;
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
    console.error("Get All Notices Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get single notice by ID
const getNoticeById = async (req, res) => {
  try {
    const { notice_id } = req.params;

    const notice = await Notice.findOne({
      where: { id: notice_id },
      include: [
        {
          model: NoticeTarget,
          as: 'targets',
          attributes: ['id', 'target_type', 'class_section_id'],
          include: [
            {
              model: ClassSection,
              as: 'classSection',
              attributes: ['id', 'class_name', 'section_name']
            }
          ]
        }
      ],
      attributes: ['id', 'title', 'message', 'attachment', 'created_by', 'created_at', 'updated_at']
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Notice not found"
      });
    }

    // Format response
    const formattedNotice = {
      notice_id: notice.id,
      title: notice.title,
      message: notice.message,
      attachment: notice.attachment ? `${process.env.BACKEND_URL}/uploads/notices/${notice.attachment}` : null,
      created_by: notice.created_by ? 'Teacher' : 'Admin',
      created_at: notice.created_at,
      updated_at: notice.updated_at,
      targets: notice.targets.map(target => {
        let targetInfo = { target_type: target.target_type };
        
        if (target.target_type === 'class' && target.classSection) {
          targetInfo.class = `${target.classSection.class_name} ${target.classSection.section_name}`;
          targetInfo.class_section_id = target.class_section_id;
        }
        
        return targetInfo;
      })
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Notice fetched successfully",
      data: formattedNotice
    });

  } catch (error) {
    console.error("Get Notice By ID Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Update notice
const updateNotice = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { notice_id } = req.params;
    const { title, message, target_type, class_section_ids } = req.body;

    // Find notice
    const notice = await Notice.findByPk(notice_id);

    if (!notice) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Notice not found"
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
      // Delete existing targets
      await NoticeTarget.destroy({ where: { notice_id: notice.id }, transaction });

      // Create new targets
      let targets = [];

      if (target_type === 'all') {
        targets.push({ notice_id: notice.id, target_type: 'all' });
      } else if (target_type === 'all_classes') {
        targets.push({ notice_id: notice.id, target_type: 'all_classes' });
      } else if (target_type === 'all_teachers') {
        targets.push({ notice_id: notice.id, target_type: 'all_teachers' });
      } else if (target_type === 'all_staff') {
        targets.push({ notice_id: notice.id, target_type: 'all_staff' });
      } else if (target_type === 'class' && class_section_ids) {
        targets = class_section_ids.map(id => ({
          notice_id: notice.id,
          target_type: 'class',
          class_section_id: id
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
    console.error("Update Notice Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete notice
const deleteNotice = async (req, res) => {
  try {
    const { notice_id } = req.params;

    const notice = await Notice.findByPk(notice_id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Notice not found"
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
    console.error("Delete Notice Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  createNotice,
  getAllNotices,
  getNoticeById,
  updateNotice,
  deleteNotice
};
