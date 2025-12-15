const express = require('express');
const router = express.Router();
const { authMiddleware, isAdmin } = require('../../middlewares/authMiddleware');
const createUploader = require('../../utils/multerHelper');
const {
  uploadSubjectResource,
  getAllSubjectResources,
  getSubjectResourceById,
  updateSubjectResource,
  deleteSubjectResource
} = require('../../controllers/admin/contentUpload/subjectResourceController');

// Configure multer for subject resources
const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'video/mp4'];
const upload = createUploader('subjectResources', allowedTypes);

// Upload subject resource (assignment, notes, etc.)
router.post('/uploadSubjectResource',  upload.single('file'), uploadSubjectResource);

// Get all subject resources
router.get('/getAllSubjectResources',  getAllSubjectResources);

// Get single subject resource
router.get('/getSubjectResource/:resource_id',  getSubjectResourceById);

// Update subject resource
router.put('/updateSubjectResource/:resource_id',  upload.single('file'), updateSubjectResource);

// Delete subject resource
router.delete('/deleteSubjectResource/:resource_id',  deleteSubjectResource);

module.exports = router;
