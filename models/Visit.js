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
        },
        visitDate: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ['waiting', 'sent_to_doctor', 'completed'],
            default: 'waiting',
        },
    },
    {
        timestamps: true,
    }
);

const Visit = mongoose.model('Visit', visitSchema);
export default Visit;
