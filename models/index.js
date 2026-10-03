const sequelize = require('../config/db');

// Import models
const { User } = require('./admin/users');
const { ClassSection } = require('./admin/class_sections');
const { Student } = require('./admin/students');
const { Teacher } = require('./admin/teachers');
const { Staff } = require('./admin/staff');
const {Subject} = require('./admin/subjects');
const {studentsAttendances} = require('./admin/studentattendances');
const {StudentParent} = require('./admin/student_parents');
const {ClassTimetable} = require('./admin/class_timetable_entries');
const {ClassTimetableSetting} = require('./admin/class_timetable_settings');
const {ClassTimeSlot} = require('./admin/class_time_slots');
const {AdmissionEnquiry} = require('./admin/admissionenquiries');
const {Holiday} = require('./admin/holidays');
// fees v1
const { AcademicYear } = require('./admin/fees_v1/academic_years');
const { FeeHeadV1 } = require('./admin/fees_v1/fee_heads');
const { FeeStructureV1 } = require('./admin/fees_v1/fee_structures');
const { FeeStructureItemV1 } = require('./admin/fees_v1/fee_structure_items');
const { InstallmentPlanV1 } = require('./admin/fees_v1/installment_plans');
const { StudentFeeAssignmentV1 } = require('./admin/fees_v1/student_fee_assignments');
const { StudentConcessionV1 } = require('./admin/fees_v1/student_concessions');
const { FeeInvoiceV1 } = require('./admin/fees_v1/fee_invoices');
const { FeeInvoiceItemV1 } = require('./admin/fees_v1/fee_invoice_items');
const { FeePaymentV1 } = require('./admin/fees_v1/fee_payments');
const { PaymentRefundV1 } = require('./admin/fees_v1/payment_refunds');
const { FeeReminderV1 } = require('./admin/fees_v1/fee_reminders');
const { IncomeEntryV1 } = require('./admin/fees_v1/income_entries');
const { ExpenseEntryV1 } = require('./admin/fees_v1/expense_entries');


// exam v2
const { ExamTypeV2 } = require('./admin/exam/exam_types');
const { ExamEventV2 } = require('./admin/exam/exam_events');
const { ExamPaperV2 } = require('./admin/exam/exam_papers');
const { ExamTimetableV2 } = require('./admin/exam/exam_timetable');
const { MarksEntryV2 } = require('./admin/exam/marks_entries');
const { ExamAttendanceV2 } = require('./admin/exam/exam_attendance');
const { ResultV2 } = require('./admin/exam/results');
const { DocumentTemplateV2 } = require('./admin/exam/document_templates');
const { DocumentV2 } = require('./admin/exam/documents');

// student leave
const { StudentLeave } = require('./admin/student_leaves');

// content uploads
const { Resource } = require('./admin/content uploads/resources');

// notices
const { Notice } = require('./admin/content uploads/notices');
const { AudienceTarget } = require('./admin/content uploads/audience_targets');


// User ↔ Student
User.hasOne(Student, { foreignKey: 'user_id', as: "studentDetails" });
Student.belongsTo(User, { foreignKey: 'user_id' });

// Student → ParentDetail
Student.hasOne(StudentParent, { foreignKey: "student_id", as: "parentDetails" });
StudentParent.belongsTo(Student, { foreignKey: "student_id", as: "studentDetails" });

// User ↔ Teacher
User.hasOne(Teacher, { foreignKey: 'user_id',as: "teacherDetails" });
Teacher.belongsTo(User, { foreignKey: 'user_id' });

// User ↔ Staff
User.hasOne(Staff, { foreignKey: 'user_id', as: 'staffDetails' });
Staff.belongsTo(User, { foreignKey: 'user_id' });

// ClassSection ↔ Student
ClassSection.hasMany(Student, { foreignKey: 'class_section_id' });
Student.belongsTo(ClassSection, { foreignKey: 'class_section_id' });

Teacher.hasMany(ClassSection, { foreignKey: 'teacher_id', as: 'classSections' });
ClassSection.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'classTeacher' });


// ClassSection ↔ Subject
ClassSection.hasMany(Subject, { foreignKey: 'class_section_id',  as: 'subjects' });
Subject.belongsTo(ClassSection, { foreignKey: 'class_section_id' , as: 'class_section'});

