import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { registerPatient, getQueue, sendToDoctor } from '../controllers/opdController.js';

const router = express.Router();

// Apply middleware to all routes in this file
router.use(protect);
router.use(authorize('opd'));

router.post('/register', registerPatient);
router.get('/queue', getQueue);
router.patch('/send/:visitId', sendToDoctor);

export default router;
