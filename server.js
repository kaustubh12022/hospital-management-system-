import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { initSocket } from './socket.js';
import connectDB from './config/db.js';

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

import authRoutes from './routes/authRoutes.js';
import testRoutes from './routes/testRoutes.js';
import opdRoutes from './routes/opdRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import pharmacyRoutes from './routes/pharmacyRoutes.js';
import ipdRoutes from './routes/ipdRoutes.js';

const app = express();

// 1. Create native Node HTTP Server mapping to Express
const httpServer = http.createServer(app);

// 2. Attach and initialize Socket.io
initSocket(httpServer);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/opd', opdRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/ipd', ipdRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

// 3. Listen completely on httpServer to dual-host endpoints & web sockets
httpServer.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
