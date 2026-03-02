import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Patient',
        },
        tokenNumber: {
            type: String,
            required: true,
            index: true,
        },
        visitDate: {
            type: Date,
            default: Date.now,
            index: true,
        },
        status: {
            type: String,
            enum: ['waiting', 'sent_to_doctor', 'completed'],
            default: 'waiting',
            index: true,
        },
        medicines: [
            {
                medicineName: { type: String, required: true },
                dosage: { type: String, required: true },
                frequency: { type: String, required: true },
                duration: { type: String, required: true },
            },
        ],
        note: {
            type: String,
        },
        billingStatus: {
            type: String,
            enum: ['paid', 'credit'],
        },
        amount: {
            type: Number,
        },
        consultationCompletedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

const Visit = mongoose.model('Visit', visitSchema);
export default Visit;
