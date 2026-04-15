# Fee Structure APIs (Role-wise, Postman Ready)

## 1) Postman Setup
- Base URL: `http://localhost:5001`
- Common prefix: `/api/v1/fees`
- Auth: Bearer token (JWT)
- Header: `Content-Type: application/json`

Suggested Postman variables:
- `{{baseUrl}}` = `http://localhost:5000`
- `{{feesPrefix}}` = `/api/v1/fees`
- `{{adminToken}}`, `{{accountantToken}}`, `{{studentToken}}`

## 2) Common Response Envelope
Success:
```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

Error:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "not_found",
    "message": "Resource not found",
    "details": null
  },
  "meta": null
}
```

## 3) Role Access Summary (Fee-Structure Related)

### Admin
Can access all fee-structure related APIs below.

### Accountant
Read-only on structure flow:
- GET `/fee-heads`
- GET `/fee-heads/:id`
- GET `/fee-structures`
- GET `/fee-structures/:id`
- GET `/fee-structures/:id/preview`
- GET `/fee-structures/:structureId/installments`
- GET `/assignments/:id`
- GET `/students/:studentId/assignment`

### Student
- GET `/students/:studentId/assignment` (self only)

### Teacher
- No dedicated fee_v1 fee-structure route is exposed for teacher role right now.

## 4) Admin APIs (Postman Ready)

### 4.1 Create Fee Head
- Method: POST
- URL: `{{baseUrl}}{{feesPrefix}}/fee-heads`
- Auth: `{{adminToken}}`

Payload:
```json
{
  "name": "Tuition Fee",
  "category": "academic",
  "description": "Core tuition component",
  "is_optional": false,
  "is_refundable": false,
  "ledger_code": "LED-101"
}
```

Success (201):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Tuition Fee",
    "category": "academic",
    "is_active": true
  },
  "error": null,
  "meta": null
}
```

### 4.2 Update Fee Head
- Method: PUT
- URL: `{{baseUrl}}{{feesPrefix}}/fee-heads/:id`
- Auth: `{{adminToken}}`

Payload:
```json
{
  "name": "Tuition Fee Updated",
  "category": "academic",
  "description": "Updated description",
  "is_optional": false,
  "is_refundable": false,
  "ledger_code": "LED-101",
  "is_active": true
}
```

Success (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Tuition Fee Updated"
  },
  "error": null,
  "meta": null
}
```

### 4.3 Create Fee Structure
- Method: POST
- URL: `{{baseUrl}}{{feesPrefix}}/fee-structures`
- Auth: `{{adminToken}}`

Payload:
```json
{
  "name": "Grade 10 - Annual Plan",
  "academic_year_id": 2,
  "applicable_to": "class",
  "class_ids": [11, 12],
  "description": "Main recurring structure for Grade 10",
  "structure_type": "recurring",
  "items": [
    {
      "fee_head_id": 1,
      "amount": 25000,
      "is_mandatory": true,
      "sort_order": 1
    },
    {
      "fee_head_id": 2,
      "amount": 5000,
      "is_mandatory": true,
      "sort_order": 2
    }
  ],
  "installments": [
    {
      "name": "Quarter 1",
      "installment_number": 1,
      "due_date": "2026-07-10",
      "percentage": 25,
      "late_fine_type": "fixed",
      "late_fine_value": 100,
      "max_late_fine": 500,
      "grace_period_days": 5
    },
    {
      "name": "Quarter 2",
      "installment_number": 2,
      "due_date": "2026-10-10",
      "percentage": 25,
      "late_fine_type": "fixed",
      "late_fine_value": 100,
      "max_late_fine": 500,
      "grace_period_days": 5
    },
    {
      "name": "Quarter 3",
      "installment_number": 3,
      "due_date": "2027-01-10",
      "percentage": 25,
      "late_fine_type": "fixed",
      "late_fine_value": 100,
      "max_late_fine": 500,
      "grace_period_days": 5
    },
    {
      "name": "Quarter 4",
      "installment_number": 4,
      "due_date": "2027-04-10",
      "percentage": 25,
      "late_fine_type": "fixed",
      "late_fine_value": 100,
      "max_late_fine": 500,
      "grace_period_days": 5
    }
  ]
}
```

