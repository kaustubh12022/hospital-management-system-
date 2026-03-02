import mongoose from 'mongoose';
import Visit from '../models/Visit.js';
import Patient from '../models/Patient.js';
import moment from 'moment-timezone';
import { getIO } from '../socket.js';

// @desc    Get all active patients sent to the doctor for today
// @route   GET /api/doctor/queue
// @access  Private/Doctor
export const getQueue = async (req, res) => {
    try {
        const startOfDay = moment.tz('Asia/Kolkata').startOf('day').toDate();
        const endOfDay = moment.tz('Asia/Kolkata').endOf('day').toDate();

        const visits = await Visit.find({
            status: 'sent_to_doctor',
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        })
            .populate('patient', 'name mobile address totalCredit')
            .sort({ tokenNumber: 1 });

        res.json(visits);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching doctor queue' });
    }
};

// @desc    Get full details of a specific visit including patient history
// @route   GET /api/doctor/visit/:visitId
// @access  Private/Doctor
export const getVisitDetails = async (req, res) => {
    try {
        const { visitId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(visitId)) {
            return res.status(400).json({ message: 'Invalid Visit ID format' });
        }

        const visit = await Visit.findById(visitId).populate(
            'patient',
            'name mobile address totalCredit creditHistory'
        );

        if (!visit) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        res.json(visit);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching visit details' });
    }
};

// @desc    Complete the medical consultation
// @route   PATCH /api/doctor/complete/:visitId
// @access  Private/Doctor
export const completeConsultation = async (req, res) => {
    try {
        const { visitId } = req.params;
        const {
            medicines,
            note,
            billingStatus,
            amount,
            sendToPharmacy,
            sendToIPD,
        } = req.body;

        // 1. Initial Validation
        if (!mongoose.Types.ObjectId.isValid(visitId)) {
            return res.status(400).json({ message: 'Invalid Visit ID format' });
        }

        if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
            return res.status(400).json({ message: 'At least one medicine is required' });
        }

        // Validate medicine format
        for (const med of medicines) {
            if (!med.medicineName || !med.dosage || !med.frequency || !med.duration) {
                return res.status(400).json({ message: 'Incomplete medicine details provided' });
            }
        }

        if (billingStatus !== 'paid' && billingStatus !== 'credit') {
            return res.status(400).json({ message: 'Invalid billing status' });
        }

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number' });
        }

        // 2. Fetch and Check State
        const visit = await Visit.findById(visitId);

        if (!visit) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        if (visit.status !== 'sent_to_doctor') {
            return res.status(400).json({
                message: `Cannot complete consultation. Visit status is '${visit.status}'.`
            });
        }

        // 3. Update the Visit Record
        visit.medicines = medicines;
        if (note) visit.note = note;
        visit.billingStatus = billingStatus;
        visit.amount = numAmount;
        visit.consultationCompletedAt = new Date();

        // 4. Routing Logic
        if (sendToPharmacy === true) {
            visit.pharmacyStatus = 'pending';
        } else {
            visit.pharmacyStatus = 'not_required';
        }

        if (sendToIPD === true) {
            visit.ipdStatus = 'pending';
        } else {
            visit.ipdStatus = 'not_required';
        }

        // 5. Determine Global Status
        if (visit.pharmacyStatus === 'pending' || visit.ipdStatus === 'pending') {
            visit.status = 'in_progress';
        } else {
            visit.status = 'completed';
        }

        await visit.save();

        // 6. Update the Patient Record if "credit"
        if (billingStatus === 'credit') {
            const patient = await Patient.findById(visit.patient);

            if (!patient) {
                // Highly unlikely unless manually deleted mid-session, but guarded.
                return res.status(500).json({ message: 'Patient document associated with visit missing' });
            }

            patient.totalCredit += numAmount;
            patient.creditHistory.push({
                amount: numAmount,
                date: visit.consultationCompletedAt
            });

            await patient.save();
        }

        // 7. Fire Live Pings to Route Destinations purely based on final flags
        if (visit.pharmacyStatus === 'pending') {
            getIO().to('pharmacy_room').emit('visit_update', {
                visitId: visit._id,
                eventType: 'pharmacy_new_visit'
            });
        }

        if (visit.ipdStatus === 'pending') {
            getIO().to('ipd_room').emit('visit_update', {
                visitId: visit._id,
                eventType: 'ipd_new_visit'
            });
        }

        res.json({
            message: 'Consultation completed successfully',
            visitId: visit._id,
            status: visit.status,
            billingStatus: visit.billingStatus
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error completing consultation' });
    }
};
