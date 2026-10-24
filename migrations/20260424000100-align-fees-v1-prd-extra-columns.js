'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    const addColumnIfMissing = async (tableName, columnName, definition) => {
      const table = await queryInterface.describeTable(tableName);
      if (!table[columnName]) {
        await queryInterface.addColumn(tableName, columnName, definition);
      }
    };

    const dropColumnIfExists = async (tableName, columnName) => {
      const table = await queryInterface.describeTable(tableName);
      if (table[columnName]) {
        await queryInterface.removeColumn(tableName, columnName);
      }
    };

    const feeTables = [
      'academic_years',
      'fee_heads',
      'fee_structures',
      'fee_structure_items',
      'installment_plans',
      'student_fee_assignments',
      'concessions',
      'student_concessions',
      'fee_invoices',
      'fee_invoice_items',
      'fee_payments',
      'payment_refunds',
      'fee_reminders',
      'fee_gateway_orders',
      'fee_webhook_events',
      'student_wallet',
      'school_fee_settings',
      'fee_number_sequences'
    ];

    // Ensure fees_v1 schema is free from old school-scoped columns.
    for (const tableName of feeTables) {
      // eslint-disable-next-line no-await-in-loop
      await dropColumnIfExists(tableName, 'school_id');
      // eslint-disable-next-line no-await-in-loop
      await dropColumnIfExists(tableName, 'schoolId');
    }

    // installment_plans additions.
    await addColumnIfMissing('installment_plans', 'start_date', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });

    await addColumnIfMissing('installment_plans', 'sequence_no', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    });

    await addColumnIfMissing('installment_plans', 'allow_partial_payment', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await addColumnIfMissing('installment_plans', 'fixed_amount', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    });

    await queryInterface.sequelize.query(`
      UPDATE installment_plans
      SET sequence_no = installment_number
      WHERE sequence_no IS NULL OR sequence_no = 1
    `);

    await queryInterface.sequelize.query(`
      UPDATE installment_plans
      SET start_date = due_date
      WHERE start_date IS NULL
    `);

    // student_fee_assignments additions.
    await addColumnIfMissing('student_fee_assignments', 'effective_from', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });

    await addColumnIfMissing('student_fee_assignments', 'effective_to', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });

    await addColumnIfMissing('student_fee_assignments', 'override_json', {
      type: DataTypes.JSON,
      allowNull: true
    });

    await queryInterface.sequelize.query(`
      UPDATE student_fee_assignments
      SET effective_from = DATE(assigned_at)
      WHERE effective_from IS NULL
    `);

    // fee_invoices additions.
    await addColumnIfMissing('fee_invoices', 'invoice_no', {
      type: DataTypes.STRING(30),
      allowNull: true
    });

    await addColumnIfMissing('fee_invoices', 'start_date', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });

    await addColumnIfMissing('fee_invoices', 'source_type', {
      type: DataTypes.ENUM('system', 'manual', 'import', 'online'),
      allowNull: false,
      defaultValue: 'system'
    });

    await queryInterface.sequelize.query(`
      UPDATE fee_invoices
      SET invoice_no = invoice_number
      WHERE invoice_no IS NULL
    `);

    await queryInterface.sequelize.query(`
      UPDATE fee_invoices
      SET start_date = due_date
      WHERE start_date IS NULL
    `);

    await queryInterface.changeColumn('fee_invoices', 'invoice_no', {
      type: DataTypes.STRING(30),
      allowNull: false
    });

    const invoiceIndexes = await queryInterface.showIndex('fee_invoices');
    const hasInvoiceNoIndex = invoiceIndexes.some((idx) => idx.name === 'uq_fee_invoices_invoice_no');
    if (!hasInvoiceNoIndex) {
      await queryInterface.addIndex('fee_invoices', ['invoice_no'], {
        unique: true,
        name: 'uq_fee_invoices_invoice_no'
      });
    }

    // fee_payments additions.
    await addColumnIfMissing('fee_payments', 'receipt_no', {
      type: DataTypes.STRING(30),
      allowNull: true
    });

    await addColumnIfMissing('fee_payments', 'status', {
      type: DataTypes.ENUM('pending', 'success', 'failed', 'reversed', 'cancelled'),
      allowNull: false,
      defaultValue: 'success'
    });

    await addColumnIfMissing('fee_payments', 'is_partial', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.sequelize.query(`
      UPDATE fee_payments
      SET receipt_no = receipt_number
      WHERE receipt_no IS NULL
    `);

    await queryInterface.sequelize.query(`
      UPDATE fee_payments
      SET status = CASE
        WHEN is_cancelled = 1 THEN 'cancelled'
        ELSE 'success'
      END
      WHERE status IS NULL OR status = 'success'
    `);

    await queryInterface.changeColumn('fee_payments', 'receipt_no', {
      type: DataTypes.STRING(30),
      allowNull: false
    });

    const paymentIndexes = await queryInterface.showIndex('fee_payments');
    const hasReceiptNoIndex = paymentIndexes.some((idx) => idx.name === 'uq_fee_payments_receipt_no');
    if (!hasReceiptNoIndex) {
      await queryInterface.addIndex('fee_payments', ['receipt_no'], {
        unique: true,
        name: 'uq_fee_payments_receipt_no'
      });
    }
  },

  async down(queryInterface) {
    const safeRemoveIndex = async (tableName, indexName) => {
      try {
        await queryInterface.removeIndex(tableName, indexName);
      } catch (err) {
        // ignore
      }
    };

    const safeRemoveColumn = async (tableName, columnName) => {
      try {
        await queryInterface.removeColumn(tableName, columnName);
      } catch (err) {
        // ignore
      }
    };

    await safeRemoveIndex('fee_payments', 'uq_fee_payments_receipt_no');
    await safeRemoveIndex('fee_invoices', 'uq_fee_invoices_invoice_no');

    await safeRemoveColumn('fee_payments', 'is_partial');
    await safeRemoveColumn('fee_payments', 'status');
    await safeRemoveColumn('fee_payments', 'receipt_no');

    await safeRemoveColumn('fee_invoices', 'source_type');
    await safeRemoveColumn('fee_invoices', 'start_date');
    await safeRemoveColumn('fee_invoices', 'invoice_no');

    await safeRemoveColumn('student_fee_assignments', 'override_json');
    await safeRemoveColumn('student_fee_assignments', 'effective_to');
    await safeRemoveColumn('student_fee_assignments', 'effective_from');

    await safeRemoveColumn('installment_plans', 'fixed_amount');
    await safeRemoveColumn('installment_plans', 'allow_partial_payment');
    await safeRemoveColumn('installment_plans', 'sequence_no');
    await safeRemoveColumn('installment_plans', 'start_date');
  }
};
