import mongoose from 'mongoose';
import Visit from '../models/Visit.js';
import moment from 'moment-timezone';

export const getQueue = async (req, res) => {
    try {
        const startOfDay = moment.tz('Asia/Kolkata').startOf('day').toDate();
        const endOfDay = moment.tz('Asia/Kolkata').endOf('day').toDate();

        const visits = await Visit.find({
            pharmacyStatus: 'pending',
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        })
            .populate('patient', 'name')
            .sort({ tokenNumber: 1 });

        res.json(visits);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching pharmacy queue' });
    }
};

export const getVisitDetails = async (req, res) => {
    try {
        const { visitId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(visitId)) {
            return res.status(400).json({ message: 'Invalid Visit ID format' });
        }

        const visit = await Visit.findById(visitId).populate('patient', 'name mobile');

        if (!visit) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        if (visit.pharmacyStatus !== 'pending') {
            return res.status(400).json({ message: 'This visit does not require pharmacy action or is already completed.' });
        }

        res.json(visit);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching pharmacy visit details' });
    }
};

export const completePharmacy = async (req, res) => {
    try {
        const { visitId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(visitId)) {
            return res.status(400).json({ message: 'Invalid Visit ID format' });
        }

        const visit = await Visit.findById(visitId);

        if (!visit) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        if (visit.pharmacyStatus !== 'pending') {
            return res.status(400).json({
                message: `Cannot complete. Pharmacy status is currently '${visit.pharmacyStatus}'.`
            });
        }

        // 1. Advance Local Status
        visit.pharmacyStatus = 'completed';

        // 2. Safe Deterministic Gate for Global Status
        // Note: Missing 'ipdStatus' safely defaults to 'not_required' structurally due to backwards compatibility handling schema
        const ipd = visit.ipdStatus || 'not_required';

        if (ipd === 'completed' || ipd === 'not_required') {
            visit.status = 'completed';
        } else {
            visit.status = 'in_progress';
        }

        await visit.save();

        res.json({
            message: 'Pharmacy processing completed successfully',
            visitId: visit._id,
            pharmacyStatus: visit.pharmacyStatus,
            globalStatus: visit.status,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error completing pharmacy task' });
    }
};
