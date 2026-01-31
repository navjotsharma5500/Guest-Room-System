// backend/controllers/hallBookingController.js
import { getSocketIO } from '../utils/socket.js';
import HallBooking from '../models/HallBooking.js';

// Helper function to check for time overlaps
const isTimeOverlapping = (
  newCheckInDate,
  newCheckInTime,
  newCheckOutDate,
  newCheckOutTime,
  existingCheckInDate,
  existingCheckInTime,
  existingCheckOutDate,
  existingCheckOutTime
) => {
  const newStart = new Date(`${newCheckInDate}T${newCheckInTime}`);
  const newEnd = new Date(`${newCheckOutDate}T${newCheckOutTime}`);
  const existingStart = new Date(`${existingCheckInDate}T${existingCheckInTime}`);
  const existingEnd = new Date(`${existingCheckOutDate}T${existingCheckOutTime}`);

  return newStart < existingEnd && newEnd > existingStart;
};

// Create new hall booking(s)
export const createHallBooking = async (req, res) => {
  try {
    const {
      rooms, // array of { hall, roomNo }
      name,
      societyName,
      eventName,
      contact,
      email,
      checkInDate,
      checkInTime,
      checkOutDate,
      checkOutTime,
      purpose,
      description,
      attachments,
    } = req.body;

    // Validate required fields
    if (!rooms || rooms.length === 0) {
      return res.status(400).json({ message: 'At least one room is required' });
    }

    if (!name || !societyName || !eventName || !contact || !email) {
      return res.status(400).json({ message: 'All mandatory fields are required' });
    }

    if (!checkInDate || !checkInTime || !checkOutDate || !checkOutTime) {
      return res.status(400).json({ message: 'Check-in and check-out dates/times are required' });
    }

    if (!attachments || attachments.length === 0) {
      return res.status(400).json({ message: 'At least one attachment is required' });
    }

    // Validate contact (10 digits)
    if (!/^\d{10}$/.test(contact)) {
      return res.status(400).json({ message: 'Contact must be exactly 10 digits' });
    }

    // Validate email (@thapar.edu)
    if (!email.endsWith('@thapar.edu')) {
      return res.status(400).json({ message: 'Email must be @thapar.edu' });
    }

    // Check for overlapping bookings for each room
    for (const room of rooms) {
      const overlappingBookings = await HallBooking.find({
        hall: room.hall,
        roomNo: room.roomNo,
        status: { $in: ['booked', 'checked_in'] },
      });

      for (const existing of overlappingBookings) {
        const hasOverlap = isTimeOverlapping(
          checkInDate,
          checkInTime,
          checkOutDate,
          checkOutTime,
          existing.checkInDate,
          existing.checkInTime,
          existing.checkOutDate,
          existing.checkOutTime
        );

        if (hasOverlap) {
          return res.status(400).json({
            message: `Time overlap detected for ${room.hall} - ${room.roomNo}`,
          });
        }
      }
    }

    // Create bookings for all selected rooms
    const createdBookings = [];

    for (const room of rooms) {
      const booking = new HallBooking({
        hall: room.hall,
        roomNo: room.roomNo,
        name,
        societyName,
        eventName,
        contact,
        email,
        checkInDate,
        checkInTime,
        checkOutDate,
        checkOutTime,
        purpose: purpose || '',
        description: description || '',
        attachments: attachments || [],
        status: 'booked',
        createdBy: req.user?._id,
        // 🆕 ADD: Explicit type flags
        bookingType: 'hall',
        isHallBooking: true,
      });

      await booking.save();
      createdBookings.push(booking);
    }

    // Emit socket event
    const io = getSocketIO();
    io.emit('hallBookingCreated', { 
      bookings: createdBookings,
      type: 'hall', // Add type
    });

    res.status(201).json({
      message: 'Hall booking(s) created successfully',
      bookings: createdBookings,
    });

  } catch (error) {
    console.error('Error creating hall booking:', error);
    res.status(500).json({ message: 'Server error while creating hall booking' });
  }
};

// Get all hall bookings
export const getAllHallBookings = async (req, res) => {
  try {
    const bookings = await HallBooking.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching hall bookings:', error);
    res.status(500).json({ message: 'Server error while fetching hall bookings' });
  }
};

