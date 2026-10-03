const { fail } = require('../../utils/response');
const { Teacher } = require('../../models/admin/teachers');
const { Student } = require('../../models/admin/students');
const { ExamPaperV2 } = require('../../models');

const attachTeacherProfile = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({
      where: { user_id: req.user.id },
      attributes: ['id', 'user_id']
    });

    if (!teacher) {
      return fail(res, {
        statusCode: 404,
        code: 'teacher_profile_not_found',
        message: 'Teacher profile not found for this user'
      });
    }

    req.teacher = teacher;
    return next();
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'teacher_profile_fetch_failed',
      message: error.message
    });
  }
};

const attachStudentProfile = async (req, res, next) => {
  try {
    const student = await Student.findOne({
      where: { user_id: req.user.id },
      attributes: ['id', 'user_id', 'class_section_id']
    });

    if (!student) {
      return fail(res, {
        statusCode: 404,
        code: 'student_profile_not_found',
        message: 'Student profile not found for this user'
      });
    }

    req.student = student;
    return next();
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'student_profile_fetch_failed',
      message: error.message
    });
  }
};

const ensureTeacherOwnsPaper = async (req, res, next) => {
  try {
    const examPaperId = req.params.exam_paper_id || req.body.exam_paper_id || req.query.exam_paper_id;
    if (!examPaperId) {
      return fail(res, {
        statusCode: 400,
        code: 'exam_paper_id_required',
        message: 'exam_paper_id is required'
      });
    }

    const paper = await ExamPaperV2.findOne({
      where: { id: examPaperId },
      attributes: ['id', 'assigned_teacher_id', 'exam_event_id']
    });

    if (!paper) {
      return fail(res, {
        statusCode: 404,
        code: 'paper_not_found',
        message: 'Exam paper not found'
      });
    }

    if (!paper.assigned_teacher_id || Number(paper.assigned_teacher_id) !== Number(req.teacher.id)) {
      return fail(res, {
        statusCode: 403,
        code: 'teacher_not_assigned',
        message: 'You are not assigned to this exam paper'
      });
    }

    req.examPaper = paper;
    return next();
  } catch (error) {
    return fail(res, {
      statusCode: 500,
      code: 'teacher_paper_authorization_failed',
      message: error.message
    });
  }
};

const preventTeacherUpdateOnLockedMarks = async (req, res, next) => {
  return next();
};

module.exports = {
  attachTeacherProfile,
  attachStudentProfile,
  ensureTeacherOwnsPaper,
  preventTeacherUpdateOnLockedMarks
};
