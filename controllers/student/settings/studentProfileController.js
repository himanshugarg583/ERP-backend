const { Student, User, ClassSection, Teacher, StudentParent } = require('../../../models');
const bcrypt = require('bcrypt');

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
              attributes: ['id', 'mobile_no'],
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
            'email'
          ]
        }
      ],
      attributes: [
        'id',
        'roll_number',
        'admission_date',
        'dob',
        'gender',
        'address',
        'phone_no',
        'previous_school_name',
        'aadhar_no',
        'tc',
        'marksheet',
        'image',
        'aadhar_card',
        'sign'
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
        email: student.User?.email,
        roll_number: student.roll_number,
        admission_date: student.admission_date,
        date_of_birth: student.dob,
        gender: student.gender,
        phone_no: student.phone_no,
        aadhar_no: student.aadhar_no,
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
        previous_school_name: student.previous_school_name,
        tc: student.tc,
        marksheet: student.marksheet
      },
      class_teacher_info: student.ClassSection?.classTeacher ? {
        name: student.ClassSection.classTeacher.User?.name,
        email: student.ClassSection.classTeacher.User?.email,
        phone: student.ClassSection.classTeacher.mobile_no
      } : null,
      parent_info: student.parentDetails ? {
        father_name: student.parentDetails.father_name,
        father_phone: student.parentDetails.father_phone,
        father_occupation: student.parentDetails.father_occupation,
        mother_name: student.parentDetails.mother_name,
        mother_phone: student.parentDetails.mother_phone,
        mother_occupation: student.parentDetails.mother_occupation,
        parent_email: student.parentDetails.email
      } : null,
      address_info: {
        address: student.address
      },
      documents: {
        image: student.image,
        aadhar_card: student.aadhar_card,
        tc: student.tc,
        marksheet: student.marksheet,
        sign: student.sign
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

// Change student password
const changeStudentPassword = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;
    const { current_password, new_password, confirm_new_password } = req.body;

    // Validate input
    if (!current_password || !new_password || !confirm_new_password) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Current password, new password and confirm new password are required"
      });
    }

    // Check if new passwords match
    if (new_password !== confirm_new_password) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "New password and confirm new password do not match"
      });
    }

    // Validate new password length
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "New password must be at least 6 characters long"
      });
    }

    // Find user
    const user = await User.findOne({ where: { id: user_id } });

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "User not found"
      });
    }

    // Verify current password
    if (current_password !== user.password) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Current password is incorrect"
      });
    }

    // Update password (direct save without hashing)
    await user.update({ password: new_password });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error("Change Student Password Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  getStudentProfile,
  changeStudentPassword
};
