import mongoose from 'mongoose';
import Visit from '../models/Visit.js';
import moment from 'moment-timezone';
import { getIO } from '../socket.js';

export const getQueue = async (req, res) => {
    try {
        const startOfDay = moment.tz('Asia/Kolkata').startOf('day').toDate();
        const endOfDay = moment.tz('Asia/Kolkata').endOf('day').toDate();

        const visits = await Visit.find({
            ipdStatus: 'pending',
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        })
            .populate('patient', 'name')
            .sort({ tokenNumber: 1 });

        res.json(visits);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching IPD queue' });
    }
};

export const completeIPD = async (req, res) => {
    try {
        const { visitId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(visitId)) {
            return res.status(400).json({ message: 'Invalid Visit ID format' });
        }

        const visit = await Visit.findById(visitId);

        if (!visit) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        if (visit.ipdStatus !== 'pending') {
            return res.status(400).json({
                message: `Cannot complete. IPD status is currently '${visit.ipdStatus}'.`
            });
        }

        // 1. Advance Local Status
        visit.ipdStatus = 'completed';

        // 2. Safe Deterministic Gate for Global Status
        // Note: Missing 'pharmacyStatus' defaults to 'not_required' automatically for backward doc safety
        const pharmacy = visit.pharmacyStatus || 'not_required';

        if (pharmacy === 'completed' || pharmacy === 'not_required') {
            visit.status = 'completed';
        } else {
            visit.status = 'in_progress';
        }

        await visit.save();

        getIO().to('doctor_room').emit('visit_update', {
            visitId: visit._id,
            eventType: 'ipd_completed'
        });

        res.json({
            message: 'IPD processing completed successfully',
            visitId: visit._id,
            ipdStatus: visit.ipdStatus,
            globalStatus: visit.status,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error completing IPD task' });
    }
};
