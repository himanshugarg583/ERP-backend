const sequelize = require('../config/db');

// Import models
const {User} = require('../models/admin/user');
const {ClassSection} = require('../models/admin/Classsection');
const {Student} = require('../models/admin/Student');
const {Teacher} = require('../models/admin/Teacher');
const {Subject} = require('./admin/subject');
const {studentsAttendances} = require('./admin/studentsAttendances');
const {StudentParent} = require('./admin/student_parent');
const {ClassTimetable} = require('./admin/ClassTimetable');

// NEW: fees & payments models (adjust paths/names to your files)
const { fee_structures } = require('./admin/fees/fee_structures');
const { StudentFee } = require('./admin/fees/StudentFee');
const { StudentFeeInstallment } = require('./admin/fees/StudentFeeInstallment');
const { FeePayment } = require('./admin/fees/FeePayment');
// (Optional ledger table; no FKs in SQL dump)
const { IncomeExpense } = require('./admin/fees/IncomeExpense');
// User ↔ Student
User.hasOne(Student, { foreignKey: 'user_id', as: "studentDetails" });
Student.belongsTo(User, { foreignKey: 'user_id' });

// Student → ParentDetail
Student.hasOne(StudentParent, { foreignKey: "student_id", as: "parentDetails" });
StudentParent.belongsTo(Student, { foreignKey: "student_id", as: "studentDetails" });

// User ↔ Teacher
User.hasOne(Teacher, { foreignKey: 'user_id',as: "teacherDetails" });
Teacher.belongsTo(User, { foreignKey: 'user_id' });

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
User.hasMany(studentsAttendances, { foreignKey: 'student_id', as: 'attendances' });
studentsAttendances.belongsTo(User, { foreignKey: 'student_id', as: 'student' });

// Attendance ↔ ClassSection
ClassSection.hasMany(studentsAttendances, { foreignKey: 'class_section_id', as: 'class_attendance' });
studentsAttendances.belongsTo(ClassSection, { foreignKey: 'class_section_id', as: 'class_section' });

// Associations
ClassSection.hasMany(ClassTimetable, { foreignKey: 'class_section_id', as: 'timetable' });
ClassTimetable.belongsTo(ClassSection, { foreignKey: 'class_section_id', as: 'classSection' });

Subject.hasMany(ClassTimetable, { foreignKey: 'subject_id', as: 'timetableEntries' });
ClassTimetable.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

Teacher.hasMany(ClassTimetable, { foreignKey: 'teacher_id', as: 'timetableEntries' });
ClassTimetable.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });

// fee
ClassSection.hasMany(fee_structures, {foreignKey: 'class_section_id', as: 'feeStructures',});
fee_structures.belongsTo(ClassSection, {foreignKey: 'class_section_id', as: 'classSection',});

// StudentFee ↔ Student (student_fees.student_id → students.id)
Student.hasMany(StudentFee, {foreignKey: 'student_id',as: 'studentFees',});
StudentFee.belongsTo(Student, {foreignKey: 'student_id',as: 'student',});

// StudentFee ↔ FeeStructure (student_fees.fee_structure_id → fee_structures.id)
fee_structures.hasMany(StudentFee, {foreignKey: 'fee_structure_id',as: 'studentFees',});
StudentFee.belongsTo(fee_structures, {foreignKey: 'fee_structure_id', as: 'feeStructure',});

// StudentFeeInstallment ↔ StudentFee (student_fee_installments.student_fee_id → student_fees.id)
StudentFee.hasMany(StudentFeeInstallment, {foreignKey: 'student_fee_id',as: 'installments',});
StudentFeeInstallment.belongsTo(StudentFee, {foreignKey: 'student_fee_id',as: 'studentFee',});

// FeePayment ↔ Student (fee_payments.student_id → students.id, nullable in SQL)
Student.hasMany(FeePayment, {foreignKey: 'student_id', as: 'feePayments',});
FeePayment.belongsTo(Student, {foreignKey: 'student_id',as: 'student', });

module.exports = {
  sequelize,
  User,
  ClassSection,
  Student,
  Teacher,
  Subject,
  studentsAttendances,
  StudentParent,
  ClassTimetable,
   // NEW exports
  fee_structures,
  StudentFee,
  StudentFeeInstallment,
  FeePayment,
  IncomeExpense
};
