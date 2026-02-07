// backend/utils/socket.js
import { Server } from 'socket.io';

let io;
let hallNamespace;
let guestNamespace;

/**
 * Register Socket.IO instance
 */
export const setSocketIO = (ioInstance) => {
  io = ioInstance;
  
  // Create namespaces AFTER io is set
  hallNamespace = io.of('/hall');
  guestNamespace = io.of('/guest');
  
  console.log("🔌 Socket.IO instance registered in backend");
  console.log("🎪 Hall namespace created");
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
 * Safe emit helper - MUST BE EXPORTED
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
 * Emit to hall namespace
 */
export const emitHallEvent = (event, data) => {
  if (!hallNamespace) {
    console.error('❌ Hall namespace not initialized');
    return;
  }
  
  try {
    hallNamespace.emit(event, data);
    io.emit(event, data); // Also emit to default for admin
    console.log(`✅ Hall event emitted: ${event}`);
  } catch (error) {
    console.error(`⚠️ Hall event emit failed: ${error.message}`);
  }
};

/**
 * Emit to guest namespace
 */
export const emitGuestEvent = (event, data) => {
  if (!guestNamespace) {
    console.error('❌ Guest namespace not initialized');
    return;
  }
  
  try {
    guestNamespace.emit(event, data);
    io.emit(event, data); // Also emit to default for admin
    console.log(`✅ Guest event emitted: ${event}`);
  } catch (error) {
    console.error(`⚠️ Guest event emit failed: ${error.message}`);
  }
};

 /**
 *Emit department payment update (for cron jobs)
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
      timestamp: Date.now()
    });
    console.log(`✅ Department payment event emitted for: ${bookingId}`);
  } catch (error) {
    console.error(`⚠️ Department payment emit failed: ${error.message}`);
  }
};

// Keep default export for backward compatibility
export default {
  setSocketIO,
  getSocketIO,
  emitEvent,
  emitHallEvent,
  emitGuestEvent,
  emitDepartmentPaymentUpdate,
};