// Teacher ↔ Subject
Teacher.hasMany(Subject, { foreignKey: 'teacher_id', as: 'subjects' });
Subject.belongsTo(Teacher, { foreignKey: 'teacher_id' , as: 'teacher'});


// Attendance ↔ Student
Student.hasMany(studentsAttendances, { foreignKey: 'student_id', as: 'studentsAttendances' });
studentsAttendances.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// Attendance ↔ User (for student user details)
User.hasMany(studentsAttendances, { foreignKey: 'student_id', as: 'attendances' });
studentsAttendances.belongsTo(User, { foreignKey: 'student_id', as: 'studentUser' });

// Attendance ↔ ClassSection
ClassSection.hasMany(studentsAttendances, { foreignKey: 'class_section_id', as: 'class_attendance' });
studentsAttendances.belongsTo(ClassSection, { foreignKey: 'class_section_id', as: 'class_section' });

// =====================================================
// STUDENT LEAVE ASSOCIATIONS
// =====================================================

// Student ↔ StudentLeave (One-to-Many)
Student.hasMany(StudentLeave, { foreignKey: 'student_id', as: 'leaves', onDelete: 'CASCADE' });
StudentLeave.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// Timetable Associations
ClassSection.hasOne(ClassTimetableSetting, { foreignKey: 'class_section_id', as: 'timetableSetting', onDelete: 'CASCADE' });
ClassTimetableSetting.belongsTo(ClassSection, { foreignKey: 'class_section_id', as: 'classSection' });

ClassSection.hasMany(ClassTimeSlot, { foreignKey: 'class_section_id', as: 'timeSlots', onDelete: 'CASCADE' });
ClassTimeSlot.belongsTo(ClassSection, { foreignKey: 'class_section_id', as: 'classSection' });

ClassSection.hasMany(ClassTimetable, { foreignKey: 'class_section_id', as: 'timetableEntries', onDelete: 'CASCADE' });
ClassTimetable.belongsTo(ClassSection, { foreignKey: 'class_section_id', as: 'classSection' });

ClassTimeSlot.hasMany(ClassTimetable, { foreignKey: 'time_slot_id', as: 'timetableEntries', onDelete: 'CASCADE' });
ClassTimetable.belongsTo(ClassTimeSlot, { foreignKey: 'time_slot_id', as: 'timeSlot' });

Subject.hasMany(ClassTimetable, { foreignKey: 'subject_id', as: 'timetableEntries' });
ClassTimetable.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

Teacher.hasMany(ClassTimetable, { foreignKey: 'teacher_id', as: 'timetableEntries' });
ClassTimetable.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });

// exam v2
// =====================================================
// EXAM MANAGEMENT ASSOCIATIONS
// =====================================================

ExamTypeV2.hasMany(ExamEventV2, { foreignKey: 'exam_type_id', as: 'events' });
ExamEventV2.belongsTo(ExamTypeV2, { foreignKey: 'exam_type_id', as: 'examType' });

User.hasMany(ExamEventV2, { foreignKey: 'created_by', as: 'createdExamEventsV2' });
ExamEventV2.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });

ExamEventV2.hasMany(ExamPaperV2, { foreignKey: 'exam_event_id', as: 'papers' });
ExamPaperV2.belongsTo(ExamEventV2, { foreignKey: 'exam_event_id', as: 'event' });

Subject.hasMany(ExamPaperV2, { foreignKey: 'subject_id', as: 'examPapersV2' });
ExamPaperV2.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

ClassSection.hasMany(ExamPaperV2, { foreignKey: 'class_id', as: 'examPapersV2' });
ExamPaperV2.belongsTo(ClassSection, { foreignKey: 'class_id', as: 'classSection' });

Teacher.hasMany(ExamPaperV2, { foreignKey: 'assigned_teacher_id', as: 'assignedExamPapersV2' });
ExamPaperV2.belongsTo(Teacher, { foreignKey: 'assigned_teacher_id', as: 'assignedTeacher' });

ExamEventV2.hasMany(ExamTimetableV2, { foreignKey: 'exam_event_id', as: 'timetableEntries' });
ExamTimetableV2.belongsTo(ExamEventV2, { foreignKey: 'exam_event_id', as: 'event' });

ExamPaperV2.hasOne(ExamTimetableV2, { foreignKey: 'exam_paper_id', as: 'timetable' });
ExamTimetableV2.belongsTo(ExamPaperV2, { foreignKey: 'exam_paper_id', as: 'paper' });

