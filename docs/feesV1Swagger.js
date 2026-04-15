const baseResponses = {
  400: { description: 'Bad Request' },
  401: { description: 'Unauthorized' },
  403: { description: 'Forbidden' },
  404: { description: 'Not Found' },
  500: { description: 'Internal Server Error' }
};

const withAuth = (operation, secured = true) => (
  secured ? { ...operation, security: [{ bearerAuth: [] }] } : operation
);

const idParam = (name = 'id', description = 'Resource ID') => ({
  in: 'path',
  name,
  required: true,
  schema: { type: 'string' },
  description
});

const feeHeadPayloadSchema = {
  type: 'object',
  required: ['name', 'category'],
  properties: {
    name: { type: 'string', example: 'Tuition Fee' },
    category: {
      type: 'string',
      enum: ['academic', 'facility', 'transport', 'hostel', 'exam', 'other'],
      example: 'academic'
    },
    description: { type: 'string', nullable: true, example: 'Core tuition component' },
    is_optional: { type: 'boolean', example: false },
    is_refundable: { type: 'boolean', example: false },
    ledger_code: { type: 'string', nullable: true, example: 'LED-101' },
    is_active: { type: 'boolean', example: true }
  }
};

const feeStructureItemSchema = {
  type: 'object',
  required: ['fee_head_id', 'amount'],
  properties: {
    fee_head_id: { type: 'integer', example: 1 },
    amount: { type: 'number', example: 25000 },
    is_mandatory: { type: 'boolean', example: true },
    sort_order: { type: 'integer', example: 1 }
  }
};

const installmentItemSchema = {
  type: 'object',
  required: ['name', 'due_date', 'percentage'],
  properties: {
    name: { type: 'string', example: 'Quarter 1' },
    installment_number: { type: 'integer', example: 1 },
    due_date: { type: 'string', format: 'date', example: '2026-07-10' },
    percentage: { type: 'number', example: 25 },
    late_fine_type: { type: 'string', enum: ['none', 'fixed', 'percent'], example: 'fixed' },
    late_fine_value: { type: 'number', example: 100 },
    max_late_fine: { type: 'number', nullable: true, example: 500 },
    grace_period_days: { type: 'integer', example: 5 }
  }
};

const feeStructureCreateSchema = {
  type: 'object',
  required: ['name', 'academic_year_id', 'items', 'installments'],
  properties: {
    name: { type: 'string', example: 'Grade 10 - Annual Plan' },
    academic_year_id: { type: 'integer', example: 2 },
    applicable_to: { type: 'string', nullable: true, example: 'class' },
    class_ids: {
      type: 'array',
      items: { type: 'integer' },
      nullable: true,
      example: [11, 12]
    },
    description: { type: 'string', nullable: true, example: 'Main recurring structure for Grade 10' },
    structure_type: { type: 'string', enum: ['recurring', 'one_time'], example: 'recurring' },
    items: {
      type: 'array',
      minItems: 1,
      items: feeStructureItemSchema
    },
    installments: {
      type: 'array',
      minItems: 1,
      items: installmentItemSchema
    }
  }
};

const feeStructureUpdateSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', example: 'Grade 10 - Updated Plan' },
    applicable_to: { type: 'string', nullable: true, example: 'class' },
    class_ids: {
      type: 'array',
      items: { type: 'integer' },
      nullable: true,
      example: [11, 12, 13]
    },
    description: { type: 'string', nullable: true, example: 'Updated description' },
    is_active: { type: 'boolean', example: true }
  }
};

const feeStructureCloneSchema = {
  type: 'object',
  required: ['academic_year_id'],
  properties: {
    academic_year_id: { type: 'integer', example: 3 },
    name: { type: 'string', example: 'Grade 10 - Annual Plan (Copy)' }
  }
};

const installmentsReplaceSchema = {
  type: 'object',
  required: ['installments'],
  properties: {
    installments: {
      type: 'array',
      minItems: 1,
      items: installmentItemSchema
    }
  }
};

