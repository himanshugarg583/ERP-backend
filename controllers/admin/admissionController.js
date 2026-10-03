const {AdmissionEnquiry} = require('../../models/admin/admissionenquiries');

// Create new admission enquiry
const createEnquiry = async (req, res) => {
  try {
  const {
    name,
    phone,
    email,
    className,
    address,
    parentName,
    oldSchool,
    description,
    status,
    date,
    source
  } = req.body;

    const enquiry = await AdmissionEnquiry.create({
      name,
      phone,
      email,
      className,
      address,
      parentName,
      oldSchool,
      source,
      description,
      status, 
      enquiry_date: date,
      source
    });

    res.status(201).json({
      success: true,
      statusCode:201,
      message: 'Admission enquiry submitted successfully.',
      data: enquiry,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
        success: false, 
        statusCode:500,
        message: 'Internal Server Error' });
  }
};

const updateEnquiry = async (req, res) => {
  try {
    const enquiryId = req.params.enquiryId;
    const {
      name,
      phone,
      email,
      className,
      address,
      parentName,
      oldSchool,
      source,
      description,
      status,
      date,
      source
    } = req.body;

    // Find existing enquiry
   
    const enquiry = await AdmissionEnquiry.findOne(
      {
        where: {id:enquiryId}
      }
      );
    if (!enquiry) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Enquiry not found",
      });
    }

    // Update only if fields are provided (optional chaining)
    enquiry.name = name ?? enquiry.name;
    enquiry.phone = phone ?? enquiry.phone;
    enquiry.email = email ?? enquiry.email;
    enquiry.className = className ?? enquiry.className;
    enquiry.address = address ?? enquiry.address;
    enquiry.parentName = parentName ?? enquiry.parentName;
    enquiry.oldSchool = oldSchool ?? enquiry.oldSchool;
    enquiry.source = source ?? enquiry.source;
    enquiry.description = description ?? enquiry.description;
    enquiry.status = status ?? enquiry.status;
    enquiry.enquiry_date = date ?? enquiry.enquiry_date;
    enquiry.source = source ?? enquiry.source;

    await enquiry.save();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Admission enquiry updated successfully.",
      data: enquiry,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      statusCode: 500,
      message: "Internal Server Error" 
    });
  }
};


const getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await AdmissionEnquiry.findAll({
      order: [['createdAt', 'DESC']] 
    });

    res.status(200).json({
      success: true,
      statusCode:200,
      message: 'Admission enquiries fetched successfully.',
      data: enquiries
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      statusCode:500,
      message: 'Internal Server Error'
    });
  }
};

// Get enquiry by ID
const getEnquiryById = async (req, res) => {
  try {
    const { id } = req.params;

    const enquiry = await AdmissionEnquiry.findOne({
      where:{id:id}
    });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        statusCode:404,
        message: 'Admission enquiry not found'
      });
    }

    res.status(200).json({
      success: true,
      statusCode:200,
      message: 'Enquiry fetched successfully',
      data: enquiry
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      statusCode:500,
      message: 'Internal Server Error'
    });
  }
};

// Delete admission enquiry by ID
const deleteEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const enquiry = await AdmissionEnquiry.findOne({
      where:{id:id}
    });


    if (!enquiry) {
      return res.status(404).json({
        success: false,
        statusCode:404,
        message: 'Admission enquiry not found'
      });
    }

    await enquiry.destroy();

    res.status(200).json({
      success: true,
      statusCode:200,
      message: 'Admission enquiry deleted successfully'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      statusCode:500,
      message: 'Internal Server Error'
    });
  }
};

const getEnquiryCount = async (req, res) => {
  try {
    // Total Enquiries
    const total = await AdmissionEnquiry.count();

    // Active Enquiries
    const active = await AdmissionEnquiry.count({
      where: { status: 'active' },
    });

    // Inactive Enquiries
    const inactive = await AdmissionEnquiry.count({
      where: { status: 'inactive' },
    });
     const admitted = await AdmissionEnquiry.count({
      where: { status: 'admitted' },
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Enquiry stats fetched successfully.',
      data: {
        totalEnquiries: total,
        activeEnquiries: active,
        inactiveEnquiries: inactive,
        admittedEnquiries: admitted,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};


module.exports ={createEnquiry,updateEnquiry,getAllEnquiries,getEnquiryById,deleteEnquiry,getEnquiryCount};