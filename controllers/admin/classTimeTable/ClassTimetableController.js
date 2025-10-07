const { sequelize } = require('../../config/db');

const saveWholeWeekTimetable = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { timetable } = req.body;
        // timetable = [ { class_section_id, subject_id, teacher_id, day_of_week, period_name, start_time, end_time, is_break }, ... ]

        // 1️⃣ Clash re-check before saving
        for (let entry of timetable) {
            if (!entry.is_break && entry.teacher_id) {
                const conflict = await ClassTimetable.count({
                    where: {
                        teacher_id: entry.teacher_id,
                        day_of_week: entry.day_of_week,
                        [Op.and]: [
                            { start_time: { [Op.lt]: entry.end_time } },
                            { end_time: { [Op.gt]: entry.start_time } }
                        ]
                    },
                    transaction: t
                });
                if (conflict > 0) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Teacher clash in ${entry.day_of_week} ${entry.period_name}`
                    });
                }
            }
        }

        // 2️⃣ Clear old timetable for that class_section & insert new
        if (timetable.length > 0) {
            await ClassTimetable.destroy({
                where: { class_section_id: timetable[0].class_section_id },
                transaction: t
            });

            await ClassTimetable.bulkCreate(timetable, { transaction: t });
        }

        await t.commit();
        return res.json({ success: true, message: "Timetable saved successfully" });

    } catch (error) {
        await t.rollback();
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { checkTeacherClash, saveWholeWeekTimetable };
