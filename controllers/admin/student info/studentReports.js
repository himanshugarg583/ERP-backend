const { User, Student, ClassSection, StudentParent } = require("../../../models");
const { Op } = require("sequelize");

const getStudentReportByClass = async (req, res) => {
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

    // Get all students for this class with complete details
    const students = await Student.findAll({
      where: {
        class_section_id: class_id
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name']
        }
      ],
      attributes: [
        'id',
        'user_id',
        'roll_number',
        'dob',
        'gender',
        'address',
        'admission_date',
        'phone_no',
        'previous_school_name',
        'aadhar_no',
        'tc',
        'marksheet',
        'image',
        'aadhar_card',
        'sign'
      ],
      order: [['roll_number', 'ASC']]
    });

    // Format the response
    const formattedStudents = students.map(student => ({
      student_id: student.id,
      user_id: student.User ? student.User.id : null,
      name: student.User ? student.User.name : 'N/A',
      roll_number: student.roll_number,
      date_of_birth: student.dob,
      gender: student.gender,
      address: student.address,
      admission_date: student.admission_date,
      phone_no: student.phone_no,
      aadhar_no: student.aadhar_no,
      previous_school: student.previous_school_name,
      documents: {
        image: student.image,
        aadhar_card: student.aadhar_card,
        transfer_certificate: student.tc,
        marksheet: student.marksheet,
        signature: student.sign
      }
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Student report generated successfully for ${classSection.class_name}-${classSection.section_name}`,
      data: {
        class_info: {
          class_id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name,
          room_no: classSection.room_No,
          capacity: classSection.capacity
        },
        total_students: students.length,
        students: formattedStudents
      }
    });

  } catch (error) {
    console.error("Get Student Report By Class Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

const getParentReportByClass = async (req, res) => {
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

    // Get all students with parent details for this class
    const students = await Student.findAll({
      where: {
        class_section_id: class_id
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name']
        },
        {
          model: StudentParent,
          as: 'parentDetails',
          attributes: [
            'id',
            'father_name',
            'mother_name',
            'father_phone',
            'mother_phone',
            'email',
            'father_occupation',
            'mother_occupation'
          ]
        }
      ],
      attributes: ['id', 'user_id', 'roll_number'],
      order: [['roll_number', 'ASC']]
    });

    // Format the response
    const formattedData = students.map(student => ({
      student_id: student.id,
      user_id: student.User ? student.User.id : null,
      student_name: student.User ? student.User.name : 'N/A',
      roll_number: student.roll_number,
      parent_info: student.parentDetails ? {
        parent_id: student.parentDetails.id,
        father_name: student.parentDetails.father_name,
        father_phone: student.parentDetails.father_phone,
        father_occupation: student.parentDetails.father_occupation,
        mother_name: student.parentDetails.mother_name,
        mother_phone: student.parentDetails.mother_phone,
        mother_occupation: student.parentDetails.mother_occupation,
        email: student.parentDetails.email
      } : null
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Parent report generated successfully for ${classSection.class_name}-${classSection.section_name}`,
      data: {
        class_info: {
          class_id: classSection.id,
          class_name: classSection.class_name,
          section_name: classSection.section_name,
          room_no: classSection.room_No,
          capacity: classSection.capacity
        },
        total_students: students.length,
        students: formattedData
      }
    });

  } catch (error) {
    console.error("Get Parent Report By Class Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = { getStudentReportByClass, getParentReportByClass };
