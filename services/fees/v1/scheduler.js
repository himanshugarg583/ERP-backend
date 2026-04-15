const cron = require('node-cron');
const { generateInvoicesForDate } = require('./invoiceService');
const { FeeInvoiceV1 } = require('../../../models/admin/fees_v1');

let initialized = false;

const startFeeSchedulers = () => {
  if (initialized) return;
  initialized = true;

  // 00:01 daily invoice generation
  cron.schedule('1 0 * * *', async () => {
    try {
      await generateInvoicesForDate({ dueDate: new Date() });
      // eslint-disable-next-line no-console
      console.log('[fees-v1] Invoice generation cron completed');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[fees-v1] Invoice generation cron failed:', error.message);
    }
  });

  // Status transition helper: overdue mark every midnight
  cron.schedule('5 0 * * *', async () => {
    try {
      await FeeInvoiceV1.update(
        { status: 'overdue' },
        {
          where: {
            status: { [require('sequelize').Op.in]: ['active', 'partial'] },
            balance_amount: { [require('sequelize').Op.gt]: 0 },
            due_date: { [require('sequelize').Op.lt]: new Date().toISOString().split('T')[0] }
          }
        }
      );
      // eslint-disable-next-line no-console
      console.log('[fees-v1] Overdue status cron completed');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[fees-v1] Overdue status cron failed:', error.message);
    }
  });
};

module.exports = {
  startFeeSchedulers
};
