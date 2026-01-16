const { Student, User, ClassSection, ExamSchedule, Exam, ExamTerm, ExamTimetable, Subject, Teacher, StudentParent } = require('../../../models');

// Get student admit card by student ID and exam ID
const getStudentAdmitCard = async (req, res) => {
  try {
    const { student_id, exam_id } = req.query;

    // Validation
    if (!student_id || !exam_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Student ID and exam ID are required"
      });
    }

    // Get student details by student_id
    const student = await Student.findOne({
      where: { id: student_id },
      include: [
        {
          model: User,
          attributes: ['name', 'email']
        },
        {
          model: ClassSection,
          attributes: ['id', 'class_name', 'section_name']
        }
      ],
      attributes: ['id', 'roll_number', 'DOB', 'gender', 'image', 'admission_date']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Get exam schedule with exam and term details based on exam_id and student's class
    const examSchedule = await ExamSchedule.findOne({
      where: {
        exam_id: exam_id,
        class_section_id: student.ClassSection.id
      },
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'exam_name', 'start_date', 'end_date', 'description'],
          include: [
            {
              model: ExamTerm,
              as: 'term',
              attributes: ['term_name', 'academic_year']
            }
          ]
        },
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name']
        }
      ]
    });

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam schedule not found"
      });
    }

    // Check if student belongs to the class for this exam
    if (student.ClassSection.id !== examSchedule.class_section_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Student does not belong to this exam's class"
      });
    }

    // Get exam timetable (all subjects for this exam)
    const examTimetable = await ExamTimetable.findAll({
      where: {
        exam_schedule_id: examSchedule.id
      },
      include: [
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
        },
        {
          model: Teacher,
          as: 'invigilator',
          attributes: ['id'],
          include: [{
            model: User,
            attributes: ['name']
          }]
        }
      ],
      attributes: ['id', 'exam_date', 'start_time', 'end_time', 'max_marks', 'room_no'],
      order: [['exam_date', 'ASC'], ['start_time', 'ASC']]
    });

    // Format admit card data
    const admitCard = {
      student_info: {
        student_id: student.id,
        name: student.User?.name,
        email: student.User?.email,
        roll_number: student.roll_number,
        class: `${student.ClassSection.class_name} ${student.ClassSection.section_name}`,
        dob: student.DOB,
        gender: student.gender,
        image: student.image,
        admission_date: student.admission_date
      },
      exam_info: {
        exam_schedule_id: examSchedule.id,
        exam_name: examSchedule.exam?.exam_name,
        term_name: examSchedule.exam?.term?.term_name,
        academic_year: examSchedule.exam?.term?.academic_year,
        exam_start_date: examSchedule.exam?.start_date,
        exam_end_date: examSchedule.exam?.end_date,
        description: examSchedule.exam?.description,
        total_marks: examSchedule.total_marks,
        passing_marks: examSchedule.passing_marks
      },
      exam_schedule: examTimetable.map(entry => ({
        subject_id: entry.subject?.id,
        subject_name: entry.subject?.subject_name,
        subject_code: entry.subject?.subject_code,
        exam_date: entry.exam_date,
        start_time: entry.start_time,
        end_time: entry.end_time,
        max_marks: entry.max_marks,
        room_no: entry.room_no,
        invigilator: entry.invigilator?.User?.name || 'TBA'
      })),
      instructions: [
        "Reach the examination center 30 minutes before the exam starts",
        "Bring your admit card and ID card",
        "Mobile phones and electronic devices are strictly prohibited",
        "Follow all examination rules and regulations",
        "Use of unfair means will result in cancellation of exam"
      ]
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student admit card fetched successfully",
      data: admitCard
    });

  } catch (error) {
    console.error("Get Student Admit Card Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get admit cards for all students in a class
const getClassAdmitCards = async (req, res) => {
  try {
    const { exam_id, class_section_id } = req.query;

    if (!exam_id || !class_section_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Exam ID and Class Section ID are required"
      });
    }

    // Get exam schedule details based on exam_id and class_section_id
    const examSchedule = await ExamSchedule.findOne({
      where: {
        exam_id: exam_id,
        class_section_id: class_section_id
      },
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'exam_name', 'start_date', 'end_date'],
          include: [
            {
              model: ExamTerm,
              as: 'term',
              attributes: ['term_name', 'academic_year']
            }
          ]
        },
        {
          model: ClassSection,
          as: 'classSection',
          attributes: ['id', 'class_name', 'section_name']
        }
      ]
    });

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam schedule not found"
      });
    }

    // Get all students in this class
    const students = await Student.findAll({
      where: {
        class_section_id: examSchedule.class_section_id
      },
      include: [
        {
          model: User,
          attributes: ['name', 'email']
        }
      ],
      attributes: ['id', 'roll_number', 'DOB', 'gender', 'image'],
      order: [['roll_number', 'ASC']]
    });

    // Get exam timetable
    const examTimetable = await ExamTimetable.findAll({
      where: {
        exam_schedule_id: examSchedule.id
      },
      include: [
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
        }
      ],
      attributes: ['exam_date', 'start_time', 'end_time', 'max_marks', 'room_no'],
      order: [['exam_date', 'ASC'], ['start_time', 'ASC']]
    });

    const admitCards = students.map(student => ({
      student_id: student.id,
      name: student.User?.name,
      roll_number: student.roll_number,
      email: student.User?.email,
      dob: student.DOB,
      gender: student.gender,
      image: student.image
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Class admit cards fetched successfully",
      data: {
        exam_info: {
          exam_name: examSchedule.exam?.exam_name,
          term_name: examSchedule.exam?.term?.term_name,
          academic_year: examSchedule.exam?.term?.academic_year,
          class: `${examSchedule.classSection?.class_name} ${examSchedule.classSection?.section_name}`,
          total_marks: examSchedule.total_marks,
          passing_marks: examSchedule.passing_marks
        },
        exam_schedule: examTimetable.map(entry => ({
          subject_name: entry.subject?.subject_name,
          subject_code: entry.subject?.subject_code,
          exam_date: entry.exam_date,
          start_time: entry.start_time,
          end_time: entry.end_time,
          max_marks: entry.max_marks,
          room_no: entry.room_no
        })),
        students: admitCards
      }
    });

  } catch (error) {
    console.error("Get Class Admit Cards Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get student list for exam based on term_id, exam_id, and class_section_id
const getExamStudentList = async (req, res) => {
  try {
    const { term_id, exam_id, class_section_id } = req.query;

    // Validation
    if (!term_id || !exam_id || !class_section_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Term ID, Exam ID, and Class Section ID are required"
      });
    }

    // Verify exam belongs to the term
    const exam = await Exam.findOne({
      where: {
        id: exam_id,
        term_id: term_id
      }
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam not found for the given term"
      });
    }

    // Get exam schedule for the class
    const examSchedule = await ExamSchedule.findOne({
      where: {
        exam_id: exam_id,
        class_section_id: class_section_id
      }
    });

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Exam schedule not found for this class"
      });
    }

    // Get all students in the class with parent details
    const students = await Student.findAll({
      where: {
        class_section_id: class_section_id
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name']
        },
        {
          model: StudentParent,
          as: 'parentDetails',
          attributes: ['father_name']
        }
      ],
      attributes: ['id', 'roll_number'],
      order: [['roll_number', 'ASC']]
    });

    const studentList = students.map(student => ({
      exam_schedule_id: examSchedule.id,
      user_id: student.User?.id,
      student_name: student.User?.name,
      roll_number: student.roll_number,
      father_name: student.parentDetails?.father_name || 'N/A'
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student list fetched successfully",
      data: {
        exam_schedule_id: examSchedule.id,
        total_students: studentList.length,
        students: studentList
      }
    });

  } catch (error) {
    console.error("Get Exam Student List Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  getStudentAdmitCard,
  getClassAdmitCards,
  getExamStudentList
};
