'use strict';

const withIgnore = async (fn) => {
  try {
    await fn();
  } catch (_) {
    // Ignore missing index/constraint/column errors to keep migration idempotent.
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const assignmentTable = await queryInterface.describeTable('student_fee_assignments');
    const invoiceTable = await queryInterface.describeTable('fee_invoices');

    if (assignmentTable.academic_year_id) {
      await withIgnore(() => queryInterface.removeConstraint('student_fee_assignments', 'uq_student_assignment_year_structure_status'));
      await withIgnore(() => queryInterface.removeIndex('student_fee_assignments', 'idx_sfa_student_year_type'));

      await withIgnore(() => queryInterface.removeColumn('student_fee_assignments', 'academic_year_id'));
    }

    if (invoiceTable.academic_year_id) {
      await withIgnore(() => queryInterface.removeColumn('fee_invoices', 'academic_year_id'));
    }
  },

  async down(queryInterface, Sequelize) {
    const assignmentTable = await queryInterface.describeTable('student_fee_assignments');
    const invoiceTable = await queryInterface.describeTable('fee_invoices');

    if (!assignmentTable.academic_year_id) {
      await withIgnore(() => queryInterface.addColumn('student_fee_assignments', 'academic_year_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'academic_years',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      }));

      await withIgnore(() => queryInterface.addConstraint('student_fee_assignments', {
        fields: ['student_id', 'academic_year_id', 'fee_structure_id', 'status'],
        type: 'unique',
        name: 'uq_student_assignment_year_structure_status'
      }));

      await withIgnore(() => queryInterface.addIndex('student_fee_assignments', ['student_id', 'academic_year_id', 'assignment_type'], {
        name: 'idx_sfa_student_year_type'
      }));
    }

    if (!invoiceTable.academic_year_id) {
      await withIgnore(() => queryInterface.addColumn('fee_invoices', 'academic_year_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'academic_years',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      }));
    }
  }
};