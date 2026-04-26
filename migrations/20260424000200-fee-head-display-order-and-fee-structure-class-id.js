'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const feeHeads = await queryInterface.describeTable('fee_heads');
    if (!feeHeads.display_order) {
      await queryInterface.addColumn('fee_heads', 'display_order', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }

    const feeStructures = await queryInterface.describeTable('fee_structures');

    if (feeStructures.class_ids) {
      await queryInterface.removeColumn('fee_structures', 'class_ids');
    }

    if (!feeStructures.class_id) {
      await queryInterface.addColumn('fee_structures', 'class_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'class_sections',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    try {
      await queryInterface.addIndex('fee_structures', ['class_id'], {
        name: 'idx_fee_structures_class_id'
      });
    } catch (err) {
      // Index may already exist in some environments.
    }
  },

  async down(queryInterface, Sequelize) {
    let feeStructures = await queryInterface.describeTable('fee_structures');

    try {
      await queryInterface.removeIndex('fee_structures', 'idx_fee_structures_class_id');
    } catch (err) {
      // Ignore if index does not exist.
    }

    if (feeStructures.class_id) {
      await queryInterface.removeColumn('fee_structures', 'class_id');
    }

    feeStructures = await queryInterface.describeTable('fee_structures');
    if (!feeStructures.class_ids) {
      await queryInterface.addColumn('fee_structures', 'class_ids', {
        type: Sequelize.JSON,
        allowNull: true
      });
    }

    const feeHeads = await queryInterface.describeTable('fee_heads');
    if (feeHeads.display_order) {
      await queryInterface.removeColumn('fee_heads', 'display_order');
    }
  }
};
