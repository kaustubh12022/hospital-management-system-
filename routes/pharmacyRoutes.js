import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getQueue, getVisitDetails, completePharmacy } from '../controllers/pharmacyController.js';

const router = express.Router();

router.use(protect);
router.use(authorize('pharmacy'));

router.get('/queue', getQueue);
router.get('/visit/:visitId', getVisitDetails);
router.patch('/complete/:visitId', completePharmacy);

export default router;
