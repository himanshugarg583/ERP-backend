const fs = require('fs');
const path = require('path');
const { Op, fn, col } = require('sequelize');
const {
  FeePaymentV1,
  FeeInvoiceV1,
  FeeInvoiceItemV1,
  StudentConcessionV1
} = require('../../../models');
const { Student } = require('../../../models/admin/Student');
const { ok, fail } = require('../../../utils/response');

const resolveStudentIdForUser = async (userId) => {
  const student = await Student.findOne({ where: { user_id: userId }, attributes: ['id'] });
  return student ? Number(student.id) : null;
};

const getCollectionSummary = async (req, res) => {
  try {
    const from = req.query.from || '1970-01-01';
    const to = req.query.to || '2999-12-31';
    const mode = req.query.mode;

    const where = {
      paid_at: { [Op.between]: [new Date(from), new Date(to)] },
      is_cancelled: false
    };

    if (mode) where.payment_mode = mode;

    const rows = await FeePaymentV1.findAll({
      where,
      attributes: [
        'payment_mode',
        [fn('SUM', col('amount_paid')), 'total_amount'],
        [fn('SUM', col('fine_paid')), 'total_fine'],
        [fn('COUNT', col('id')), 'tx_count']
      ],
      group: ['payment_mode'],
      raw: true
    });

    return ok(res, rows, { total_modes: rows.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'report_failed', message: error.message });
  }
};

const getDuesReport = async (req, res) => {
  try {
    const where = {
      balance_amount: { [Op.gt]: 0 }
    };

    if (req.query.academic_year_id) where.academic_year_id = req.query.academic_year_id;
    if (req.query.overdue_only === 'true') where.status = 'overdue';
    if (req.query.min_amount) where.balance_amount = { [Op.gte]: Number(req.query.min_amount) };

    const rows = await FeeInvoiceV1.findAll({ where, order: [['balance_amount', 'DESC']] });
    return ok(res, rows, { total: rows.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'report_failed', message: error.message });
  }
};

const getDefaultersReport = async (req, res) => {
  try {
    const invoices = await FeeInvoiceV1.findAll({
      where: {
        status: 'overdue',
        balance_amount: { [Op.gt]: 0 }
      },
      order: [['due_date', 'ASC']]
    });

    const data = invoices.map((inv) => {
      const days = Math.max(0, Math.floor((Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)));
      return {
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_no: inv.invoice_no || inv.invoice_number,
        student_id: inv.student_id,
        due_date: inv.due_date,
        days_overdue: days,
        amount_due: Number(inv.balance_amount)
      };
    });

    return ok(res, data, { total: data.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'report_failed', message: error.message });
  }
};

const getHeadWiseReport = async (req, res) => {
  try {
    const from = req.query.from || '1970-01-01';
    const to = req.query.to || '2999-12-31';

    const rows = await FeeInvoiceItemV1.findAll({
      include: [{ model: FeeInvoiceV1, as: 'invoice', attributes: [] }],
      where: {
        '$invoice.generated_at$': { [Op.between]: [new Date(from), new Date(to)] }
      },
      attributes: [
        'fee_head_id',
        [fn('SUM', col('net_amount')), 'total_net_amount'],
        [fn('SUM', col('gross_amount')), 'total_gross_amount'],
        [fn('SUM', col('concession_amount')), 'total_concession']
      ],
      group: ['fee_head_id'],
      raw: true
    });

    return ok(res, rows, { total_heads: rows.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'report_failed', message: error.message });
  }
};

const getStudentLedger = async (req, res) => {
  try {
    const studentId = Number(req.params.id);

    if (req.user?.role === 'student') {
      const authenticatedStudentId = await resolveStudentIdForUser(req.user.id);
      if (!authenticatedStudentId || authenticatedStudentId !== studentId) {
        return fail(res, { statusCode: 403, code: 'forbidden', message: 'You can only access your own ledger.' });
      }
    }

    const invoices = await FeeInvoiceV1.findAll({
      where: { student_id: studentId },
      include: [
        { model: FeeInvoiceItemV1, as: 'items' },
        { model: FeePaymentV1, as: 'payments' }
      ],
      order: [['due_date', 'ASC']]
    });

    return ok(res, invoices, { total_invoices: invoices.length });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'report_failed', message: error.message });
  }
};

const getConcessionImpact = async (req, res) => {
  try {
    const rows = await StudentConcessionV1.findAll({
      where: { approval_status: 'approved' }
    });

    const bucket = new Map();
    for (const row of rows) {
      const name = row.fee_head_id ? `Head-${row.fee_head_id}` : 'General';
      const prev = bucket.get(name) || { concession_name: name, count: 0, total_value: 0 };
      prev.count += 1;
      prev.total_value += 0;
      bucket.set(name, prev);
    }

    return ok(res, Array.from(bucket.values()), { total_types: bucket.size });
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'report_failed', message: error.message });
  }
};

const exportReport = async (req, res) => {
  try {
    const { report_type, format = 'xlsx', filters = {} } = req.body;

    const lines = [
      'report_type,generated_at,filters',
      `${report_type},${new Date().toISOString()},"${JSON.stringify(filters).replace(/"/g, '""')}"`
    ];

    const csv = lines.join('\n');
    const dir = path.join(__dirname, '../../../public/exports');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fileName = `${report_type}-${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    const filePath = path.join(dir, fileName);

    // Placeholder export. For now writes CSV payload inside chosen extension.
    fs.writeFileSync(filePath, csv, 'utf8');

    return ok(res, {
      download_url: `/public/exports/${fileName}`,
      note: 'Export placeholder generated. Plug in real xlsx/pdf generator as next step.'
    }, null, 201);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'export_failed', message: error.message });
  }
};

module.exports = {
  getCollectionSummary,
  getDuesReport,
  getDefaultersReport,
  getHeadWiseReport,
  getStudentLedger,
  getConcessionImpact,
  exportReport
};
