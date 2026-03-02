import mongoose from 'mongoose';
import Patient from '../models/Patient.js';
import Visit from '../models/Visit.js';
import moment from 'moment-timezone';
import { getIO } from '../socket.js';

// @desc    Register a patient (new or existing) and assign a daily token
// @route   POST /api/opd/register
// @access  Private/OPD
export const registerPatient = async (req, res) => {
    try {
        const { name, mobile, address } = req.body;

        if (!name || !mobile || !address) {
            return res.status(400).json({ message: 'Name, mobile, and address are required' });
        }

        // 1. Handle Patient Record
        let patient = await Patient.findOne({ mobile });
        if (!patient) {
            patient = await Patient.create({
                name,
                mobile,
                address,
            });
        }

        // 2. Token Generation Logic
        // Define 'today' boundaries locked to hospital timezone
        const startOfDay = moment.tz('Asia/Kolkata').startOf('day').toDate();
        const endOfDay = moment.tz('Asia/Kolkata').endOf('day').toDate();

        // Find the highest token number for today
        const latestVisit = await Visit.findOne({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        }).sort({ createdAt: -1 });

        let nextTokenNumber = 1;

        if (latestVisit) {
            nextTokenNumber = parseInt(latestVisit.tokenNumber, 10) + 1;
        }

        if (nextTokenNumber > 999) {
            return res.status(400).json({ message: 'Daily token limit reached' });
        }

        // Format to 3 digits (e.g., 7 -> "007")
        const formattedToken = String(nextTokenNumber).padStart(3, '0');

        // 3. Create the Visit
        const visit = await Visit.create({
            patient: patient._id,
            tokenNumber: formattedToken,
            status: 'waiting',
        });

        // 4. Return Data
        res.status(201).json({
            patient: {
                _id: patient._id,
                name: patient.name,
                mobile: patient.mobile,
                address: patient.address,
            },
            tokenNumber: visit.tokenNumber,
            visitStatus: visit.status,
            visitId: visit._id
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get today's queue
// @route   GET /api/opd/queue
// @access  Private/OPD
export const getQueue = async (req, res) => {
    try {
        const startOfDay = moment.tz('Asia/Kolkata').startOf('day').toDate();
        const endOfDay = moment.tz('Asia/Kolkata').endOf('day').toDate();

        const visits = await Visit.find({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        })
            .populate('patient', 'name')
            .sort({ tokenNumber: 1 }); // Sort ascending by token number

        // Format response
        const formattedQueue = visits.map((v) => ({
            _id: v._id,
            tokenNumber: v.tokenNumber,
            patientName: v.patient.name,
            status: v.status,
        }));

        res.json(formattedQueue);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Change visit status to "sent_to_doctor"
// @route   PATCH /api/opd/send/:visitId
// @access  Private/OPD
export const sendToDoctor = async (req, res) => {
    try {
        const { visitId } = req.params;

        // 1. Validate Mongo ID to prevent cast errors
        if (!mongoose.Types.ObjectId.isValid(visitId)) {
            return res.status(400).json({ message: 'Invalid Visit ID format' });
        }

        const visit = await Visit.findById(visitId);

        if (!visit) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        // 2. Strict State Control
        if (visit.status !== 'waiting') {
            return res.status(400).json({
                message: `Cannot send. Visit is currently marked as '${visit.status}'. Only 'waiting' visits can be sent.`
            });
        }

        visit.status = 'sent_to_doctor';
        await visit.save();

        getIO().to('doctor_room').emit('visit_update', {
            visitId: visit._id,
            eventType: 'new_patient'
        });

        res.json({
            _id: visit._id,
            tokenNumber: visit.tokenNumber,
            status: visit.status,
            message: 'Patient sent to doctor successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while sending patient' });
    }
};
