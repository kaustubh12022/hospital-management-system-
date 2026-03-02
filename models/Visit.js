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
    },
    {
        timestamps: true,
    }
);

const Visit = mongoose.model('Visit', visitSchema);
export default Visit;
