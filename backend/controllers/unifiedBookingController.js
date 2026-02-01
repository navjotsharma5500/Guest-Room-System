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
    
    let guestBookings = [];
    let hallBookings = [];

    // 🛡️ ISOLATION: Fetch each system independently
    try {
      guestBookings = await Booking.find()
        .populate('createdBy', 'name email')
        .lean();
      
      guestBookings = guestBookings.map(b => ({
        ...b,
        bookingType: 'guest',
        isHallBooking: false,
        guest: b.guest,
      }));
    } catch (guestError) {
      console.error('⚠️ Guest booking fetch failed (isolated):', guestError.message);
    }

    try {
      hallBookings = await HallBooking.find()
        .populate('createdBy', 'name email')
        .lean();
      
      hallBookings = hallBookings.map(b => ({
        ...b,
        bookingType: 'hall',
        isHallBooking: true,
        guest: b.name,
        hostel: b.hall,
        from: b.checkInDate,
        to: b.checkOutDate,
      }));
    } catch (hallError) {
      console.error('⚠️ Hall booking fetch failed (isolated):', hallError.message);
    }

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

    let guestBookings = [];
    let hallBookings = [];

    try {
      guestBookings = await Booking.find({
        from: { $lte: new Date(endDate) },
        to: { $gte: new Date(startDate) },
      }).lean();

      guestBookings = guestBookings.map(b => ({
        ...b,
        bookingType: 'guest',
        isHallBooking: false,
      }));
    } catch (guestError) {
      console.error('⚠️ Guest booking fetch failed (isolated):', guestError.message);
    }

    try {
      hallBookings = await HallBooking.find({
        checkInDate: { $lte: endDate },
        checkOutDate: { $gte: startDate },
      }).lean();

      hallBookings = hallBookings.map(b => ({
        ...b,
        bookingType: 'hall',
        isHallBooking: true,
        guest: b.name,
        hostel: b.hall,
        from: b.checkInDate,
        to: b.checkOutDate,
      }));
    } catch (hallError) {
      console.error('⚠️ Hall booking fetch failed (isolated):', hallError.message);
    }

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