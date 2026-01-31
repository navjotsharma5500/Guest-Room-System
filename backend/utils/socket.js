// backend/utils/socket.js
// =======================================================
// SOCKET.IO SERVER HELPER (BACKEND ONLY)
// =======================================================

import { Server } from 'socket.io';

let io;

/**
 * Initialize Socket.IO server
 * Called ONCE from index.js when server starts
 */
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    socket.on('join-dashboard', () => {
      console.log('📊 Client joined dashboard');
      socket.join('dashboard');
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  console.log("🔌 Socket.IO instance initialized in backend");
  return io;
};

/**
 * Register Socket.IO instance (alternative to initializeSocket)
 * Called ONCE from index.js after io is created externally
 */
export const setSocketIO = (ioInstance) => {
  io = ioInstance;
  console.log("🔌 Socket.IO instance registered in backend");
};

/**
 * Get Socket.IO instance
 * Used inside controllers to emit events
 */
export const getSocketIO = () => {
  if (!io) {
    throw new Error('❌ Socket.IO not initialized');
  }
  return io;
};

/**
 * Safe emit helper (optional but useful)
 */
export const emitEvent = (event, payload, room = null) => {
  const io = getSocketIO();

  if (room) {
    io.to(room).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
};

export default {
  initializeSocket,
  setSocketIO,
  getSocketIO,
  emitEvent,
};