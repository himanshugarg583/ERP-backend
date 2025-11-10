const { User, Student, Teacher } = require("../../../models");

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Get from authenticated user token

    // Find user with basic details
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'role', 'status', 'created_at', 'updated_at']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "User not found"
      });
    }

    let profileData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    // If user is a student, get student details
    if (user.role === 'student') {
      const student = await Student.findOne({
        where: { user_id: userId },
        attributes: [
          'id',
          'roll_number',
          'dob',
          'gender',
          'address',
          'admission_date',
          'phone_no',
          'previous_school_name',
          'aadhar_no',
          'class_section_id',
          'tc',
          'marksheet',
          'image',
          'aadhar_card',
          'sign'
        ]
      });

      if (student) {
        profileData.student_details = {
          student_id: student.id,
          roll_number: student.roll_number,
          date_of_birth: student.dob,
          gender: student.gender,
          address: student.address,
          admission_date: student.admission_date,
          phone_no: student.phone_no,
          aadhar_no: student.aadhar_no,
          previous_school: student.previous_school_name,
          class_section_id: student.class_section_id,
          documents: {
            image: student.image,
            aadhar_card: student.aadhar_card,
            transfer_certificate: student.tc,
            marksheet: student.marksheet,
            signature: student.sign
          }
        };
      }
    }

    // If user is a teacher, get teacher details
    if (user.role === 'teacher') {
      const teacher = await Teacher.findOne({
        where: { user_id: userId },
        attributes: [
          'id',
          'qualification',
          'dob',
          'mobile_no',
          'permanent_address',
          'role',
          'gender',
          'salary',
          'joining_date',
          'current_address',
          'image'
        ]
      });

      if (teacher) {
        profileData.teacher_details = {
          teacher_id: teacher.id,
          qualification: teacher.qualification,
          date_of_birth: teacher.dob,
          mobile_no: teacher.mobile_no,
          permanent_address: teacher.permanent_address,
          role: teacher.role,
          gender: teacher.gender,
          salary: teacher.salary,
          joining_date: teacher.joining_date,
          current_address: teacher.current_address,
          image: teacher.image
        };
      }
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Profile fetched successfully",
      data: profileData
    });

  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = { getProfile };
