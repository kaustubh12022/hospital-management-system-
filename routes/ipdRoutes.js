import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getQueue, completeIPD } from '../controllers/ipdController.js';

const router = express.Router();

router.use(protect);
router.use(authorize('ipd'));

router.get('/queue', getQueue);
router.patch('/complete/:visitId', completeIPD);

export default router;
