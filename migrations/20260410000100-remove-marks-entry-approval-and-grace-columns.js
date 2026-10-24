'use strict';

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  const normalized = tables
    .map((table) => (typeof table === 'string' ? table : table.tableName || table.table_name))
    .filter(Boolean)
    .map((name) => String(name).toLowerCase());

  return normalized.includes(String(tableName).toLowerCase());
};

module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, 'marks_entries'))) {
      return;
    }

    const columns = await queryInterface.describeTable('marks_entries');

    try {
      await queryInterface.removeIndex('marks_entries', 'idx_marks_entry_paper_status');
    } catch (error) {
      // Ignore when index does not exist.
    }

    if (columns.status) {
      await queryInterface.removeColumn('marks_entries', 'status');
    }
    if (columns.approved_by) {
      await queryInterface.removeColumn('marks_entries', 'approved_by');
    }
    if (columns.approved_at) {
      await queryInterface.removeColumn('marks_entries', 'approved_at');
    }
    if (columns.grace_marks) {
      await queryInterface.removeColumn('marks_entries', 'grace_marks');
    }

    try {
      await queryInterface.addIndex('marks_entries', ['exam_paper_id'], {
        name: 'idx_marks_entry_paper'
      });
    } catch (error) {
      // Ignore when index already exists.
    }
  },

  async down(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'marks_entries'))) {
      return;
    }

    const columns = await queryInterface.describeTable('marks_entries');

    if (!columns.status) {
      await queryInterface.addColumn('marks_entries', 'status', {
        type: Sequelize.ENUM('draft', 'submitted', 'approved', 'locked'),
        allowNull: false,
        defaultValue: 'draft'
      });
    }

    if (!columns.approved_by) {
      await queryInterface.addColumn('marks_entries', 'approved_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    if (!columns.approved_at) {
      await queryInterface.addColumn('marks_entries', 'approved_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    if (!columns.grace_marks) {
      await queryInterface.addColumn('marks_entries', 'grace_marks', {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0
      });
    }

    try {
      await queryInterface.removeIndex('marks_entries', 'idx_marks_entry_paper');
    } catch (error) {
      // Ignore when index does not exist.
    }

    try {
      await queryInterface.addIndex('marks_entries', ['exam_paper_id', 'status'], {
        name: 'idx_marks_entry_paper_status'
      });
    } catch (error) {
      // Ignore when index already exists.
    }
  }
};
