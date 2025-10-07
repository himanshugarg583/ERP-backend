const bcrypt = require("bcrypt");
const { User, Teacher } = require("../../../models");
const createUploader = require('../../../utils/multerHelper');
const teacherUpload = createUploader('teachers'); 


const addTeacher = async (req, res) => {
  try {
// console.log("first",req.body);


    const {
      name,
      email,
      password,
      gender,
      mobile,
      dob,
      qualification,
      currentaddress,
      permenantaddress,
      salary,
      joining_date,
      role,
    } = req.body;

     if (
      !name || !email  || !gender || !mobile ||  !password || !joining_date
    ) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Please fill all required fields",
      });
    }
 
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ 
        success:false,
        statusCode:400,
        message: "Email already in use" });
    }

  
    const user = await User.create({
      name,
      email,
      password: password,
      role: 'teacher', 
      status: "active"
    });



    // Create teacher profile
    const teacher = await Teacher.create({
      user_id: user.id,
      gender,
      mobile,
      dob,
      qualification,
      current_address:currentaddress,
      permanent_address:permenantaddress,
      salary,
      joining_date,
      role:role,
      image: req.file ? req.file.filename : null
    });

    res.status(201).json({
      success: true,
      statusCode:201,
      message: "Teacher added successfully",
      data: {
        user,
        teacher,
      },
    });

  } catch (error) {
    console.error("Error adding teacher:", error);
    res.status(500).json({
      
      success: false,
      statusCode:500,
      message: "Internal Server Error" });
  }
};



const updateTeacher = async (req, res) => {
  try {
    const userId = req.params.userId;


    const {
      name,
      email,
      status,
      gender,
      mobile,
      dob,
      qualification,
      currentaddress,
      permenantaddress,
      salary,
      password,
      joining_date,
      role
    } = req.body;

   

    const user = await User.findOne({
      where:{id:userId}
    });

    // console.log("user is",user);
    if (!user) {
      return res.status(404).json({
        success:false,
        statusCode:404,
        message: "User not found" });
    }

    // Update User table
    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.password = password ?? user.password;
    user.status = status ?? user.status;
    await user.save();

    // Find Teacher
    const teacher = await Teacher.findOne({
       where: {
         user_id: userId } });

        //  console.log("teacher is",teacher);

    // Update Teacher table
    teacher.gender = gender ?? teacher.gender;
    teacher.mobile = mobile ?? teacher.mobile;
    teacher.dob = dob ?? teacher.dob;
    teacher.qualification = qualification ?? teacher.qualification;
    teacher.current_address = currentaddress ?? teacher.current_address;
    teacher.permanent_address = permenantaddress ?? teacher.permanent_address;
    teacher.salary = salary ?? teacher.salary;
    teacher.joining_date = joining_date ?? teacher.joining_date;
    teacher.role = role ?? teacher.role;
    // image: req.file ? req.file.filename : null
    // if (image) teacher.image = image;

    await teacher.save();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Teacher updated successfully",
      data: { user, teacher },
    });

  } catch (error) {
    console.error("Update Teacher Error:", error);
    res.status(500).json({
      success:false,
      statusCode:500,
      message: "Internal Server Error" });
  }
};

const softDeleteTeacher = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Check if user exists
    const user = await User.findOne({
      where:{id:userId}
    });
    if (!user) {
      return res.status(404).json({ 
        success:false,
        statusCode:404,
        message: "User not found" });
    }

    // Soft delete: change status to inactive
    user.status = "inactive";
    await user.save();

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Teacher deactivated (soft deleted) successfully",
    });
  } catch (error) {
    console.error("Soft Delete Teacher Error:", error);
    res.status(500).json({
      success:false,
      statusCode:500,
      message: "Internal Server Error" });
  }
};




const getdeleteTeachers = async (req, res) => {
  try {
    const inactiveTeachers = await User.findAll({
      where: {
        role: "teacher",
        status: "inactive",
      },
      include: {
        model: Teacher,
        as: "teacherDetails",
      },
    });

     if (!inactiveTeachers) {
      return res.status(404).json({ 
        success:false,
        statusCode:404,
        message: "no deleted teacher found" });
    }

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Inactive teachers fetched successfully",
      data: inactiveTeachers,
    });

  } catch (error) {
    console.error("Get Inactive Teachers Error:", error);
    res.status(500).json({
      success:false,
      statusCode:500,
      message: "Internal Server Error" });
  }
};

const getAllTeachers = async (req, res) => {
  try {
    const allTeachers = await User.findAll({
      where: {
        role: "teacher",
        status: "active",
      },
      include: {
        model: Teacher,
        as: "teacherDetails",
      },
    });

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Active teachers fetched successfully",
      data: allTeachers,
    });

  } catch (error) {
    console.error("Get Active Teachers Error:", error);
    res.status(500).json({
      success:false,
      statusCode:500,
      message: "Internal Server Error" });
  }
};



const reactivateTeacher = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find user
    const user = await User.findOne({
    where:{id:userId}
    }
      );
    if (!user) {
      return res.status(404).json({ 
        success:false,
        statusCode:404,
        message: "User not found" });
    }

    // Update status to active
    user.status = "active";
    await user.save();

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Teacher reactivated successfully",
    });
  } catch (error) {
    console.error("Reactivate Teacher Error:", error);
    res.status(500).json({
      success:false,
      statusCode:500,
      message: "Internal Server Error" });
  }
};


const getSingleTeacher = async (req, res) => {
  try {
    const userId = req.params.userId;

    const teacher = await User.findOne({
      where: {
        id: userId,
        role: "teacher",
      },
      include: {
        model: Teacher,
        as: "teacherDetails",
      },
    });

    if (!teacher) {
      return res.status(404).json({
        statusCode:404,
        success: false,
        message: "Teacher not found",
      });
    }

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Teacher details fetched successfully",
      data: teacher,
    });
  } catch (error) {
    console.error("Get Single Teacher Error:", error);
    res.status(500).json({ 
      success:false,
      statusCode:500,
      message: "Internal Server Error" });
  }
};


const getTeacherStats = async (req, res) => {
  try {
    
    const [active, maleCount,
      femaleCount] = await Promise.all([
     
      User.count({ where: { role: "teacher", status: "active" } }),
       Teacher.count({
        where: {
          gender: "male",
        },
      }),
      Teacher.count({
        where: {
          gender: "female",
        },
      }),
     
    ]);

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Teacher dashboard stats fetched successfully",
      data: {
        activeTeachers: active,
        maleCount:maleCount,
        femaleCount:femaleCount
      },
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ 
      succes:false,
      statusCode:500,
      message: "Internal Server Error" });
  }
};




module.exports = { addTeacher ,updateTeacher,softDeleteTeacher,getdeleteTeachers,getAllTeachers,reactivateTeacher,getSingleTeacher,getTeacherStats};