Success (201):
```json
{
  "success": true,
  "data": {
    "id": 7,
    "name": "Grade 10 - Annual Plan",
    "academic_year_id": 2,
    "structure_type": "recurring",
    "items": [],
    "installments": []
  },
  "error": null,
  "meta": null
}
```

Common error (422):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "invalid_installments",
    "message": "At least one installment is required",
    "details": null
  },
  "meta": null
}
```

### 4.4 Update Fee Structure
- Method: PUT
- URL: `{{baseUrl}}{{feesPrefix}}/fee-structures/:id`
- Auth: `{{adminToken}}`

Payload:
```json
{
  "name": "Grade 10 - Updated Plan",
  "applicable_to": "class",
  "class_ids": [11, 12, 13],
  "description": "Updated structure details",
  "is_active": true
}
```

Success (200):
```json
{
  "success": true,
  "data": {
    "id": 7,
    "name": "Grade 10 - Updated Plan",
    "is_active": true
  },
  "error": null,
  "meta": null
}
```

Conflict (409) when students are already assigned and item changes are attempted:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "structure_locked",
    "message": "Structure has 24 active students - clone it to make amount changes.",
    "details": null
  },
  "meta": null
}
```

### 4.5 Clone Fee Structure
- Method: POST
- URL: `{{baseUrl}}{{feesPrefix}}/fee-structures/:id/clone`
- Auth: `{{adminToken}}`

Payload:
```json
{
  "academic_year_id": 3,
  "name": "Grade 10 - Annual Plan (Copy)"
}
```

Success (201):
```json
{
  "success": true,
  "data": {
    "id": 12,
    "name": "Grade 10 - Annual Plan (Copy)"
  },
  "error": null,
  "meta": null
}
```

### 4.6 Replace Installments for a Structure
- Method: POST
- URL: `{{baseUrl}}{{feesPrefix}}/fee-structures/:structureId/installments`
- Auth: `{{adminToken}}`

Payload:
```json
{
  "installments": [
    {
      "name": "Term 1",
      "installment_number": 1,
      "due_date": "2026-08-01",
      "percentage": 50,
      "late_fine_type": "fixed",
      "late_fine_value": 100,
      "max_late_fine": 1000,
      "grace_period_days": 7
    },
    {
      "name": "Term 2",
      "installment_number": 2,
      "due_date": "2026-12-01",
      "percentage": 50,
      "late_fine_type": "fixed",
      "late_fine_value": 100,
      "max_late_fine": 1000,
      "grace_period_days": 7
    }
  ]
}
```

Success (201):
```json
{
  "success": true,
  "data": [
    {
      "id": 31,
      "fee_structure_id": 7,
      "name": "Term 1"
    }
  ],
  "error": null,
  "meta": {
    "total": 2
  }
}
```

### 4.7 Update Installment
- Method: PUT
- URL: `{{baseUrl}}{{feesPrefix}}/installments/:id`
- Auth: `{{adminToken}}`

Payload:
```json
{
  "name": "Term 1 Updated",
  "due_date": "2026-08-10",
  "percentage": 50,
  "late_fine_type": "fixed",
  "late_fine_value": 120,
  "max_late_fine": 1200,
  "grace_period_days": 5
}
```

Success (200):
```json
{
  "success": true,
  "data": {
    "id": 31,
    "name": "Term 1 Updated"
  },
  "error": null,
  "meta": null
}
```

