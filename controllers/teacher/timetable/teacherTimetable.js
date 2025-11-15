const { Teacher, ClassTimetable, ClassSection, Subject, User } = require('../../../models');

// Get teacher timetable by user_id
const getTeacherTimetable = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;

    // Find teacher by user_id
    const teacher = await Teacher.findOne({
      where: { user_id: user_id },
      include: [
        {
          model: User,
          attributes: ['name', 'email']
        }
      ]
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Teacher not found with this user ID"
      });
    }

    // Get all timetable entries for this teacher
    const timetable = await ClassTimetable.findAll({
      where: { teacher_id: teacher.id },
      include: [
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name']
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
        }
      ],
      order: [
        ['day_of_week', 'ASC'],
        ['start_time', 'ASC']
      ]
    });

    if (timetable.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No timetable found for this teacher"
      });
    }

    // Group by day of week
    const groupedTimetable = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: []
    };

    timetable.forEach(entry => {
      const dayData = {
        id: entry.id,
        period_name: entry.period_name,
        start_time: entry.start_time,
        end_time: entry.end_time,
        is_break: entry.is_break,
        class_info: entry.classSection ? {
          id: entry.classSection.id,
          class_name: entry.classSection.class_name,
          section_name: entry.classSection.section_name,
          display: `${entry.classSection.class_name} ${entry.classSection.section_name}`
        } : null,
        subject_info: entry.subject ? {
          id: entry.subject.id,
          subject_name: entry.subject.subject_name,
          subject_code: entry.subject.subject_code
        } : null
      };

      if (groupedTimetable[entry.day_of_week]) {
        groupedTimetable[entry.day_of_week].push(dayData);
      }
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Teacher timetable fetched successfully",
      data: {
        teacher_info: {
          teacher_id: teacher.id,
          name: teacher.User?.name,
          email: teacher.User?.email,
          qualification: teacher.qualification,
          role: teacher.role
        },
        timetable: groupedTimetable
      }
    });

  } catch (error) {
    console.error("Get Teacher Timetable Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get class timetable by class_section_id
const getClassTimetable = async (req, res) => {
  try {
    const { class_section_id } = req.params;

    // Validation
    if (!class_section_id || isNaN(parseInt(class_section_id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid class section ID is required"
      });
    }

    // Check if class exists
    const classSection = await ClassSection.findByPk(class_section_id);
    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    // Get all timetable entries for this class
    const timetable = await ClassTimetable.findAll({
      where: { class_section_id: class_section_id },
      include: [
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id'],
          include: [
            {
              model: User,
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [
        ['day_of_week', 'ASC'],
        ['start_time', 'ASC']
      ]
    });

    if (timetable.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No timetable found for this class"
      });
    }

    // Group by day of week
    const groupedTimetable = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: []
    };

    timetable.forEach(entry => {
      const dayData = {
        id: entry.id,
        period_name: entry.period_name,
        start_time: entry.start_time,
        end_time: entry.end_time,
        is_break: entry.is_break,
        subject: entry.subject ? {
          id: entry.subject.id,
          subject_name: entry.subject.subject_name,
          subject_code: entry.subject.subject_code
        } : null,
        teacher: entry.teacher ? {
          id: entry.teacher.id,
          name: entry.teacher.User?.name || 'N/A'
        } : null
      };

      if (groupedTimetable[entry.day_of_week]) {
        groupedTimetable[entry.day_of_week].push(dayData);
      }
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Class timetable fetched successfully",
      data: {
        class_info: {
          class_section_id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name,
          display_name: `${classSection.class_name} ${classSection.section_name}`
        },
        timetable: groupedTimetable
      }
    });

  } catch (error) {
    console.error("Get Class Timetable Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  getTeacherTimetable,
  getClassTimetable
};
