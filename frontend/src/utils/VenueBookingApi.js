// src/utils/VenueBookingApi.js
// 🎪 VENUE BOOKING SYSTEM API - ISOLATED FROM GUEST ROOM
// This file is ONLY for Venue Booking Dashboard
// Do not import guest room APIs here

import { BACKEND_URL } from "./apiConfig";

const API = BACKEND_URL;

/**
 * Fetch all venue bookings (admin/assistant only)
 * Isolated from guest room system
 */
export const fetchVenueBookings = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API}/api/venue-bookings`, {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Venue bookings API failed: ${response.status}`);
    }

    const bookings = await response.json();
    console.log('✅ Venue bookings fetched (isolated):', bookings);
    return bookings;
    
  } catch (error) {
    console.error('🔴 Venue booking fetch error (isolated):', error);
    // Don't crash the app
    return [];
  }
};

/**
 * Create venue booking
 */
export const createVenueBooking = async (bookingData) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API}/api/venue-bookings`, {
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
      throw new Error(errorData.message || 'Failed to create venue booking');
    }

    return await response.json();
  } catch (error) {
    console.error('🔴 Create venue booking error:', error);
    throw error;
  }
};

/**
 * Cancel venue booking
 */
export const cancelVenueBooking = async (bookingId, remarks) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API}/api/venue-bookings/${bookingId}/cancel`, {
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
    console.error('🔴 Cancel venue booking error:', error);
    throw error;
  }
};

/**
 * Extend venue booking
 */
export const extendVenueBooking = async (bookingId, extensionData) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API}/api/venue-bookings/${bookingId}/extend`, {
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
      throw new Error(errorData.message || 'Failed to extend venue booking');
    }

    return await response.json();
  } catch (error) {
    console.error('🔴 Extend venue booking error:', error);
    throw error;
  }
};

/**
 * Health check for venue booking system
 */
export const checkVenueBookingHealth = async () => {
  try {
    const response = await fetch(`${API}/api/venue-bookings/health`, {
      method: 'GET',
    });
    
    if (response.ok) {
      return await response.json();
    }
    return { status: 'unhealthy' };
  } catch (error) {
    console.error('🔴 Venue system health check failed:', error);
    return { status: 'error', message: error.message };
  }
};

// Backward compatible aliases
export const fetchHallBookings = fetchVenueBookings;
export const createHallBooking = createVenueBooking;
export const cancelHallBooking = cancelVenueBooking;
export const extendHallBooking = extendVenueBooking;
export const checkHallBookingHealth = checkVenueBookingHealth;
