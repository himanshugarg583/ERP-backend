'use strict';

module.exports = {
  async up(queryInterface) {
    const dropIfExists = async (tableName) => {
      try {
        await queryInterface.dropTable(tableName);
      } catch (err) {
        // ignore if table does not exist
      }
    };

    // Remove legacy pre-v1 fee tables if still present.
    const legacyTables = [
      'fee_installments',
      'student_fees',
      'fee_structure_details',
      'fee_structures_old',
      'fee_head',
      'fees',
      'student_fee',
      'fee_payment'
    ];

    for (const tableName of legacyTables) {
      // eslint-disable-next-line no-await-in-loop
      await dropIfExists(tableName);
    }

    // Keep only 14 core fees_v1 tables; drop non-core helper tables.
    const nonCoreV1Tables = [
      'fee_gateway_orders',
      'fee_webhook_events',
      'student_wallet',
      'school_fee_settings'
    ];

    for (const tableName of nonCoreV1Tables) {
      // eslint-disable-next-line no-await-in-loop
      await dropIfExists(tableName);
    }
  },

  async down(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // Recreate non-core helper tables if rollback is needed.
    await queryInterface.createTable('fee_gateway_orders', {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('(UUID())')
      },
      invoice_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      student_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      gateway: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'razorpay'
      },
      gateway_order_id: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('active', 'paid', 'expired', 'failed'),
        allowNull: false,
        defaultValue: 'active'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.createTable('fee_webhook_events', {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('(UUID())')
      },
      gateway: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      event_id: {
        type: DataTypes.STRING(150),
        allowNull: true
      },
      event_type: {
        type: DataTypes.STRING(120),
        allowNull: true
      },
      payload: {
        type: DataTypes.JSON,
        allowNull: false
      },
      signature: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('processed', 'ignored', 'rejected', 'failed'),
        allowNull: false,
        defaultValue: 'processed'
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      received_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.createTable('student_wallet', {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('(UUID())')
      },
      student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
      },
      balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.createTable('school_fee_settings', {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('(UUID())')
      },
      block_report_card_on_dues: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      fine_first: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      due_date_shift: {
        type: DataTypes.ENUM('next_working_day', 'no_shift', 'prev_working_day'),
        allowNull: false,
        defaultValue: 'no_shift'
      },
      dnd_start_time: {
        type: DataTypes.STRING(5),
        allowNull: false,
        defaultValue: '21:00'
      },
      dnd_end_time: {
        type: DataTypes.STRING(5),
        allowNull: false,
        defaultValue: '08:00'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  }
};