ClassSection.hasMany(ExamTimetableV2, { foreignKey: 'class_id', as: 'examTimetableEntriesV2' });
ExamTimetableV2.belongsTo(ClassSection, { foreignKey: 'class_id', as: 'classSection' });

Subject.hasMany(ExamTimetableV2, { foreignKey: 'subject_id', as: 'examTimetableEntriesV2' });
ExamTimetableV2.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

Teacher.hasMany(ExamTimetableV2, { foreignKey: 'invigilator_teacher_id', as: 'invigilatorEntriesV2' });
ExamTimetableV2.belongsTo(Teacher, { foreignKey: 'invigilator_teacher_id', as: 'invigilator' });

ExamPaperV2.hasMany(MarksEntryV2, { foreignKey: 'exam_paper_id', as: 'marks' });
MarksEntryV2.belongsTo(ExamPaperV2, { foreignKey: 'exam_paper_id', as: 'paper' });

Student.hasMany(MarksEntryV2, { foreignKey: 'student_id', as: 'examMarksV2' });
MarksEntryV2.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

User.hasMany(MarksEntryV2, { foreignKey: 'entered_by', as: 'enteredMarksV2' });
MarksEntryV2.belongsTo(User, { foreignKey: 'entered_by', as: 'enteredBy' });

ExamPaperV2.hasMany(ExamAttendanceV2, { foreignKey: 'exam_paper_id', as: 'attendanceRows' });
ExamAttendanceV2.belongsTo(ExamPaperV2, { foreignKey: 'exam_paper_id', as: 'paper' });

Student.hasMany(ExamAttendanceV2, { foreignKey: 'student_id', as: 'examAttendanceV2' });
ExamAttendanceV2.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

User.hasMany(ExamAttendanceV2, { foreignKey: 'marked_by', as: 'markedAttendanceV2' });
ExamAttendanceV2.belongsTo(User, { foreignKey: 'marked_by', as: 'markedBy' });

Student.hasMany(ResultV2, { foreignKey: 'student_id', as: 'resultsV2' });
ResultV2.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

ExamEventV2.hasMany(ResultV2, { foreignKey: 'exam_event_id', as: 'results' });
ResultV2.belongsTo(ExamEventV2, { foreignKey: 'exam_event_id', as: 'event' });

ResultV2.hasMany(MarksEntryV2, { foreignKey: 'result_id', as: 'details' });
MarksEntryV2.belongsTo(ResultV2, { foreignKey: 'result_id', as: 'result' });

Student.hasMany(DocumentV2, { foreignKey: 'student_id', as: 'documentsV2' });
DocumentV2.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

User.hasMany(DocumentV2, { foreignKey: 'generated_by', as: 'generatedDocumentsV2' });
DocumentV2.belongsTo(User, { foreignKey: 'generated_by', as: 'generatedBy' });

// =====================================================
// CONTENT UPLOADS ASSOCIATIONS
// =====================================================

// =====================================================
// NOTICES ASSOCIATIONS
// =====================================================

// 1. Notice ↔ AudienceTarget (One-to-Many)
Notice.hasMany(AudienceTarget, { foreignKey: 'notice_id', as: 'targets', onDelete: 'CASCADE' });
AudienceTarget.belongsTo(Notice, { foreignKey: 'notice_id', as: 'notice' });

// 1b. Resource ↔ AudienceTarget (One-to-Many)
Resource.hasMany(AudienceTarget, { foreignKey: 'resource_id', as: 'targets', onDelete: 'CASCADE' });
AudienceTarget.belongsTo(Resource, { foreignKey: 'resource_id', as: 'resource' });

// 2. Teacher ↔ Notice (One-to-Many) - created_by
Teacher.hasMany(Notice, { foreignKey: 'created_by', as: 'createdNotices', onDelete: 'SET NULL' });
Notice.belongsTo(Teacher, { foreignKey: 'created_by', as: 'createdBy' });

// 3. ClassSection ↔ AudienceTarget (One-to-Many)
ClassSection.hasMany(AudienceTarget, { foreignKey: 'class_section_id', as: 'audienceTargets', onDelete: 'CASCADE' });
AudienceTarget.belongsTo(ClassSection, { foreignKey: 'class_section_id', as: 'classSection' });

