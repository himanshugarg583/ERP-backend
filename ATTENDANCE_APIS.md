# Attendance APIs (Admin, Teacher, Student)

## Base URL
`http://localhost:5000`

## Authentication
Most endpoints require JWT in header:

`Authorization: Bearer <token>`

Use login endpoint to get token:

- `POST /api/auth/login`

---

## Admin Attendance APIs

Base route: `/admin/studentsAttendance`

### 1. Get All Classes
- **Method:** `GET`
- **Endpoint:** `/admin/studentsAttendance/getAllClasses`
- **Auth:** Required (`admin`)
- **Payload:** None

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Classes fetched successfully",
  "data": {
    "classes": [
      {
        "id": 1,
        "class_name": "10",
        "section_name": "A",
        "room_No": "R-101",
        "total_students": 37,
        "classTeacher": {
          "id": 2,
          "User": {
            "id": 9,
            "name": "Teacher User"
          }
        }
      }
    ],
    "total_classes": 1
  }
}
```

### 2. Get Students By Class
- **Method:** `GET`
- **Endpoint:** `/admin/studentsAttendance/getStudentsByClass/:class_id`
- **Auth:** Required (`admin`)
- **Path Params:**
  - `class_id` (number)

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Students fetched successfully",
  "data": {
    "class_info": {
      "id": 1,
      "class_name": "10",
      "section_name": "A"
    },
    "students": [
      {
        "id": 7,
        "roll_number": "10A-01",
        "User": {
          "id": 15,
          "name": "Student User",
          "email": "student.demo@erp.local"
        }
      }
    ],
    "total_students": 1
  }
}
```

### 3. Mark Class Attendance
- **Method:** `POST`
- **Endpoint:** `/admin/studentsAttendance/markClassAttendance`
- **Auth:** Required (`admin`)
- **Body:**
```json
{
  "class_section_id": 1,
  "date": "2026-04-04",
  "attendances": [
    { "student_id": 7, "status": "present" },
    { "student_id": 8, "status": "absent" }
  ]
}
```

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Attendance marked successfully"
}
```

### 4. Daily Attendance Report
- **Method:** `GET`
- **Endpoint:** `/admin/studentsAttendance/attendanceReport`
- **Auth:** Required (`admin`)
- **Query Params:**
  - `class_name` (string)
  - `section_name` (string)
  - `date` (YYYY-MM-DD)

#### Example
`/admin/studentsAttendance/attendanceReport?class_name=10&section_name=A&date=2026-04-04`

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Attendance report fetched successfully",
  "data": {
    "class_info": {
      "class_name": "10",
      "section_name": "A",
      "room_No": "R-101",
      "date": "2026-04-04"
    },
    "summary": {
      "total_students": 40,
      "present": 32,
      "absent": 6,
      "late": 1,
      "not_marked": 1
    },
    "attendance_records": [
      {
        "student_id": 7,
        "student_name": "Aman",
        "roll_number": "10A-01",
        "class_name": "10",
        "section_name": "A",
        "attendance_status": "present"
      }
    ]
  }
}
```

### 5. Monthly Attendance Report
- **Method:** `GET`
- **Endpoint:** `/admin/studentsAttendance/monthlyAttendanceReport`
- **Auth:** Required (`admin`)
- **Query Params:**
  - `class_name` (string)
  - `section_name` (string)
  - `month` (1-12)
  - `year` (YYYY)

#### Example
`/admin/studentsAttendance/monthlyAttendanceReport?class_name=10&section_name=A&month=4&year=2026`

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Monthly attendance report fetched successfully",
  "data": {
    "report_info": {
      "class_name": "10",
      "section_name": "A",
      "month": "April",
      "year": 2026
    },
    "class_summary": {
      "total_students": 40,
      "average_attendance_percentage": "89.75"
    },
    "student_reports": [
      {
        "student_id": 7,
        "student_name": "Aman",
        "roll_number": "10A-01",
        "attendance_summary": {
          "total_days_marked": 22,
          "present": 20,
          "absent": 1,
          "late": 1,
          "attendance_percentage": "95.45"
        }
      }
    ]
  }
}
```

### 6. Class-wise Attendance Summary (Date)
- **Method:** `GET`
- **Endpoint:** `/admin/studentsAttendance/classWiseSummary`
- **Auth:** Required (`admin`)
- **Query Params:**
  - `date` (YYYY-MM-DD)

#### Example
`/admin/studentsAttendance/classWiseSummary?date=2026-04-04`

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Class-wise attendance summary fetched successfully",
  "data": {
    "date": "2026-04-04",
    "overall_summary": {
      "total_students": 500,
      "present": 430,
      "absent": 40,
      "late": 20,
      "not_marked": 10,
      "attendance_percentage": "90.00"
    },
    "total_classes": 15,
    "class_wise_reports": [
      {
        "class_id": 1,
        "class_name": "10",
        "section_name": "A",
        "summary": {
          "total_students": 40,
          "present": 36,
          "absent": 2,
          "late": 1,
          "not_marked": 1,
          "attendance_percentage": "92.50"
        }
      }
    ]
  }
}
```

