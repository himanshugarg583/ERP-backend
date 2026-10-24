const {User,Teacher,ClassSection,Student,Subject,StudentParent, ExamTypeV2, ExamEventV2, ExamPaperV2, ExamSchedule} = require('../../models');

const getTeacherDropdown = async (req, res) => {
  try {
    const allTeachers = await User.findAll({
      where: {
        role: "teacher",
        status: "active",
      },
      attributes: ["id", "name"],
      include: {
        model: Teacher,
        as: "teacherDetails",
        attributes: ["id", "qualification", "gender", "mobile_no"],
        include: [{
          model: Subject,
          as: 'subjects',
          attributes: ['id', 'subject_name', 'subject_code', 'class_section_id'],
          include: [{
            model: ClassSection,
            as: 'class_section',
            attributes: ['id', 'class_name', 'section_name']
          }],
          required: false
        }],
      },
    });

    const formattedTeachers = allTeachers.map((user) => {
      const subjects = user.teacherDetails?.subjects || [];

      return {
        user_id: user.id,
        name: user.name,
        teacherDetails: user.teacherDetails ? {
          id: user.teacherDetails.id,
          qualification: user.teacherDetails.qualification,
          gender: user.teacherDetails.gender,
          mobile_no: user.teacherDetails.mobile_no
        } : null,
        assigned_subjects: subjects.length > 0
          ? subjects.map((subject) => ({
            subject_id: subject.id,
            subject_name: subject.subject_name,
            subject_code: subject.subject_code,
            class_section_id: subject.class_section_id,
            class_name: subject.class_section?.class_name || null,
            section_name: subject.class_section?.section_name || null
          }))
          : null
      };
    });

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Active teachers fetched successfully",
      data: formattedTeachers,
    });

  } catch (error) {
    console.error("Get Active Teachers Error:", error);
    res.status(500).json({
      success:false,
      statusCode:500,
      message: "Internal Server Error" });
  }
};

const getClassDropdown = async (req, res) => {
  try {

    const classSections = await ClassSection.findAll({
          attributes: ['id', 'class_name', 'section_name'], 
      order: [["class_name", "ASC"], ["section_name", "ASC"]],
    });

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Class-sections fetched successfully",
      data: classSections,
    });

  } catch (error) {
    console.error("Get Class-Sections Error:", error);
    res.status(500).json({ 
      success:false,
      statusCode:500,
      message: "Internal Server Error"
    
    });
  }
};

