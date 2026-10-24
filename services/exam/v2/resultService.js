const { Op } = require('sequelize');
const {
  ExamPaperV2,
  MarksEntryV2,
  ResultV2
} = require('../../../models');

const resolveGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
};

const computeResultsForEvent = async (examEventId) => {
  const papers = await ExamPaperV2.findAll({
    where: { exam_event_id: examEventId },
    attributes: ['id', 'max_marks', 'passing_marks']
  });

  if (!papers.length) {
    return { count: 0, rows: [] };
  }

  const paperIds = papers.map((paper) => paper.id);
  const paperById = new Map(papers.map((paper) => [paper.id, paper]));

  const entries = await MarksEntryV2.findAll({
    where: {
      exam_paper_id: {
        [Op.in]: paperIds
      }
    },
    attributes: ['id', 'exam_paper_id', 'student_id', 'total_marks', 'is_absent', 'is_exempt']
  });

  await MarksEntryV2.update(
    { result_id: null },
    {
      where: {
        exam_paper_id: {
          [Op.in]: paperIds
        }
      }
    }
  );

  const perStudent = new Map();

  for (const entry of entries) {
    const studentId = entry.student_id;
    const paper = paperById.get(entry.exam_paper_id);
    if (!paper) {
      continue;
    }

    if (!perStudent.has(studentId)) {
      perStudent.set(studentId, {
        total_marks: 0,
        max_marks: 0,
        failed: 0,
        details: []
      });
    }

    const holder = perStudent.get(studentId);
    const obtained = Math.max(0, Number(entry.total_marks || 0));
    const maxMarks = Number(paper.max_marks || 0);
    const passingMarks = Number(paper.passing_marks || 0);

    holder.total_marks += obtained;
    holder.max_marks += maxMarks;

    const isPass = Boolean(entry.is_exempt) || (!entry.is_absent && obtained >= passingMarks);
    if (!isPass) {
      holder.failed += 1;
    }

    const percentage = maxMarks > 0 ? Number(((obtained / maxMarks) * 100).toFixed(2)) : 0;
    holder.details.push({
      marks_entry_id: entry.id,
      exam_paper_id: entry.exam_paper_id,
      student_id: studentId,
      marks_obtained: obtained,
      max_marks: maxMarks,
      percentage,
      grade: resolveGrade(percentage),
      is_pass: isPass
    });
  }

  const outputRows = [];

  for (const [student_id, summary] of perStudent.entries()) {
    const percentage = summary.max_marks > 0
      ? Number(((summary.total_marks / summary.max_marks) * 100).toFixed(2))
      : 0;

    const grade = resolveGrade(percentage);
    const is_pass = summary.failed === 0;

    const [result] = await ResultV2.findOrCreate({
      where: {
        student_id,
        exam_event_id: examEventId
      },
      defaults: {
        student_id,
        exam_event_id: examEventId,
        total_marks: summary.total_marks,
        max_marks: summary.max_marks,
        percentage,
        grade,
        is_pass,
        status: 'draft',
        version: 1,
        computed_at: new Date()
      }
    });

    result.total_marks = summary.total_marks;
    result.max_marks = summary.max_marks;
    result.percentage = percentage;
    result.grade = grade;
    result.is_pass = is_pass;
    result.computed_at = new Date();
    await result.save();

    if (summary.details.length) {
      await Promise.all(summary.details.map((detail) =>
        MarksEntryV2.update(
          {
            result_id: result.id,
            marks_obtained: detail.marks_obtained,
            max_marks: detail.max_marks,
            percentage: detail.percentage,
            grade: detail.grade,
            is_pass: detail.is_pass
          },
          {
            where: {
              id: detail.marks_entry_id
            }
          }
        )));
    }

    outputRows.push(result);
  }

  outputRows.sort((a, b) => Number(b.percentage) - Number(a.percentage));
  for (let i = 0; i < outputRows.length; i += 1) {
    outputRows[i].rank = i + 1;
    await outputRows[i].save();
  }

  return {
    count: outputRows.length,
    rows: outputRows
  };
};

const publishResultsForEvent = async (examEventId, versionBump = false) => {
  const rows = await ResultV2.findAll({
    where: {
      exam_event_id: examEventId
    }
  });

  for (const row of rows) {
    row.status = 'published';
    row.published_at = new Date();
    if (versionBump) {
      row.version = Number(row.version || 1) + 1;
    }
    await row.save();
  }

  return rows.length;
};

module.exports = {
  computeResultsForEvent,
  publishResultsForEvent,
  resolveGrade
};