// Get hall bookings by hall
export const getHallBookingsByHall = async (req, res) => {
  try {
    const { hall } = req.params;

    const bookings = await HallBooking.find({ hall })
      .populate('createdBy', 'name email')
      .sort({ checkInDate: 1 });

    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching hall bookings by hall:', error);
    res.status(500).json({ message: 'Server error while fetching hall bookings' });
  }
};

// Get single hall booking by ID
export const getHallBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await HallBooking.findById(id).populate('createdBy', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Hall booking not found' });
    }

    res.status(200).json(booking);
  } catch (error) {
    console.error('Error fetching hall booking:', error);
    res.status(500).json({ message: 'Server error while fetching hall booking' });
  }
};

// Extend hall booking
export const extendHallBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { extendedDate, extendedTime, remarks } = req.body;

    const booking = await HallBooking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: 'Hall booking not found' });
    }

    // Check for overlaps with the extended time
    const overlappingBookings = await HallBooking.find({
      _id: { $ne: id },
      hall: booking.hall,
      roomNo: booking.roomNo,
      status: { $in: ['booked', 'checked_in'] },
    });

    for (const existing of overlappingBookings) {
      const hasOverlap = isTimeOverlapping(
        booking.checkInDate,
        booking.checkInTime,
        extendedDate,
        extendedTime,
        existing.checkInDate,
        existing.checkInTime,
        existing.checkOutDate,
        existing.checkOutTime
      );

      if (hasOverlap) {
        return res.status(400).json({
          message: 'Time overlap detected with another booking',
        });
      }
    }

    // Save extension history
    booking.extensionHistory.push({
      originalCheckOutDate: booking.checkOutDate,
      originalCheckOutTime: booking.checkOutTime,
      newCheckOutDate: extendedDate,
      newCheckOutTime: extendedTime,
      remarks: remarks || '',
    });

    // Update checkout date and time
    booking.checkOutDate = extendedDate;
    booking.checkOutTime = extendedTime;

    await booking.save();

    // Emit socket event
    const io = getSocketIO();
    io.emit('hallBookingExtended', { 
      booking,
      type: 'hall', // Add type
    });

    res.status(200).json(booking);
  } catch (error) {
    console.error('Error extending hall booking:', error);
    res.status(500).json({ message: 'Server error while extending hall booking' });
  }
};

// Cancel hall booking
export const cancelHallBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const booking = await HallBooking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: 'Hall booking not found' });
    }

    booking.status = 'cancelled';
    booking.cancellationRemarks = remarks || '';
    booking.cancelledAt = new Date();

    await booking.save();

    // Emit socket event
    const io = getSocketIO();
    io.emit('hallBookingCancelled', { 
      booking,
      type: 'hall', // Add type
    });

    res.status(200).json({
      message: 'Hall booking cancelled successfully',
      booking,
    });
  } catch (error) {
    console.error('Error cancelling hall booking:', error);
    res.status(500).json({ message: 'Server error while cancelling hall booking' });
  }
};

// Update hall booking status
export const updateHallBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['booked', 'checked_in', 'checked_out', 'cancelled', 'no_show'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await HallBooking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: 'Hall booking not found' });
    }

    res.status(200).json(booking);
  } catch (error) {
    console.error('Error updating hall booking status:', error);
    res.status(500).json({ message: 'Server error while updating status' });
  }
};

// Delete hall booking
export const deleteHallBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await HallBooking.findByIdAndDelete(id);

    if (!booking) {
      return res.status(404).json({ message: 'Hall booking not found' });
    }

    res.status(200).json({
      message: 'Hall booking deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting hall booking:', error);
    res.status(500).json({ message: 'Server error while deleting hall booking' });
  }
};

// Get hall bookings by date range
export const getHallBookingsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const bookings = await HallBooking.find({
      checkInDate: { $lte: endDate },
      checkOutDate: { $gte: startDate },
    })
      .populate('createdBy', 'name email')
      .sort({ checkInDate: 1 });

    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching hall bookings by date range:', error);
    res.status(500).json({ message: 'Server error while fetching hall bookings' });
  }
};