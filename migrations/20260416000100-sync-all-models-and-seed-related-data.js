'use strict';

const path = require('path');
const bcrypt = require('bcryptjs');

module.exports = {
  async up() {
    const projectRoot = path.resolve(__dirname, '..');
    const coreModels = require(path.join(projectRoot, 'models'));
    const feeModels = require(path.join(projectRoot, 'models', 'admin', 'fees_v1'));

    const {
      sequelize,
      User,
      Teacher,
      Student,
      Staff,
      ClassSection,
      Subject,
      StudentParent,
      studentsAttendances,
      StudentLeave,
      ClassTimetableSetting,
      ClassTimeSlot,
      ClassTimetable,
      AdmissionEnquiry,
      Holiday,
      Notice,
      NoticeTarget,
      ClassResource,
      SubjectResource,
      IncomeExpense,
      ExamTypeV2,
      ExamEventV2,
      ExamPaperV2,
      ExamTimetableV2,
      ResultV2,
      MarksEntryV2,
      ExamAttendanceV2,
      DocumentTemplateV2,
      DocumentV2,
    } = coreModels;

    const {
      AcademicYear,
      FeeHeadV1,
      FeeStructureV1,
      FeeStructureItemV1,
      InstallmentPlanV1,
      StudentFeeAssignmentV1,
      ConcessionV1,
      StudentConcessionV1,
      FeeInvoiceV1,
      FeeInvoiceItemV1,
      FeePaymentV1,
      PaymentRefundV1,
      FeeReminderV1,
      FeeGatewayOrderV1,
      FeeWebhookEventV1,
      StudentWalletV1,
      SchoolFeeSettingV1,
      FeeNumberSequenceV1,
    } = feeModels;

    const ensureByWhere = async (model, where, defaults = {}) => {
      const [record] = await model.findOrCreate({ where, defaults: { ...where, ...defaults } });
      return record;
    };

    const ensureByFindOne = async (model, where, createPayload) => {
      const existing = await model.findOne({ where });
      if (existing) return existing;
      return model.create(createPayload);
    };

    // First ensure all tables exist, then align columns model-by-model.
    // `class_timetable_entries` has legacy FK state in some DBs where alter can fail.
    await sequelize.sync();

    for (const model of Object.values(sequelize.models)) {
      const modelTable = model.getTableName();
      const tableName = typeof modelTable === 'string' ? modelTable : modelTable.tableName;

      try {
        await model.sync({ alter: true });
      } catch (error) {
        if (tableName === 'class_timetable_entries') {
          console.warn('Skipping alter sync for class_timetable_entries due to legacy FK shape:', error.message);
          continue;
        }
        throw error;
      }
    }

    // Align legacy class timetable FK shape with current model definition.
    try {
      const [teacherColumnRows] = await sequelize.query(`
        SELECT IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'class_timetable_entries'
          AND COLUMN_NAME = 'teacher_id'
        LIMIT 1
      `);

      if (teacherColumnRows.length && teacherColumnRows[0].IS_NULLABLE === 'NO') {
        await sequelize.query('ALTER TABLE class_timetable_entries MODIFY teacher_id INT NULL');
      }

      const [teacherFkRows] = await sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'class_timetable_entries'
          AND COLUMN_NAME = 'teacher_id'
          AND REFERENCED_TABLE_NAME = 'teachers'
      `);

      if (!teacherFkRows.length) {
        await sequelize.query(`
          ALTER TABLE class_timetable_entries
          ADD CONSTRAINT fk_class_timetable_entries_teacher
          FOREIGN KEY (teacher_id)
          REFERENCES teachers(id)
          ON DELETE SET NULL
          ON UPDATE CASCADE
        `);
      }
    } catch (error) {
      console.warn('Class timetable teacher FK alignment skipped:', error.message);
    }

    const passwordHash = await bcrypt.hash('Seed@12345', 10);

    const adminUser = await ensureByWhere(
      User,
      { email: 'admin.seed@erp.local' },
      {
        name: 'Seed Admin',
        password: passwordHash,
        role: 'admin',
        status: 'active',
      }
    );

    const teacherUser = await ensureByWhere(
      User,
      { email: 'teacher.seed@erp.local' },
      {
        name: 'Amit Sharma',
        password: passwordHash,
        role: 'teacher',
        status: 'active',
      }
    );

    const studentUser = await ensureByWhere(
      User,
      { email: 'student.seed@erp.local' },
      {
        name: 'Riya Verma',
        password: passwordHash,
        role: 'student',
        status: 'active',
      }
    );

    const accountantUser = await ensureByWhere(
      User,
      { email: 'accountant.seed@erp.local' },
      {
        name: 'Neha Gupta',
        password: passwordHash,
        role: 'accountant',
        status: 'active',
      }
    );

    const staffUser = await ensureByWhere(
      User,
      { email: 'staff.seed@erp.local' },
      {
        name: 'Suresh Yadav',
        password: passwordHash,
        role: 'staff',
        status: 'active',
      }
    );

    const teacher = await ensureByWhere(
      Teacher,
      { user_id: teacherUser.id },
      {
        qualification: 'M.Sc, B.Ed',
        mobile_no: '9876501001',
        role: 'teacher',
        gender: 'male',
        salary: 58000,
        joining_date: '2020-06-15',
        current_address: 'Jaipur, Rajasthan',
      }
    );

    const classSection = await ensureByWhere(
      ClassSection,
      { class_name: '10', section_name: 'A' },
      {
        room_No: 'R-204',
        capacity: 42,
        teacher_id: teacher.id,
      }
    );

    const student = await ensureByWhere(
      Student,
      { user_id: studentUser.id },
      {
        roll_number: '10A-001',
        dob: '2010-08-12',
        gender: 'female',
        address: 'Vaishali Nagar, Jaipur',
        admission_date: '2022-04-01',
        class_section_id: classSection.id,
        phone_no: '9876502002',
        previous_school_name: 'Sunrise Public School',
        aadhar_no: '9999888877776666',
      }
    );

    const staff = await ensureByWhere(
      Staff,
      { user_id: staffUser.id },
      {
        employee_code: 'STF-SEED-001',
        department: 'hr',
        designation: 'HR Coordinator',
        gender: 'male',
        mobile_no: '9876503003',
        joining_date: '2021-01-10',
        salary: 32000,
      }
    );

    const subject = await ensureByWhere(
      Subject,
      { subject_code: 'MATH-10A-SEED' },
      {
        subject_name: 'Mathematics',
        class_section_id: classSection.id,
        teacher_id: teacher.id,
      }
    );

    await ensureByWhere(
      StudentParent,
      { student_id: student.id },
      {
        father_name: 'Mahesh Verma',
        father_phone: '9876504004',
        father_occupation: 'Business Owner',
        mother_name: 'Kavita Verma',
        mother_phone: '9876504005',
        mother_occupation: 'Teacher',
        email: 'parent.seed@erp.local',
        address: 'Vaishali Nagar, Jaipur',
      }
    );

    await ensureByWhere(
      studentsAttendances,
      { student_id: student.id, date: '2026-04-15' },
      {
        class_section_id: classSection.id,
        status: 'present',
        marked_by: teacherUser.id,
      }
    );

    await ensureByWhere(
      StudentLeave,
      { student_id: student.id, start_date: '2026-04-10', end_date: '2026-04-11' },
      {
        leave_type: 'sick',
        reason: 'Viral fever and doctor-advised rest',
        status: 'approved',
        approved_by: adminUser.id,
      }
    );

    const timetableSetting = await ensureByWhere(
      ClassTimetableSetting,
      { class_section_id: classSection.id },
      {
        start_time: '08:00:00',
        end_time: '14:00:00',
        period_duration_minutes: 45,
        break_duration_minutes: 20,
        break_after_period: 4,
        working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      }
    );

    const timeSlot = await ensureByWhere(
      ClassTimeSlot,
      { class_section_id: classSection.id, slot_number: 1 },
      {
        slot_label: 'Period 1',
        start_time: '08:00:00',
        end_time: '08:45:00',
        is_break: false,
      }
    );

    await ensureByWhere(
      ClassTimetable,
      {
        class_section_id: classSection.id,
        day_of_week: 'Monday',
        time_slot_id: timeSlot.id,
      },
      {
        subject_id: subject.id,
        teacher_id: teacher.id,
        notes: 'Algebra fundamentals',
        is_break: false,
      }
    );

    await ensureByWhere(
      AdmissionEnquiry,
      { email: 'enquiry.seed@erp.local' },
      {
        name: 'Rohit Singh',
        phone: '9876505005',
        className: '10',
        enquiry_date: '2026-04-12',
        parentName: 'Sunil Singh',
        oldSchool: 'City Model School',
        address: 'Mansarovar, Jaipur',
        source: 'referral',
        status: 'active',
        description: 'Interested in science stream and transport facility',
      }
    );

    await ensureByWhere(
      Holiday,
      { holiday_date: '2026-08-15' },
      {
        reason: 'Independence Day',
        description: 'School remains closed for national holiday',
      }
    );

    const notice = await ensureByFindOne(
      Notice,
      { title: 'PTM Schedule - April 2026' },
      {
        title: 'PTM Schedule - April 2026',
        message: 'Parent-teacher meeting for Class 10A is on Saturday at 10:30 AM.',
        created_by: teacher.id,
      }
    );

    await ensureByFindOne(
      NoticeTarget,
      { notice_id: notice.id, target_type: 'class', class_section_id: classSection.id },
      {
        notice_id: notice.id,
        target_type: 'class',
        class_section_id: classSection.id,
      }
    );

    await ensureByFindOne(
      ClassResource,
      { class_section_id: classSection.id, title: 'April Circular - Exam Preparation' },
      {
        class_section_id: classSection.id,
        title: 'April Circular - Exam Preparation',
        description: 'Guidelines for revision schedule and exam readiness.',
        file_url: '/uploads/classResources/april-circular.pdf',
        resource_type: 'circular',
        teacher_id: teacher.id,
      }
    );

    await ensureByFindOne(
      SubjectResource,
      { class_section_id: classSection.id, subject_id: subject.id, title: 'Algebra Worksheet Set 1' },
      {
        class_section_id: classSection.id,
        subject_id: subject.id,
        title: 'Algebra Worksheet Set 1',
        description: 'Practice worksheet on linear equations.',
        file_url: '/uploads/subjectResources/algebra-worksheet-1.pdf',
        resource_type: 'worksheet',
        due_date: '2026-04-25 17:00:00',
        teacher_id: teacher.id,
      }
    );

    await ensureByFindOne(
      IncomeExpense,
      { entry_type: 'income', category: 'Tuition Fee', entry_date: '2026-04-15' },
      {
        entry_type: 'income',
        category: 'Tuition Fee',
        sub_category: 'Class 10A',
        amount: 25000,
        payment_mode: 'online',
        transaction_ref: 'TXN-SEED-0001',
        description: 'Monthly tuition collection batch for class 10A',
        entry_date: '2026-04-15',
        recorded_by: 'Neha Gupta',
      }
    );

    const examType = await ensureByWhere(
      ExamTypeV2,
      { name: 'Annual Exam - Seed' },
      {
        description: 'Annual summative examination template',
        grading_config: {
          A1: { min: 91, max: 100 },
          A2: { min: 81, max: 90 },
          B1: { min: 71, max: 80 },
          C1: { min: 51, max: 60 },
        },
        is_active: true,
      }
    );

    const examEvent = await ensureByWhere(
      ExamEventV2,
      { name: 'Annual Examination 2025-26 (Seed)' },
      {
        exam_type_id: examType.id,
        academic_year: '2025-2026',
        start_date: '2026-05-01',
        end_date: '2026-05-20',
        status: 'scheduled',
        created_by: adminUser.id,
      }
    );

    const examPaper = await ensureByWhere(
      ExamPaperV2,
      {
        exam_event_id: examEvent.id,
        subject_id: subject.id,
        class_id: classSection.id,
      },
      {
        max_marks: 100,
        passing_marks: 33,
        marks_config: { theory: 80, practical: 20 },
        assigned_teacher_id: teacher.id,
        is_active: true,
      }
    );

    await ensureByWhere(
      ExamTimetableV2,
      { exam_paper_id: examPaper.id },
      {
        exam_event_id: examEvent.id,
        class_id: classSection.id,
        subject_id: subject.id,
        exam_date: '2026-05-05',
        start_time: '10:00:00',
        end_time: '12:00:00',
        duration_minutes: 120,
        slot_number: 1,
        room_label: 'Hall A',
        invigilator_teacher_id: teacher.id,
      }
    );

    const result = await ensureByWhere(
      ResultV2,
      { student_id: student.id, exam_event_id: examEvent.id },
      {
        total_marks: 78,
        max_marks: 100,
        percentage: 78,
        grade: 'A2',
        rank: 3,
        is_pass: true,
        computed_at: new Date('2026-05-25T10:00:00Z'),
        status: 'published',
        version: 1,
      }
    );

    await ensureByWhere(
      MarksEntryV2,
      { exam_paper_id: examPaper.id, student_id: student.id },
      {
        result_id: result.id,
        marks: { theory: 62, practical: 16 },
        marks_obtained: 78,
        total_marks: 100,
        max_marks: 100,
        percentage: 78,
        grade: 'A2',
        is_pass: true,
        is_absent: false,
        is_exempt: false,
        entered_by: teacherUser.id,
        entered_at: new Date('2026-05-24T10:00:00Z'),
        meta_data: { moderated: false },
      }
    );

    await ensureByWhere(
      ExamAttendanceV2,
      { exam_paper_id: examPaper.id, student_id: student.id },
      {
        status: 'present',
        marked_by: teacherUser.id,
        marked_at: new Date('2026-05-05T09:50:00Z'),
        remarks: 'On time',
        is_locked: false,
        malpractice_flag: false,
      }
    );

    const template = await ensureByWhere(
      DocumentTemplateV2,
      { name: 'Report Card Template - Seed' },
      {
        document_type: 'report_card',
        template_config: {
          page: 'A4',
          showPhoto: true,
          showSignature: true,
        },
        is_active: true,
      }
    );

    await ensureByFindOne(
      DocumentV2,
      {
        student_id: student.id,
        document_type: 'report_card',
        reference_id: result.id,
      },
      {
        student_id: student.id,
        document_type: 'report_card',
        reference_id: result.id,
        file_url: '/uploads/results/report-card-seed-10A-001.pdf',
        status: 'final',
        version: 1,
        meta_data: { template_id: template.id },
        generated_by: adminUser.id,
        generated_at: new Date('2026-05-26T10:00:00Z'),
        is_valid: true,
      }
    );

    const academicYear = await ensureByWhere(
      AcademicYear,
      { name: '2025-2026' },
      {
        start_date: '2025-04-01',
        end_date: '2026-03-31',
        is_current: true,
      }
    );

    await ensureByFindOne(
      SchoolFeeSettingV1,
      { due_date_shift: 'no_shift', dnd_start_time: '21:00', dnd_end_time: '08:00' },
      {
        block_report_card_on_dues: true,
        fine_first: true,
        due_date_shift: 'no_shift',
        dnd_start_time: '21:00',
        dnd_end_time: '08:00',
      }
    );

    const feeHead = await ensureByWhere(
      FeeHeadV1,
      { name: 'Tuition Fee - Seed' },
      {
        category: 'academic',
        description: 'Core tuition component for class 10',
        is_optional: false,
        is_refundable: false,
        ledger_code: 'FEE-TUTION-001',
        is_active: true,
      }
    );

    const feeStructure = await ensureByWhere(
      FeeStructureV1,
      { name: 'Class 10 Annual Structure - Seed', academic_year_id: academicYear.id },
      {
        applicable_to: 'class_10',
        class_ids: [classSection.id],
        description: 'Annual recurring fee plan for Class 10A',
        structure_type: 'recurring',
        is_active: true,
        created_by: adminUser.id,
      }
    );

    await ensureByWhere(
      FeeStructureItemV1,
      { fee_structure_id: feeStructure.id, fee_head_id: feeHead.id },
      {
        amount: 50000,
        is_mandatory: true,
        sort_order: 1,
      }
    );

    const installment = await ensureByWhere(
      InstallmentPlanV1,
      { fee_structure_id: feeStructure.id, installment_number: 1 },
      {
        name: 'Quarter 1',
        due_date: '2026-06-15',
        percentage: 25,
        late_fine_type: 'flat',
        late_fine_value: 200,
        grace_period_days: 5,
      }
    );

    const assignment = await ensureByWhere(
      StudentFeeAssignmentV1,
      {
        student_id: student.id,
        fee_structure_id: feeStructure.id,
        academic_year_id: academicYear.id,
        status: 'active',
      },
      {
        assignment_type: 'recurring',
        assigned_by: accountantUser.id,
        assigned_at: new Date('2026-04-01T09:00:00Z'),
      }
    );

    const concession = await ensureByWhere(
      ConcessionV1,
      { name: 'Merit Scholarship - Seed' },
      {
        type: 'percentage',
        value: 10,
        applies_to: 'total_invoice',
        requires_approval: true,
        valid_from: '2026-04-01',
        valid_until: '2027-03-31',
        is_active: true,
      }
    );

    await ensureByWhere(
      StudentConcessionV1,
      {
        student_id: student.id,
        concession_id: concession.id,
        academic_year_id: academicYear.id,
      },
      {
        fee_head_id: feeHead.id,
        approval_status: 'approved',
        approved_by: adminUser.id,
        approved_at: new Date('2026-04-02T11:00:00Z'),
        note: 'Approved based on previous academic performance',
      }
    );

    const invoice = await ensureByWhere(
      FeeInvoiceV1,
      { invoice_number: 'INV-SEED-2026-0001' },
      {
        student_id: student.id,
        assignment_id: assignment.id,
        installment_plan_id: installment.id,
        academic_year_id: academicYear.id,
        gross_amount: 12500,
        concession_amount: 1250,
        net_amount: 11250,
        fine_amount: 0,
        paid_amount: 11250,
        balance_amount: 0,
        status: 'paid',
        due_date: '2026-06-15',
        generated_at: new Date('2026-04-03T09:30:00Z'),
      }
    );

    await ensureByWhere(
      FeeInvoiceItemV1,
      { invoice_id: invoice.id, fee_head_id: feeHead.id },
      {
        gross_amount: 12500,
        concession_amount: 1250,
        net_amount: 11250,
      }
    );

    const payment = await ensureByWhere(
      FeePaymentV1,
      { receipt_number: 'RCPT-SEED-2026-0001' },
      {
        invoice_id: invoice.id,
        student_id: student.id,
        amount_paid: 11250,
        fine_paid: 0,
        payment_mode: 'online',
        transaction_ref: 'PAY-SEED-REF-001',
        payment_gateway: 'razorpay',
        gateway_payment_id: 'pay_seed_001',
        collected_by: accountantUser.id,
        paid_at: new Date('2026-04-03T09:45:00Z'),
        is_cancelled: false,
      }
    );

    await ensureByWhere(
      StudentWalletV1,
      { student_id: student.id },
      {
        balance: 500,
      }
    );

    await ensureByFindOne(
      PaymentRefundV1,
      { payment_id: payment.id, reason: 'Duplicate payment captured in test run' },
      {
        payment_id: payment.id,
        student_id: student.id,
        refund_amount: 500,
        reason: 'Duplicate payment captured in test run',
        refund_mode: 'bank_transfer',
        status: 'processed',
        requested_by: accountantUser.id,
        approved_by: adminUser.id,
        approved_at: new Date('2026-04-04T09:00:00Z'),
        processed_at: new Date('2026-04-04T12:30:00Z'),
        gateway_refund_id: 'rfnd_seed_001',
      }
    );

    await ensureByFindOne(
      FeeReminderV1,
      {
        invoice_id: invoice.id,
        reminder_type: 'receipt',
        recipient_number: 'riya.parent@erp.local',
      },
      {
        invoice_id: invoice.id,
        student_id: student.id,
        recipient_number: 'riya.parent@erp.local',
        channel: 'email',
        reminder_type: 'receipt',
        message_template: 'PAYMENT_RECEIPT_V1',
        sent_at: new Date('2026-04-03T10:00:00Z'),
        status: 'delivered',
      }
    );

    await ensureByWhere(
      FeeGatewayOrderV1,
      { gateway_order_id: 'order_seed_001' },
      {
        invoice_id: invoice.id,
        student_id: student.id,
        gateway: 'razorpay',
        amount: 11250,
        expires_at: new Date('2026-04-03T10:30:00Z'),
        status: 'paid',
      }
    );

    await ensureByWhere(
      FeeNumberSequenceV1,
      { key_name: 'invoice' },
      {
        last_value: 1,
      }
    );

    await ensureByFindOne(
      FeeWebhookEventV1,
      { event_id: 'evt_seed_001' },
      {
        gateway: 'razorpay',
        event_id: 'evt_seed_001',
        event_type: 'payment.captured',
        payload: {
          receipt_number: 'RCPT-SEED-2026-0001',
          amount: 11250,
        },
        signature: 'seed_signature',
        status: 'processed',
        received_at: new Date('2026-04-03T09:50:00Z'),
      }
    );

    // Silence unused warnings for records that are intentionally created for referential integrity.
    void timetableSetting;
    void staff;
  },

  async down() {
    // Intentionally left as a no-op.
    // This migration aligns schema with current models and seeds baseline data;
    // automatic rollback could remove legitimate records in shared environments.
  },
};
