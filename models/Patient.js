import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        mobile: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        address: {
            type: String,
            required: true,
        },
        totalCredit: {
            type: Number,
            default: 0,
        },
        creditHistory: [
            {
                amount: { type: Number, required: true },
                date: { type: Date, default: Date.now },
            },
        ],
    },
    {
        timestamps: true,
    }
);

const Patient = mongoose.model('Patient', patientSchema);
export default Patient;
