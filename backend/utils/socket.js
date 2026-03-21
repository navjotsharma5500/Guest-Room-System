// backend/utils/socket.js
import { Server } from 'socket.io';

let io;
let guestNamespace;

/**
 * Register Socket.IO instance
 */
export const setSocketIO = (ioInstance) => {
  io = ioInstance;

  // Create only Guest namespace
  guestNamespace = io.of('/guest');

  console.log("🔌 Socket.IO instance registered in backend");
  console.log("🏨 Guest namespace created");
};

/**
 * Get Socket.IO instance
 */
export const getSocketIO = () => {
  if (!io) {
    throw new Error('❌ Socket.IO not initialized');
  }
  return io;
};

/**
 * Safe emit helper (global emit)
 */
export const emitEvent = (event, payload, room = null) => {
  const ioInstance = getSocketIO();

  if (room) {
    ioInstance.to(room).emit(event, payload);
  } else {
    ioInstance.emit(event, payload);
  }
};

/**
 * Emit to guest namespace only
 */
export const emitGuestEvent = (event, data) => {
  if (!guestNamespace) {
    console.error('❌ Guest namespace not initialized');
    return;
  }

  try {
    guestNamespace.emit(event, data);
    io.emit(event, data); // Also emit to default namespace for admins
    console.log(`✅ Guest event emitted: ${event}`);
  } catch (error) {
    console.error(`⚠️ Guest event emit failed: ${error.message}`);
  }
};

/**
 * Emit department payment update (for cron jobs / guest room only)
 */
export const emitDepartmentPaymentUpdate = (bookingId, data) => {
  if (!io) {
    console.error('❌ Socket.IO not initialized');
    return;
  }

  try {
    io.to('dashboard-room').emit('guest-checked-out', {
      bookingId,
      ...data,
      timestamp: Date.now(),
    });
    console.log(`✅ Department payment event emitted for: ${bookingId}`);
  } catch (error) {
    console.error(`⚠️ Department payment emit failed: ${error.message}`);
  }
};

// Default export
export default {
  setSocketIO,
  getSocketIO,
  emitEvent,
  emitGuestEvent,
  emitDepartmentPaymentUpdate,
};