### 7. Get Class Attendance List By Date (Admin)
- **Method:** `GET`
- **Endpoint:** `/admin/studentsAttendance/getClassAttendanceByDate`
- **Auth:** Required (`admin`)
- **Query Params:**
  - `class_section_id` (number)
  - `date` (YYYY-MM-DD)

#### Example
`/admin/studentsAttendance/getClassAttendanceByDate?class_section_id=1&date=2026-04-04`

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Class attendance fetched successfully",
  "data": {
    "class_info": {
      "class_section_id": 1,
      "class_name": "10",
      "section_name": "A",
      "display_name": "10 A"
    },
    "date": "2026-04-04",
    "summary": {
      "total": 2,
      "present": 1,
      "absent": 0,
      "leave": 1
    },
    "attendance": [
      {
        "attendance_id": 19,
        "student_id": 7,
        "student_name": "Aman",
        "roll_number": "10A-01",
        "status": "present",
        "marked_by": 2,
        "marked_at": "2026-04-04T10:22:11.000Z"
      }
    ]
  }
}
```

---

## Teacher Attendance APIs

Base route: `/classattendance`

### 1. Get Teacher Assigned Classes
- **Method:** `GET`
- **Endpoint:** `/classattendance/getTeacherClasses`
- **Auth:** Required (`teacher`)
- **Payload:** None

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Teacher classes fetched successfully",
  "data": {
    "teacher_id": 2,
    "total_classes": 2,
    "classes": [
      {
        "class_section_id": 1,
        "class_name": "10",
        "section_name": "A",
        "display_name": "10 A",
        "total_students": 40
      }
    ]
  }
}
```

### 2. Get Class Student List
- **Method:** `GET`
- **Endpoint:** `/classattendance/getClassStudentList/:class_section_id`
- **Auth:** Not enforced in current route file (recommended to add `authMiddleware, isTeacher`)
- **Path Params:**
  - `class_section_id` (number)

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Student list fetched successfully",
  "data": {
    "class_info": {
      "class_section_id": 1,
      "class_name": "10",
      "section_name": "A",
      "display_name": "10 A"
    },
    "total_students": 2,
    "students": [
      {
        "student_id": 7,
        "student_name": "Aman",
        "roll_number": "10A-01"
      }
    ]
  }
}
```

### 3. Get Students By Class
- **Method:** `GET`
- **Endpoint:** `/classattendance/getStudentsByClass/:class_id`
- **Auth:** Required (`teacher`)
- **Path Params:**
  - `class_id` (number)

#### Response
Same output as `getClassStudentList`.

### 4. Mark Class Attendance (Bulk)
- **Method:** `POST`
- **Endpoint:** `/classattendance/markClassAttendance`
- **Auth:** Required (`teacher`)
- **Body:**
```json
{
  "class_section_id": 1,
  "date": "2026-04-04",
  "attendance": [
    { "student_id": 7, "status": "present" },
    { "student_id": 8, "status": "absent" }
  ]
}
```

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Attendance marked successfully",
  "data": {
    "class_section_id": 1,
    "date": "2026-04-04",
    "marked_by": 2,
    "total_processed": 2,
    "total_errors": 0,
    "results": [
      {
        "student_id": 7,
        "status": "present",
        "leave_auto_applied": false,
        "action": "created"
      }
    ]
  }
}
```

### 5. Update Class Attendance (Current Date Only)
- **Method:** `PATCH`
- **Endpoint:** `/classattendance/updateClassAttendance`
- **Auth:** Required (`teacher`)
- **Body:**
```json
{
  "class_section_id": 1,
  "date": "2026-04-04",
  "attendance": [
    { "student_id": 7, "status": "leave" },
    { "student_id": 8, "status": "present" }
  ]
}
```

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Attendance updated successfully",
  "data": {
    "class_section_id": 1,
    "date": "2026-04-04",
    "marked_by": 2,
    "total_updated": 2,
    "total_errors": 0,
    "results": [
      {
        "student_id": 7,
        "status": "leave",
        "leave_auto_applied": true,
        "action": "updated"
      }
    ]
  }
}
```

### 6. Get Class Attendance By Date
- **Method:** `GET`
- **Endpoint:** `/classattendance/getClassAttendanceByDate`
- **Auth:** Required (`teacher`)
- **Query Params:**
  - `class_section_id` (number)
  - `date` (YYYY-MM-DD)

#### Example
`/classattendance/getClassAttendanceByDate?class_section_id=1&date=2026-04-04`

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Attendance fetched successfully",
  "data": {
    "class_info": {
      "class_section_id": 1,
      "class_name": "10",
      "section_name": "A",
      "display_name": "10 A"
    },
    "date": "2026-04-04",
    "summary": {
      "total": 2,
      "present": 1,
      "absent": 0,
      "leave": 1
    },
    "attendance": [
      {
        "student_id": 7,
        "student_name": "Aman",
        "roll_number": "10A-01",
        "status": "leave",
        "marked_at": "2026-04-04T10:22:11.000Z"
      }
    ]
  }
}
```

