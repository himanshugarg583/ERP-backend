const { Holiday } = require('../../../models');
const { Op } = require('sequelize');

const createHoliday = async (req, res) => {
  try {
    const { holiday_date, reason, description } = req.body;

    if (!holiday_date || !reason) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'holiday_date and reason are required'
      });
    }

    const existingHoliday = await Holiday.findOne({ where: { holiday_date } });
    if (existingHoliday) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Holiday already exists for this date'
      });
    }

    const holiday = await Holiday.create({
      holiday_date,
      reason,
      description: description || null
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Holiday created successfully',
      data: holiday
    });
  } catch (error) {
    console.error('Create Holiday Error:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error'
    });
  }
};

const getAllHolidays = async (req, res) => {
  try {
    const { month, year } = req.query;
    const whereClause = {};

    if (month && year) {
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12 || isNaN(yearNum)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Invalid month or year'
        });
      }

      const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
      const lastDay = new Date(yearNum, monthNum, 0).getDate();
      const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      whereClause.holiday_date = { [Op.between]: [startDate, endDate] };
    }

    const holidays = await Holiday.findAll({
      where: whereClause,
      order: [['holiday_date', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Holidays fetched successfully',
      data: {
        total: holidays.length,
        holidays
      }
    });
  } catch (error) {
    console.error('Get All Holidays Error:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error'
    });
  }
};

const getHolidayByDate = async (req, res) => {
  try {
    const { holiday_date } = req.query;

    if (!holiday_date) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'holiday_date is required'
      });
    }

    const holiday = await Holiday.findOne({ where: { holiday_date } });

    if (!holiday) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'No holiday found for this date'
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Holiday fetched successfully',
      data: holiday
    });
  } catch (error) {
    console.error('Get Holiday By Date Error:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error'
    });
  }
};

const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await Holiday.findByPk(id);
    if (!holiday) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Holiday not found'
      });
    }

    await holiday.destroy();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Holiday deleted successfully'
    });
  } catch (error) {
    console.error('Delete Holiday Error:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error'
    });
  }
};

module.exports = {
  createHoliday,
  getAllHolidays,
  getHolidayByDate,
  deleteHoliday
};
