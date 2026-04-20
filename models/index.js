const sequelize = require('../config/db');

// Import models
const { User } = require('./admin/user');
const { ClassSection } = require('./admin/Classsection');
const { Student } = require('./admin/Student');
const { Teacher } = require('./admin/Teacher');
const { Staff } = require('./admin/Staff');
const {Subject} = require('./admin/subject');
const {studentsAttendances} = require('./admin/studentsAttendances');
const {StudentParent} = require('./admin/student_parent');
const {ClassTimetable} = require('./admin/ClassTimetable');
const {ClassTimetableSetting} = require('./admin/ClassTimetableSetting');
const {ClassTimeSlot} = require('./admin/ClassTimeSlot');
const {AdmissionEnquiry} = require('./admin/AdmissionEnquiry');
const {Holiday} = require('./admin/Holiday');

const { IncomeExpense } = require('./admin/accounting/IncomeExpense');

// exam v2
const { ExamTypeV2 } = require('./admin/exam/ExamTypeV2');
const { ExamEventV2 } = require('./admin/exam/ExamEventV2');
const { ExamPaperV2 } = require('./admin/exam/ExamPaperV2');
const { ExamTimetableV2 } = require('./admin/exam/ExamTimetableV2');
const { MarksEntryV2 } = require('./admin/exam/MarksEntryV2');
const { ExamAttendanceV2 } = require('./admin/exam/ExamAttendanceV2');
const { ResultV2 } = require('./admin/exam/ResultV2');
const { DocumentTemplateV2 } = require('./admin/exam/DocumentTemplateV2');
const { DocumentV2 } = require('./admin/exam/DocumentV2');

// student leave
const { StudentLeave } = require('./admin/StudentLeave');

// content uploads
const { Resource } = require('./admin/content uploads/resource');

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
  
  // Accounting Models
  IncomeExpense,

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
