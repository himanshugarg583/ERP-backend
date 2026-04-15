const { SchoolFeeSettingV1 } = require('../../../models/admin/fees_v1');
const { ok, fail } = require('../../../utils/response');

const getFeeSettings = async (req, res) => {
  try {
    let row = await SchoolFeeSettingV1.findOne();
    if (!row) row = await SchoolFeeSettingV1.create({});
    return ok(res, row);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'settings_fetch_failed', message: error.message });
  }
};

const updateFeeSettings = async (req, res) => {
  try {
    let row = await SchoolFeeSettingV1.findOne();
    if (!row) row = await SchoolFeeSettingV1.create({});

    await row.update({
      block_report_card_on_dues: req.body.block_report_card_on_dues ?? row.block_report_card_on_dues,
      fine_first: req.body.fine_first ?? row.fine_first,
      due_date_shift: req.body.due_date_shift ?? row.due_date_shift,
      dnd_start_time: req.body.dnd_start_time ?? row.dnd_start_time,
      dnd_end_time: req.body.dnd_end_time ?? row.dnd_end_time
    });

    return ok(res, row);
  } catch (error) {
    return fail(res, { statusCode: 500, code: 'settings_update_failed', message: error.message });
  }
};

module.exports = {
  getFeeSettings,
  updateFeeSettings
};