// 4. Subject ↔ AudienceTarget (One-to-Many)
Subject.hasMany(AudienceTarget, { foreignKey: 'subject_id', as: 'audienceTargets', onDelete: 'CASCADE' });
AudienceTarget.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

// =====================================================
// FEES V1 ASSOCIATIONS
// =====================================================

// Academic year and structure relations
AcademicYear.hasMany(FeeStructureV1, { foreignKey: 'academic_year_id', as: 'feeStructures' });
FeeStructureV1.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });

AcademicYear.hasMany(StudentConcessionV1, { foreignKey: 'academic_year_id', as: 'studentConcessions' });
StudentConcessionV1.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'concessionYear' });

// Structure relations
FeeStructureV1.hasMany(FeeStructureItemV1, { foreignKey: 'fee_structure_id', as: 'items' });
FeeStructureItemV1.belongsTo(FeeStructureV1, { foreignKey: 'fee_structure_id', as: 'structure' });

FeeHeadV1.hasMany(FeeStructureItemV1, { foreignKey: 'fee_head_id', as: 'structureItems' });
FeeStructureItemV1.belongsTo(FeeHeadV1, { foreignKey: 'fee_head_id', as: 'feeHead' });

ClassSection.hasMany(FeeStructureV1, { foreignKey: 'class_id', as: 'feeStructuresV1' });
FeeStructureV1.belongsTo(ClassSection, { foreignKey: 'class_id', as: 'classSection' });

FeeStructureV1.hasMany(InstallmentPlanV1, { foreignKey: 'fee_structure_id', as: 'installments' });
InstallmentPlanV1.belongsTo(FeeStructureV1, { foreignKey: 'fee_structure_id', as: 'structure' });

// Assignment relations
Student.hasMany(StudentFeeAssignmentV1, { foreignKey: 'student_id', as: 'feeAssignmentsV1' });
StudentFeeAssignmentV1.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

FeeStructureV1.hasMany(StudentFeeAssignmentV1, { foreignKey: 'fee_structure_id', as: 'assignments' });
StudentFeeAssignmentV1.belongsTo(FeeStructureV1, { foreignKey: 'fee_structure_id', as: 'feeStructure' });

User.hasMany(StudentFeeAssignmentV1, { foreignKey: 'assigned_by', as: 'assignedFeesV1' });
StudentFeeAssignmentV1.belongsTo(User, { foreignKey: 'assigned_by', as: 'assignedBy' });

Student.hasMany(StudentConcessionV1, { foreignKey: 'student_id', as: 'concessionsV1' });
StudentConcessionV1.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

FeeHeadV1.hasMany(StudentConcessionV1, { foreignKey: 'fee_head_id', as: 'studentConcessions' });
StudentConcessionV1.belongsTo(FeeHeadV1, { foreignKey: 'fee_head_id', as: 'feeHead' });

User.hasMany(StudentConcessionV1, { foreignKey: 'approved_by', as: 'approvedConcessionsV1' });
StudentConcessionV1.belongsTo(User, { foreignKey: 'approved_by', as: 'approvedBy' });

// Invoice relations
StudentFeeAssignmentV1.hasMany(FeeInvoiceV1, { foreignKey: 'assignment_id', as: 'invoices' });
FeeInvoiceV1.belongsTo(StudentFeeAssignmentV1, { foreignKey: 'assignment_id', as: 'assignment' });

InstallmentPlanV1.hasMany(FeeInvoiceV1, { foreignKey: 'installment_plan_id', as: 'invoices' });
FeeInvoiceV1.belongsTo(InstallmentPlanV1, { foreignKey: 'installment_plan_id', as: 'installment' });

Student.hasMany(FeeInvoiceV1, { foreignKey: 'student_id', as: 'invoicesV1' });
FeeInvoiceV1.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

User.hasMany(FeeInvoiceV1, { foreignKey: 'waived_by', as: 'waivedInvoicesV1' });
FeeInvoiceV1.belongsTo(User, { foreignKey: 'waived_by', as: 'waivedBy' });

FeeInvoiceV1.hasMany(FeeInvoiceItemV1, { foreignKey: 'invoice_id', as: 'items' });
FeeInvoiceItemV1.belongsTo(FeeInvoiceV1, { foreignKey: 'invoice_id', as: 'invoice' });

