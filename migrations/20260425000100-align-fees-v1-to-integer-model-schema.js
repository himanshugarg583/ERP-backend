'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    const sequelize = queryInterface.sequelize;

    const coreTables = [
      'academic_years',
      'fee_heads',
      'fee_structures',
      'fee_structure_items',
      'installment_plans',
      'student_fee_assignments',
      'student_concessions',
      'fee_invoices',
      'fee_invoice_items',
      'fee_payments',
      'payment_refunds',
      'fee_reminders',
      'income_entries',
      'expense_entries'
    ];

    const quoteId = (value) => `\`${String(value).replace(/`/g, '``')}\``;

    const tableExists = async (tableName) => {
      const [rows] = await sequelize.query(
        `SELECT 1 AS ok
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tableName
         LIMIT 1`,
        { replacements: { tableName } }
      );
      return rows.length > 0;
    };

    const columnInfo = async (tableName, columnName) => {
      const [rows] = await sequelize.query(
        `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :tableName
           AND COLUMN_NAME = :columnName
         LIMIT 1`,
        { replacements: { tableName, columnName } }
      );
      return rows[0] || null;
    };

    const columnExists = async (tableName, columnName) => {
      const info = await columnInfo(tableName, columnName);
      return Boolean(info);
    };

    const isIntType = (columnType) => /^(tinyint|smallint|mediumint|int|bigint)\b/i.test(columnType || '');

    const indexExists = async (tableName, indexName) => {
      const [rows] = await sequelize.query(
        `SELECT 1 AS ok
         FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :tableName
           AND INDEX_NAME = :indexName
         LIMIT 1`,
        { replacements: { tableName, indexName } }
      );
      return rows.length > 0;
    };

    const dropIndexIfExists = async (tableName, indexName) => {
      if (!(await tableExists(tableName))) return;
      if (!(await indexExists(tableName, indexName))) return;
      await sequelize.query(`ALTER TABLE ${quoteId(tableName)} DROP INDEX ${quoteId(indexName)}`);
    };

    const dropNonPrimaryIndexesForColumn = async (tableName, columnName) => {
      if (!(await tableExists(tableName)) || !(await columnExists(tableName, columnName))) return;

      const [rows] = await sequelize.query(
        `SELECT DISTINCT INDEX_NAME
         FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :tableName
           AND COLUMN_NAME = :columnName
           AND INDEX_NAME <> 'PRIMARY'`,
        { replacements: { tableName, columnName } }
      );

      for (const row of rows) {
        // eslint-disable-next-line no-await-in-loop
        await dropIndexIfExists(tableName, row.INDEX_NAME);
      }
    };

    const dropAllForeignKeysOnTable = async (tableName) => {
      if (!(await tableExists(tableName))) return;

      const [rows] = await sequelize.query(
        `SELECT DISTINCT CONSTRAINT_NAME
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :tableName
           AND REFERENCED_TABLE_NAME IS NOT NULL`,
        { replacements: { tableName } }
      );

      for (const row of rows) {
        try {
          await queryInterface.removeConstraint(tableName, row.CONSTRAINT_NAME);
        } catch (err) {
          // Ignore already removed constraints.
        }
      }
    };

    const dropAllForeignKeysReferencingTable = async (referencedTableName) => {
      const [rows] = await sequelize.query(
        `SELECT DISTINCT TABLE_NAME, CONSTRAINT_NAME
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE()
           AND REFERENCED_TABLE_NAME = :referencedTableName`,
        { replacements: { referencedTableName } }
      );

      for (const row of rows) {
        try {
          await queryInterface.removeConstraint(row.TABLE_NAME, row.CONSTRAINT_NAME);
        } catch (err) {
          // Ignore already removed constraints.
        }
      }
    };

    const addTempAutoIdIfNeeded = async (tableName) => {
      if (!(await tableExists(tableName))) return;

      const idCol = await columnInfo(tableName, 'id');
      if (!idCol || isIntType(idCol.COLUMN_TYPE)) return;

      if (!(await columnExists(tableName, '__new_id'))) {
        await sequelize.query(
          `ALTER TABLE ${quoteId(tableName)}
           ADD COLUMN ${quoteId('__new_id')} INT NOT NULL AUTO_INCREMENT,
           ADD UNIQUE INDEX ${quoteId('uq__new_id')} (${quoteId('__new_id')})`
        );
      }
    };

    const convertUuidFkToInt = async ({ sourceTable, sourceColumn, targetTable, allowNull }) => {
      if (!(await tableExists(sourceTable)) || !(await tableExists(targetTable))) return;
      if (!(await columnExists(sourceTable, sourceColumn))) return;

      const sourceColInfo = await columnInfo(sourceTable, sourceColumn);
      if (sourceColInfo && isIntType(sourceColInfo.COLUMN_TYPE)) return;

      const tempColumn = `__new_${sourceColumn}`;
      if (!(await columnExists(sourceTable, tempColumn))) {
        await sequelize.query(
          `ALTER TABLE ${quoteId(sourceTable)}
           ADD COLUMN ${quoteId(tempColumn)} INT NULL`
        );
      }

      const targetJoinColumn = (await columnExists(targetTable, '__new_id')) ? '__new_id' : 'id';

      await sequelize.query(
        `UPDATE ${quoteId(sourceTable)} s
         LEFT JOIN ${quoteId(targetTable)} t ON s.${quoteId(sourceColumn)} = t.${quoteId('id')}
         SET s.${quoteId(tempColumn)} = t.${quoteId(targetJoinColumn)}`
      );

      if (!allowNull) {
        const [missingRows] = await sequelize.query(
          `SELECT COUNT(*) AS missing_count
           FROM ${quoteId(sourceTable)}
           WHERE ${quoteId(sourceColumn)} IS NOT NULL
             AND ${quoteId(tempColumn)} IS NULL`
        );

        if (Number(missingRows[0]?.missing_count || 0) > 0) {
          throw new Error(
            `Cannot convert ${sourceTable}.${sourceColumn} because some UUID values do not map to ${targetTable}.id`
          );
        }
      }

      await dropNonPrimaryIndexesForColumn(sourceTable, sourceColumn);

      await sequelize.query(
        `ALTER TABLE ${quoteId(sourceTable)} DROP COLUMN ${quoteId(sourceColumn)}`
      );

      const nullSql = allowNull ? 'NULL' : 'NOT NULL';
      await sequelize.query(
        `ALTER TABLE ${quoteId(sourceTable)}
         CHANGE COLUMN ${quoteId(tempColumn)} ${quoteId(sourceColumn)} INT ${nullSql}`
      );
    };

    const dropColumnIfExists = async (tableName, columnName) => {
      if (!(await tableExists(tableName))) return;
      if (!(await columnExists(tableName, columnName))) return;
      await sequelize.query(`ALTER TABLE ${quoteId(tableName)} DROP COLUMN ${quoteId(columnName)}`);
    };

    const finalizePrimaryKeyToInt = async (tableName) => {
      if (!(await tableExists(tableName))) return;
      if (!(await columnExists(tableName, '__new_id'))) return;

      await dropAllForeignKeysReferencingTable(tableName);

      await sequelize.query(`ALTER TABLE ${quoteId(tableName)} DROP PRIMARY KEY`);
      await sequelize.query(`ALTER TABLE ${quoteId(tableName)} DROP COLUMN ${quoteId('id')}`);
      await sequelize.query(
        `ALTER TABLE ${quoteId(tableName)}
         CHANGE COLUMN ${quoteId('__new_id')} ${quoteId('id')} INT NOT NULL`
      );

      await dropIndexIfExists(tableName, 'uq__new_id');

      await sequelize.query(`ALTER TABLE ${quoteId(tableName)} ADD PRIMARY KEY (${quoteId('id')})`);
      await sequelize.query(
        `ALTER TABLE ${quoteId(tableName)}
         MODIFY COLUMN ${quoteId('id')} INT NOT NULL AUTO_INCREMENT`
      );
    };

    const addForeignKey = async ({
      tableName,
      columnName,
      referencedTableName,
      referencedColumnName,
      onUpdate,
      onDelete,
      constraintName
    }) => {
      if (!(await tableExists(tableName)) || !(await tableExists(referencedTableName))) return;
      if (!(await columnExists(tableName, columnName))) return;
      if (!(await columnExists(referencedTableName, referencedColumnName))) return;

      const [rows] = await sequelize.query(
        `SELECT 1 AS ok
         FROM information_schema.TABLE_CONSTRAINTS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :tableName
           AND CONSTRAINT_NAME = :constraintName
           AND CONSTRAINT_TYPE = 'FOREIGN KEY'
         LIMIT 1`,
        { replacements: { tableName, constraintName } }
      );

      if (rows.length > 0) return;

      await queryInterface.addConstraint(tableName, {
        fields: [columnName],
        type: 'foreign key',
        name: constraintName,
        references: {
          table: referencedTableName,
          field: referencedColumnName
        },
        onUpdate,
        onDelete
      });
    };

    // 1) Drop existing fee foreign keys first to safely reshape columns.
    for (const table of coreTables) {
      // eslint-disable-next-line no-await-in-loop
      await dropAllForeignKeysOnTable(table);
    }
    for (const table of coreTables) {
      // eslint-disable-next-line no-await-in-loop
      await dropAllForeignKeysReferencingTable(table);
    }

    // 2) Add temporary numeric IDs for UUID-based primary keys.
    for (const table of [
      'academic_years',
      'fee_heads',
      'fee_structures',
      'fee_structure_items',
      'installment_plans',
      'student_fee_assignments',
      'student_concessions',
      'fee_invoices',
      'fee_invoice_items',
      'fee_payments',
      'payment_refunds',
      'fee_reminders'
    ]) {
      // eslint-disable-next-line no-await-in-loop
      await addTempAutoIdIfNeeded(table);
    }

    // 3) Convert UUID foreign-key columns to INT using temporary id mappings.
    const fkConversions = [
      { sourceTable: 'fee_structures', sourceColumn: 'academic_year_id', targetTable: 'academic_years', allowNull: false },
      { sourceTable: 'fee_structure_items', sourceColumn: 'fee_structure_id', targetTable: 'fee_structures', allowNull: false },
      { sourceTable: 'fee_structure_items', sourceColumn: 'fee_head_id', targetTable: 'fee_heads', allowNull: false },
      { sourceTable: 'installment_plans', sourceColumn: 'fee_structure_id', targetTable: 'fee_structures', allowNull: false },
      { sourceTable: 'student_fee_assignments', sourceColumn: 'fee_structure_id', targetTable: 'fee_structures', allowNull: false },
      { sourceTable: 'student_fee_assignments', sourceColumn: 'academic_year_id', targetTable: 'academic_years', allowNull: false },
      { sourceTable: 'student_concessions', sourceColumn: 'fee_head_id', targetTable: 'fee_heads', allowNull: true },
      { sourceTable: 'student_concessions', sourceColumn: 'academic_year_id', targetTable: 'academic_years', allowNull: false },
      { sourceTable: 'fee_invoices', sourceColumn: 'assignment_id', targetTable: 'student_fee_assignments', allowNull: false },
      { sourceTable: 'fee_invoices', sourceColumn: 'installment_plan_id', targetTable: 'installment_plans', allowNull: false },
      { sourceTable: 'fee_invoices', sourceColumn: 'academic_year_id', targetTable: 'academic_years', allowNull: false },
      { sourceTable: 'fee_invoice_items', sourceColumn: 'invoice_id', targetTable: 'fee_invoices', allowNull: false },
      { sourceTable: 'fee_invoice_items', sourceColumn: 'fee_head_id', targetTable: 'fee_heads', allowNull: false },
      { sourceTable: 'fee_payments', sourceColumn: 'invoice_id', targetTable: 'fee_invoices', allowNull: false },
      { sourceTable: 'payment_refunds', sourceColumn: 'payment_id', targetTable: 'fee_payments', allowNull: false },
      { sourceTable: 'fee_reminders', sourceColumn: 'invoice_id', targetTable: 'fee_invoices', allowNull: false }
    ];

    for (const conversion of fkConversions) {
      // eslint-disable-next-line no-await-in-loop
      await convertUuidFkToInt(conversion);
    }

    // 4) Remove columns that are not present in models.
    await dropColumnIfExists('student_concessions', 'concession_id');
    await dropColumnIfExists('fee_structures', 'applicable_to');
    await dropColumnIfExists('installment_plans', 'max_late_fine');
    await dropColumnIfExists('installment_plans', 'grace_period_days');

    // 5) Replace UUID primary keys with integer auto-increment IDs.
    for (const table of [
      'academic_years',
      'fee_heads',
      'fee_structures',
      'fee_structure_items',
      'installment_plans',
      'student_fee_assignments',
      'student_concessions',
      'fee_invoices',
      'fee_invoice_items',
      'fee_payments',
      'payment_refunds',
      'fee_reminders'
    ]) {
      // eslint-disable-next-line no-await-in-loop
      await finalizePrimaryKeyToInt(table);
    }

    // 6) Create missing tables expected by models.
    if (!(await tableExists('income_entries'))) {
      await queryInterface.createTable('income_entries', {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        academic_year_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        fee_payment_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        category: {
          type: DataTypes.STRING(100),
          allowNull: false,
          defaultValue: 'fee_collection'
        },
        source: {
          type: DataTypes.STRING(100),
          allowNull: true
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        entry_date: {
          type: DataTypes.DATEONLY,
          allowNull: false
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        recorded_by: {
          type: DataTypes.INTEGER,
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
    }

    if (!(await tableExists('expense_entries'))) {
      await queryInterface.createTable('expense_entries', {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        academic_year_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        category: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        vendor_name: {
          type: DataTypes.STRING(150),
          allowNull: true
        },
        payment_mode: {
          type: DataTypes.ENUM('cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'),
          allowNull: false,
          defaultValue: 'cash'
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        entry_date: {
          type: DataTypes.DATEONLY,
          allowNull: false
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        recorded_by: {
          type: DataTypes.INTEGER,
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
    }

    // 7) Re-add model-aligned foreign keys.
    const fksToAdd = [
      {
        tableName: 'fee_structures',
        columnName: 'academic_year_id',
        referencedTableName: 'academic_years',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'fee_structures_academic_year_id_fk'
      },
      {
        tableName: 'fee_structures',
        columnName: 'class_id',
        referencedTableName: 'class_sections',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        constraintName: 'fee_structures_class_id_fk'
      },
      {
        tableName: 'fee_structures',
        columnName: 'created_by',
        referencedTableName: 'users',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'fee_structures_created_by_fk'
      },
      {
        tableName: 'fee_structure_items',
        columnName: 'fee_structure_id',
        referencedTableName: 'fee_structures',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        constraintName: 'fee_structure_items_fee_structure_id_fk'
      },
      {
        tableName: 'fee_structure_items',
        columnName: 'fee_head_id',
        referencedTableName: 'fee_heads',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'fee_structure_items_fee_head_id_fk'
      },
      {
        tableName: 'installment_plans',
        columnName: 'fee_structure_id',
        referencedTableName: 'fee_structures',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        constraintName: 'installment_plans_fee_structure_id_fk'
      },
      {
        tableName: 'student_fee_assignments',
        columnName: 'student_id',
        referencedTableName: 'students',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'student_fee_assignments_student_id_fk'
      },
      {
        tableName: 'student_fee_assignments',
        columnName: 'fee_structure_id',
        referencedTableName: 'fee_structures',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'student_fee_assignments_fee_structure_id_fk'
      },
      {
        tableName: 'student_fee_assignments',
        columnName: 'academic_year_id',
        referencedTableName: 'academic_years',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'student_fee_assignments_academic_year_id_fk'
      },
      {
        tableName: 'student_fee_assignments',
        columnName: 'assigned_by',
        referencedTableName: 'users',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'student_fee_assignments_assigned_by_fk'
      },
      {
        tableName: 'student_concessions',
        columnName: 'student_id',
        referencedTableName: 'students',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        constraintName: 'student_concessions_student_id_fk'
      },
      {
        tableName: 'student_concessions',
        columnName: 'fee_head_id',
        referencedTableName: 'fee_heads',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        constraintName: 'student_concessions_fee_head_id_fk'
      },
      {
        tableName: 'student_concessions',
        columnName: 'academic_year_id',
        referencedTableName: 'academic_years',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        constraintName: 'student_concessions_academic_year_id_fk'
      },
      {
        tableName: 'student_concessions',
        columnName: 'approved_by',
        referencedTableName: 'users',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        constraintName: 'student_concessions_approved_by_fk'
      },
      {
        tableName: 'fee_invoices',
        columnName: 'student_id',
        referencedTableName: 'students',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'fee_invoices_student_id_fk'
      },
      {
        tableName: 'fee_invoices',
        columnName: 'assignment_id',
        referencedTableName: 'student_fee_assignments',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'fee_invoices_assignment_id_fk'
      },
      {
        tableName: 'fee_invoices',
        columnName: 'installment_plan_id',
        referencedTableName: 'installment_plans',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'fee_invoices_installment_plan_id_fk'
      },
      {
        tableName: 'fee_invoices',
        columnName: 'academic_year_id',
        referencedTableName: 'academic_years',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'fee_invoices_academic_year_id_fk'
      },
      {
        tableName: 'fee_invoices',
        columnName: 'waived_by',
        referencedTableName: 'users',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        constraintName: 'fee_invoices_waived_by_fk'
      },
      {
        tableName: 'fee_invoice_items',
        columnName: 'invoice_id',
        referencedTableName: 'fee_invoices',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        constraintName: 'fee_invoice_items_invoice_id_fk'
      },
      {
        tableName: 'fee_invoice_items',
        columnName: 'fee_head_id',
        referencedTableName: 'fee_heads',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'fee_invoice_items_fee_head_id_fk'
      },
      {
        tableName: 'fee_payments',
        columnName: 'invoice_id',
        referencedTableName: 'fee_invoices',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'fee_payments_invoice_id_fk'
      },
      {
        tableName: 'fee_payments',
        columnName: 'student_id',
        referencedTableName: 'students',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'fee_payments_student_id_fk'
      },
      {
        tableName: 'fee_payments',
        columnName: 'collected_by',
        referencedTableName: 'users',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'fee_payments_collected_by_fk'
      },
      {
        tableName: 'fee_payments',
        columnName: 'cancelled_by',
        referencedTableName: 'users',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        constraintName: 'fee_payments_cancelled_by_fk'
      },
      {
        tableName: 'payment_refunds',
        columnName: 'payment_id',
        referencedTableName: 'fee_payments',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'payment_refunds_payment_id_fk'
      },
      {
        tableName: 'payment_refunds',
        columnName: 'student_id',
        referencedTableName: 'students',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'payment_refunds_student_id_fk'
      },
      {
        tableName: 'payment_refunds',
        columnName: 'requested_by',
        referencedTableName: 'users',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        constraintName: 'payment_refunds_requested_by_fk'
      },
      {
        tableName: 'payment_refunds',
        columnName: 'approved_by',
        referencedTableName: 'users',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        constraintName: 'payment_refunds_approved_by_fk'
      },
      {
        tableName: 'fee_reminders',
        columnName: 'invoice_id',
        referencedTableName: 'fee_invoices',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        constraintName: 'fee_reminders_invoice_id_fk'
      },
      {
        tableName: 'fee_reminders',
        columnName: 'student_id',
        referencedTableName: 'students',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        constraintName: 'fee_reminders_student_id_fk'
      },
      {
        tableName: 'income_entries',
        columnName: 'academic_year_id',
        referencedTableName: 'academic_years',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        constraintName: 'income_entries_academic_year_id_fk'
      },
      {
        tableName: 'income_entries',
        columnName: 'fee_payment_id',
        referencedTableName: 'fee_payments',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        constraintName: 'income_entries_fee_payment_id_fk'
      },
      {
        tableName: 'income_entries',
        columnName: 'recorded_by',
        referencedTableName: 'users',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        constraintName: 'income_entries_recorded_by_fk'
      },
      {
        tableName: 'expense_entries',
        columnName: 'academic_year_id',
        referencedTableName: 'academic_years',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        constraintName: 'expense_entries_academic_year_id_fk'
      },
      {
        tableName: 'expense_entries',
        columnName: 'recorded_by',
        referencedTableName: 'users',
        referencedColumnName: 'id',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        constraintName: 'expense_entries_recorded_by_fk'
      }
    ];

    for (const fk of fksToAdd) {
      // eslint-disable-next-line no-await-in-loop
      await addForeignKey(fk);
    }
  },

  async down() {
    throw new Error('Down migration is not supported for 20260425000100-align-fees-v1-to-integer-model-schema');
  }
};