const getStudentsByClass = async (req, res) => {
  try {
    const { class_id } = req.params;

    // Validate class_id
    if (!class_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Class ID is required"
      });
    }

    // Check if class exists
    const classSection = await ClassSection.findByPk(class_id);

    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    // Get all students for this class
    const students = await Student.findAll({
      where: {
        class_section_id: class_id
      },
      include: [
        {
          model: User,
          attributes: ['name']
        },
        {
          model: StudentParent,
          as: 'parentDetails',
          attributes: ['father_name']
        }
      ],
      attributes: ['id', 'roll_number', 'gender', 'phone_no'],
      order: [['roll_number', 'ASC']]
    });

    // Format response with all requested fields
    const formattedStudents = students.map(student => ({
      id: student.id,
      name: student.User ? student.User.name : 'N/A',
      roll_number: student.roll_number,
      gender: student.gender,
      phone_no: student.phone_no,
      father_name: student.parentDetails ? student.parentDetails.father_name : 'N/A'
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Students fetched successfully for ${classSection.class_name}-${classSection.section_name}`,
      data: formattedStudents
    });

  } catch (error) {
    console.error("Get Students By Class Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

const getExamTermDropdown = async (req, res) => {
  try {
    const examTerms = await ExamTypeV2.findAll({
      attributes: ['id', 'name', 'is_active'],
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam types fetched successfully",
      data: examTerms.map(row => ({
        id: row.id,
        term_name: row.name,
        status: row.is_active ? 'active' : 'inactive'
      }))
    });

  } catch (error) {
    console.error("Get Exam Term Dropdown Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

const getExamDropdown = async (req, res) => {
  try {
    const { term_id } = req.query;

    const whereCondition = {};
    if (term_id) {
      whereCondition.exam_type_id = term_id;
    }

    const exams = await ExamEventV2.findAll({
      where: whereCondition,
      attributes: ['id', 'name', 'academic_year', 'status'],
      order: [['academic_year', 'DESC'], ['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam events fetched successfully",
      data: exams.map(row => ({
        id: row.id,
        name: row.name,
        academic_year: row.academic_year,
        status: row.status
      }))
    });

  } catch (error) {
    console.error("Get Exam Dropdown Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

const getExamScheduleByExam = async (req, res) => {
  try {
    const { exam_id } = req.query;

    if (!exam_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam ID is required"
      });
    }

    // In Exam V2, "ExamSchedule" is essentially ExamPaperV2 linked to ExamTimetableV2
    const examSchedules = await ExamPaperV2.findAll({
      where: {
        exam_event_id: exam_id
      },
      include: [
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['class_name', 'section_name']
        }
      ],
      attributes: ['id', 'class_id', 'max_marks', 'passing_marks'],
      order: [['class_id', 'ASC']]
    });

    const formattedSchedules = examSchedules.map(schedule => ({
      exam_schedule_id: schedule.id,
      class_id: schedule.class_id,
      name: schedule.classSection ? `${schedule.classSection.class_name}-${schedule.classSection.section_name}` : 'N/A'
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Exam schedules fetched successfully",
      data: formattedSchedules
    });

  } catch (error) {
    console.error("Get Exam Schedule By Exam Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

const getStudentsForExamMark = async (req, res) => {
  try {
    const { exam_schedule_id, class_id } = req.query;

    // Validation
    if (!exam_schedule_id || !class_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam schedule ID and class ID are required"
      });
    }

    // Verify exam schedule exists
    const examSchedule = await ExamSchedule.findByPk(exam_schedule_id);
    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam schedule not found"
      });
    }

    // Verify class_id matches exam_schedule
    if (examSchedule.class_section_id != class_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Class ID does not match with exam schedule"
      });
    }

    // Get all students from the class
    const students = await Student.findAll({
      where: {
        class_section_id: class_id
      },
      include: [
        {
          model: User,
          attributes: ['name']
        }
      ],
      attributes: ['id', 'roll_number'],
      order: [['roll_number', 'ASC']]
    });

    // Format response
    const formattedStudents = students.map(student => ({
      student_id: student.id,
      name: student.User?.name || 'N/A',
      roll_number: student.roll_number
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Students fetched successfully for exam marks entry",
      data: formattedStudents
    });

  } catch (error) {
    console.error("Get Students For Exam Mark Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

const getSubjectsByClass = async (req, res) => {
  try {
    const { class_id } = req.query;

    // Validation
    if (!class_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Class ID is required"
      });
    }

    // Verify class exists
    const classSection = await ClassSection.findByPk(class_id);
    if (!classSection) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    // Get all subjects for this class
    const subjects = await Subject.findAll({
      where: {
        class_section_id: class_id
      },
      attributes: ['id', 'subject_name', 'subject_code'],
      order: [['subject_name', 'ASC']]
    });

    // Format response
    const formattedSubjects = subjects.map(subject => ({
      subject_id: subject.id,
      name: subject.subject_name,
      subject_code: subject.subject_code
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Subjects fetched successfully",
      data: formattedSubjects
    });

  } catch (error) {
    console.error("Get Subjects By Class Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = { 
  getTeacherDropdown,
  getClassDropdown,
  getStudentsByClass,
  getExamTermDropdown,
  getExamDropdown,
  getExamScheduleByExam,
  getStudentsForExamMark,
  getSubjectsByClass
};