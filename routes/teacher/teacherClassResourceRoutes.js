const express = require('express');
const router = express.Router();
const { authMiddleware, isTeacher } = require('../../middlewares/authMiddleware');
const createUploader = require('../../utils/multerHelper');
const {
  uploadClassResource,
  getMyClassResources,
  getClassResourceById,
  updateClassResource,
  deleteClassResource
} = require('../../controllers/teacher/contentUpload/teacherClassResourceController');

// Configure multer for class resources
const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'video/mp4'];
const upload = createUploader('classResources', allowedTypes);

// Upload class resource
router.post('/uploadClassResource', authMiddleware, isTeacher, upload.single('file'), uploadClassResource);

// Get all class resources uploaded by teacher
router.get('/getMyClassResources', authMiddleware, isTeacher, getMyClassResources);

// Get single class resource
router.get('/getClassResourceById/:resource_id', authMiddleware, isTeacher, getClassResourceById);

// Update class resource
router.put('/updateClassResource/:resource_id', authMiddleware, isTeacher, upload.single('file'), updateClassResource);

// Delete class resource
router.delete('/deleteClassResource/:resource_id', authMiddleware, isTeacher, deleteClassResource);

module.exports = router;
