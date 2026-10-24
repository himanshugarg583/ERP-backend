const { User, Student, ClassSection, StudentParent, sequelize } = require("../../../models");
const { Op } = require("sequelize");
const { addStudentValidationSchema, updateStudentValidationSchema } = require("../../../middlewares/validations/studentValidation");
const createUploader = require('../../../utils/multerHelper');



const addStudent = async (req, res) => {
  // 1. Validate input parameters with Joi
  const { error: validationError, value: validatedBody } = addStudentValidationSchema.validate(req.body, { abortEarly: false });
  if (validationError) {
    const details = validationError.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/['"]/g, '')
    }));
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: validationError.details[0]?.message.replace(/['"]/g, '') || "Validation failed",
      errors: details
    });
  }

  const transaction = await sequelize.transaction();
  try {
    const {
      name,
      email,
      password,
      gender,
      admission_no,
      admission_number,
      roll_number,
      class_section_id,
      dob,
      phone_no,
      Aadhar_no,
      aadhar_no,
      address,
      admission_date,
      previous_school_name,
      father_name,
      mother_name,
      father_phone,
      mother_phone,
      parent_email_id,
      email_id,
      father_occupation,
      mother_occupation,
    } = validatedBody;

    const files = req.files || {};

    // Check if user already exists
    const existingStudent = await User.findOne({ where: { email }, transaction });
    if (existingStudent) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        statusCode: 400,
        message: "Email already in use" 
      });
    }

    // Resolve or auto-generate admission_no
    const providedAdmissionNo = admission_no || admission_number;
    const finalAdmissionNo = (providedAdmissionNo && String(providedAdmissionNo).trim())
      ? String(providedAdmissionNo).trim()
      : `ADM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const finalAadharNo = aadhar_no || Aadhar_no || null;
    const finalParentEmail = parent_email_id || email_id || null;

    // Create user entry
    const user = await User.create({
      name,
      email,
      password,
      role: "student",
      status: "active"
    }, { transaction });

    // Create student entry
    const student = await Student.create({
      user_id: user.id,
      admission_no: finalAdmissionNo,
      roll_number: roll_number || null,
      dob: dob || null,
      gender: gender ? gender.toLowerCase() : null,
      admission_date: admission_date || new Date(),
      class_section_id: class_section_id ? Number(class_section_id) : null,
      phone_no: phone_no || null,
      previous_school_name: previous_school_name || null,
      aadhar_no: finalAadharNo,
      tc: files.tc ? files.tc[0].filename : null,
      marksheet: files.marksheet ? files.marksheet[0].filename : null,
      image: files.image ? files.image[0].filename : null,
      aadhar_card: files.aadhar_card ? files.aadhar_card[0].filename : null,
      sign: files.sign ? files.sign[0].filename : null,
    }, { transaction });

    // Create parent entry
    const parent = await StudentParent.create({
      student_id: student.id,
      father_name: father_name || null,
      mother_name: mother_name || null,
      father_phone: father_phone || null,
      mother_phone: mother_phone || null,
      email: finalParentEmail,
      address: address || null,
      father_occupation: father_occupation || null,
      mother_occupation: mother_occupation || null,
    }, { transaction });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Student registered successfully",
      data: {
        user,
        student,
        parent
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Add Student Error:", error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors?.[0]?.path || 'field';
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: `A student with this ${field} already exists.`,
        error: error.message
      });
    }

    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeDatabaseError') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: error.parent?.sqlMessage || error.message || "Database validation failed"
      });
    }

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || "Internal Server Error"
    });
  }
};

const getSingleStudent = async (req, res) => {
  try {
    const student_id = req.params.student_id;

    const student = await Student.findOne({
      where: {
        id: student_id
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'status', 'role']
        },
        {
          model: StudentParent,
          as: "parentDetails"
        },
        {
          model: ClassSection,
          attributes: ['id', 'class_name', 'section_name']
        }
      ]
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
  const { error: validationError, value: validatedBody } = updateStudentValidationSchema.validate(req.body, { abortEarly: false });
  if (validationError) {
    const details = validationError.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/['"]/g, '')
    }));
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: validationError.details[0]?.message.replace(/['"]/g, '') || "Validation failed",
      errors: details
    });
  }

  try {
    const student_id = req.params.student_id;
    const {
      name,
      email,
      password,
      status,
      admission_no,
      admission_number,
      roll_number,
      dob,
      gender,
      address,
      admission_date,
      class_section_id,
      phone_no,
      previous_school_name,
      aadhar_no,
      Aadhar_no,
      father_name,
      mother_name,
      guardian_name,
      father_phone,
      mother_phone,
      email_id,
      parent_email_id,
      father_occupation,
      mother_occupation,
    } = validatedBody;

    const student = await Student.findOne({ where: { id: student_id } });
    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    const user = await User.findOne({ where: { id: student.user_id } });
    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "User not found"
      });
    }

    await user.update({
      name: name ?? user.name,
      email: email ?? user.email,
      password: password ?? user.password,
      status: status ?? user.status,
    });

    const nextAdmissionNo = admission_no || admission_number;
    const finalAadharNo = aadhar_no ?? Aadhar_no;

    await student.update({
      admission_no: nextAdmissionNo ? String(nextAdmissionNo).trim() : student.admission_no,
      roll_number: roll_number ?? student.roll_number,
      dob: dob ?? student.dob,
      gender: gender ? gender.toLowerCase() : student.gender,
      address: address ?? student.address,
      admission_date: admission_date ?? student.admission_date,
      class_section_id: class_section_id ?? student.class_section_id,
      phone_no: phone_no ?? student.phone_no,
      previous_school_name: previous_school_name ?? student.previous_school_name,
      aadhar_no: finalAadharNo ?? student.aadhar_no
    });

    const studentParent = await StudentParent.findOne({ where: { student_id: student.id } });
    if (studentParent) {
      await studentParent.update({
        father_name: father_name ?? studentParent.father_name,
        mother_name: mother_name ?? studentParent.mother_name,
        guardian_name: guardian_name ?? studentParent.guardian_name,
        father_phone: father_phone ?? studentParent.father_phone,
        mother_phone: mother_phone ?? studentParent.mother_phone,
        email: (parent_email_id ?? email_id) ?? studentParent.email,
        father_occupation: father_occupation ?? studentParent.father_occupation,
        mother_occupation: mother_occupation ?? studentParent.mother_occupation,
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student updated successfully",
      data: {
        user,
        student,
        StudentParent: studentParent
      }
    });

  } catch (error) {
    console.error("Update Student Error:", error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors?.[0]?.path || 'field';
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: `A student with this ${field} already exists.`
      });
    }

    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeDatabaseError') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: error.parent?.sqlMessage || error.message || "Database validation failed"
      });
    }

    return res.status(500).json({ 
      success: false,
      statusCode: 500,
      message: error.message || "Internal Server Error"
    });
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





const getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', class_section_id } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause for Student
    const studentWhere = {};
    if (class_section_id) {
      studentWhere.class_section_id = class_section_id;
    }

    // Build where clause for User (search by name or email)
    const userWhere = {
      role: 'student',
      status: 'active'
    };
    if (search) {
      userWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    // Get all students with pagination
    const { count, rows: students } = await Student.findAndCountAll({
      where: studentWhere,
      attributes: [['id', 'student_id'], 'roll_number'],
      include: [
        {
          model: User,
          where: userWhere,
          attributes: ['name']
        },
        {
          model: ClassSection,
          attributes: ['class_name', 'section_name']
        },
        {
          model: StudentParent,
          as: 'parentDetails',
          attributes: ['father_name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['roll_number', 'ASC']]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Students fetched successfully",
      data: students,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error("Get All Students Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

const deleteStudent = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { student_id } = req.params;

    const student = await Student.findOne({
      where: { id: student_id },
      transaction
    });

    if (!student) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    await StudentParent.destroy({
      where: { student_id: student.id },
      transaction
    });

    await Student.destroy({
      where: { id: student.id },
      transaction
    });

    await User.destroy({
      where: { id: student.user_id },
      transaction
    });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student deleted successfully"
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete Student Error:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};


module.exports = { addStudent ,getSingleStudent,updateStudent,
  getStudentStats,getClassWiseStudentStats,getAllStudents,deleteStudent};
