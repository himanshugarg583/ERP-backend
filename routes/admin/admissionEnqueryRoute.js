const express = require('express');
const router = express.Router();
const { authMiddleware,isAdmin } = require('../../middlewares/authMiddleware');
const { createEnquiry,getAllEnquiries,getEnquiryById,deleteEnquiry,updateEnquiry,getEnquiryCount } = require('../../controllers/admin/admissionController');

router.post('/createEnquiry',authMiddleware,isAdmin,createEnquiry);
router.put('/updateEnquiry/:enquiryId',authMiddleware,isAdmin,updateEnquiry);
router.get('/getAllEnquiries',authMiddleware,isAdmin, getAllEnquiries);
router.get('/getEnquiryById/:id',authMiddleware,isAdmin,getEnquiryById);
router.delete('/deleteEnquiry/:id',authMiddleware,isAdmin, deleteEnquiry);
// enquery count summery
router.get('/getEnquiryCount', authMiddleware,isAdmin,getEnquiryCount);



module.exports = router;
