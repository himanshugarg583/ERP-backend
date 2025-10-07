// controllers/admin/ClassTimetableController.js
const { Op } = require('sequelize');
const { ClassTimetable } = require('../../models/admin/ClassTimetable');

const checkTeacherClash = async (req, res) => {
    try {
        const { teacher_id, day_of_week, start_time, end_time } = req.body;

        if (!teacher_id) {
            return res.json({ clash: false }); // No teacher means no clash
        }

        const conflict = await ClassTimetable.count({
            where: {
                teacher_id,
                day_of_week,
                [Op.and]: [
                    { start_time: { [Op.lt]: end_time } },
                    { end_time: { [Op.gt]: start_time } }
                ]
            }
        });

        if (conflict > 0) {
            return res.json({ clash: true, message: 'Teacher already assigned in this time slot' });
        }

        return res.json({ clash: false });

    } catch (error) {
        return res.status(500).json({ clash: true, message: error.message });
    }
};

module.exports = { checkTeacherClash };
