const { MarksEntryV2 } = require('../../../models');

const upsertMarksEntry = async ({
  exam_paper_id,
  student_id,
  entered_by,
  marks,
  total_marks,
  is_absent = false,
  is_exempt = false,
  meta_data = null
}) => {
  const existing = await MarksEntryV2.findOne({
    where: {
      exam_paper_id,
      student_id
    }
  });

  if (!existing) {
    return MarksEntryV2.create({
      exam_paper_id,
      student_id,
      result_id: null,
      entered_by,
      marks,
      marks_obtained: total_marks,
      total_marks,
      max_marks: 0,
      percentage: 0,
      grade: 'N/A',
      is_pass: false,
      is_absent,
      is_exempt,
      meta_data,
      entered_at: new Date()
    });
  }

  existing.marks = marks;
  existing.result_id = null;
  existing.marks_obtained = total_marks;
  existing.total_marks = total_marks;
  existing.max_marks = 0;
  existing.percentage = 0;
  existing.grade = 'N/A';
  existing.is_pass = false;
  existing.is_absent = is_absent;
  existing.is_exempt = is_exempt;
  existing.meta_data = meta_data;
  existing.entered_by = entered_by;
  existing.entered_at = new Date();
  await existing.save();

  return existing;
};

module.exports = {
  upsertMarksEntry
};