const assignmentTargetingSchema = {
  type: 'object',
  required: ['fee_structure_id', 'academic_year_id'],
  properties: {
    fee_structure_id: { type: 'integer', example: 7 },
    academic_year_id: { type: 'integer', example: 2 },
    class_ids: {
      type: 'array',
      items: { type: 'integer' },
      example: [11]
    },
    student_ids: {
      type: 'array',
      items: { type: 'integer' },
      example: [101, 102]
    },
    custom_items: {
      type: 'array',
      nullable: true,
      items: feeStructureItemSchema
    },
    excluded_heads: {
      type: 'array',
      nullable: true,
      items: { type: 'integer' },
      example: [5]
    }
  }
};

const assignmentSingleSchema = {
  type: 'object',
  required: ['student_id', 'fee_structure_id', 'academic_year_id'],
  properties: {
    student_id: { type: 'integer', example: 101 },
    fee_structure_id: { type: 'integer', example: 7 },
    academic_year_id: { type: 'integer', example: 2 },
    custom_items: {
      type: 'array',
      nullable: true,
      items: feeStructureItemSchema
    },
    excluded_heads: {
      type: 'array',
      nullable: true,
      items: { type: 'integer' },
      example: [5]
    }
  }
};

const assignmentPreviewSchema = {
  type: 'object',
  properties: {
    class_ids: {
      type: 'array',
      items: { type: 'integer' },
      example: [11, 12]
    },
    student_ids: {
      type: 'array',
      items: { type: 'integer' },
      example: [101, 102]
    }
  }
};

const assignmentCancelSchema = {
  type: 'object',
  properties: {
    reason: { type: 'string', example: 'Incorrect structure assignment' }
  }
};

