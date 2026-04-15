# Fee Management V1 Flow (BRD-Aligned)

This document describes the new fee flow implemented under `/api/v1/fees`.

## 1) Master Setup Flow

1. Create academic year in `academic_years` (via DB/admin panel).
2. Create fee heads:
   - `POST /api/v1/fees/fee-heads`
3. Create fee structure with items and installments:
   - `POST /api/v1/fees/fee-structures`

## 2) Installment Rules Flow

1. Add/edit installment plan:
   - `POST /api/v1/fees/fee-structures/:structureId/installments`
   - `PUT /api/v1/fees/installments/:id`
2. Validation enforced:
   - Installment percentages sum to exactly 100.
   - One-time structures allow exactly one installment with 100%.

## 3) Assignment Flow

### Regular Assignment

- Preview assignment:
  - `POST /api/v1/fees/assignments/preview/:structureId`
- Assign single student:
  - `POST /api/v1/fees/assignments/student`
- Assign bulk:
  - `POST /api/v1/fees/assignments/bulk`

### One-Time Fee Assignment (New)

For Admission Fee, Exam Fee, Annual Event Fee, etc.

1. Create a structure with `structure_type = one_time`.
2. Assign using dedicated endpoint:
   - `POST /api/v1/fees/assignments/one-time`
3. On assignment, invoice is generated immediately for one-time installment.

## 4) Concession Workflow

1. Define concession type:
   - `POST /api/v1/fees/concessions`
2. Apply to student:
   - `POST /api/v1/fees/students/:studentId/concessions`
3. Approve/reject (principal/admin):
   - `PUT /api/v1/fees/concession-requests/:id/approve`
   - `PUT /api/v1/fees/concession-requests/:id/reject`

## 5) Invoice Workflow

1. Auto generation via scheduler at 00:01.
2. Manual generation:
   - `POST /api/v1/fees/invoices/generate`
3. List/search invoices:
   - `GET /api/v1/fees/invoices`
4. Student invoices:
   - `GET /api/v1/fees/students/:studentId/invoices`
5. Waive invoice (principal/admin):
   - `PUT /api/v1/fees/invoices/:id/waive`

## 6) Payment Flow

### Offline

- Collect payment:
  - `POST /api/v1/fees/payments/collect`

### Online (Razorpay)

1. Create order:
   - `POST /api/v1/fees/payments/initiate-online`
2. Receive webhook:
   - `POST /api/v1/fees/payments/webhook/razorpay`
3. Idempotency:
   - Duplicate `gateway_payment_id` is ignored.

### Cheque

- Update cheque status:
  - `PUT /api/v1/fees/payments/:id/cheque-status`
- On bounce:
  - Payment auto-cancelled.
  - Invoice balance restored.

## 7) Communication Flow (SMTP Email)

WhatsApp is replaced by SMTP + nodemailer.

1. On successful payment, receipt email is sent to student email.
2. Reminder logs are written into `fee_reminders` table.
3. Bulk due reminders:
   - `POST /api/v1/fees/reminders/bulk-send`

## 8) Refund Flow

1. Create refund request:
   - `POST /api/v1/fees/refunds`
2. Principal/admin approval:
   - `PUT /api/v1/fees/refunds/:id/approve`
   - `PUT /api/v1/fees/refunds/:id/reject`

## 9) Reports Flow

- Collection summary: `GET /api/v1/fees/reports/collection-summary`
- Dues: `GET /api/v1/fees/reports/dues`
- Defaulters: `GET /api/v1/fees/reports/defaulters`
- Head-wise: `GET /api/v1/fees/reports/head-wise`
- Student ledger: `GET /api/v1/fees/reports/student-ledger/:id`
- Concession impact: `GET /api/v1/fees/reports/concession-impact`
- Export: `POST /api/v1/fees/reports/export`

## 10) Security

- JWT auth required on all private routes.
- Role controls for admin, accountant, student.
- Rate limiter on payment and webhook endpoints.
- Webhook signature verification for Razorpay.

## 11) Parent APIs

As requested, no parent-specific APIs are created in this version.
