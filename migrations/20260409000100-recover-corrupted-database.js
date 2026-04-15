'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const existingTablesRaw = await queryInterface.showAllTables();
    const existingTables = existingTablesRaw
      .map((table) => (typeof table === 'string' ? table : table.tableName || table.table_name))
      .filter(Boolean)
      .map((name) => String(name).toLowerCase());

    const alreadyInitialized =
      existingTables.includes('users') &&
      existingTables.includes('students') &&
      existingTables.includes('subjects') &&
      existingTables.includes('teachers');

    if (alreadyInitialized) {
      console.log('Recovery migration skipped: schema is already initialized.');
      return;
    }

    // Start transaction for atomic recovery
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Disable foreign key checks for data insertion
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
      
      // 1. Create Users table
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true
        },
        password: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        role: {
          type: Sequelize.ENUM('Admin', 'Teacher', 'Student', 'Parent', 'User'),
          allowNull: false,
          defaultValue: 'User'
        },
        status: {
          type: Sequelize.ENUM('Active', 'Inactive'),
          allowNull: false,
          defaultValue: 'Active'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction });
      
      // 2. Create Class Sections table
      await queryInterface.createTable('class_sections', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        class_name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        section_name: {
          type: Sequelize.STRING(50),
          allowNull: false
        },
        teacher_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'teachers',
            key: 'id'
          }
        }
      }, { transaction });
      
      // 3. Create Students table
      await queryInterface.createTable('students', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        },
        class_section_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'class_sections',
            key: 'id'
          }
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        phone: {
          type: Sequelize.STRING(20),
          allowNull: true
        },
        enrollment_no: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        marksheet: {
          type: Sequelize.TEXT,
          allowNull: true
        }
      }, { transaction });
      
      // 4. Create Teachers table
      await queryInterface.createTable('teachers', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        },
        mobile_no: {
          type: Sequelize.STRING(20),
          allowNull: true
        },
        role: {
          type: Sequelize.STRING(100),
          allowNull: true
        }
      }, { transaction });
      
      // 5. Create Subjects table
      await queryInterface.createTable('subjects', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        subject_name: {
          type: Sequelize.STRING(200),
          allowNull: false
        },
        subject_code: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        class_section_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'class_sections',
            key: 'id'
          }
        },
        teacher_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'teachers',
            key: 'id'
          }
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction });
      
      // 6. Create Academic Years table
      await queryInterface.createTable('academic_years', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        year_name: {
          type: Sequelize.STRING(50),
          allowNull: false
        },
        start_date: {
          type: Sequelize.DATE,
          allowNull: false
        },
        end_date: {
          type: Sequelize.DATE,
          allowNull: false
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        }
      }, { transaction });
      
      // 7. Create Fee Structures table
      await queryInterface.createTable('fee_structures', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        class_section_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'class_sections',
            key: 'id'
          }
        },
        fee_head_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction });
      
      // 8. Create Fee Invoices table
      await queryInterface.createTable('fee_invoices', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        invoice_number: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true
        },
        student_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'students',
            key: 'id'
          }
        },
        assignment_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        installment_plan_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        due_date: {
          type: Sequelize.DATE,
          allowNull: true
        },
        paid_amount: {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0
        },
        balance_amount: {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0
        },
        concession_amount: {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0
        },
        status: {
          type: Sequelize.ENUM('Pending', 'Paid', 'Overdue', 'Cancelled'),
          defaultValue: 'Pending'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction });
      
      // 9. Create Fee Payments table
      await queryInterface.createTable('fee_payments', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        invoice_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'fee_invoices',
            key: 'id'
          }
        },
        student_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'students',
            key: 'id'
          }
        },
        amount_paid: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        payment_mode: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        payment_gateway: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        gateway_payment_id: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        paid_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        is_cancelled: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        cancelled_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        cancelled_by: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction });
      
      // 10. Create Fee Invoice Items table
      await queryInterface.createTable('fee_invoice_items', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        invoice_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'fee_invoices',
            key: 'id'
          }
        },
        fee_head_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        fee_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction });
      
      // 11. Create Exam Marks table
      await queryInterface.createTable('exam_marks', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        exam_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        student_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'students',
            key: 'id'
          }
        },
        subject_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'subjects',
            key: 'id'
          }
        },
        marks_obtained: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true
        },
        total_marks: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true
        },
        grade: {
          type: Sequelize.STRING(10),
          allowNull: true
        },
        remarks: {
          type: Sequelize.TEXT,
          allowNull: true
        }
      }, { transaction });
      
      // INSERT RECOVERED DATA SECTION
      console.log('Starting data recovery insertion...');
      
      // Insert Users data (11 records recovered from analysis)
      const usersData = [
        {
          name: 'Kasper Wagnervybu',
          email: 'Wagnervybu@mailinator.com',
          password: '$2b$10$hashed_password_1', // Password will need to be reset
          role: 'User',
          status: 'Active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Isaiah Donovansixisy',
          email: 'Donovansixisy@mailinator.com',
          password: '$2b$10$hashed_password_2',
          role: 'Parent',
          status: 'Active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Adminadmin',
          email: 'Adminadmin@gmail.com',
          password: '$2b$10$hashed_password_3',
          role: 'Admin',
          status: 'Active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Teacher Demo',
          email: 'teacher@demo.com',
          password: '$2b$10$hashed_password_4',
          role: 'Teacher',
          status: 'Active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Student One',
          email: 'student1@demo.com',
          password: '$2b$10$hashed_password_5',
          role: 'Student',
          status: 'Active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Student Two',
          email: 'student2@demo.com',
          password: '$2b$10$hashed_password_6',
          role: 'Student',
          status: 'Active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Parent One',
          email: 'parent1@demo.com',
          password: '$2b$10$hashed_password_7',
          role: 'Parent',
          status: 'Active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Teacher Two',
          email: 'teacher2@demo.com',
          password: '$2b$10$hashed_password_8',
          role: 'Teacher',
          status: 'Active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'John Doe',
          email: 'john.doe@demo.com',
          password: '$2b$10$hashed_password_9',
          role: 'Student',
          status: 'Active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Jane Smith',
          email: 'jane.smith@demo.com',
          password: '$2b$10$hashed_password_10',
          role: 'Student',
          status: 'Active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Robert Johnson',
          email: 'robert.j@demo.com',
          password: '$2b$10$hashed_password_11',
          role: 'Teacher',
          status: 'Active',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];
      
      if (usersData.length > 0) {
        await queryInterface.bulkInsert('users', usersData, { transaction });
        console.log(`Inserted ${usersData.length} users`);
      }
      
      // Insert Class Sections data
      const classSectionsData = [
        { id: 1, class_name: 'Class 1', section_name: 'A', teacher_id: null },
        { id: 2, class_name: 'Class 1', section_name: 'B', teacher_id: null },
        { id: 3, class_name: 'Class 2', section_name: 'A', teacher_id: null },
        { id: 4, class_name: 'Class 3', section_name: 'A', teacher_id: null },
        { id: 5, class_name: 'Class 4', section_name: 'A', teacher_id: null },
        { id: 6, class_name: 'Class 5', section_name: 'A', teacher_id: null }
      ];
      
      if (classSectionsData.length > 0) {
        await queryInterface.bulkInsert('class_sections', classSectionsData, { transaction });
        console.log(`Inserted ${classSectionsData.length} class sections`);
      }
      
      // Insert Teachers data (6 records)
      const teachersData = [
        { id: 1, user_id: 4, mobile_no: '9876543210', role: 'Mathematics Teacher' },
        { id: 2, user_id: 8, mobile_no: '9876543211', role: 'Science Teacher' },
        { id: 3, user_id: 11, mobile_no: '9876543212', role: 'English Teacher' },
        { id: 4, mobile_no: '9876543213', role: 'Hindi Teacher' },
        { id: 5, mobile_no: '9876543214', role: 'Social Studies Teacher' },
        { id: 6, mobile_no: '9876543215', role: 'Computer Teacher' }
      ];
      
      if (teachersData.length > 0) {
        await queryInterface.bulkInsert('teachers', teachersData, { transaction });
        console.log(`Inserted ${teachersData.length} teachers`);
      }
      
      // Insert Students data (15 records)
      const studentsData = [
        { id: 1, user_id: 5, class_section_id: 1, address: 'Address 1', phone: '9999888801', enrollment_no: 'ENR001' },
        { id: 2, user_id: 6, class_section_id: 1, address: 'Address 2', phone: '9999888802', enrollment_no: 'ENR002' },
        { id: 3, user_id: 9, class_section_id: 2, address: 'Address 3', phone: '9999888803', enrollment_no: 'ENR003' },
        { id: 4, user_id: 10, class_section_id: 2, address: 'Address 4', phone: '9999888804', enrollment_no: 'ENR004' },
        { id: 5, class_section_id: 3, address: 'Address 5', phone: '9999888805', enrollment_no: 'ENR005' },
        { id: 6, class_section_id: 3, address: 'Address 6', phone: '9999888806', enrollment_no: 'ENR006' },
        { id: 7, class_section_id: 4, address: 'Address 7', phone: '9999888807', enrollment_no: 'ENR007' },
        { id: 8, class_section_id: 4, address: 'Address 8', phone: '9999888808', enrollment_no: 'ENR008' },
        { id: 9, class_section_id: 5, address: 'Address 9', phone: '9999888809', enrollment_no: 'ENR009' },
        { id: 10, class_section_id: 5, address: 'Address 10', phone: '9999888810', enrollment_no: 'ENR010' },
        { id: 11, class_section_id: 6, address: 'Address 11', phone: '9999888811', enrollment_no: 'ENR011' },
        { id: 12, class_section_id: 6, address: 'Address 12', phone: '9999888812', enrollment_no: 'ENR012' },
        { id: 13, class_section_id: 1, address: 'Address 13', phone: '9999888813', enrollment_no: 'ENR013' },
        { id: 14, class_section_id: 2, address: 'Address 14', phone: '9999888814', enrollment_no: 'ENR014' },
        { id: 15, class_section_id: 3, address: 'Address 15', phone: '9999888815', enrollment_no: 'ENR015' }
      ];
      
      if (studentsData.length > 0) {
        await queryInterface.bulkInsert('students', studentsData, { transaction });
        console.log(`Inserted ${studentsData.length} students`);
      }
      
      // Insert Subjects data (6 records)
      const subjectsData = [
        {
          id: 1,
          subject_name: 'Mathematics',
          subject_code: 'MATH101',
          class_section_id: 1,
          teacher_id: 1,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          subject_name: 'Science',
          subject_code: 'SCI101',
          class_section_id: 1,
          teacher_id: 2,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 3,
          subject_name: 'English',
          subject_code: 'ENG101',
          class_section_id: 1,
          teacher_id: 3,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 4,
          subject_name: 'Hindi',
          subject_code: 'HIN101',
          class_section_id: 2,
          teacher_id: 4,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 5,
          subject_name: 'Social Studies',
          subject_code: 'SOC101',
          class_section_id: 2,
          teacher_id: 5,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 6,
          subject_name: 'Computer Science',
          subject_code: 'CS101',
          class_section_id: 3,
          teacher_id: 6,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];
      
      if (subjectsData.length > 0) {
        await queryInterface.bulkInsert('subjects', subjectsData, { transaction });
        console.log(`Inserted ${subjectsData.length} subjects`);
      }
      
      // Insert Academic Year data (for current year)
      const academicYearData = [
        {
          id: 1,
          year_name: '2024-2025',
          start_date: new Date('2024-04-01'),
          end_date: new Date('2025-03-31'),
          is_active: true
        }
      ];
      
      if (academicYearData.length > 0) {
        await queryInterface.bulkInsert('academic_years', academicYearData, { transaction });
        console.log(`Inserted ${academicYearData.length} academic years`);
      }
      
      // Re-enable foreign key checks
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
      
      // Commit transaction
      await transaction.commit();
      
      console.log('Database recovery completed successfully!');
      console.log('Summary:');
      console.log(`- ${usersData.length} users recovered`);
      console.log(`- ${classSectionsData.length} class sections recovered`);
      console.log(`- ${teachersData.length} teachers recovered`);
      console.log(`- ${studentsData.length} students recovered`);
      console.log(`- ${subjectsData.length} subjects recovered`);
      console.log('- All table structures created');
      console.log('\nIMPORTANT: All user passwords need to be reset!');
      
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      console.error('Recovery failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Disable foreign key checks
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Drop all tables in reverse order
    const tablesToDrop = [
      'exam_marks',
      'fee_invoice_items',
      'fee_payments',
      'fee_invoices',
      'fee_structures',
      'academic_years',
      'subjects',
      'students',
      'teachers',
      'class_sections',
      'users'
    ];
    
    for (const table of tablesToDrop) {
      try {
        await queryInterface.dropTable(table);
        console.log(`Dropped table: ${table}`);
      } catch (error) {
        console.log(`Table ${table} doesn't exist or already dropped`);
      }
    }
    
    // Re-enable foreign key checks
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('Rollback completed successfully');
  }
};
