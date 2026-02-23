// src/nightPermissions/hooks/useNightSocket.js
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_URL } from '../../utils/apiConfig';

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(BACKEND_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('✅ Night Permissions socket connected:', socketInstance.id);
      socketInstance.emit('join-night-permissions');
      socketInstance.emit('join-dashboard');
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });
  }
  return socketInstance;
};

// Hook: subscribe to one or more socket events, auto-cleanup on unmount
export const useSocket = (events = {}) => {
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    const entries = Object.entries(events);

    entries.forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      entries.forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, []);

  return socketRef.current;
};