const { User, Staff } = require('../../../models');

const STAFF_ROLES = [
  'staff',
  'accountant',
  'hr',
  'librarian',
  'admission_officer',
  'transport_manager',
  'hostel_warden'
];

const addStaff = async (req, res) => {
  try {
    const normalizedMobile = req.body.mobile ?? req.body.mobile_no ?? req.body.phone ?? req.body.phoneNumber;

    const {
      name,
      email,
      password,
      gender,
      dob,
      qualification,
      currentaddress,
      permenantaddress,
      salary,
      joining_date,
      employee_code,
      role,
      designation
    } = req.body;

    const staffRole = role ?? req.body.department;

    if (!name || !email || !password || !staffRole || !joining_date) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Please fill all required fields'
      });
    }

    if (!STAFF_ROLES.includes(staffRole)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Invalid staff role'
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Email already in use'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: staffRole,
      status: 'active'
    });

    const staff = await Staff.create({
      user_id: user.id,
      employee_code,
      role: staffRole,
      designation,
      gender,
      dob,
      mobile_no: normalizedMobile,
      qualification,
      current_address: currentaddress,
      permanent_address: permenantaddress,
      salary,
      joining_date,
      image: req.file ? req.file.filename : null
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Staff added successfully',
      data: { user, staff }
    });
  } catch (error) {
    console.error('Error adding staff:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error'
    });
  }
};

const getAllStaff = async (req, res) => {
  try {
    const allStaff = await User.findAll({
      where: {
        role: STAFF_ROLES,
        status: 'active'
      },
      include: {
        model: Staff,
        as: 'staffDetails'
      }
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const staffWithImage = allStaff.map((member) => {
      const json = member.toJSON();
      const imageName = json.staffDetails?.image;
      if (imageName) {
        json.staffDetails.image = `${baseUrl}/uploads/staff/${imageName}`;
      }
      return json;
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Active staff fetched successfully',
      data: staffWithImage
    });
  } catch (error) {
    console.error('Get Active Staff Error:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error'
    });
  }
};

module.exports = {
  addStaff,
  getAllStaff
};
