// src/utils/unifiedBookingApi.js
// ⚠️ ADMIN-ONLY API - DO NOT USE IN HALL OR GUEST ROOM DASHBOARDS
// This combines both systems and should only be used for:
// - Admin analytics
// - Unified calendar view
// - Cross-system reports

import { BACKEND_URL } from "./apiConfig";

const API = BACKEND_URL;

/**
 * ⚠️ ADMIN ONLY: Fetch all unified bookings (guest + hall)
 * Backend handles role filtering automatically based on JWT token
 * 
 * DO NOT USE IN:
 * - HallBookingDashboard (use useHallDataPolling instead)
 * - GuestRoomDashboard (use existing guest room APIs)
 * 
 * SAFE TO USE IN:
 * - Admin analytics pages
 * - Unified calendar components
 * - Admin reports
 */
export const fetchUnifiedBookings = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API}/api/unified-bookings`, {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      console.error('Failed to fetch unified bookings:', response.statusText);
      return [];
    }

    const data = await response.json();
    console.log('✅ Unified bookings fetched:', data);
    return data.bookings || [];
  } catch (error) {
    console.error('❌ Error fetching unified bookings:', error);
    // Don't throw - return empty array to prevent cascading failures
    return [];
  }
};

/**
 * ⚠️ ADMIN ONLY: Fetch unified bookings by date range
 */
export const fetchUnifiedBookingsByDateRange = async (startDate, endDate) => {
  try {
    const token = localStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(
      `${API}/api/unified-bookings/date-range?startDate=${startDate}&endDate=${endDate}`,
      {
        method: 'GET',
        credentials: 'include',
        headers,
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch bookings by date range:', response.statusText);
      return [];
    }

    const data = await response.json();
    console.log('✅ Unified bookings by date range fetched:', data);
    return data.bookings || [];
  } catch (error) {
    console.error('❌ Error fetching bookings by date range:', error);
    // Don't throw - return empty array to prevent cascading failures
    return [];
  }
};

/**
 * Normalize booking for consistent frontend usage
 * Ensures all bookings have the same shape regardless of type
 */
export const normalizeBooking = (booking) => {
  return {
    ...booking,
    // Ensure consistent date fields
    from: booking.from || booking.checkInDate,
    to: booking.to || booking.checkOutDate,
    // Ensure consistent location fields
    hostel: booking.hostel || booking.hall,
    // Ensure guest field exists
    guest: booking.guest || booking.name,
    // Type identifiers
    bookingType: booking.bookingType || (booking.isHallBooking ? 'hall' : 'guest'),
    isHallBooking: booking.isHallBooking || booking.bookingType === 'hall',
  };
};