FeeHeadV1.hasMany(FeeInvoiceItemV1, { foreignKey: 'fee_head_id', as: 'invoiceItems' });
FeeInvoiceItemV1.belongsTo(FeeHeadV1, { foreignKey: 'fee_head_id', as: 'feeHead' });

// Payment relations
FeeInvoiceV1.hasMany(FeePaymentV1, { foreignKey: 'invoice_id', as: 'payments' });
FeePaymentV1.belongsTo(FeeInvoiceV1, { foreignKey: 'invoice_id', as: 'invoice' });

Student.hasMany(FeePaymentV1, { foreignKey: 'student_id', as: 'feePaymentsV1' });
FeePaymentV1.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

User.hasMany(FeePaymentV1, { foreignKey: 'collected_by', as: 'collectedPaymentsV1' });
FeePaymentV1.belongsTo(User, { foreignKey: 'collected_by', as: 'collector' });

// Refund relations
FeePaymentV1.hasMany(PaymentRefundV1, { foreignKey: 'payment_id', as: 'refunds' });
PaymentRefundV1.belongsTo(FeePaymentV1, { foreignKey: 'payment_id', as: 'payment' });

Student.hasMany(PaymentRefundV1, { foreignKey: 'student_id', as: 'refundsV1' });
PaymentRefundV1.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

User.hasMany(PaymentRefundV1, { foreignKey: 'requested_by', as: 'requestedRefundsV1' });
PaymentRefundV1.belongsTo(User, { foreignKey: 'requested_by', as: 'requestedBy' });

User.hasMany(PaymentRefundV1, { foreignKey: 'approved_by', as: 'approvedRefundsV1' });
PaymentRefundV1.belongsTo(User, { foreignKey: 'approved_by', as: 'approvedBy' });

// Reminder relations
FeeInvoiceV1.hasMany(FeeReminderV1, { foreignKey: 'invoice_id', as: 'reminders' });
FeeReminderV1.belongsTo(FeeInvoiceV1, { foreignKey: 'invoice_id', as: 'invoice' });

Student.hasMany(FeeReminderV1, { foreignKey: 'student_id', as: 'feeRemindersV1' });
FeeReminderV1.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// Income and expense entry relations
AcademicYear.hasMany(IncomeEntryV1, { foreignKey: 'academic_year_id', as: 'incomeEntries' });
IncomeEntryV1.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });

FeePaymentV1.hasMany(IncomeEntryV1, { foreignKey: 'fee_payment_id', as: 'incomeEntries' });
IncomeEntryV1.belongsTo(FeePaymentV1, { foreignKey: 'fee_payment_id', as: 'feePayment' });

User.hasMany(IncomeEntryV1, { foreignKey: 'recorded_by', as: 'recordedIncomeEntries' });
IncomeEntryV1.belongsTo(User, { foreignKey: 'recorded_by', as: 'recordedBy' });

AcademicYear.hasMany(ExpenseEntryV1, { foreignKey: 'academic_year_id', as: 'expenseEntries' });
ExpenseEntryV1.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });

User.hasMany(ExpenseEntryV1, { foreignKey: 'recorded_by', as: 'recordedExpenseEntries' });
ExpenseEntryV1.belongsTo(User, { foreignKey: 'recorded_by', as: 'recordedBy' });


module.exports = {
  sequelize,
  User,
  ClassSection,
  Student,
  Teacher,
  Staff,
  Subject,
  studentsAttendances,
  StudentParent,
  ClassTimetable,
  ClassTimetableSetting,
  ClassTimeSlot,
  AdmissionEnquiry,
  Holiday,

  // Fee Models (V1)
  AcademicYear,
  FeeHeadV1,
  FeeStructureV1,
  FeeStructureItemV1,
  InstallmentPlanV1,
  StudentFeeAssignmentV1,
  StudentConcessionV1,
  FeeInvoiceV1,
  FeeInvoiceItemV1,
  FeePaymentV1,
  PaymentRefundV1,
  FeeReminderV1,
  IncomeEntryV1,
  ExpenseEntryV1,
  

  // Exam Management Models (V2)
  ExamTypeV2,
  ExamEventV2,
  ExamPaperV2,
  ExamTimetableV2,
  MarksEntryV2,
  ExamAttendanceV2,
  ResultV2,
  DocumentTemplateV2,
  DocumentV2,

  // Student Leave
  StudentLeave,

  // Content Uploads
  Resource,

  // Notices
  Notice,
  AudienceTarget
};
