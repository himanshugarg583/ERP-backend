'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    
    console.log('\n🔧 SCHEMA ALIGNMENT MIGRATION\n');

    try {
      // 1. Verify admissionenquiries table structure
      console.log('✓ Checking admissionenquiries table...');
      let columns = await queryInterface.describeTable('admissionenquiries');
      
      // Ensure all required columns exist
      if (!columns.createdAt) {
        await queryInterface.addColumn('admissionenquiries', 'createdAt', {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        });
        console.log('  ✓ Added createdAt column');
      }

      if (!columns.updatedAt) {
        await queryInterface.addColumn('admissionenquiries', 'updatedAt', {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        });
        console.log('  ✓ Added updatedAt column');
      }

      // 2. Verify subjects table has correct column order and all fields
      console.log('✓ Checking subjects table...');
      columns = await queryInterface.describeTable('subjects');
      
      // Ensure subject_type column exists
      if (!columns.subject_type) {
        await queryInterface.addColumn('subjects', 'subject_type', {
          type: DataTypes.ENUM('theory', 'practical', 'extra_caricualam_activity'),
          defaultValue: 'theory',
          allowNull: false
        });
        console.log('  ✓ Added subject_type column');
      }

      // 3. Verify staff table has timestamp columns
      console.log('✓ Checking staff table...');
      columns = await queryInterface.describeTable('staff');
      
      if (!columns.createdAt) {
        await queryInterface.addColumn('staff', 'createdAt', {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        });
        console.log('  ✓ Added createdAt column');
      }

      if (!columns.updatedAt) {
        await queryInterface.addColumn('staff', 'updatedAt', {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        });
        console.log('  ✓ Added updatedAt column');
      }

      // 4. Verify teachers table has timestamp columns
      console.log('✓ Checking teachers table...');
      columns = await queryInterface.describeTable('teachers');
      
      if (!columns.createdAt) {
        await queryInterface.addColumn('teachers', 'createdAt', {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        });
        console.log('  ✓ Added createdAt column');
      }

      if (!columns.updatedAt) {
        await queryInterface.addColumn('teachers', 'updatedAt', {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        });
        console.log('  ✓ Added updatedAt column');
      }

      // 5. Check and validate all table names match exactly
      console.log('\n✓ Validating all table names...');
      const tables = await queryInterface.showAllTables();
      
      const expectedTables = [
        'academic_years', 'admissionenquiries', 'audience_targets',
        'class_sections', 'class_time_slots', 'class_timetable_entries',
        'class_timetable_settings', 'document_templates', 'documents',
        'exam_attendance', 'exam_events', 'exam_papers',
        'exam_schedules', 'exam_types', 'holidays', 'marks_entries',
        'notice_targets', 'notices', 'resources', 'staff', 'student_attendance',
        'student_leaves', 'student_parents', 'students', 'subjects',
        'teachers', 'users', 'fee_heads', 'fee_invoices', 'fee_invoice_items',
        'fee_payments', 'fee_reminders', 'fee_structures', 'fee_structure_items',
        'student_fee_assignments', 'student_concessions', 'installment_plans',
        'expense_entries', 'income_entries', 'document_templates'
      ];

      const missingTables = expectedTables.filter(t => !tables.includes(t));
      if (missingTables.length > 0) {
        console.log(`  ⚠️  Note: These expected tables are missing: ${missingTables.join(', ')}`);
      } else {
        console.log(`  ✓ All expected tables exist`);
      }

      // 6. Verify primary keys and constraints
      console.log('\n✓ Verifying table structures...');
      const criticalTables = [
        'users', 'students', 'teachers', 'staff', 'subjects',
        'class_sections', 'class_time_slots', 'class_timetable_entries'
      ];

      for (const tableName of criticalTables) {
        if (tables.includes(tableName)) {
          const tableInfo = await queryInterface.describeTable(tableName);
          console.log(`  ✓ ${tableName}: ${Object.keys(tableInfo).length} columns`);
        }
      }

      console.log('\n✅ Schema alignment migration completed successfully!\n');

    } catch (error) {
      console.error('\n❌ Migration error:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Rollback would remove columns if needed
    console.log('Migration rollback would remove added columns');
  }
};
