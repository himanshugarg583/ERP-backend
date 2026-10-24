'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // 1) Drop legacy fee tables to override old fee engine.
    const legacyTables = [
      'fee_payments',
      'fee_installments',
      'student_fees',
      'fee_structure_details',
      'fee_structures',
      'fee_head'
    ];

    for (const table of legacyTables) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.dropTable(table);
      } catch (err) {
        // Ignore if table does not exist.
      }
    }

    // 2) BRD-driven core tables.

    await queryInterface.createTable('academic_years', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      is_current: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    await queryInterface.sequelize.query(`
      ALTER TABLE academic_years
      ADD COLUMN current_flag TINYINT GENERATED ALWAYS AS (CASE WHEN is_current = 1 THEN 1 ELSE NULL END) STORED,
      ADD UNIQUE INDEX uq_academic_year_single_current (current_flag)
    `);

    await queryInterface.createTable('fee_heads', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
      },
      category: {
        type: DataTypes.ENUM('academic', 'facility', 'transport', 'hostel', 'exam', 'other'),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      is_optional: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_refundable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      ledger_code: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.createTable('fee_structures', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false
      },
      academic_year_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'academic_years',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      applicable_to: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      class_ids: {
        type: DataTypes.JSON,
        allowNull: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      structure_type: {
        type: DataTypes.ENUM('recurring', 'one_time'),
        allowNull: false,
        defaultValue: 'recurring'
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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

    await queryInterface.addIndex('fee_structures', ['academic_year_id'], { name: 'idx_fee_structures_academic_year' });
    await queryInterface.addIndex('fee_structures', ['structure_type'], { name: 'idx_fee_structures_type' });

    await queryInterface.createTable('fee_structure_items', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      fee_structure_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'fee_structures',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fee_head_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'fee_heads',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      is_mandatory: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
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

    await queryInterface.addConstraint('fee_structure_items', {
      fields: ['fee_structure_id', 'fee_head_id'],
      type: 'unique',
      name: 'uq_fee_structure_items_structure_head'
    });

    await queryInterface.createTable('installment_plans', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      fee_structure_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'fee_structures',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      installment_number: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      due_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false
      },
      late_fine_type: {
        type: DataTypes.ENUM('per_day', 'flat', 'none'),
        allowNull: false,
        defaultValue: 'none'
      },
      late_fine_value: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0
      },
      max_late_fine: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true
      },
      grace_period_days: {
        type: DataTypes.INTEGER,
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

    await queryInterface.addConstraint('installment_plans', {
      fields: ['fee_structure_id', 'installment_number'],
      type: 'unique',
      name: 'uq_installment_plan_structure_number'
    });

    await queryInterface.createTable('student_fee_assignments', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      fee_structure_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'fee_structures',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      academic_year_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'academic_years',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      assignment_type: {
        type: DataTypes.ENUM('recurring', 'one_time'),
        allowNull: false,
        defaultValue: 'recurring'
      },
      assigned_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      assigned_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      custom_items: {
        type: DataTypes.JSON,
        allowNull: true
      },
      excluded_heads: {
        type: DataTypes.JSON,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('active', 'cancelled', 'transferred', 'archived'),
        allowNull: false,
        defaultValue: 'active'
      },
      cancellation_reason: {
        type: DataTypes.TEXT,
        allowNull: true
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

    await queryInterface.addConstraint('student_fee_assignments', {
      fields: ['student_id', 'academic_year_id', 'fee_structure_id', 'status'],
      type: 'unique',
      name: 'uq_student_assignment_year_structure_status'
    });
    await queryInterface.addIndex('student_fee_assignments', ['fee_structure_id'], { name: 'idx_sfa_structure' });
    await queryInterface.addIndex('student_fee_assignments', ['student_id', 'academic_year_id', 'assignment_type'], { name: 'idx_sfa_student_year_type' });

    await queryInterface.createTable('concessions', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM('percentage', 'flat_amount', 'full_waiver'),
        allowNull: false
      },
      value: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0
      },
      applies_to: {
        type: DataTypes.ENUM('all_heads', 'specific_head', 'total_invoice'),
        allowNull: false
      },
      requires_approval: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      valid_from: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      valid_until: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.createTable('student_concessions', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      concession_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'concessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fee_head_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'fee_heads',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      academic_year_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'academic_years',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      approval_status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true
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

    await queryInterface.addIndex('student_concessions', ['student_id', 'academic_year_id'], { name: 'idx_student_concessions_student_year' });

    await queryInterface.createTable('fee_invoices', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      invoice_number: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true
      },
      student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      assignment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'student_fee_assignments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      installment_plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'installment_plans',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      academic_year_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'academic_years',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      gross_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      concession_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      net_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      fine_amount: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0
      },
      paid_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      balance_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('draft', 'active', 'partial', 'paid', 'overdue', 'waived', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft'
      },
      due_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      generated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      waived_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      waiver_reason: {
        type: DataTypes.TEXT,
        allowNull: true
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

    await queryInterface.addConstraint('fee_invoices', {
      fields: ['student_id', 'installment_plan_id'],
      type: 'unique',
      name: 'uq_invoice_student_installment'
    });

    await queryInterface.createTable('fee_invoice_items', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'fee_invoices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fee_head_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'fee_heads',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      gross_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      concession_amount: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0
      },
      net_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
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

    await queryInterface.createTable('fee_payments', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      receipt_number: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true
      },
      invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'fee_invoices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      amount_paid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      fine_paid: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0
      },
      payment_mode: {
        type: DataTypes.ENUM('cash', 'upi', 'card', 'netbanking', 'cheque', 'dd', 'neft', 'online'),
        allowNull: false
      },
      transaction_ref: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      payment_gateway: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      gateway_payment_id: {
        type: DataTypes.STRING(150),
        allowNull: true,
        unique: true
      },
      collected_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      cheque_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      cheque_bank: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      cheque_status: {
        type: DataTypes.ENUM('pending', 'cleared', 'bounced'),
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      is_cancelled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      cancelled_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      cancellation_reason: {
        type: DataTypes.TEXT,
        allowNull: true
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

    await queryInterface.addIndex('fee_payments', ['student_id', 'paid_at'], { name: 'idx_fee_payments_student_paid_at' });

    await queryInterface.createTable('payment_refunds', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      payment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'fee_payments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      refund_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      refund_mode: {
        type: DataTypes.ENUM('cash', 'bank_transfer', 'gateway_reversal'),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'processed', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      requested_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      processed_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      gateway_refund_id: {
        type: DataTypes.STRING(150),
        allowNull: true
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

    await queryInterface.createTable('fee_reminders', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'fee_invoices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      recipient_number: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      channel: {
        type: DataTypes.ENUM('sms', 'whatsapp', 'email', 'app_push'),
        allowNull: false,
        defaultValue: 'email'
      },
      reminder_type: {
        type: DataTypes.ENUM('due_soon', 'overdue', 'receipt', 'bounce_alert', 'concession_status'),
        allowNull: false
      },
      message_template: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      sent_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      status: {
        type: DataTypes.ENUM('sent', 'delivered', 'failed', 'bounced'),
        allowNull: false,
        defaultValue: 'sent'
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true
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

    // Supporting tables for reliable online flow and overpayment handling.
    await queryInterface.createTable('fee_gateway_orders', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'fee_invoices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
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

    await queryInterface.addIndex('fee_webhook_events', ['gateway', 'event_id'], { name: 'idx_fee_webhooks_gateway_event' });

    await queryInterface.createTable('student_wallet', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'students',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
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

    await queryInterface.createTable('fee_number_sequences', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      key_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      last_value: {
        type: DataTypes.BIGINT,
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

    await queryInterface.bulkInsert('fee_number_sequences', [
      {
        key_name: 'invoice',
        last_value: 0,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        key_name: 'receipt',
        last_value: 0,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

  },

  async down(queryInterface) {
    const v1Tables = [
      'fee_number_sequences',
      'school_fee_settings',
      'student_wallet',
      'fee_webhook_events',
      'fee_gateway_orders',
      'fee_reminders',
      'payment_refunds',
      'fee_payments',
      'fee_invoice_items',
      'fee_invoices',
      'student_concessions',
      'concessions',
      'student_fee_assignments',
      'installment_plans',
      'fee_structure_items',
      'fee_structures',
      'fee_heads',
      'academic_years'
    ];

    for (const table of v1Tables) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.dropTable(table);
      } catch (err) {
        // ignore
      }
    }
  }
};


