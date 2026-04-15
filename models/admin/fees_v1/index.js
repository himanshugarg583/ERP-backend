const { AcademicYear } = require('./AcademicYear');
const { FeeHeadV1 } = require('./FeeHead');
const { FeeStructureV1 } = require('./FeeStructure');
const { FeeStructureItemV1 } = require('./FeeStructureItem');
const { InstallmentPlanV1 } = require('./InstallmentPlan');
const { StudentFeeAssignmentV1 } = require('./StudentFeeAssignment');
const { ConcessionV1 } = require('./Concession');
const { StudentConcessionV1 } = require('./StudentConcession');
const { FeeInvoiceV1 } = require('./FeeInvoice');
const { FeeInvoiceItemV1 } = require('./FeeInvoiceItem');
const { FeePaymentV1 } = require('./FeePayment');
const { PaymentRefundV1 } = require('./PaymentRefund');
const { FeeReminderV1 } = require('./FeeReminder');
const { FeeGatewayOrderV1 } = require('./FeeGatewayOrder');
const { FeeWebhookEventV1 } = require('./FeeWebhookEvent');
const { StudentWalletV1 } = require('./StudentWallet');
const { SchoolFeeSettingV1 } = require('./SchoolFeeSetting');
const { FeeNumberSequenceV1 } = require('./FeeNumberSequence');
const { Student } = require('../Student');
const { User } = require('../user');

// AcademicYear relations
AcademicYear.hasMany(FeeStructureV1, { foreignKey: 'academic_year_id', as: 'feeStructures' });
FeeStructureV1.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
AcademicYear.hasMany(StudentFeeAssignmentV1, { foreignKey: 'academic_year_id', as: 'assignments' });
StudentFeeAssignmentV1.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
AcademicYear.hasMany(StudentConcessionV1, { foreignKey: 'academic_year_id', as: 'studentConcessions' });
StudentConcessionV1.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'concessionYear' });
AcademicYear.hasMany(FeeInvoiceV1, { foreignKey: 'academic_year_id', as: 'invoices' });
FeeInvoiceV1.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'invoiceYear' });

// Structure relations
FeeStructureV1.hasMany(FeeStructureItemV1, { foreignKey: 'fee_structure_id', as: 'items' });
FeeStructureItemV1.belongsTo(FeeStructureV1, { foreignKey: 'fee_structure_id', as: 'structure' });
FeeHeadV1.hasMany(FeeStructureItemV1, { foreignKey: 'fee_head_id', as: 'structureItems' });
FeeStructureItemV1.belongsTo(FeeHeadV1, { foreignKey: 'fee_head_id', as: 'feeHead' });
FeeStructureV1.hasMany(InstallmentPlanV1, { foreignKey: 'fee_structure_id', as: 'installments' });
InstallmentPlanV1.belongsTo(FeeStructureV1, { foreignKey: 'fee_structure_id', as: 'structure' });

// Assignment relations
Student.hasMany(StudentFeeAssignmentV1, { foreignKey: 'student_id', as: 'feeAssignmentsV1' });
StudentFeeAssignmentV1.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
FeeStructureV1.hasMany(StudentFeeAssignmentV1, { foreignKey: 'fee_structure_id', as: 'assignments' });
StudentFeeAssignmentV1.belongsTo(FeeStructureV1, { foreignKey: 'fee_structure_id', as: 'structure' });
User.hasMany(StudentFeeAssignmentV1, { foreignKey: 'assigned_by', as: 'assignedFeesV1' });
StudentFeeAssignmentV1.belongsTo(User, { foreignKey: 'assigned_by', as: 'assignedBy' });

// Concession relations
ConcessionV1.hasMany(StudentConcessionV1, { foreignKey: 'concession_id', as: 'applications' });
StudentConcessionV1.belongsTo(ConcessionV1, { foreignKey: 'concession_id', as: 'concession' });
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

// Reminder + order + wallet
FeeInvoiceV1.hasMany(FeeReminderV1, { foreignKey: 'invoice_id', as: 'reminders' });
FeeReminderV1.belongsTo(FeeInvoiceV1, { foreignKey: 'invoice_id', as: 'invoice' });
Student.hasMany(FeeReminderV1, { foreignKey: 'student_id', as: 'feeRemindersV1' });
FeeReminderV1.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
FeeInvoiceV1.hasMany(FeeGatewayOrderV1, { foreignKey: 'invoice_id', as: 'gatewayOrders' });
FeeGatewayOrderV1.belongsTo(FeeInvoiceV1, { foreignKey: 'invoice_id', as: 'invoice' });
Student.hasMany(FeeGatewayOrderV1, { foreignKey: 'student_id', as: 'gatewayOrdersV1' });
FeeGatewayOrderV1.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Student.hasOne(StudentWalletV1, { foreignKey: 'student_id', as: 'walletV1' });
StudentWalletV1.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

module.exports = {
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
  FeeNumberSequenceV1
};
