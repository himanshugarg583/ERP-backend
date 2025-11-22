const { Teacher, User, Subject, ClassSection, Student } = require('../../../models');

// Get teacher subjects (user_id from token)
const getTeacherSubjects = async (req, res) => {
  try {
    // Get user_id from auth token
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

    // Get all subjects taught by this teacher
    const subjects = await Subject.findAll({
      where: { teacher_id: teacher.id },
      include: [
        {
          model: ClassSection,
          as: 'class_section',
          attributes: ['id', 'class_name', 'section_name']
        }
      ],
      attributes: ['id', 'subject_name', 'subject_code', 'class_section_id', 'teacher_id']
    });

    // Format response with student strength
    const formattedSubjects = await Promise.all(subjects.map(async (subject) => {
      // Count students in this class section
      const studentCount = await Student.count({
        where: { class_section_id: subject.class_section_id }
      });

      return {
        subject_id: subject.id,
        subject_name: subject.subject_name,
        subject_code: subject.subject_code,
        class_section_id: subject.class_section_id,
        class_name: subject.class_section?.class_name,
        section_name: subject.class_section?.section_name,
        class_display: subject.class_section 
          ? `${subject.class_section.class_name} ${subject.class_section.section_name}` 
          : 'N/A',
        student_strength: studentCount
      };
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Teacher subjects fetched successfully",
      data: {
        teacher_id: teacher.id,
        teacher_user_id: user_id,
        total_subjects: formattedSubjects.length,
        subjects: formattedSubjects
      }
    });

  } catch (error) {
    console.error("Get Teacher Subjects Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  getTeacherSubjects
};
