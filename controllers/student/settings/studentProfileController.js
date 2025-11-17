const { Student, User, ClassSection, Teacher, StudentParent } = require('../../../models');

// Get student profile
const getStudentProfile = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;

    // Find student with all details
    const student = await Student.findOne({
      where: { user_id: user_id },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'status']
        },
        {
          model: ClassSection,
          attributes: ['id', 'class_name', 'section_name', 'room_No', 'capacity'],
          include: [
            {
              model: Teacher,
              as: 'classTeacher',
              attributes: ['id', 'mobile', 'qualification', 'role'],
              include: [
                {
                  model: User,
                  attributes: ['id', 'name', 'email']
                }
              ]
            }
          ]
        },
        {
          model: StudentParent,
          as: 'parentDetails',
          attributes: [
            'father_name',
            'father_phone',
            'father_occupation',
            'mother_name',
            'mother_phone',
            'mother_occupation',
            'email',
            'address'
          ]
        }
      ],
      attributes: [
        'id',
        'roll_number',
        'admission_number',
        'admission_date',
        'DOB',
        'gender',
        'blood_group',
        'religion',
        'caste',
        'category',
        'mobile',
        'email',
        'current_address',
        'permanent_address',
        'image',
        'previous_school',
        'previous_class',
        'tc_number',
        'tc_issue_date'
      ]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Format response
    const profile = {
      personal_info: {
        student_id: student.id,
        user_id: student.User?.id,
        name: student.User?.name,
        email: student.User?.email || student.email,
        roll_number: student.roll_number,
        admission_number: student.admission_number,
        admission_date: student.admission_date,
        date_of_birth: student.DOB,
        gender: student.gender,
        blood_group: student.blood_group,
        religion: student.religion,
        caste: student.caste,
        category: student.category,
        mobile: student.mobile,
        image: student.image,
        account_status: student.User?.status
      },
      academic_info: {
        class_section_id: student.ClassSection?.id,
        class_name: student.ClassSection?.class_name,
        section_name: student.ClassSection?.section_name,
        class_display: student.ClassSection ? `${student.ClassSection.class_name} ${student.ClassSection.section_name}` : 'N/A',
        room_no: student.ClassSection?.room_No,
        class_capacity: student.ClassSection?.capacity,
        previous_school: student.previous_school,
        previous_class: student.previous_class,
        tc_number: student.tc_number,
        tc_issue_date: student.tc_issue_date
      },
      class_teacher_info: student.ClassSection?.classTeacher ? {
        teacher_id: student.ClassSection.classTeacher.id,
        teacher_user_id: student.ClassSection.classTeacher.User?.id,
        name: student.ClassSection.classTeacher.User?.name,
        email: student.ClassSection.classTeacher.User?.email,
        mobile: student.ClassSection.classTeacher.mobile,
        qualification: student.ClassSection.classTeacher.qualification,
        role: student.ClassSection.classTeacher.role
      } : null,
      parent_info: student.parentDetails ? {
        father_name: student.parentDetails.father_name,
        father_phone: student.parentDetails.father_phone,
        father_occupation: student.parentDetails.father_occupation,
        mother_name: student.parentDetails.mother_name,
        mother_phone: student.parentDetails.mother_phone,
        mother_occupation: student.parentDetails.mother_occupation,
        parent_email: student.parentDetails.email,
        address: student.parentDetails.address
      } : null,
      address_info: {
        current_address: student.current_address,
        permanent_address: student.permanent_address
      }
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student profile fetched successfully",
      data: profile
    });

  } catch (error) {
    console.error("Get Student Profile Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  getStudentProfile
};