---

## Student Attendance APIs

Base route: `/studentattendance`

### 1. Get Student Monthly Attendance
- **Method:** `GET`
- **Endpoint:** `/studentattendance/getMonthlyAttendance`
- **Auth:** Required (`student`)
- **Query Params:**
  - `month` (1-12)
  - `year` (YYYY)

#### Example
`/studentattendance/getMonthlyAttendance?month=4&year=2026`

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Monthly attendance fetched successfully",
  "data": {
    "student_id": 7,
    "month": 4,
    "year": 2026,
    "month_name": "April",
    "summary": {
      "total_days_marked": 22,
      "present": 20,
      "absent": 1,
      "leave": 1,
      "attendance_percentage": "90.91"
    },
    "attendance": [
      {
        "date": "2026-04-01",
        "status": "present",
        "marked_at": "2026-04-01T09:01:00.000Z"
      }
    ]
  }
}
```

### 2. Get Student Class And Subjects (Attendance Support API)
- **Method:** `GET`
- **Endpoint:** `/studentattendance/getClassAndSubjects`
- **Auth:** Required (`student`)
- **Payload:** None

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Student class and subjects fetched successfully",
  "data": {
    "student_info": {
      "student_id": 7,
      "roll_number": "10A-01"
    },
    "class_info": {
      "class_section_id": 1,
      "class_name": "10",
      "section_name": "A",
      "display_name": "10 A",
      "room_no": "R-101",
      "capacity": 40
    },
    "subjects": [
      {
        "subject_id": 3,
        "subject_name": "Mathematics",
        "subject_code": "MTH-01"
      }
    ],
    "total_subjects": 1
  }
}
```

### 3. Get Student Timetable (Attendance Context API)
- **Method:** `GET`
- **Endpoint:** `/studentattendance/getTimetable`
- **Auth:** Required (`student`)
- **Payload:** None

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Student timetable fetched successfully",
  "data": {
    "student_info": {
      "student_id": 7,
      "roll_number": "10A-01"
    },
    "class_info": {
      "class_section_id": 1,
      "class_name": "10",
      "section_name": "A",
      "display_name": "10 A"
    },
    "timetable": {
      "Monday": [
        {
          "id": 11,
          "period_name": "Period 1",
          "start_time": "08:00:00",
          "end_time": "08:45:00",
          "is_break": false,
          "subject": {
            "id": 3,
            "subject_name": "Mathematics",
            "subject_code": "MTH-01"
          },
          "teacher": {
            "id": 2,
            "name": "Teacher User"
          }
        }
      ],
      "Tuesday": [],
      "Wednesday": [],
      "Thursday": [],
      "Friday": [],
      "Saturday": []
    }
  }
}
```

---

## Common Error Response Format

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation or business error message"
}
```

Other common status codes:
- `401` Unauthorized (missing/invalid token)
- `403` Forbidden (role not allowed)
- `404` Not found
- `500` Internal server error

---

## Notes
- Admin mark API uses body key: `attendances`
- Teacher mark/update APIs use body key: `attendance`
- Teacher update API allows update only for current server date.
- Approved student leave can automatically force attendance status to `leave`.

---

## New Leave + Holiday APIs (Admin)

### A. Delete Leave (Admin, any status)
- **Method:** `DELETE`
- **Endpoint:** `/admin/studentLeave/deleteLeave/:id`
- **Auth:** Required (`admin`)
- **Path Params:**
  - `id` (leave id)

#### Success Response (200)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Leave deleted successfully by admin"
}
```

### B. Create Holiday
- **Method:** `POST`
- **Endpoint:** `/admin/holiday/createHoliday`
- **Auth:** Required (`admin`)
- **Body:**
```json
{
  "holiday_date": "2026-04-14",
  "reason": "Ambedkar Jayanti",
  "description": "School closed"
}
```

#### Success Response (201)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Holiday created successfully",
  "data": {
    "id": 1,
    "holiday_date": "2026-04-14",
    "reason": "Ambedkar Jayanti",
    "description": "School closed"
  }
}
```

### C. Get All Holidays
- **Method:** `GET`
- **Endpoint:** `/admin/holiday/getAllHolidays`
- **Auth:** Required (`admin`)
- **Query (optional):**
  - `month` (1-12)
  - `year` (YYYY)

### D. Get Holiday By Date
- **Method:** `GET`
- **Endpoint:** `/admin/holiday/getHolidayByDate?holiday_date=2026-04-14`
- **Auth:** Required (`admin`)

### E. Delete Holiday
- **Method:** `DELETE`
- **Endpoint:** `/admin/holiday/deleteHoliday/:id`
- **Auth:** Required (`admin`)

### Attendance Behavior Update
- If leave is approved and teacher/admin marks `present`, final status remains `present`.
- If leave is approved and teacher/admin marks `absent` or `leave`, final status becomes `leave`.
- Attendance mark/update is blocked on dates declared as holidays.
