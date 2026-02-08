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
  
  console.log("ðŸ”Œ Socket.IO instance registered in backend");
  console.log("ðŸŽª Hall namespace created");
  console.log("ðŸ¨ Guest namespace created");
};

/**
 * Get Socket.IO instance
 */
export const getSocketIO = () => {
  if (!io) {
    throw new Error('âŒ Socket.IO not initialized');
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
    console.error('âŒ Hall namespace not initialized');
    return;
  }
  
  try {
    hallNamespace.emit(event, data);
    io.emit(event, data); // Also emit to default for admin
    console.log(`âœ… Hall event emitted: ${event}`);
  } catch (error) {
    console.error(`âš ï¸ Hall event emit failed: ${error.message}`);
  }
};

/**
 * Emit to guest namespace
 */
export const emitGuestEvent = (event, data) => {
  if (!guestNamespace) {
    console.error('âŒ Guest namespace not initialized');
    return;
  }
  
  try {
    guestNamespace.emit(event, data);
    io.emit(event, data); // Also emit to default for admin
    console.log(`âœ… Guest event emitted: ${event}`);
  } catch (error) {
    console.error(`âš ï¸ Guest event emit failed: ${error.message}`);
  }
};

 /**
 *Emit department payment update (for cron jobs)
 */
export const emitDepartmentPaymentUpdate = (bookingId, data) => {
  if (!io) {
    console.error('âŒ Socket.IO not initialized');
    return;
  }
  
  try {
    io.to('dashboard-room').emit('guest-checked-out', {
      bookingId,
      ...data,
      timestamp: Date.now()
    });
    console.log(`âœ… Department payment event emitted for: ${bookingId}`);
  } catch (error) {
    console.error(`âš ï¸ Department payment emit failed: ${error.message}`);
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