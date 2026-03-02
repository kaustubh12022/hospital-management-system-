import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*', // Restrict this in production
            methods: ['GET', 'POST', 'PATCH']
        }
    });

    // 1. JWT Authentication Middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                const err = new Error('Not authorized, no token provided');
                err.data = { type: 'authentication_error' };
                console.log(`[Socket Reject] Connection dropped: No JWT token`);
                return next(err);
            }

            // Verify Token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Validate against Database
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                const err = new Error('Not authorized, user not found');
                err.data = { type: 'authentication_error' };
                console.log(`[Socket Reject] Connection dropped: User deleted or missing`);
                return next(err);
            }

            // Attach user strictly from DB validation, not client claim
            socket.user = user;
            next();
        } catch (error) {
            const err = new Error('Not authorized, token failed');
            err.data = { type: 'authentication_error' };
            console.log(`[Socket Reject] Connection dropped: JWT verification failed`);
            return next(err);
        }
    });

    // 2. Connection Handshake and Role-Based Room Assignment
    io.on('connection', (socket) => {
        const role = socket.user.role; // Guaranteed purely from DB validation above

        // Assign to explicit structural rooms based purely on backend identity
        if (role === 'doctor') {
            socket.join('doctor_room');
            console.log(`[Socket Match] Verified Doctor attached to 'doctor_room'. ID: ${socket.id}`);
        } else if (role === 'pharmacy') {
            socket.join('pharmacy_room');
            console.log(`[Socket Match] Verified Pharmacy attached to 'pharmacy_room'. ID: ${socket.id}`);
        } else if (role === 'ipd') {
            socket.join('ipd_room');
            console.log(`[Socket Match] Verified IPD attached to 'ipd_room'. ID: ${socket.id}`);
        } else if (role === 'opd') {
            socket.join('opd_room');
            console.log(`[Socket Match] Verified OPD attached to 'opd_room'. ID: ${socket.id}`);
        } else {
            console.log(`[Socket Reject] Unrecognized role attempt: ${role}`);
            socket.disconnect(true);
        }

        socket.on('disconnect', () => {
            console.log(`[Socket Drop] User gracefully disconnected. ID: ${socket.id}`);
        });
    });

    return io;
};

// Accessor for controllers avoiding circular dependencies
export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io has not been initialized!');
    }
    return io;
};
