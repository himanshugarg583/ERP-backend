const express = require('express');
const router = express.Router();
const { authMiddleware, isAdmin } = require('../../middlewares/authMiddleware');
const createUploader = require('../../utils/multerHelper');
const {
  uploadClassResource,
  getAllClassResources,
  getClassResourceById,
  updateClassResource,
  deleteClassResource
} = require('../../controllers/admin/contentUpload/classResourceController');

// Configure multer for class resources
const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'video/mp4'];
const upload = createUploader('classResources', allowedTypes);

// Upload class resource
router.post('/uploadClassResource',  upload.single('file'), uploadClassResource);

// Get all class resources
router.get('/getAllClassResources', getAllClassResources);

// Get single class resource
router.get('/getClassResource/:resource_id', getClassResourceById);

// Update class resource
router.put('/updateClassResource/:resource_id', upload.single('file'), updateClassResource);

// Delete class resource
router.delete('/deleteClassResource/:resource_id', deleteClassResource);

module.exports = router;
