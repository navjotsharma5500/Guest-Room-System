// backend/controllers/unifiedBookingController.js
import Booking from '../models/Booking.js';
import HallBooking from '../models/HallBooking.js';

/**
 * Get all bookings (guest + hall) with role-based filtering
 */
export const getAllUnifiedBookings = async (req, res) => {
  try {
    const userRole = req.user?.role || 'caretaker';
    const userHostel = req.user?.assignedHostel || req.user?.hostel;

    // Fetch guest bookings
    let guestBookings = await Booking.find()
      .populate('createdBy', 'name email')
      .lean();

    // Fetch hall bookings
    let hallBookings = await HallBooking.find()
      .populate('createdBy', 'name email')
      .lean();

    // Add type identifiers to guest bookings
    guestBookings = guestBookings.map(b => ({
      ...b,
      bookingType: 'guest',
      isHallBooking: false,
      guest: b.guest, // Already has guest field
    }));

    // Add type identifiers and compatibility fields to hall bookings
    hallBookings = hallBookings.map(b => ({
      ...b,
      bookingType: 'hall',
      isHallBooking: true,
      guest: b.name, // Use name as guest
      hostel: b.hall, // Use hall as hostel for compatibility
      from: b.checkInDate, // Compatibility
      to: b.checkOutDate, // Compatibility
    }));

    // Role-based filtering
    let filteredBookings = [];

    if (userRole === 'admin') {
      // Admin sees everything
      filteredBookings = [...guestBookings, ...hallBookings];
    } else if (userRole === 'assistant') {
      // Assistant sees ONLY hall bookings
      filteredBookings = hallBookings;
    } else if (userRole === 'manager') {
      // Manager sees ONLY guest bookings
      filteredBookings = guestBookings;
    } else if (userRole === 'caretaker') {
      // Caretaker sees only their hostel's guest bookings
      filteredBookings = guestBookings.filter(b => b.hostel === userHostel);
    }

    // Sort by check-in date
    filteredBookings.sort((a, b) => {
      const dateA = new Date(a.from || a.checkInDate);
      const dateB = new Date(b.from || b.checkInDate);
      return dateA - dateB;
    });

    res.status(200).json({
      success: true,
      count: filteredBookings.length,
      bookings: filteredBookings,
    });

  } catch (error) {
    console.error('Error fetching unified bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings',
    });
  }
};

/**
 * Get bookings by date range (unified)
 */
export const getUnifiedBookingsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userRole = req.user?.role || 'caretaker';
    const userHostel = req.user?.assignedHostel || req.user?.hostel;

    // Fetch guest bookings in date range
    let guestBookings = await Booking.find({
      from: { $lte: new Date(endDate) },
      to: { $gte: new Date(startDate) },
    }).lean();

    // Fetch hall bookings in date range
    let hallBookings = await HallBooking.find({
      checkInDate: { $lte: endDate },
      checkOutDate: { $gte: startDate },
    }).lean();

    // Add type identifiers
    guestBookings = guestBookings.map(b => ({
      ...b,
      bookingType: 'guest',
      isHallBooking: false,
    }));

    hallBookings = hallBookings.map(b => ({
      ...b,
      bookingType: 'hall',
      isHallBooking: true,
      guest: b.name,
      hostel: b.hall,
      from: b.checkInDate,
      to: b.checkOutDate,
    }));

    // Role-based filtering
    let filteredBookings = [];

    if (userRole === 'admin') {
      filteredBookings = [...guestBookings, ...hallBookings];
    } else if (userRole === 'assistant') {
      filteredBookings = hallBookings;
    } else if (userRole === 'manager') {
      filteredBookings = guestBookings;
    } else if (userRole === 'caretaker') {
      filteredBookings = guestBookings.filter(b => b.hostel === userHostel);
    }

    res.status(200).json({
      success: true,
      count: filteredBookings.length,
      bookings: filteredBookings,
    });

  } catch (error) {
    console.error('Error fetching bookings by date range:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings',
    });
  }
};