Conflict (409):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "installment_locked",
    "message": "Cannot edit installment after invoices are generated.",
    "details": null
  },
  "meta": null
}
```

### 4.8 Preview Assignment Scope
- Method: POST
- URL: `{{baseUrl}}{{feesPrefix}}/assignments/preview/:structureId`
- Auth: `{{adminToken}}`

Payload:
```json
{
  "class_ids": [11, 12],
  "student_ids": [101, 102]
}
```

Success (200):
```json
{
  "success": true,
  "data": {
    "fee_structure_id": 7,
    "total_students": 2,
    "class_ids": [11, 12],
    "sample_student_ids": [101, 102]
  },
  "error": null,
  "meta": null
}
```

### 4.9 Assign Structure to One Student
- Method: POST
- URL: `{{baseUrl}}{{feesPrefix}}/assignments/student`
- Auth: `{{adminToken}}`

Payload:
```json
{
  "student_id": 101,
  "fee_structure_id": 7,
  "academic_year_id": 2,
  "custom_items": [],
  "excluded_heads": []
}
```

Success (201):
```json
{
  "success": true,
  "data": {
    "id": 210,
    "student_id": 101,
    "fee_structure_id": 7,
    "academic_year_id": 2,
    "status": "active"
  },
  "error": null,
  "meta": null
}
```

### 4.10 Bulk Assign Structure
- Method: POST
- URL: `{{baseUrl}}{{feesPrefix}}/assignments/bulk`
- Auth: `{{adminToken}}`

Payload:
```json
{
  "fee_structure_id": 7,
  "academic_year_id": 2,
  "class_ids": [11],
  "student_ids": [],
  "custom_items": [],
  "excluded_heads": []
}
```

Success (200):
```json
{
  "success": true,
  "data": {
    "assigned_count": 38,
    "skipped_count": 2,
    "skipped_students": [
      {
        "student_id": 998,
        "reason": "Student 998 already has an active recurring assignment for this academic year."
      }
    ]
  },
  "error": null,
  "meta": null
}
```

### 4.11 Assign One-Time Fee Structure
- Method: POST
- URL: `{{baseUrl}}{{feesPrefix}}/assignments/one-time`
- Auth: `{{adminToken}}`

Payload:
```json
{
  "fee_structure_id": 9,
  "academic_year_id": 2,
  "class_ids": [11],
  "student_ids": [],
  "custom_items": [],
  "excluded_heads": []
}
```

Success (201):
```json
{
  "success": true,
  "data": {
    "assigned_count": 15,
    "skipped_count": 1,
    "skipped_students": [],
    "generated_invoices": 15
  },
  "error": null,
  "meta": null
}
```

### 4.12 Cancel Assignment
- Method: PUT
- URL: `{{baseUrl}}{{feesPrefix}}/assignments/:id/cancel`
- Auth: `{{adminToken}}`

Payload:
```json
{
  "reason": "Wrong class mapping"
}
```

Success (200):
```json
{
  "success": true,
  "data": {
    "id": 210,
    "status": "cancelled",
    "cancellation_reason": "Wrong class mapping"
  },
  "error": null,
  "meta": null
}
```

## 5) Accountant APIs (Read-Only, Postman Ready)
Use `{{accountantToken}}`.

- GET `{{baseUrl}}{{feesPrefix}}/fee-heads`
- GET `{{baseUrl}}{{feesPrefix}}/fee-heads/:id`
- GET `{{baseUrl}}{{feesPrefix}}/fee-structures`
- GET `{{baseUrl}}{{feesPrefix}}/fee-structures/:id`
- GET `{{baseUrl}}{{feesPrefix}}/fee-structures/:id/preview`
- GET `{{baseUrl}}{{feesPrefix}}/fee-structures/:structureId/installments`
- GET `{{baseUrl}}{{feesPrefix}}/assignments/:id`
- GET `{{baseUrl}}{{feesPrefix}}/students/:studentId/assignment`

Sample success response (GET list):
```json
{
  "success": true,
  "data": [],
  "error": null,
  "meta": {
    "total": 0
  }
}
```

## 6) Student APIs (Self Access)
Use `{{studentToken}}`.

### Get Active Assignment (Self)
- Method: GET
- URL: `{{baseUrl}}{{feesPrefix}}/students/:studentId/assignment`

Success (200):
```json
{
  "success": true,
  "data": {
    "id": 210,
    "student_id": 101,
    "status": "active",
    "structure": {
      "id": 7,
      "name": "Grade 10 - Annual Plan"
    }
  },
  "error": null,
  "meta": null
}
```

Forbidden (403) if student tries another student id:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "forbidden",
    "message": "You can only access your own assignment.",
    "details": null
  },
  "meta": null
}
```

## 7) Teacher APIs
No fee-structure API is currently available for teacher role in fee_v1 routes.

If teacher access is needed, route role permissions must be expanded in the fee_v1 router.
