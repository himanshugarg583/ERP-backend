const { User, Student,ClassSection ,StudentParent} = require("../../../models");
const { Op } = require("sequelize");
const createUploader = require('../../../utils/multerHelper');



const addStudent = async (req, res) => {
  try {
    const {
      // User table
      name,
      email,
      password,

      roll_number,
      class_section_id,
      dob,
      gender,
      phone_no,
      Aadhar_no,      
      address,
      admission_date,
      previous_school_name,

      // Student table
      father_name,
      mother_name,
      // guardian_name,
      father_phone,
      mother_phone,
      parent_email_id,
      father_occupation,
      mother_occupation,
      



      
    } = req.body;
    const files = req.files;

    if (
      !name || !email  || !gender ||  !password 
    ) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Please fill all required fields",
      });
    }
      // Check if user already exists
    const existingStudent = await User.findOne({ where: { email } });
    if (existingStudent) {
      return res.status(400).json({ 
        success:false,
        statusCode:400,
        message: "Email already in use" });
    }

  

    //  Create user entry
    const user = await User.create({
      name,
      email,
      password,
      role: "student",
      status: "active"
    });

    //  Create student entry
    const student = await Student.create({
      user_id: user.id,
      roll_number,
      dob,
      gender,
      address,
      admission_date,
      class_section_id,
      phone_no,
      previous_school_name,
      aadhar_no:Aadhar_no,
      tc: files.tc ? files.tc[0].filename : null,
      marksheet: files.marksheet ? files.marksheet[0].filename : null,
      image: files.image ? files.image[0].filename : null,
      aadhar_card: files.aadhar_card ? files.aadhar_card[0].filename : null,
      sign: files.sign ? files.sign[0].filename : null,
    });

    //  Create parent entry
    const parent = await StudentParent.create({
      student_id: student.id,
      father_name,
      mother_name,
      // guardian_name,
      father_phone,
      mother_phone,
      email:parent_email_id,
      father_occupation,
      mother_occupation,
     
    });

    res.status(201).json({
      success: true,
      statusCode:201,
      message: "Student registered successfully",
      data: {
        user,
        student,
        parent
      }
    });

  } catch (error) {
    console.error("Add Student Error:", error);
    res.status(500).json({
      success: false,
      statusCode:500,
      message: "Internal Server Error"
    });
  }
};







const getSingleStudent = async (req, res) => {
  try {
    const user_id = req.params.user_id;

    const student = await User.findOne({
      where: {
        id: user_id,
        role: "student"
      },
      include: {
        model: Student,
        as: "studentDetails",
        include: {
          model: StudentParent,
          as: "parentDetails"
        }
      }
    });

    if (!student) {
      return res.status(404).json({ 

        
        success: false,
        statusCode:404,
        message: "Student not found" });
    }

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Student fetched successfully",
      data: student
    });

  } catch (error) {
    console.error("Get Single Student Error:", error);
    res.status(500).json({ 
      success:false,
      statusCode:500,
      message: "Internal Server Error" 
    });
  }
};



const updateStudent = async (req, res) => {
  try {
    const user_id = req.params.user_id;

    const {
      // User table
      name,
      email,
      password,
      
      status,

      // Student table
      roll_number,
      dob,
      gender,
      address,
      admission_date,
      class_section_id,
      phone_no,
      previous_school_name,

      // Parent table
      father_name,
      mother_name,
      guardian_name,
      father_phone,
      mother_phone,
      email_id,
      father_occupation,
      mother_occupation,
    } = req.body;

    const user = await User.findOne({
      where:{id:user_id}
    });
    const student = await Student.findOne({ where: { user_id } });
    // 

    if (!user || !student) {
      return res.status(404).json({
        success:false,
        statusCode:404,
        message: "Student not found"
       });
    }

    //  Update only if field provided (fallback to old value)
    await user.update({
      name: name ?? user.name,
      email: email ?? user.email,
      password: password ?? user.password,
      status: status ?? user.status,
    });

    await student.update({
      roll_number: roll_number ?? student.roll_number,
      dob: dob ?? student.dob,
      gender: gender ?? student.gender,
      address: address ?? student.address,
      admission_date: admission_date ?? student.admission_date,
      class_section_id: class_section_id ?? student.class_section_id,
      phone_no: phone_no ?? student.phone_no,
      previous_school_name: previous_school_name ?? student.previous_school_name
    });
    const StudentParent = await StudentParent.findOne({ where: { student_id: student.id } });

     await StudentParent.update({
      father_name: father_name ?? StudentParent.father_name,
      mother_name: mother_name ?? StudentParent.mother_name,
      guardian_name: guardian_name ?? StudentParent.guardian_name,
      father_phone: father_phone ?? StudentParent.father_phone,
      mother_phone: mother_phone ?? StudentParent.mother_phone,
      email_id: email_id ?? StudentParent.email_id,
      father_occupation: father_occupation ?? StudentParent.father_occupation,
      mother_occupation: mother_occupation ?? StudentParent.mother_occupation,
      
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student updated successfully",
      data: {
        user,
        student,
        StudentParent
      }
    });

  } catch (error) {
    console.error("Update Student Error:", error);
    res.status(500).json({ 
      success:false,
      statusCode:500,
      message: "Internal Server Error" });
  }
};


const getStudentStats = async (req, res) => {
  try {
    // Get all user_ids of active students
    const activeStudentIds = await User.findAll({
      where: { role: "student", status: "active" },
      attributes: ["id"]
    });

    const ids = activeStudentIds.map(user => user.id);

    // Count using user_id in student table
    const [total, male, female] = await Promise.all([
      ids.length,
      Student.count({ where: { gender: "male", user_id: ids } }),
      Student.count({ where: { gender: "female", user_id: ids } }),
    ]);

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Active student stats fetched successfully",
      data: {
        totalActiveStudents: total,
        maleStudents: male,
        femaleStudents: female
      }
    });

  } catch (error) {
    console.error("Get Student Stats Error:", error);
    res.status(500).json({
      success:false,
      statusCode:500,
      message: "Internal Server Error" });
  }
};





const getClassWiseStudentStats = async (req, res) => {
  try {
    // Get all active student IDs
    const activeUsers = await User.findAll({
      where: { role: "student", status: "active" },
      attributes: ["id"]
    });
    const activeIds = activeUsers.map(u => u.id);

    // Get all class-sections
    const classSections = await ClassSection.findAll();

    const result = [];

    for (const section of classSections) {
      const sectionId = section.id;

      const [total, male, female] = await Promise.all([
        Student.count({
          where: {
            user_id: { [Op.in]: activeIds },
            class_section_id: sectionId
          }
        }),
        Student.count({
          where: {
            user_id: { [Op.in]: activeIds },
            class_section_id: sectionId,
            gender: "male"
          }
        }),
        Student.count({
          where: {
            user_id: { [Op.in]: activeIds },
            class_section_id: sectionId,
            gender: "female"
          }
        })
      ]);

      result.push({
        class_section_id: sectionId,
        class_name: section.class_name,
        section_name: section.section_name,
        total,
        male,
        female
      });
    }

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Class-wise student stats fetched successfully",
      data: result
    });

  } catch (error) {
    console.error("Class-wise Student Stats Error:", error);
    res.status(500).json({ 
      success:false,
      statusCode:500,
      message: "Internal Server Error" });
  }
};





module.exports = { addStudent ,getSingleStudent,updateStudent,
  getStudentStats,getClassWiseStudentStats};
