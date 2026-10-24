# School ERP Backend - Frontend API Documentation
> **Note**: Fees aur Exam modules is documentation se excluded hain jaisa specify kiya gaya tha. Baaki sabhi modules (Auth, Admin, Teacher, Student, Accountant) ki detailed APIs niche di gayi hain.

---

## 📌 Global Configuration & Conventions

### 1. Base URL
- **Local Development**: `http://localhost:5001`
- **Production**: Configured in frontend `.env` (e.g. `https://api.yourdomain.com`)

### 2. Authentication Header
Tamam protected routes ke liye Authorization header mandatory hai:
```http
Authorization: Bearer <JWT_TOKEN>
```

### 3. Request Headers
- JSON payloads ke liye:
  ```http
  Content-Type: application/json
  ```
- File uploads (Multiform data) ke liye:
  ```http
  Content-Type: multipart/form-data
  ```

### 4. Standard Response Formats

#### ✅ Success Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... }
}
```

#### ❌ Centralized Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Human readable error message",
  "error": {
    "code": "BAD_REQUEST",
    "message": "Human readable error message",
    "details": null
  },
  "details": null
}
```

---

## 📑 Table of Contents
1. [Authentication & Authorization](#1-authentication--authorization)
2. [Admin: HR & Staff Management](#2-admin-hr--staff-management)
3. [Admin: Student Management](#3-admin-student-management)
4. [Admin: Admission Enquiry](#4-admin-admission-enquiry)
5. [Admin: Academics (Class & Sections)](#5-admin-academics-class--sections)
6. [Admin: Academics (Subjects)](#6-admin-academics-subjects)
7. [Admin: Student Attendance](#7-admin-student-attendance)
8. [Admin: Student Leaves Management](#8-admin-student-leaves-management)
9. [Admin: School Holidays](#9-admin-school-holidays)
10. [Admin: Class Timetable & Scheduling](#10-admin-class-timetable--scheduling)
11. [Admin: Certificates & ID Cards](#11-admin-certificates--id-cards)
12. [Admin: Notice Board](#12-admin-notice-board)
13. [Admin: Content & Resources Upload](#13-admin-content--resources-upload)
14. [Admin: Financial (Income & Expense)](#14-admin-financial-income--expense)
15. [Admin: Dashboard & Statistics](#15-admin-dashboard--statistics)
16. [Admin: Profile & Settings](#16-admin-profile--settings)
17. [Teacher: Profile & Settings](#17-teacher-profile--settings)
18. [Teacher: Dashboard](#18-teacher-dashboard)
19. [Teacher: Timetable](#19-teacher-timetable)
20. [Teacher: Subjects](#20-teacher-subjects)
21. [Teacher: Class Attendance](#21-teacher-class-attendance)
22. [Teacher: Notice Board](#22-teacher-notice-board)
23. [Teacher: Content & Resources](#23-teacher-content--resources)
24. [Student: Profile & Settings](#24-student-profile--settings)
25. [Student: Dashboard](#25-student-dashboard)
26. [Student: Attendance & Timetable](#26-student-attendance--timetable)
27. [Student: Leaves](#27-student-leaves)
28. [Student: Notices](#28-student-notices)
29. [Student: Study Resources & Assignments](#29-student-study-resources--assignments)
30. [Accountant: Profile & Settings](#30-accountant-profile--settings)
31. [Accountant: Dashboard & Analytics](#31-accountant-dashboard--analytics)

---

## 1. Authentication & Authorization

### 1.1 User Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "Password@123"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Welcome back principal login",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...",
  "role": "admin",
  "user": {
    "id": 1,
    "name": "Super Admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### 1.2 User Registration
- **Endpoint**: `POST /api/auth/register`
- **Access**: Public (or internal)
- **Request Body**:
```json
{
  "name": "Rohan Sharma",
  "email": "rohan@example.com",
  "password": "Password@123",
  "role": "student"
}
```
- **Success Response (201 Created)**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "User created successfully!",
  "user": {
    "id": 12,
    "name": "Rohan Sharma",
    "email": "rohan@example.com",
    "role": "student"
  }
}
```

### 1.3 User Logout
- **Endpoint**: `POST /api/auth/logout`
- **Access**: Authenticated
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out successfully"
}
```

---

## 2. Admin: HR & Staff Management

### 2.1 Add Teacher
- **Endpoint**: `POST /api/admin/register/addTeacher` (or `POST /admin/hr/register/addTeacher`)
- **Access**: Admin
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `name` *(string, required)*
  - `email` *(string, required)*
  - `password` *(string, required)*
  - `gender` *(string, required)*: `male` / `female` / `other`
  - `mobile` *(string, required)*
  - `joining_date` *(date string YYYY-MM-DD, required)*
  - `dob` *(date string YYYY-MM-DD)*
  - `qualification` *(string)*
  - `currentaddress` *(string)*
  - `permenantaddress` *(string)*
  - `salary` *(number)*
  - `image` *(File, optional)*: JPG, PNG
- **Success Response (201 Created)**

### 2.2 Get All Teachers
- **Endpoint**: `GET /api/admin/getAllTeachers` (or `GET /admin/hr/getAllTeachers`)
- **Access**: Admin
- **Success Response (200 OK)**: Returns array of active teachers with User profile info.

### 2.3 Get Single Teacher
- **Endpoint**: `GET /api/admin/getSingleTeacher/:userId`
- **Access**: Admin

### 2.4 Update Teacher
- **Endpoint**: `PUT /api/admin/updateTeacher/:userId`
- **Access**: Admin
- **Request Body**: Same fields as Add Teacher (optional).

### 2.5 Soft Delete Teacher
- **Endpoint**: `DELETE /api/admin/softDeleteTeacher/:userId`
- **Access**: Admin

### 2.6 Reactivate Deleted Teacher
- **Endpoint**: `PATCH /api/admin/reactivateTeacher/:userId`
- **Access**: Admin

### 2.7 Get Deleted Teachers List
- **Endpoint**: `GET /api/admin/getdeleteTeachers`
- **Access**: Admin

### 2.8 Get Teacher Stats
- **Endpoint**: `GET /api/admin/getTeacherStats`
- **Access**: Admin

### 2.9 Get Teacher Credentials List
- **Endpoint**: `GET /admin/hr/getTeacherCredentials`
- **Access**: Admin

### 2.10 Get Teacher Salary Details
- **Endpoint**: `GET /admin/hr/getTeacherSalary`
- **Access**: Admin

### 2.11 Add Other Staff (Accountant, HR, Librarian, etc.)
- **Endpoint**: `POST /admin/hr/register/addStaff`
- **Access**: Admin
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `name`, `email`, `password`, `joining_date`, `mobile` *(required)*
  - `role` *(required)*: `'staff' | 'accountant' | 'hr' | 'librarian' | 'admission_officer' | 'transport_manager' | 'hostel_warden'`
  - `designation`, `dob`, `gender`, `qualification`, `salary`, `currentaddress`, `permenantaddress`
  - `image` *(File)*

### 2.12 Get All Staff
- **Endpoint**: `GET /admin/hr/getAllStaff`
- **Access**: Admin

---

## 3. Admin: Student Management

### 3.1 Add Student
- **Endpoint**: `POST /admin/studentInfo/addStudent`
- **Access**: Admin
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `name`, `email`, `password`, `gender` *(required)*
  - `roll_number` *(string)*
  - `class_section_id` *(number/id)*
  - `dob`, `admission_date` *(YYYY-MM-DD)*
  - `phone_no`, `Aadhar_no`, `address`, `previous_school_name`
  - `father_name`, `mother_name`, `father_phone`, `mother_phone`, `parent_email_id`, `father_occupation`, `mother_occupation`
  - **Files**:
    - `image` *(Photo)*
    - `aadhar_card` *(File)*
    - `marksheet` *(File)*
    - `tc` *(Transfer Certificate File)*
    - `sign` *(Signature File)*

### 3.2 Get All Students
- **Endpoint**: `GET /admin/studentInfo/getAllStudents`
- **Access**: Admin
- **Query Params**: `?page=1&limit=20&search=keyword`

### 3.3 Get Single Student
- **Endpoint**: `GET /admin/studentInfo/getSingleStudent/:student_id`
- **Access**: Admin

### 3.4 Update Student
- **Endpoint**: `PATCH /admin/studentInfo/updateStudent/:student_id`
- **Access**: Admin

### 3.5 Delete Student
- **Endpoint**: `DELETE /admin/studentInfo/deleteStudent/:student_id`
- **Access**: Admin

### 3.6 Student Statistics
- **Endpoint**: `GET /admin/studentInfo/getStudentStats`
- **Access**: Admin

### 3.7 Class-wise Student Statistics
- **Endpoint**: `GET /admin/studentInfo/getClassWiseStudentStats`
- **Access**: Admin

### 3.8 Student Credentials
- **Endpoint**: `GET /admin/studentInfo/getStudentCredentials`
- **Access**: Admin

### 3.9 Student Class & Parent Reports
- **Endpoints**:
  - `GET /admin/studentInfo/getStudentReport/:class_id`
  - `GET /admin/studentInfo/getParentReport/:class_id`

---

## 4. Admin: Admission Enquiry

### 4.1 Create Admission Enquiry
- **Endpoint**: `POST /api/admissionenquiry/createEnquiry`
- **Access**: Admin
- **Request Body**:
```json
{
  "name": "Amit Kumar",
  "phone": "9876543210",
  "email": "amit@example.com",
  "className": "10th",
  "parentName": "Suresh Kumar",
  "address": "Delhi, India",
  "oldSchool": "St. Xavier",
  "description": "Looking for admission in Science stream",
  "source": "Website",
  "status": "pending",
  "date": "2026-03-01"
}
```

### 4.2 Get All Enquiries
- **Endpoint**: `GET /api/admissionenquiry/getAllEnquiries`
- **Access**: Admin

### 4.3 Get Enquiry By ID
- **Endpoint**: `GET /api/admissionenquiry/getEnquiryById/:id`
- **Access**: Admin

### 4.4 Update Enquiry
- **Endpoint**: `PUT /api/admissionenquiry/updateEnquiry/:enquiryId`
- **Access**: Admin
- **Request Body**: Any enquiry fields to update (`status`: `approved` / `rejected` / `pending`, etc.)

### 4.5 Delete Enquiry
- **Endpoint**: `DELETE /api/admissionenquiry/deleteEnquiry/:id`
- **Access**: Admin

### 4.6 Get Enquiry Count Summary
- **Endpoint**: `GET /api/admissionenquiry/getEnquiryCount`
- **Access**: Admin

---

## 5. Admin: Academics (Class & Sections)

### 5.1 Create Class Section
- **Endpoint**: `POST /api/Classsection/createClass`
- **Access**: Admin
- **Request Body**:
```json
{
  "class_name": "Class 10",
  "section_name": "A",
  "room_no": "101",
  "capacity": 45,
  "teacher_id": 2
}
```

### 5.2 Get All Class Sections
- **Endpoint**: `GET /api/Classsection/getAllClassSections`
- **Access**: Admin / Staff / Teachers

### 5.3 Update Class Section
- **Endpoint**: `PUT /api/Classsection/updateClassSection/:id`
- **Access**: Admin

### 5.4 Delete Class Section
- **Endpoint**: `DELETE /api/Classsection/DeleteClassSection/:id`
- **Access**: Admin

### 5.5 Assign Class Teacher
- **Endpoint**: `POST /api/Classsection/assignClassTeacher`
- **Access**: Admin
- **Request Body**:
```json
{
  "class_section_id": 3,
  "teacher_id": 5
}
```

---

## 6. Admin: Academics (Subjects)

### 6.1 Add Subject
- **Endpoint**: `POST /admin/Subject/addSubject`
- **Access**: Admin
- **Request Body**:
```json
{
  "subject_name": "Mathematics",
  "subject_code": "MATH101",
  "class_section_id": 3,
  "teacher_id": 5
}
```

### 6.2 Get All Subjects With Details
- **Endpoint**: `GET /admin/Subject/getAllSubjectsWithDetails`
- **Access**: Admin

### 6.3 Get Subjects by Class Section
- **Endpoint**: `GET /admin/Subject/getSubjectsByClassSection/:class_section_id`
- **Access**: Admin / Teachers

### 6.4 Get Single Subject
- **Endpoint**: `GET /admin/Subject/getSingleSubject/:id`
- **Access**: Admin

### 6.5 Update Subject
- **Endpoint**: `PUT /admin/Subject/updateSubject/:id`
- **Access**: Admin

### 6.6 Delete Subject
- **Endpoint**: `DELETE /admin/Subject/deleteSubject/:id`
- **Access**: Admin

---

## 7. Admin: Student Attendance

### 7.1 Get Available Classes
- **Endpoint**: `GET /admin/studentsAttendance/getAllClasses`
- **Access**: Admin

### 7.2 Get Students by Class
- **Endpoint**: `GET /admin/studentsAttendance/getStudentsByClass/:class_id`
- **Access**: Admin

### 7.3 Mark Class Attendance (Admin)
- **Endpoint**: `POST /admin/studentsAttendance/markClassAttendance`
- **Access**: Admin
- **Request Body**:
```json
{
  "class_section_id": 1,
  "date": "2026-03-01",
  "attendances": [
    { "student_id": 10, "status": "present" },
    { "student_id": 11, "status": "absent" },
    { "student_id": 12, "status": "late" }
  ]
}
```

### 7.4 Get Class Attendance By Date
- **Endpoint**: `GET /admin/studentsAttendance/getClassAttendanceByDate?class_section_id=1&date=2026-03-01`
- **Access**: Admin

### 7.5 Attendance Report (Daily)
- **Endpoint**: `GET /admin/studentsAttendance/attendanceReport?class_id=1&date=2026-03-01`
- **Access**: Admin

### 7.6 Monthly Attendance Report
- **Endpoint**: `GET /admin/studentsAttendance/monthlyAttendanceReport?class_id=1&month=3&year=2026`
- **Access**: Admin

### 7.7 Class-wise Attendance Summary
- **Endpoint**: `GET /admin/studentsAttendance/classWiseSummary?date=2026-03-01`
- **Access**: Admin

---

## 8. Admin: Student Leaves Management

### 8.1 Apply Leave (On behalf of Student)
- **Endpoint**: `POST /admin/studentLeave/applyLeave`
- **Access**: Admin
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `student_id` *(number, required)*
  - `start_date` *(YYYY-MM-DD, required)*
  - `end_date` *(YYYY-MM-DD, required)*
  - `reason` *(string, required)*
  - `attachment` *(File, optional)*

### 8.2 Get All Leaves
- **Endpoint**: `GET /admin/studentLeave/getAllLeaves`
- **Access**: Admin
- **Query Params**: `?status=pending&class_section_id=1`

### 8.3 Get Single Leave Details
- **Endpoint**: `GET /admin/studentLeave/getLeave/:id`
- **Access**: Admin

### 8.4 Update Leave Status (Approve / Reject)
- **Endpoint**: `PUT /admin/studentLeave/updateLeaveStatus/:id`
- **Access**: Admin
- **Request Body**:
```json
{
  "status": "approved",
  "admin_remarks": "Leave approved for medical reasons"
}
```
*(Status options: `approved`, `rejected`)*

### 8.5 Delete Leave Application
- **Endpoint**: `DELETE /admin/studentLeave/deleteLeave/:id`
- **Access**: Admin

---

## 9. Admin: School Holidays

### 9.1 Create Holiday
- **Endpoint**: `POST /admin/holiday/createHoliday`
- **Access**: Admin
- **Request Body**:
```json
{
  "holiday_date": "2026-03-25",
  "reason": "Holi Festival",
  "description": "School will remain closed for Holi festival"
}
```

### 9.2 Get All Holidays
- **Endpoint**: `GET /admin/holiday/getAllHolidays`
- **Access**: Admin / Teachers / Students

### 9.3 Get Holiday By Date
- **Endpoint**: `GET /admin/holiday/getHolidayByDate?date=2026-03-25`
- **Access**: Admin

### 9.4 Delete Holiday
- **Endpoint**: `DELETE /admin/holiday/deleteHoliday/:id`
- **Access**: Admin

---

## 10. Admin: Class Timetable & Scheduling

### 10.1 Bulk Schedule School Timing for Classes
- **Endpoint**: `POST /admin/timetable/classes/schedule/bulk`
- **Access**: Admin
- **Request Body**:
```json
{
  "class_section_ids": [1, 2, 3],
  "start_time": "08:00",
  "end_time": "14:00",
  "total_number_of_periods": 7,
  "is_break": true,
  "break_duration_minutes": 30,
  "break_after_period": 4,
  "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
}
```

### 10.2 List Scheduled Timing Table Data
- **Endpoint**: `GET /admin/timetable/classes/schedule/table-data`
- **Access**: Admin

### 10.3 Edit Timing for Specific Class
- **Endpoint**: `PUT /admin/timetable/classes/schedule/:class_id`
- **Access**: Admin

### 10.4 Get Timing Configuration for Class
- **Endpoint**: `GET /admin/timetable/classes/configuration/:class_id`
- **Access**: Admin

### 10.5 Generate Slots for Class
- **Endpoint**: `POST /admin/timetable/classes/:class_id/slots/generate`
- **Access**: Admin
- **Request Body**: `{ "force_regenerate": true }`

### 10.6 List Slots of a Class
- **Endpoint**: `GET /admin/timetable/classes/:class_id/slots`
- **Access**: Admin

### 10.7 Update Individual Slot
- **Endpoint**: `PUT /admin/timetable/classes/:class_id/slots/:slot_id`
- **Access**: Admin

### 10.8 Assign Single Timetable Entry
- **Endpoint**: `POST /admin/timetable/entries`
- **Access**: Admin
- **Request Body**:
```json
{
  "class_section_id": 1,
  "day_of_week": "Monday",
  "time_slot_id": 3,
  "subject_id": 2,
  "teacher_id": 5,
  "notes": "Regular period"
}
```

### 10.9 Bulk Upsert Day Timetable Entries
- **Endpoint**: `POST /admin/timetable/entries/day-upsert`
- **Access**: Admin
- **Request Body**:
```json
{
  "class_section_id": 1,
  "day_of_week": "Monday",
  "entries": [
    { "time_slot_id": 1, "subject_id": 2, "teacher_id": 5 },
    { "time_slot_id": 2, "subject_id": 3, "teacher_id": 6 }
  ]
}
```

### 10.10 Check Teacher Clash / Conflicts
- **Endpoint**: `POST /admin/timetable/conflicts/check`
- **Access**: Admin
- **Request Body**:
```json
{
  "class_section_id": 1,
  "day_of_week": "Monday",
  "time_slot_id": 2,
  "teacher_id": 5
}
```

### 10.11 Get Class Full Timetable
- **Endpoint**: `GET /admin/timetable/classes/timetable/:class_id`
- **Access**: Admin

### 10.12 Get Teacher Full Timetable
- **Endpoint**: `GET /admin/timetable/teachers/timetable/:teacher_id`
- **Access**: Admin

---

## 11. Admin: Certificates & ID Cards

### 11.1 Generate Student ID Card
- **Endpoint**: `POST /admin/certificate/generateIdCard`
- **Access**: Admin / Staff
- **Request Body**: `{ "user_id": 10 }`

### 11.2 Generate Multiple Students ID Cards
- **Endpoint**: `POST /admin/certificate/generateMultipleIdCards`
- **Access**: Admin / Staff
- **Request Body**: `{ "user_ids": [10, 11, 12] }`

### 11.3 Generate Staff / Teacher ID Card
- **Endpoint**: `POST /admin/certificate/generateStaffIdCard`
- **Access**: Admin
- **Request Body**: `{ "user_id": 3 }`

### 11.4 Generate Multiple Staff ID Cards
- **Endpoint**: `POST /admin/certificate/generateMultipleStaffIdCards`
- **Access**: Admin
- **Request Body**: `{ "user_ids": [3, 4, 5] }`

---

## 12. Admin: Notice Board

### 12.1 Create Notice
- **Endpoint**: `POST /admin/notice/createNotices`
- **Access**: Admin
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `title` *(string, required)*
  - `message` *(string, required)*
  - `target_type` *(string, required)*: `'all' | 'all_classes' | 'all_teachers' | 'all_staff' | 'class' | 'individual'`
  - `class_section_ids` *(array/json string if target_type is 'class')*
  - `individual_type` *(e.g. 'student' / 'teacher')*
  - `individual_id` *(id)*
  - `attachment` *(File, optional)*

### 12.2 Get All Notices
- **Endpoint**: `GET /admin/notice/getAllNotices`
- **Access**: Admin

### 12.3 Get Single Notice
- **Endpoint**: `GET /admin/notice/getNotice/:notice_id`
- **Access**: Admin

### 12.4 Update Notice
- **Endpoint**: `PUT /admin/notice/updateNotice/:notice_id`
- **Access**: Admin
- **Content-Type**: `multipart/form-data`

### 12.5 Delete Notice
- **Endpoint**: `DELETE /admin/notice/deleteNotice/:notice_id`
- **Access**: Admin

---

## 13. Admin: Content & Resources Upload

### 13.1 Upload Class Resource
- **Endpoint**: `POST /admin/classResource/uploadClassResource`
- **Access**: Admin
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `class_section_id` *(number, required)*
  - `title` *(string, required)*
  - `resource_type` *(string, required)*: `'syllabus' | 'assignment' | 'notes' | 'other'`
  - `description` *(string)*
  - `file` *(File, required)*: PDF, Doc, MP4, Image

### 13.2 Get All Class Resources
- **Endpoint**: `GET /admin/classResource/getAllClassResources`
- **Access**: Admin

### 13.3 Upload Subject Resource
- **Endpoint**: `POST /admin/subjectResource/uploadSubjectResource`
- **Access**: Admin
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `subject_id` *(number, required)*
  - `title` *(string, required)*
  - `resource_type` *(string, required)*
  - `file` *(File, required)*

### 13.4 Get All Subject Resources
- **Endpoint**: `GET /admin/subjectResource/getAllSubjectResources`
- **Access**: Admin

---

## 14. Admin: Financial (Income & Expense)

### 14.1 Create Income Entry
- **Endpoint**: `POST /api/admin/createIncome`
- **Access**: Admin
- **Request Body**:
```json
{
  "academic_year_id": 1,
  "category": "Donation",
  "source": "Alumni Association",
  "amount": 25000,
  "entry_date": "2026-03-01",
  "notes": "School library fund contribution"
}
```

### 14.2 Get All Income Entries
- **Endpoint**: `GET /api/admin/getAllIncome`
- **Access**: Admin
- **Query Params**: `?page=1&limit=20&start_date=2026-01-01&end_date=2026-03-31`

### 14.3 Get Income Summary (Dashboard Cards)
- **Endpoint**: `GET /api/admin/income-summary`
- **Access**: Admin

### 14.4 Create Expense Entry
- **Endpoint**: `POST /api/admin/createExpense`
- **Access**: Admin
- **Request Body**:
```json
{
  "academic_year_id": 1,
  "category": "Electricity Bill",
  "vendor_name": "Power Corp Ltd",
  "payment_mode": "bank_transfer",
  "amount": 14500,
  "entry_date": "2026-03-01",
  "notes": "Main building bill"
}
```
*(Payment modes: `cash`, `upi`, `card`, `bank_transfer`, `cheque`, `other`)*

### 14.5 Get All Expense Entries
- **Endpoint**: `GET /api/admin/getAllExpense`
- **Access**: Admin

### 14.6 Get Expense Summary
- **Endpoint**: `GET /api/admin/expense-summary`
- **Access**: Admin

---

## 15. Admin: Dashboard & Statistics

### 15.1 Get Overall Admin Dashboard Stats
- **Endpoint**: `GET /admin/dashboard/stats`
- **Access**: Admin
- **Returns**: Counts of students, teachers, classes, staff, today's attendance summary, and recent activity.

### 15.2 Monthly Income vs Expense (Chart Data)
- **Endpoint**: `GET /admin/dashboard/monthly-income-expense`
- **Access**: Admin

### 15.3 Class-wise Today's Attendance (Donut/Bar Chart)
- **Endpoint**: `GET /admin/dashboard/class-wise-attendance`
- **Access**: Admin

### 15.4 Dashboard Notices
- **Endpoint**: `GET /admin/dashboard/notices`
- **Access**: Admin

---

## 16. Admin: Profile & Settings

### 16.1 Get Admin Profile
- **Endpoint**: `GET /admin/setting/profile`
- **Access**: Admin
- **Returns**: Current admin details from token.

### 16.2 Change Admin Password
- **Endpoint**: `POST /admin/setting/changePassword`
- **Access**: Admin
- **Request Body**:
```json
{
  "current_password": "OldPassword@123",
  "new_password": "NewSecurePassword@123"
}
```

---

## 17. Teacher: Profile & Settings

### 17.1 Get Teacher Profile
- **Endpoint**: `GET /teacher/setting/getProfile`
- **Access**: Teacher
- **Returns**: Personal info, qualification, assigned classes, subjects, contact info.

### 17.2 Change Teacher Password
- **Endpoint**: `PUT /teacher/setting/changePassword`
- **Access**: Teacher
- **Request Body**:
```json
{
  "oldPassword": "CurrentPassword123",
  "newPassword": "NewPassword123"
}
```

---

## 18. Teacher: Dashboard

### 18.1 Get Teacher Dashboard Statistics
- **Endpoint**: `GET /teacher/dashboard/stats`
- **Access**: Teacher
- **Returns**:
  - Total assigned classes
  - Total assigned subjects
  - Today's upcoming classes count
  - Attendance marking status for today
  - Recent notices for teacher

---

## 19. Teacher: Timetable

### 19.1 Get My Full Timetable
- **Endpoint**: `GET /teacherTimetable/me` (or `/teacherTimetable/getTeacherTimetable`)
- **Access**: Teacher
- **Returns**: Monday to Saturday full class schedule.

### 19.2 Get Today's Classes
- **Endpoint**: `GET /teacherTimetable/today` (or `/teacherTimetable/getTodayClasses`)
- **Access**: Teacher
- **Returns**: Classes scheduled for current day with timings and room numbers.

### 19.3 Get Class Timetable
- **Endpoint**: `GET /teacherTimetable/classes/:class_section_id`
- **Access**: Teacher

---

## 20. Teacher: Subjects

### 20.1 Get My Assigned Subjects
- **Endpoint**: `GET /teacher/subject/getMySubjects`
- **Access**: Teacher
- **Returns**: List of subjects taught by this teacher with class section info.

---

## 21. Teacher: Class Attendance

### 21.1 Get Teacher's Assigned Classes
- **Endpoint**: `GET /classattendance/getTeacherClasses`
- **Access**: Teacher

### 21.2 Check Today's Attendance Marking Status
- **Endpoint**: `GET /classattendance/checkMarkingStatus?class_section_id=1`
- **Access**: Teacher
- **Returns**: Boolean status whether attendance for today is already marked or pending.

### 21.3 Get Student List for Marking Attendance
- **Endpoint**: `GET /classattendance/getClassStudentList/:class_section_id`
- **Access**: Teacher

### 21.4 Mark Class Attendance
- **Endpoint**: `POST /classattendance/markClassAttendance`
- **Access**: Teacher
- **Request Body**:
```json
{
  "class_section_id": 1,
  "date": "2026-03-01",
  "attendances": [
    { "student_id": 10, "status": "present" },
    { "student_id": 11, "status": "absent" }
  ]
}
```

### 21.5 Update Class Attendance (Current Date)
- **Endpoint**: `PATCH /classattendance/updateClassAttendance`
- **Access**: Teacher
- **Request Body**:
```json
{
  "class_section_id": 1,
  "date": "2026-03-01",
  "attendances": [
    { "student_id": 11, "status": "present" }
  ]
}
```

### 21.6 Get Monthly Attendance Grid Report (1-31 Days)
- **Endpoint**: `GET /classattendance/getMonthlyClassReport?class_section_id=1&month=3&year=2026`
- **Access**: Teacher

### 21.7 Individual Student Attendance History
- **Endpoint**: `GET /classattendance/getStudentHistory/:student_id`
- **Access**: Teacher

---

## 22. Teacher: Notice Board

### 22.1 Create Notice
- **Endpoint**: `POST /teacher/notice/createNotice`
- **Access**: Teacher
- **Content-Type**: `multipart/form-data`
- **Form Fields**: `title`, `message`, `target_type`, `class_section_ids`, `attachment`

### 22.2 Get Notices Created By Me
- **Endpoint**: `GET /teacher/notice/getMyNotices`
- **Access**: Teacher

### 22.3 Get Notices Received For Me
- **Endpoint**: `GET /teacher/notice/getNoticesForMe`
- **Access**: Teacher

### 22.4 Update Notice
- **Endpoint**: `PUT /teacher/notice/updateNotice/:notice_id`
- **Access**: Teacher

### 22.5 Delete Notice
- **Endpoint**: `DELETE /teacher/notice/deleteNotice/:notice_id`
- **Access**: Teacher

---

## 23. Teacher: Content & Resources

### 23.1 Upload Class Resource
- **Endpoint**: `POST /teacher/classResource/uploadClassResource`
- **Access**: Teacher
- **Content-Type**: `multipart/form-data`
- **Form Fields**: `class_section_id`, `title`, `description`, `resource_type`, `file`

### 23.2 Get My Uploaded Class Resources
- **Endpoint**: `GET /teacher/classResource/getMyClassResources`
- **Access**: Teacher

### 23.3 Upload Subject Resource (Assignments / Notes)
- **Endpoint**: `POST /teacher/subjectResource/uploadSubjectResource`
- **Access**: Teacher
- **Content-Type**: `multipart/form-data`
- **Form Fields**: `subject_id`, `title`, `description`, `resource_type`, `file`

### 23.4 Get My Uploaded Subject Resources
- **Endpoint**: `GET /teacher/subjectResource/getMySubjectResources`
- **Access**: Teacher

---

## 24. Student: Profile & Settings

### 24.1 Get Student Profile
- **Endpoint**: `GET /student/setting/getProfile`
- **Access**: Student
- **Returns**: Full student profile, class, roll number, parents info, admission date.

### 24.2 Change Student Password
- **Endpoint**: `PUT /student/setting/changePassword`
- **Access**: Student
- **Request Body**:
```json
{
  "currentPassword": "CurrentPassword123",
  "newPassword": "NewPassword123"
}
```

---

## 25. Student: Dashboard

### 25.1 Get Student Dashboard Stats
- **Endpoint**: `GET /student/dashboard/stats`
- **Access**: Student
- **Returns**: Attendance percentage, upcoming classes, total subjects, pending assignments, unread notices.

### 25.2 Get Today's Classes
- **Endpoint**: `GET /student/dashboard/today-classes`
- **Access**: Student

### 25.3 Get Weekly Timetable
- **Endpoint**: `GET /student/dashboard/weekly-timetable`
- **Access**: Student

### 25.4 Get Pending Assignments
- **Endpoint**: `GET /student/dashboard/pending-assignments`
- **Access**: Student

### 25.5 Get Student Notices
- **Endpoint**: `GET /student/dashboard/notices`
- **Access**: Student

---

## 26. Student: Attendance & Timetable

### 26.1 Get Monthly Attendance
- **Endpoint**: `GET /studentattendance/getMonthlyAttendance?month=3&year=2026`
- **Access**: Student
- **Returns**: Total presents, absents, leaves, and day-by-day status calendar.

### 26.2 Get Student Class & Enrolled Subjects
- **Endpoint**: `GET /studentattendance/getClassAndSubjects`
- **Access**: Student

### 26.3 Get Timetable
- **Endpoint**: `GET /studentattendance/getTimetable` (or `/studentattendance/me/timetable`)
- **Access**: Student

---

## 27. Student: Leaves

### 27.1 Apply For Leave
- **Endpoint**: `POST /student/leave/applyLeave`
- **Access**: Student
- **Request Body**:
```json
{
  "start_date": "2026-03-10",
  "end_date": "2026-03-12",
  "reason": "Family function out of town"
}
```

### 27.2 Get My Leaves Status
- **Endpoint**: `GET /student/leave/getMyLeaves`
- **Access**: Student
- **Returns**: List of all applied leaves with status (`pending` / `approved` / `rejected`) and admin remarks.

### 27.3 Cancel / Delete Leave Application
- **Endpoint**: `DELETE /student/leave/deleteLeave/:leave_id`
- **Access**: Student

---

## 28. Student: Notices

### 28.1 Get Notices For Me
- **Endpoint**: `GET /student/notice/getNoticesForMe`
- **Access**: Student
- **Returns**: All school announcements, class notices, and holiday notices.

---

## 29. Student: Study Resources & Assignments

### 29.1 Get Class Resources (Syllabus, Timetable PDFs, etc.)
- **Endpoint**: `GET /student/resources/classResources`
- **Access**: Student

### 29.2 Get Single Class Resource
- **Endpoint**: `GET /student/resources/classResource/:resource_id`
- **Access**: Student

### 29.3 Get Subject Resources (Notes / Presentations)
- **Endpoint**: `GET /student/resources/subjectResources`
- **Access**: Student

### 29.4 Get Resources By Subject ID
- **Endpoint**: `GET /student/resources/subjectResources/subject/:subject_id`
- **Access**: Student

### 29.5 Get All Assignments
- **Endpoint**: `GET /student/resources/assignments`
- **Access**: Student

---

## 30. Accountant: Profile & Settings

### 30.1 Get Accountant Profile
- **Endpoint**: `GET /api/accountant/profile/me`
- **Access**: Accountant
- **Returns**: Name, email, designation, contact info, status.

### 30.2 Change Accountant Password
- **Endpoint**: `PUT /api/accountant/profile/change-password`
- **Access**: Accountant
- **Request Body**:
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```

---

## 31. Accountant: Dashboard & Analytics

### 31.1 Get Accountant Dashboard Stats
- **Endpoint**: `GET /api/accountant/dashboard/stats`
- **Access**: Accountant
- **Returns**: Financial summary cards, total collections, pending transactions, recent receipts.

### 31.2 Monthly Collection Chart Data
- **Endpoint**: `GET /api/accountant/dashboard/monthly-collection`
- **Access**: Accountant

### 31.3 Payment Methods Breakdown
- **Endpoint**: `GET /api/accountant/dashboard/payment-methods`
- **Access**: Accountant
- **Returns**: Distribution of Cash, UPI, Card, Net Banking collections.

### 31.4 Class-wise Collection
- **Endpoint**: `GET /api/accountant/dashboard/class-wise-collection`
- **Access**: Accountant

### 31.5 Recent Payments Activity
- **Endpoint**: `GET /api/accountant/dashboard/recent-payments`
- **Access**: Accountant

---

## 💡 Frontend Integration Example (Axios)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001',
});

// Attach Authorization Token Automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized Response & Error Interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorData = error.response?.data;
    const message = errorData?.message || 'Something went wrong. Please try again.';
    
    if (error.response?.status === 401) {
      // Auto logout or redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
```
