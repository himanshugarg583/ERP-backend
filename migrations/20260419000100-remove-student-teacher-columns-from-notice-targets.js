'use strict';

module.exports = {
  async up(queryInterface) {
    const tableName = 'notice_targets';
    const tableDefinition = await queryInterface.describeTable(tableName);

    const removeForeignKeysForColumn = async (columnName) => {
      const [rows] = await queryInterface.sequelize.query(
        `
          SELECT CONSTRAINT_NAME
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = :tableName
            AND COLUMN_NAME = :columnName
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `,
        {
          replacements: { tableName, columnName }
        }
      );

      for (const row of rows) {
        await queryInterface.removeConstraint(tableName, row.CONSTRAINT_NAME);
      }
    };

    if (tableDefinition.student_id) {
      await removeForeignKeysForColumn('student_id');
      await queryInterface.removeColumn(tableName, 'student_id');
    }

    if (tableDefinition.teacher_id) {
      await removeForeignKeysForColumn('teacher_id');
      await queryInterface.removeColumn(tableName, 'teacher_id');
    }
  },

  async down(queryInterface, Sequelize) {
    const tableName = 'notice_targets';
    const tableDefinition = await queryInterface.describeTable(tableName);

    if (!tableDefinition.student_id) {
      await queryInterface.addColumn(tableName, 'student_id', {
        type: Sequelize.INTEGER(11),
        allowNull: true,
        references: {
          model: 'students',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }

    if (!tableDefinition.teacher_id) {
      await queryInterface.addColumn(tableName, 'teacher_id', {
        type: Sequelize.INTEGER(11),
        allowNull: true,
        references: {
          model: 'teachers',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }
  }
};
