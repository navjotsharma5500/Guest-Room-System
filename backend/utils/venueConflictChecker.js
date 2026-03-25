import VenueBooking from "../models/VenueBooking.js";

/**
 * Check if two time ranges overlap
 * Overlap condition: newStart < existingEnd AND newEnd > existingStart
 */
const isTimeOverlapping = (newStart, newEnd, existStart, existEnd) => {
  return newStart < existEnd && newEnd > existStart;
};

/**
 * FEATURE 1: Check venue booking conflicts
 * @param {string} hall - Hall name
 * @param {string} roomNo - Room number  
 * @param {string} checkInDate - YYYY-MM-DD format
 * @param {string} checkInTime - HH:MM format (24-hour)
 * @param {string} checkOutDate - YYYY-MM-DD format
 * @param {string} checkOutTime - HH:MM format (24-hour)
 * @returns {Promise<object>} {hasConflict: bool, conflictWith?: {...}}
 */
export const checkVenueConflict = async (
  hall,
  roomNo,
  checkInDate,
  checkInTime,
  checkOutDate,
  checkOutTime
) => {
  try {
    // Validate inputs
    if (!hall || !roomNo || !checkInDate || !checkInTime || !checkOutDate || !checkOutTime) {
      throw new Error("Missing required parameters");
    }

    // Parse datetime: "2024-12-25T14:00"
    const newStart = new Date(`${checkInDate}T${checkInTime}`);
    const newEnd = new Date(`${checkOutDate}T${checkOutTime}`);

    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
      throw new Error("Invalid date/time format");
    }

    if (newEnd <= newStart) {
      throw new Error("Check-out must be after check-in");
    }

    // Query: Find bookings SAME HALL + SAME ROOM + ACTIVE STATUS
    const bookings = await VenueBooking.find({
      hall: hall.trim(),
      roomNo: roomNo.trim(),
      status: { $in: ["booked", "checked_in"] },
    });

    // Check for overlaps
    for (const booking of bookings) {
      const existStart = new Date(`${booking.checkInDate}T${booking.checkInTime}`);
      const existEnd = new Date(`${booking.checkOutDate}T${booking.checkOutTime}`);

      if (isTimeOverlapping(newStart, newEnd, existStart, existEnd)) {
        return {
          hasConflict: true,
          conflictWith: {
            id: booking._id,
            name: booking.name,
            start: `${booking.checkInDate} ${booking.checkInTime}`,
            end: `${booking.checkOutDate} ${booking.checkOutTime}`,
          },
        };
      }
    }

    return { hasConflict: false };
  } catch (error) {
    console.error("❌ checkVenueConflict error:", error);
    throw error;
  }
};
