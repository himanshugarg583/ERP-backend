# Fee v1 API Inventory

Base URL: `/api/v1/fees`

Auth legend:
- `Public`: no token required
- `Admin`: role `admin`
- `Finance`: role `admin` or `accountant`
- `Student/Finance`: role `admin`, `accountant`, or `student`
- `StudentSelf/Finance`: same as Student/Finance, but `student` can only access own data

## Payments - Webhook

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/payments/webhook/razorpay` | Public | Receive Razorpay webhook events |

## Fee Heads

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/fee-heads` | Finance | List fee heads |
| POST | `/fee-heads` | Admin | Create fee head |
| GET | `/fee-heads/:id` | Finance | Get one fee head |
| PUT | `/fee-heads/:id` | Admin | Update fee head |
| DELETE | `/fee-heads/:id` | Admin | Deactivate fee head |

## Fee Structures

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/fee-structures` | Finance | List fee structures |
| POST | `/fee-structures` | Admin | Create fee structure |
| GET | `/fee-structures/:id` | Finance | Get one fee structure |
| PUT | `/fee-structures/:id` | Admin | Update fee structure |
| POST | `/fee-structures/:id/clone` | Admin | Clone fee structure |
| GET | `/fee-structures/:id/preview` | Finance | Preview fee structure summary |

## Installments

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/fee-structures/:structureId/installments` | Finance | List installment plan |
| POST | `/fee-structures/:structureId/installments` | Admin | Create installment plan |
| PUT | `/installments/:id` | Admin | Update installment row |
| DELETE | `/installments/:id` | Admin | Delete installment row |

## Assignments

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/assignments/preview/:structureId` | Admin | Preview bulk assignment |
| POST | `/assignments/student` | Admin | Assign structure to single student |
| POST | `/assignments/bulk` | Admin | Bulk assign structure |
| POST | `/assignments/one-time` | Admin | Assign one-time fee |
| GET | `/assignments/:id` | Finance | Get assignment by ID |
| GET | `/students/:studentId/assignment` | StudentSelf/Finance | Get active assignment for student |
| PUT | `/assignments/:id/cancel` | Admin | Cancel assignment |

## Concessions

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/concessions` | Finance | List concession definitions |
| POST | `/concessions` | Admin | Create concession rule |
| PUT | `/concessions/:id` | Admin | Update concession rule |
| POST | `/students/:studentId/concessions` | Finance | Apply concession to student |
| GET | `/students/:studentId/concessions` | StudentSelf/Finance | List student concessions |
| GET | `/concession-requests/pending` | Admin | List pending concession requests |
| PUT | `/concession-requests/:id/approve` | Admin | Approve concession request |
| PUT | `/concession-requests/:id/reject` | Admin | Reject concession request |

## Invoices

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/invoices` | Finance | List invoices |
| GET | `/invoices/:id` | Student/Finance | Get invoice by ID |
| POST | `/invoices/generate` | Admin | Generate invoices |
| GET | `/students/:studentId/invoices` | StudentSelf/Finance | List invoices for a student |
| PUT | `/invoices/:id/waive` | Admin | Waive amount on invoice |

## Payments

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/payments/collect` | Finance | Collect payment (cash/online/cheque/bank) |
| POST | `/payments/initiate-online` | Student/Finance | Initiate online payment |
| GET | `/payments/:id` | Student/Finance | Get payment by ID |
| GET | `/payments/:id/receipt` | Student/Finance | Get receipt for payment |
| POST | `/payments/:id/send-receipt` | Finance | Email receipt |
| POST | `/payments/:id/cancel` | Finance | Cancel payment |
| PUT | `/payments/:id/cheque-status` | Finance | Update cheque status |

## Refunds

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/refunds` | Finance | Initiate refund request |
| GET | `/refunds/pending` | Admin | List pending refunds |
| PUT | `/refunds/:id/approve` | Admin | Approve refund |
| PUT | `/refunds/:id/reject` | Admin | Reject refund |

## Reports

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/reports/collection-summary` | Finance | Collection summary report |
| GET | `/reports/dues` | Finance | Dues report |
| GET | `/reports/defaulters` | Finance | Defaulters report |
| GET | `/reports/head-wise` | Finance | Head-wise report |
| GET | `/reports/student-ledger/:id` | Student/Finance (self for student) | Student ledger report |
| GET | `/reports/concession-impact` | Admin | Concession impact report |
| POST | `/reports/export` | Finance | Export report |

## Reminders

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/reminders/bulk-send` | Finance | Send reminder notifications |

## Settings

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/settings` | Admin | Get fee settings |
| PUT | `/settings` | Admin | Update fee settings |
