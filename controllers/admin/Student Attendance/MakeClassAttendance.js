const { studentsAttendances,ClassSection } = require('../../../models');
// const { ClassSection } = require('../../models/admin/Classsection');

const markClassAttendance = async (req, res) => {
  try {
    const { class_section_id, date, attendances } = req.body;
    const userId = req.user?.id || null;

    // 🧪 Basic validation
    if (!class_section_id || !date || !Array.isArray(attendances)) {
      return res.status(400).json({
        success: false,
        statusCode:400,
        message: "Missing class_section_id, date or attendances list"
      });
    }

   
    const classSection = await ClassSection.findOne({ where: { id: class_section_id } });

    if (!classSection) {
      return res.status(404).json({ 
        success: false,
        statusCode:404,
        message: "Class section not found" 
      });
    }

    // ✅ Loop over each student attendance
    for (let record of attendances) {
      const { student_id, status } = record;

      // 🔍 Check if attendance already exists
      const existing = await studentsAttendances.findOne({
        where: { student_id, date }
      });

      if (existing) {
        // ✏️ Update if already exists
        existing.status = status;
        existing.class_section_id = class_section_id;
        existing.marked_by = userId;
        await existing.save();
      } else {
        // 🆕 Create new record
        await studentsAttendances.create({
          student_id,
          class_section_id,
          date,
          status,
          marked_by: userId
        });
      }
    }

    return res.status(200).json({
      success: true,
      statusCode:200,
      message: "Attendance marked successfully"
    });

  } catch (error) {
    console.error("Attendance error:", error);
    return res.status(500).json({
      success: false,
      statusCode:500,
      message: "Internal server error"
    });
  }
};

module.exports = { markClassAttendance };