const feesV1SwaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ERP Fee Management API (v1)',
    version: '1.0.0',
    description: 'Interactive API docs for the new BRD-aligned fee_v1 module.'
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local development server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  tags: [
    { name: 'Fee Heads' },
    { name: 'Fee Structures' },
    { name: 'Installments' },
    { name: 'Assignments' },
    { name: 'Concessions' },
    { name: 'Invoices' },
    { name: 'Payments' },
    { name: 'Refunds' },
    { name: 'Reports' },
    { name: 'Reminders' },
    { name: 'Settings' }
  ],
  paths: {
    '/api/v1/fees/payments/webhook/razorpay': {
      post: withAuth({
        tags: ['Payments'],
        summary: 'Razorpay webhook callback',
        responses: {
          200: { description: 'Webhook processed' },
          ...baseResponses
        }
      }, false)
    },

    '/api/v1/fees/fee-heads': {
      get: withAuth({
        tags: ['Fee Heads'],
        summary: 'List fee heads',
        responses: { 200: { description: 'Fee heads fetched' }, ...baseResponses }
      }),
      post: withAuth({
        tags: ['Fee Heads'],
        summary: 'Create fee head',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: feeHeadPayloadSchema
            }
          }
        },
        responses: { 201: { description: 'Fee head created' }, ...baseResponses }
      })
    },

    '/api/v1/fees/fee-heads/{id}': {
      get: withAuth({
        tags: ['Fee Heads'],
        summary: 'Get fee head by ID',
        parameters: [idParam()],
        responses: { 200: { description: 'Fee head fetched' }, ...baseResponses }
      }),
      put: withAuth({
        tags: ['Fee Heads'],
        summary: 'Update fee head',
        parameters: [idParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: feeHeadPayloadSchema
            }
          }
        },
        responses: { 200: { description: 'Fee head updated' }, ...baseResponses }
      }),
      delete: withAuth({
        tags: ['Fee Heads'],
        summary: 'Deactivate fee head',
        parameters: [idParam()],
        responses: { 200: { description: 'Fee head deactivated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/fee-structures': {
      get: withAuth({
        tags: ['Fee Structures'],
        summary: 'List fee structures',
        responses: { 200: { description: 'Fee structures fetched' }, ...baseResponses }
      }),
      post: withAuth({
        tags: ['Fee Structures'],
        summary: 'Create fee structure',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: feeStructureCreateSchema
            }
          }
        },
        responses: { 201: { description: 'Fee structure created' }, ...baseResponses }
      })
    },

    '/api/v1/fees/fee-structures/{id}': {
      get: withAuth({
        tags: ['Fee Structures'],
        summary: 'Get fee structure by ID',
        parameters: [idParam()],
        responses: { 200: { description: 'Fee structure fetched' }, ...baseResponses }
      }),
      put: withAuth({
        tags: ['Fee Structures'],
        summary: 'Update fee structure',
        parameters: [idParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: feeStructureUpdateSchema
            }
          }
        },
        responses: { 200: { description: 'Fee structure updated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/fee-structures/{id}/clone': {
      post: withAuth({
        tags: ['Fee Structures'],
        summary: 'Clone fee structure',
        parameters: [idParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: feeStructureCloneSchema
            }
          }
        },
        responses: { 201: { description: 'Fee structure cloned' }, ...baseResponses }
      })
    },

    '/api/v1/fees/fee-structures/{id}/preview': {
      get: withAuth({
        tags: ['Fee Structures'],
        summary: 'Preview fee structure',
        parameters: [idParam()],
        responses: { 200: { description: 'Fee structure preview fetched' }, ...baseResponses }
      })
    },

    '/api/v1/fees/fee-structures/{structureId}/installments': {
      get: withAuth({
        tags: ['Installments'],
        summary: 'List installment plan by fee structure',
        parameters: [idParam('structureId', 'Fee structure ID')],
        responses: { 200: { description: 'Installments fetched' }, ...baseResponses }
      }),
      post: withAuth({
        tags: ['Installments'],
        summary: 'Create installment plan for fee structure',
        parameters: [idParam('structureId', 'Fee structure ID')],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: installmentsReplaceSchema
            }
          }
        },
        responses: { 201: { description: 'Installments created' }, ...baseResponses }
      })
    },

    '/api/v1/fees/installments/{id}': {
      put: withAuth({
        tags: ['Installments'],
        summary: 'Update installment',
        parameters: [idParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: installmentItemSchema
            }
          }
        },
        responses: { 200: { description: 'Installment updated' }, ...baseResponses }
      }),
      delete: withAuth({
        tags: ['Installments'],
        summary: 'Delete installment',
        parameters: [idParam()],
        responses: { 200: { description: 'Installment deleted' }, ...baseResponses }
      })
    },

    '/api/v1/fees/assignments/preview/{structureId}': {
      post: withAuth({
        tags: ['Assignments'],
        summary: 'Preview bulk assignment for structure',
        parameters: [idParam('structureId', 'Fee structure ID')],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: assignmentPreviewSchema
            }
          }
        },
        responses: { 200: { description: 'Preview generated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/assignments/student': {
      post: withAuth({
        tags: ['Assignments'],
        summary: 'Assign fee structure to one student',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: assignmentSingleSchema
            }
          }
        },
        responses: { 201: { description: 'Student assignment created' }, ...baseResponses }
      })
    },

    '/api/v1/fees/assignments/bulk': {
      post: withAuth({
        tags: ['Assignments'],
        summary: 'Bulk assign fee structure',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: assignmentTargetingSchema
            }
          }
        },
        responses: { 201: { description: 'Bulk assignment completed' }, ...baseResponses }
      })
    },

    '/api/v1/fees/assignments/one-time': {
      post: withAuth({
        tags: ['Assignments'],
        summary: 'Assign one-time fee',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: assignmentTargetingSchema
            }
          }
        },
        responses: { 201: { description: 'One-time assignment created' }, ...baseResponses }
      })
    },

    '/api/v1/fees/assignments/{id}': {
      get: withAuth({
        tags: ['Assignments'],
        summary: 'Get assignment by ID',
        parameters: [idParam()],
        responses: { 200: { description: 'Assignment fetched' }, ...baseResponses }
      })
    },

    '/api/v1/fees/students/{studentId}/assignment': {
      get: withAuth({
        tags: ['Assignments'],
        summary: 'Get active assignment for student',
        parameters: [idParam('studentId', 'Student ID')],
        responses: { 200: { description: 'Student assignment fetched' }, ...baseResponses }
      })
    },

    '/api/v1/fees/assignments/{id}/cancel': {
      put: withAuth({
        tags: ['Assignments'],
        summary: 'Cancel assignment',
        parameters: [idParam()],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: assignmentCancelSchema
            }
          }
        },
        responses: { 200: { description: 'Assignment cancelled' }, ...baseResponses }
      })
    },

    '/api/v1/fees/concessions': {
      get: withAuth({
        tags: ['Concessions'],
        summary: 'List concessions',
        responses: { 200: { description: 'Concessions fetched' }, ...baseResponses }
      }),
      post: withAuth({
        tags: ['Concessions'],
        summary: 'Create concession rule',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: { 201: { description: 'Concession created' }, ...baseResponses }
      })
    },

    '/api/v1/fees/concessions/{id}': {
      put: withAuth({
        tags: ['Concessions'],
        summary: 'Update concession rule',
        parameters: [idParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: { 200: { description: 'Concession updated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/students/{studentId}/concessions': {
      get: withAuth({
        tags: ['Concessions'],
        summary: 'List student concessions',
        parameters: [idParam('studentId', 'Student ID')],
        responses: { 200: { description: 'Student concessions fetched' }, ...baseResponses }
      }),
      post: withAuth({
        tags: ['Concessions'],
        summary: 'Apply concession to student',
        parameters: [idParam('studentId', 'Student ID')],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: { 201: { description: 'Concession applied' }, ...baseResponses }
      })
    },

    '/api/v1/fees/concession-requests/pending': {
      get: withAuth({
        tags: ['Concessions'],
        summary: 'List pending concession requests',
        responses: { 200: { description: 'Pending requests fetched' }, ...baseResponses }
      })
    },

    '/api/v1/fees/concession-requests/{id}/approve': {
      put: withAuth({
        tags: ['Concessions'],
        summary: 'Approve concession request',
        parameters: [idParam()],
        responses: { 200: { description: 'Request approved' }, ...baseResponses }
      })
    },

    '/api/v1/fees/concession-requests/{id}/reject': {
      put: withAuth({
        tags: ['Concessions'],
        summary: 'Reject concession request',
        parameters: [idParam()],
        responses: { 200: { description: 'Request rejected' }, ...baseResponses }
      })
    },

    '/api/v1/fees/invoices': {
      get: withAuth({
        tags: ['Invoices'],
        summary: 'List invoices',
        responses: { 200: { description: 'Invoices fetched' }, ...baseResponses }
      })
    },

    '/api/v1/fees/invoices/{id}': {
      get: withAuth({
        tags: ['Invoices'],
        summary: 'Get invoice by ID',
        parameters: [idParam()],
        responses: { 200: { description: 'Invoice fetched' }, ...baseResponses }
      })
    },

    '/api/v1/fees/invoices/generate': {
      post: withAuth({
        tags: ['Invoices'],
        summary: 'Generate invoices',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: { 201: { description: 'Invoices generated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/students/{studentId}/invoices': {
      get: withAuth({
        tags: ['Invoices'],
        summary: 'List invoices for student',
        parameters: [idParam('studentId', 'Student ID')],
        responses: { 200: { description: 'Student invoices fetched' }, ...baseResponses }
      })
    },

    '/api/v1/fees/invoices/{id}/waive': {
      put: withAuth({
        tags: ['Invoices'],
        summary: 'Waive invoice amount',
        parameters: [idParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: { 200: { description: 'Invoice waived' }, ...baseResponses }
      })
    },

    '/api/v1/fees/payments/collect': {
      post: withAuth({
        tags: ['Payments'],
        summary: 'Collect payment manually',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: { 201: { description: 'Payment collected' }, ...baseResponses }
      })
    },

    '/api/v1/fees/payments/initiate-online': {
      post: withAuth({
        tags: ['Payments'],
        summary: 'Initiate online payment',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: { 200: { description: 'Online payment initiated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/payments/{id}': {
      get: withAuth({
        tags: ['Payments'],
        summary: 'Get payment by ID',
        parameters: [idParam()],
        responses: { 200: { description: 'Payment fetched' }, ...baseResponses }
      })
    },

    '/api/v1/fees/payments/{id}/receipt': {
      get: withAuth({
        tags: ['Payments'],
        summary: 'Get payment receipt',
        parameters: [idParam()],
        responses: { 200: { description: 'Receipt generated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/payments/{id}/send-receipt': {
      post: withAuth({
        tags: ['Payments'],
        summary: 'Send receipt by email',
        parameters: [idParam()],
        responses: { 200: { description: 'Receipt sent' }, ...baseResponses }
      })
    },

    '/api/v1/fees/payments/{id}/cancel': {
      post: withAuth({
        tags: ['Payments'],
        summary: 'Cancel payment entry',
        parameters: [idParam()],
        responses: { 200: { description: 'Payment cancelled' }, ...baseResponses }
      })
    },

    '/api/v1/fees/payments/{id}/cheque-status': {
      put: withAuth({
        tags: ['Payments'],
        summary: 'Update cheque status',
        parameters: [idParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: { 200: { description: 'Cheque status updated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/refunds': {
      post: withAuth({
        tags: ['Refunds'],
        summary: 'Initiate refund request',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: { 201: { description: 'Refund initiated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/refunds/pending': {
      get: withAuth({
        tags: ['Refunds'],
        summary: 'List pending refunds',
        responses: { 200: { description: 'Pending refunds fetched' }, ...baseResponses }
      })
    },

    '/api/v1/fees/refunds/{id}/approve': {
      put: withAuth({
        tags: ['Refunds'],
        summary: 'Approve refund',
        parameters: [idParam()],
        responses: { 200: { description: 'Refund approved' }, ...baseResponses }
      })
    },

    '/api/v1/fees/refunds/{id}/reject': {
      put: withAuth({
        tags: ['Refunds'],
        summary: 'Reject refund',
        parameters: [idParam()],
        responses: { 200: { description: 'Refund rejected' }, ...baseResponses }
      })
    },

    '/api/v1/fees/reports/collection-summary': {
      get: withAuth({
        tags: ['Reports'],
        summary: 'Collection summary report',
        responses: { 200: { description: 'Collection summary generated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/reports/dues': {
      get: withAuth({
        tags: ['Reports'],
        summary: 'Dues report',
        responses: { 200: { description: 'Dues report generated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/reports/defaulters': {
      get: withAuth({
        tags: ['Reports'],
        summary: 'Defaulters report',
        responses: { 200: { description: 'Defaulters report generated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/reports/head-wise': {
      get: withAuth({
        tags: ['Reports'],
        summary: 'Head-wise collection report',
        responses: { 200: { description: 'Head-wise report generated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/reports/student-ledger/{id}': {
      get: withAuth({
        tags: ['Reports'],
        summary: 'Student ledger report',
        parameters: [idParam()],
        responses: { 200: { description: 'Student ledger generated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/reports/concession-impact': {
      get: withAuth({
        tags: ['Reports'],
        summary: 'Concession impact report',
        responses: { 200: { description: 'Concession impact generated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/reports/export': {
      post: withAuth({
        tags: ['Reports'],
        summary: 'Export report',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: { 200: { description: 'Export generated' }, ...baseResponses }
      })
    },

    '/api/v1/fees/reminders/bulk-send': {
      post: withAuth({
        tags: ['Reminders'],
        summary: 'Send bulk fee reminders',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: { 200: { description: 'Reminders sent' }, ...baseResponses }
      })
    },

    '/api/v1/fees/settings': {
      get: withAuth({
        tags: ['Settings'],
        summary: 'Get fee settings',
        responses: { 200: { description: 'Settings fetched' }, ...baseResponses }
      }),
      put: withAuth({
        tags: ['Settings'],
        summary: 'Update fee settings',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: { 200: { description: 'Settings updated' }, ...baseResponses }
      })
    }
  }
};

module.exports = feesV1SwaggerSpec;
