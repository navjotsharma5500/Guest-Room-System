// src/utils/hallBookingApi.js
// 🎪 HALL BOOKING SYSTEM API - ISOLATED FROM GUEST ROOM
// This file is ONLY for Hall Booking Dashboard
// Do not import guest room APIs here

import { BACKEND_URL } from "./apiConfig";

const API = BACKEND_URL;

/**
 * Fetch all hall bookings (admin/assistant only)
 * Isolated from guest room system
 */
export const fetchHallBookings = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API}/api/hall-bookings`, {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Hall bookings API failed: ${response.status}`);
    }

    const bookings = await response.json();
    console.log('✅ Hall bookings fetched (isolated):', bookings);
    return bookings;
    
  } catch (error) {
    console.error('🔴 Hall booking fetch error (isolated):', error);
    // Don't crash the app
    return [];
  }
};

/**
 * Create hall booking
 */
export const createHallBooking = async (bookingData) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API}/hall-bookings`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create hall booking');
    }

    return await response.json();
  } catch (error) {
    console.error('🔴 Create hall booking error:', error);
    throw error;
  }
};

/**
 * Cancel hall booking
 */
export const cancelHallBooking = async (bookingId, remarks) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API}/hall-bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ remarks }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to cancel booking');
    }

    return await response.json();
  } catch (error) {
    console.error('🔴 Cancel hall booking error:', error);
    throw error;
  }
};

/**
 * Extend hall booking
 */
export const extendHallBooking = async (bookingId, extensionData) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API}/hall-bookings/${bookingId}/extend`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(extensionData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to extend booking');
    }

    return await response.json();
  } catch (error) {
    console.error('🔴 Extend hall booking error:', error);
    throw error;
  }
};

/**
 * Health check for hall booking system
 */
export const checkHallBookingHealth = async () => {
  try {
    const response = await fetch(`${API}/hall-bookings/health`, {
      method: 'GET',
    });
    
    if (response.ok) {
      return await response.json();
    }
    return { status: 'unhealthy' };
  } catch (error) {
    console.error('🔴 Hall system health check failed:', error);
    return { status: 'error', message: error.message };
  }
};