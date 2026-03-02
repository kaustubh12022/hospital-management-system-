import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getQueue, getVisitDetails, completeConsultation } from '../controllers/doctorController.js';

const router = express.Router();

// Apply middleware to all routes in this file
router.use(protect);
router.use(authorize('doctor'));

router.get('/queue', getQueue);
router.get('/visit/:visitId', getVisitDetails);
router.patch('/complete/:visitId', completeConsultation);

export default router;
