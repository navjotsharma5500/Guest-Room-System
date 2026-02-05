// src/utils/bookingUtils.js
// Utility functions for booking type detection

export const HALL_NAMES = [
  "Hall",
  "Rooms",
  "Creativity Rooms",
  "Green Rooms",
  "Open Area",
  "Desk Area",
  "Common Rooms"
];

/**
 * Determines if a booking is from the hall booking portal
 * @param {Object} booking - The booking object
 * @returns {boolean} - True if it's a hall booking
 */
export const isHallBooking = (booking) => {
  // Check explicit flag first
  if (booking.isHallBooking === true || booking.bookingType === "hall") {
    return true;
  }
  
  // Check if hostel name matches hall structure
  if (booking.hostel && HALL_NAMES.includes(booking.hostel)) {
    return true;
  }
  
  // If no hostel field, might be hall booking
  if (!booking.hostel) {
    return true;
  }
  
  return false;
};

/**
 * Filters bookings based on user role
 * @param {Array} bookings - Array of booking objects
 * @param {string} role - User role (admin, manager, caretaker, assistant)
 * @returns {Array} - Filtered bookings
 */
export const filterBookingsByRole = (bookings, role) => {
  if (role === "admin") {
    return bookings; // Admin sees everything
  }
  
  if (role === "assistant") {
    // Assistant sees only hall bookings
    return bookings.filter(isHallBooking);
  }
  
  if (role === "manager" || role === "caretaker" || role === "warden") {
    // Manager/Caretaker see only guest room bookings
    return bookings.filter(booking => !isHallBooking(booking));
  }
  
  return bookings;
};