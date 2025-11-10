const { Op } = require('sequelize');
const { ClassTimetable, ClassSection, Subject, Teacher, User } = require('../../../models');

// Create single timetable entry
const createTimetable = async (req, res) => {
  try {
    const {
      class_section_id,
      subject_id,
      teacher_id,
      day_of_week,
      period_name,
      start_time,
      end_time,
      is_break
    } = req.body;

    // Validation
    if (!class_section_id || !day_of_week || !period_name || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Required fields: class_section_id, day_of_week, period_name, start_time, end_time"
      });
    }

    // If not a break, check for teacher clash
    if (!is_break && teacher_id) {
      const conflict = await ClassTimetable.findOne({
        where: {
          teacher_id,
          day_of_week,
          [Op.and]: [
            { start_time: { [Op.lt]: end_time } },
            { end_time: { [Op.gt]: start_time } }
          ]
        }
      });

      if (conflict) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Teacher is already assigned to another class in this time slot"
        });
      }
    }

    const timetable = await ClassTimetable.create({
      class_section_id,
      subject_id: is_break ? null : subject_id,
      teacher_id: is_break ? null : teacher_id,
      day_of_week,
      period_name,
      start_time,
      end_time,
      is_break: is_break || false
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Timetable entry created successfully",
      data: timetable
    });

  } catch (error) {
    console.error("Create Timetable Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get timetable by class
const getTimetableByClass = async (req, res) => {
  try {
    const { class_id } = req.params;

    const classSection = await ClassSection.findByPk(class_id);

    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    const timetable = await ClassTimetable.findAll({
      where: { class_section_id: class_id },
      include: [
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name']
        },
        {
          model: Teacher,
          as: 'teacher',
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

    // Group by day
    const groupedTimetable = timetable.reduce((acc, entry) => {
      if (!acc[entry.day_of_week]) {
        acc[entry.day_of_week] = [];
      }
      acc[entry.day_of_week].push({
        id: entry.id,
        period_name: entry.period_name,
        start_time: entry.start_time,
        end_time: entry.end_time,
        is_break: entry.is_break,
        subject: entry.subject ? {
          id: entry.subject.id,
          name: entry.subject.subject_name
        } : null,
        teacher: entry.teacher ? {
          id: entry.teacher.id,
          name: entry.teacher.User ? entry.teacher.User.name : 'N/A'
        } : null
      });
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Timetable fetched successfully",
      data: {
        class_info: {
          class_id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name
        },
        timetable: groupedTimetable
      }
    });

  } catch (error) {
    console.error("Get Timetable Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete timetable entry
const deleteTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await ClassTimetable.findByPk(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Timetable entry not found"
      });
    }

    await entry.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Timetable entry deleted successfully"
    });

  } catch (error) {
    console.error("Delete Timetable Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Save whole week timetable at once
const saveWeekTimetable = async (req, res) => {
  try {
    const { class_section_id, week_timetable } = req.body;

    // Validation
    if (!class_section_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "class_section_id is required"
      });
    }

    if (!week_timetable || typeof week_timetable !== 'object') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "week_timetable object is required"
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

    // Flatten week_timetable object into array
    const allEntries = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const day of days) {
      if (week_timetable[day] && Array.isArray(week_timetable[day])) {
        week_timetable[day].forEach(entry => {
          allEntries.push({
            ...entry,
            day_of_week: day,
            class_section_id
          });
        });
      }
    }

    if (allEntries.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "No timetable entries provided"
      });
    }

    // Check for teacher clashes
    const teacherSlots = {};
    for (const entry of allEntries) {
      if (!entry.is_break && entry.teacher_id) {
        const key = `${entry.teacher_id}_${entry.day_of_week}`;
        if (!teacherSlots[key]) {
          teacherSlots[key] = [];
        }
        
        // Check against existing database entries
        const existingConflict = await ClassTimetable.findOne({
          where: {
            teacher_id: entry.teacher_id,
            day_of_week: entry.day_of_week,
            class_section_id: { [Op.ne]: class_section_id }, // Exclude same class
            [Op.and]: [
              { start_time: { [Op.lt]: entry.end_time } },
              { end_time: { [Op.gt]: entry.start_time } }
            ]
          }
        });

        if (existingConflict) {
          return res.status(400).json({
            success: false,
            statusCode: 400,
            message: `Teacher is already assigned to another class on ${entry.day_of_week} from ${entry.start_time} to ${entry.end_time}`
          });
        }

        // Check against current submission
        for (const slot of teacherSlots[key]) {
          if (entry.start_time < slot.end_time && entry.end_time > slot.start_time) {
            return res.status(400).json({
              success: false,
              statusCode: 400,
              message: `Teacher has overlapping periods on ${entry.day_of_week}`
            });
          }
        }
        
        teacherSlots[key].push({
          start_time: entry.start_time,
          end_time: entry.end_time
        });
      }
    }

    // Delete existing timetable for this class
    await ClassTimetable.destroy({
      where: { class_section_id }
    });

    // Create new timetable entries
    const createdEntries = await ClassTimetable.bulkCreate(
      allEntries.map(entry => ({
        class_section_id,
        subject_id: entry.is_break ? null : entry.subject_id,
        teacher_id: entry.is_break ? null : entry.teacher_id,
        day_of_week: entry.day_of_week,
        period_name: entry.period_name,
        start_time: entry.start_time,
        end_time: entry.end_time,
        is_break: entry.is_break || false
      }))
    );

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: `Timetable saved successfully for ${classSection.class_name}-${classSection.section_name}`,
      data: {
        class_section_id,
        total_entries: createdEntries.length,
        days_covered: days.filter(day => week_timetable[day] && week_timetable[day].length > 0)
      }
    });

  } catch (error) {
    console.error("Save Week Timetable Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Bulk create timetable for whole week (Backward compatibility)
const bulkCreateTimetable = async (req, res) => {
  try {
    const { class_section_id, timetable } = req.body;

    // Validation
    if (!class_section_id || !Array.isArray(timetable) || timetable.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "class_section_id and timetable array are required"
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

    // Validate all subject_ids and teacher_ids exist
    const uniqueSubjectIds = [...new Set(timetable.filter(e => !e.is_break && e.subject_id).map(e => e.subject_id))];
    const uniqueTeacherIds = [...new Set(timetable.filter(e => !e.is_break && e.teacher_id).map(e => e.teacher_id))];

    if (uniqueSubjectIds.length > 0) {
      const subjects = await Subject.findAll({
        where: { id: uniqueSubjectIds },
        attributes: ['id']
      });

      if (subjects.length !== uniqueSubjectIds.length) {
        const foundIds = subjects.map(s => s.id);
        const missingIds = uniqueSubjectIds.filter(id => !foundIds.includes(id));
        return res.status(404).json({
          success: false,
          statusCode: 404,
          message: `Subject IDs not found: ${missingIds.join(', ')}`
        });
      }
    }

    if (uniqueTeacherIds.length > 0) {
      const teachers = await Teacher.findAll({
        where: { id: uniqueTeacherIds },
        attributes: ['id']
      });

      if (teachers.length !== uniqueTeacherIds.length) {
        const foundIds = teachers.map(t => t.id);
        const missingIds = uniqueTeacherIds.filter(id => !foundIds.includes(id));
        return res.status(404).json({
          success: false,
          statusCode: 404,
          message: `Teacher IDs not found: ${missingIds.join(', ')}`
        });
      }
    }

    // Check for teacher clashes
    for (let entry of timetable) {
      if (!entry.is_break && entry.teacher_id) {
        const conflict = await ClassTimetable.findOne({
          where: {
            teacher_id: entry.teacher_id,
            day_of_week: entry.day_of_week,
            class_section_id: { [Op.ne]: class_section_id },
            [Op.and]: [
              { start_time: { [Op.lt]: entry.end_time } },
              { end_time: { [Op.gt]: entry.start_time } }
            ]
          }
        });

        if (conflict) {
          return res.status(400).json({
            success: false,
            statusCode: 400,
            message: `Teacher clash detected on ${entry.day_of_week} period ${entry.period_name || 'N/A'}`
          });
        }
      }
    }

    // Delete existing timetable for this class
    await ClassTimetable.destroy({
      where: { class_section_id }
    });

    // Create new timetable
    const createdEntries = await ClassTimetable.bulkCreate(
      timetable.map(entry => ({
        class_section_id,
        subject_id: entry.is_break ? null : entry.subject_id,
        teacher_id: entry.is_break ? null : entry.teacher_id,
        day_of_week: entry.day_of_week,
        period_name: entry.period_name,
        start_time: entry.start_time,
        end_time: entry.end_time,
        is_break: entry.is_break || false
      }))
    );

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Timetable created successfully for the week",
      data: {
        total_entries: createdEntries.length
      }
    });

  } catch (error) {
    console.error("Bulk Create Timetable Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Check teacher clash
const checkTeacherClash = async (req, res) => {
  try {
    const { teacher_id, day_of_week, start_time, end_time } = req.body;

    if (!teacher_id) {
      return res.json({ 
        success: true,
        clash: false 
      });
    }

    const conflict = await ClassTimetable.findOne({
      where: {
        teacher_id,
        day_of_week,
        [Op.and]: [
          { start_time: { [Op.lt]: end_time } },
          { end_time: { [Op.gt]: start_time } }
        ]
      }
    });

    if (conflict) {
      return res.json({ 
        success: true,
        clash: true, 
        message: 'Teacher already assigned in this time slot' 
      });
    }

    return res.status(200).json({ 
      success: true,
      statusCode: 200,
      clash: false 
    });

  } catch (error) {
    console.error("Check Teacher Clash Error:", error);
    res.status(500).json({ 
      success: false,
      statusCode: 500,
      message: "Internal Server Error" 
    });
  }
};

// Get timetable by teacher user_id
const getTimetableByTeacher = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "User ID is required"
      });
    }

    // Find teacher by user_id
    const teacher = await Teacher.findOne({
      where: { user_id },
      include: [{
        model: User,
        attributes: ['name', 'email']
      }]
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
          id: teacher.id,
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

module.exports = { 
  createTimetable,
  getTimetableByClass,
  deleteTimetableEntry,
  saveWeekTimetable,
  bulkCreateTimetable,
  checkTeacherClash,
  getTimetableByTeacher
};
