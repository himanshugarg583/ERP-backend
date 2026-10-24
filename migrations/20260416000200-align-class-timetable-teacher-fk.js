'use strict';

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    try {
      const [teacherColumnRows] = await sequelize.query(`
        SELECT IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'class_timetable_entries'
          AND COLUMN_NAME = 'teacher_id'
        LIMIT 1
      `);

      if (teacherColumnRows.length && teacherColumnRows[0].IS_NULLABLE === 'NO') {
        await sequelize.query('ALTER TABLE class_timetable_entries MODIFY teacher_id INT NULL');
      }

      const [teacherFkRows] = await sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'class_timetable_entries'
          AND COLUMN_NAME = 'teacher_id'
          AND REFERENCED_TABLE_NAME = 'teachers'
      `);

      if (!teacherFkRows.length) {
        await sequelize.query(`
          ALTER TABLE class_timetable_entries
          ADD CONSTRAINT fk_class_timetable_entries_teacher
          FOREIGN KEY (teacher_id)
          REFERENCES teachers(id)
          ON DELETE SET NULL
          ON UPDATE CASCADE
        `);
      }
    } catch (error) {
      console.warn('Skipping class timetable teacher FK alignment:', error.message);
    }
  },

  async down() {
    // No-op: rollback intentionally omitted to avoid re-introducing legacy FK issues.
  },
};
