import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/public', (req, res) => {
    res.json({ message: 'This is a public route.' });
});

router.get('/protected', protect, (req, res) => {
    res.json({ message: 'You have access to this protected route.', user: req.user });
});

router.get('/doctor', protect, authorize('doctor'), (req, res) => {
    res.json({ message: 'Welcome Doctor. You have doctor access.', user: req.user });
});

router.get('/opd', protect, authorize('opd'), (req, res) => {
    res.json({ message: 'Welcome OPD Assistant.', user: req.user });
});

export default router;
