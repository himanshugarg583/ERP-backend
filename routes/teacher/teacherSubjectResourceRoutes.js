const express = require('express');
const router = express.Router();
const { authMiddleware, isTeacher } = require('../../middlewares/authMiddleware');
const createUploader = require('../../utils/multerHelper');
const {
  uploadSubjectResource,
  getMySubjectResources,
  getSubjectResourceById,
  updateSubjectResource,
  deleteSubjectResource
} = require('../../controllers/teacher/contentUpload/teacherSubjectResourceController');

// Configure multer for subject resources
const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'video/mp4'];
const upload = createUploader('subjectResources', allowedTypes);

// Upload subject resource (assignment, notes, etc.)
router.post('/uploadSubjectResource', authMiddleware, isTeacher, upload.single('file'), uploadSubjectResource);

// Get all subject resources uploaded by teacher
router.get('/getMySubjectResources', authMiddleware, isTeacher, getMySubjectResources);

// Get single subject resource
router.get('/getSubjectResourceById/:resource_id', authMiddleware, isTeacher, getSubjectResourceById);

// Update subject resource
router.put('/updateSubjectResource/:resource_id', authMiddleware, isTeacher, upload.single('file'), updateSubjectResource);

// Delete subject resource
router.delete('/deleteSubjectResource/:resource_id', authMiddleware, isTeacher, deleteSubjectResource);

module.exports = router;
