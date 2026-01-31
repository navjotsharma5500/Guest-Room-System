// src/socket.js
// =======================================================
// SOCKET.IO SERVER HELPER (BACKEND ONLY)
// =======================================================

let ioInstance = null;

/**
 * Register Socket.IO instance
 * Called ONCE from index.js after io is created
 */
export const setSocketIO = (io) => {
  ioInstance = io;
  console.log("ðŸ”Œ Socket.IO instance registered in backend");
};

/**
 * Get Socket.IO instance
 * Used inside controllers to emit events
 */
export const getSocketIO = () => {
  if (!ioInstance) {
    throw new Error("âŒ Socket.IO instance not initialized");
  }
  return ioInstance;
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
  setSocketIO,
  getSocketIO,
  emitEvent,
};