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

const { IncomeExpense } = require('./admin/fees/IncomeExpense');
const { FeeHead } = require('./admin/fees/FeeHead');
const { FeeStructure } = require('./admin/fees/FeeStructure');
const { FeeStructureDetail } = require('./admin/fees/FeeStructureDetail');
const { StudentFee } = require('./admin/fees/StudentFee');
const { FeePayment } = require('./admin/fees/FeePayment');
const { FeeInstallment } = require('./admin/fees/FeeInstallment');

// exam
const { ExamTerm } = require('./admin/exam/examTerm');
const { Exam } = require('./admin/exam/exam');
const { ExamSchedule } = require('./admin/exam/examSchedule');
const { ExamTimetable } = require('./admin/exam/examTimetable');
const { ExamMark } = require('./admin/exam/examMark');

// student leave
const { StudentLeave } = require('./admin/StudentLeave');


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

// Associations
ClassSection.hasMany(ClassTimetable, { foreignKey: 'class_section_id', as: 'timetable' });
ClassTimetable.belongsTo(ClassSection, { foreignKey: 'class_section_id', as: 'classSection' });

Subject.hasMany(ClassTimetable, { foreignKey: 'subject_id', as: 'timetableEntries' });
ClassTimetable.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

Teacher.hasMany(ClassTimetable, { foreignKey: 'teacher_id', as: 'timetableEntries' });
ClassTimetable.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });

// =====================================================
// FEE MANAGEMENT ASSOCIATIONS
// =====================================================

// 1. ClassSection ↔ FeeStructure (One-to-Many)
ClassSection.hasMany(FeeStructure, {foreignKey: 'class_section_id', as: 'feeStructures', onDelete: 'CASCADE'});
FeeStructure.belongsTo(ClassSection, { foreignKey: 'class_section_id', as: 'classSection'});

// 2. FeeHead ↔ FeeStructureDetail (One-to-Many)
FeeHead.hasMany(FeeStructureDetail, { foreignKey: 'fee_head_id', as: 'structureDetails', onDelete: 'RESTRICT' });

FeeStructureDetail.belongsTo(FeeHead, { foreignKey: 'fee_head_id',  as: 'feeHead' });

// 3. FeeStructure ↔ FeeStructureDetail (One-to-Many)
FeeStructure.hasMany(FeeStructureDetail, { foreignKey: 'fee_structure_id',  as: 'feeDetails', onDelete: 'CASCADE' });
FeeStructureDetail.belongsTo(FeeStructure, { foreignKey: 'fee_structure_id',  as: 'feeStructure' });

// 4. Student ↔ StudentFee (One-to-Many)
Student.hasMany(StudentFee, { foreignKey: 'student_id', as: 'studentFees', onDelete: 'CASCADE' });
StudentFee.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// 5. FeeStructure ↔ StudentFee (One-to-Many)
FeeStructure.hasMany(StudentFee, { foreignKey: 'fee_structure_id', as: 'studentFees', onDelete: 'RESTRICT' });
StudentFee.belongsTo(FeeStructure, { foreignKey: 'fee_structure_id', as: 'feeStructure' });

// 6. StudentFee ↔ FeeInstallment (One-to-Many)
StudentFee.hasMany(FeeInstallment, { foreignKey: 'student_fee_id', as: 'installments', onDelete: 'CASCADE' });
FeeInstallment.belongsTo(StudentFee, { foreignKey: 'student_fee_id', as: 'studentFee' });
  

// 7. Student ↔ FeePayment (One-to-Many)
Student.hasMany(FeePayment, { foreignKey: 'student_id',  as: 'feePayments', onDelete: 'CASCADE'});
FeePayment.belongsTo(Student, { foreignKey: 'student_id',  as: 'student'});

// 8. User ↔ FeePayment (One-to-Many) - for created_by tracking
User.hasMany(FeePayment, { foreignKey: 'created_by',as: 'processedPayments',onDelete: 'SET NULL'});
FeePayment.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });

// 9. FeePayment Self-Referencing (for refunds)
FeePayment.belongsTo(FeePayment, {foreignKey: 'parent_payment_id',  as: 'originalPayment', onDelete: 'SET NULL'});
FeePayment.hasMany(FeePayment, {  foreignKey: 'parent_payment_id',  as: 'refunds', onDelete: 'SET NULL'});

// 10. User ↔ StudentFee (One-to-Many) - for created_by tracking  
User.hasMany(StudentFee, { foreignKey: 'created_by',  as: 'createdStudentFees', onDelete: 'SET NULL'});
StudentFee.belongsTo(User, { foreignKey: 'created_by',  as: 'createdByUser'});

// 11. User ↔ FeeStructure (One-to-Many) - for created_by tracking
User.hasMany(FeeStructure, { foreignKey: 'created_by', as: 'createdFeeStructures', onDelete: 'SET NULL' });

FeeStructure.belongsTo(User, {  foreignKey: 'created_by', as: 'createdByUser' });

// exam
// =====================================================
// EXAM MANAGEMENT ASSOCIATIONS
// =====================================================

// 1️⃣ ExamTerm ↔ Exam (One-to-Many)
ExamTerm.hasMany(Exam, { foreignKey: 'term_id', as: 'exams', onDelete: 'CASCADE' });
Exam.belongsTo(ExamTerm, { foreignKey: 'term_id', as: 'term' });

// 2️⃣ Exam ↔ ExamSchedule (One-to-Many)
Exam.hasMany(ExamSchedule, { foreignKey: 'exam_id', as: 'examSchedules', onDelete: 'CASCADE' });
ExamSchedule.belongsTo(Exam, { foreignKey: 'exam_id', as: 'exam' });

// 3️⃣ ClassSection ↔ ExamSchedule (One-to-Many)
ClassSection.hasMany(ExamSchedule, { foreignKey: 'class_section_id', as: 'examSchedules', onDelete: 'CASCADE' });
ExamSchedule.belongsTo(ClassSection, { foreignKey: 'class_section_id', as: 'classSection' });

// 4️⃣ ExamSchedule ↔ ExamTimetable (One-to-Many)
ExamSchedule.hasMany(ExamTimetable, { foreignKey: 'exam_schedule_id', as: 'examTimetables', onDelete: 'CASCADE' });
ExamTimetable.belongsTo(ExamSchedule, { foreignKey: 'exam_schedule_id', as: 'examSchedule' });

// 5️⃣ Subject ↔ ExamTimetable (One-to-Many)
Subject.hasMany(ExamTimetable, { foreignKey: 'subject_id', as: 'examTimetables', onDelete: 'CASCADE' });
ExamTimetable.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

// 6️⃣ Teacher ↔ ExamTimetable (Invigilator)
Teacher.hasMany(ExamTimetable, { foreignKey: 'invigilator_teacher_id', as: 'invigilatedExams', onDelete: 'SET NULL' });
ExamTimetable.belongsTo(Teacher, { foreignKey: 'invigilator_teacher_id', as: 'invigilator' });

// 7️⃣ ExamSchedule ↔ ExamMark (One-to-Many)
ExamSchedule.hasMany(ExamMark, { foreignKey: 'exam_schedule_id', as: 'examMarks', onDelete: 'CASCADE' });
ExamMark.belongsTo(ExamSchedule, { foreignKey: 'exam_schedule_id', as: 'examSchedule' });

// 8️⃣ Student ↔ ExamMark (One-to-Many)
Student.hasMany(ExamMark, { foreignKey: 'student_id', as: 'examMarks', onDelete: 'CASCADE' });
ExamMark.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// 9️⃣ Subject ↔ ExamMark (One-to-Many)
Subject.hasMany(ExamMark, { foreignKey: 'subject_id', as: 'subjectMarks', onDelete: 'CASCADE' });
ExamMark.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });


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
  
  // Fee Management Models
  IncomeExpense,
  FeeHead,
  FeeStructure,
  FeeStructureDetail,
  StudentFee,
  FeePayment,
  FeeInstallment,

  // Exam Management Models
  ExamTerm,
  Exam,
  ExamSchedule,
  ExamTimetable,
  ExamMark,

  // Student Leave
  StudentLeave
};
