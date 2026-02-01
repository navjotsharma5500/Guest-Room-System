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

// Isolation wrapper - prevents errors from affecting other systems
const isolatedHandler = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error('🔴 Hall Booking Error (ISOLATED):', error);
    res.status(500).json({ 
      message: 'Hall booking system error',
      isolated: true
    });
  }
};

// ==================== CORE FUNCTIONS ====================

// Create new hall booking(s)
const createHallBookingCore = async (req, res) => {
  const {
    rooms,
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

  if (!/^\d{10}$/.test(contact)) {
    return res.status(400).json({ message: 'Contact must be exactly 10 digits' });
  }

  if (!email.endsWith('@thapar.edu')) {
    return res.status(400).json({ message: 'Email must be @thapar.edu' });
  }

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
      bookingType: 'hall',
      isHallBooking: true,
    });

    await booking.save();
    createdBookings.push(booking);
  }

  try {
    const io = getSocketIO();
    io.emit('hallBookingCreated', { 
      bookings: createdBookings,
      type: 'hall',
      isolated: true,
    });
  } catch (socketError) {
    console.error('⚠️ Socket emit failed (non-critical):', socketError.message);
  }

  res.status(201).json({
    message: 'Hall booking(s) created successfully',
    bookings: createdBookings,
  });
};

// Get all hall bookings
const getAllHallBookingsCore = async (req, res) => {
  const bookings = await HallBooking.find()
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json(bookings);
};

// Get hall bookings by hall
const getHallBookingsByHallCore = async (req, res) => {
  const { hall } = req.params;

  const bookings = await HallBooking.find({ hall })
    .populate('createdBy', 'name email')
    .sort({ checkInDate: 1 });

  res.status(200).json(bookings);
};

// Get single hall booking by ID
const getHallBookingByIdCore = async (req, res) => {
  const { id } = req.params;

  const booking = await HallBooking.findById(id).populate('createdBy', 'name email');

  if (!booking) {
    return res.status(404).json({ message: 'Hall booking not found' });
  }

  res.status(200).json(booking);
};

// Extend hall booking
const extendHallBookingCore = async (req, res) => {
  const { id } = req.params;
  const { extendedDate, extendedTime, remarks } = req.body;

  const booking = await HallBooking.findById(id);

  if (!booking) {
    return res.status(404).json({ message: 'Hall booking not found' });
  }

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

  booking.extensionHistory.push({
    originalCheckOutDate: booking.checkOutDate,
    originalCheckOutTime: booking.checkOutTime,
    newCheckOutDate: extendedDate,
    newCheckOutTime: extendedTime,
    remarks: remarks || '',
  });

  booking.checkOutDate = extendedDate;
  booking.checkOutTime = extendedTime;

  await booking.save();

  try {
    const io = getSocketIO();
    io.emit('hallBookingExtended', { 
      booking,
      type: 'hall',
      isolated: true,
    });
  } catch (socketError) {
    console.error('⚠️ Socket emit failed (non-critical):', socketError.message);
  }

  res.status(200).json(booking);
};

// Cancel hall booking
const cancelHallBookingCore = async (req, res) => {
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

  try {
    const io = getSocketIO();
    io.emit('hallBookingCancelled', { 
      booking,
      type: 'hall',
      isolated: true,
    });
  } catch (socketError) {
    console.error('⚠️ Socket emit failed (non-critical):', socketError.message);
  }

  res.status(200).json({
    message: 'Hall booking cancelled successfully',
    booking,
  });
};

// Update hall booking status
const updateHallBookingStatusCore = async (req, res) => {
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
};

// Delete hall booking
const deleteHallBookingCore = async (req, res) => {
  const { id } = req.params;

  const booking = await HallBooking.findByIdAndDelete(id);

  if (!booking) {
    return res.status(404).json({ message: 'Hall booking not found' });
  }

  res.status(200).json({
    message: 'Hall booking deleted successfully',
  });
};

// Get hall bookings by date range
const getHallBookingsByDateRangeCore = async (req, res) => {
  const { startDate, endDate } = req.query;

  const bookings = await HallBooking.find({
    checkInDate: { $lte: endDate },
    checkOutDate: { $gte: startDate },
  })
    .populate('createdBy', 'name email')
    .sort({ checkInDate: 1 });

  res.status(200).json(bookings);
};

// ==================== EXPORTED ISOLATED VERSIONS ====================

export const createHallBooking = isolatedHandler(createHallBookingCore);
export const getAllHallBookings = isolatedHandler(getAllHallBookingsCore);
export const getHallBookingsByHall = isolatedHandler(getHallBookingsByHallCore);
export const getHallBookingById = isolatedHandler(getHallBookingByIdCore);
export const extendHallBooking = isolatedHandler(extendHallBookingCore);
export const cancelHallBooking = isolatedHandler(cancelHallBookingCore);
export const updateHallBookingStatus = isolatedHandler(updateHallBookingStatusCore);
export const deleteHallBooking = isolatedHandler(deleteHallBookingCore);
export const getHallBookingsByDateRange = isolatedHandler(getHallBookingsByDateRangeCore);