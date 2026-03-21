// backend/controllers/VenueBookingController.js
import { getSocketIO } from '../utils/socket.js';
import VenueBooking from '../models/VenueBooking.js';
import VenueEnquiry from '../models/VenueEnquiry.js';
import SocietyNameSuggestion, { getDefaultSocietyEmail } from '../models/SocietyNameSuggestion.js';
import EventNameSuggestion from '../models/EventNameSuggestion.js';
import {
  canAccessVenueRoom,
  getVenueRoomFilterForRole,
  mergeRoleRoomFilter,
  filterRecordsByVenueRole,
} from '../utils/venueAccessPolicy.js';
import {
  sendDirectBookingEmail,
  sendBookingExtendedEmail,
  sendBookingCancelledEmail,
} from '../emails/venueEmailService.js';

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
    console.error('🔴 Venue Booking Error (ISOLATED):', error);
    res.status(500).json({ 
      message: `Venue booking system error: ${error.message}`,
      isolated: true,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const touchSocietySuggestion = async (name = '') => {
  const normalizedName = String(name || '').trim();
  if (!normalizedName) return;
  const email = getDefaultSocietyEmail(normalizedName);

  await SocietyNameSuggestion.findOneAndUpdate(
    { name: normalizedName },
    {
      $setOnInsert: { name: normalizedName, email: email || '' },
      $inc: { usageCount: 1 },
      $set: {
        lastUsed: new Date(),
        ...(email ? { email } : {}),
      },
    },
    { upsert: true, new: true }
  );
};

const touchEventSuggestion = async (name = '') => {
  const normalizedName = String(name || '').trim();
  if (!normalizedName) return;

  await EventNameSuggestion.findOneAndUpdate(
    { name: normalizedName },
    {
      $setOnInsert: { name: normalizedName },
      $inc: { usageCount: 1 },
      $set: { lastUsed: new Date() },
    },
    { upsert: true, new: true }
  );
};

// ==================== CORE FUNCTIONS ====================

// Create new venue booking(s)
const createVenueBookingCore = async (req, res) => {
  const {
    rooms,
    name,
    societyName,
    eventName,
    department,
    contact,
    email,
    checkInDate,
    checkInTime,
    checkOutDate,
    checkOutTime,
    purpose,
    description,
    attachments,
    enquiryId,
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

  try {
    await Promise.all([
      touchSocietySuggestion(societyName),
      touchEventSuggestion(eventName),
    ]);
  } catch (suggestionError) {
    console.error('⚠️ Suggestion update failed (non-critical):', suggestionError.message);
  }

  for (const room of rooms) {
    if (!canAccessVenueRoom(req.user?.role, room.hall, room.roomNo)) {
      return res.status(403).json({ message: `Access denied to room ${room.roomNo}` });
    }

    const overlappingBookings = await VenueBooking.find({
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
  let venueEnquiry = null;

  if (enquiryId) {
    venueEnquiry = await VenueEnquiry.findById(enquiryId);
    if (!venueEnquiry) {
      return res.status(404).json({ message: 'Linked venue enquiry not found' });
    }
    if (!['approved', 'pending'].includes(venueEnquiry.status)) {
      return res.status(400).json({ message: `Enquiry is ${venueEnquiry.status}, cannot create booking` });
    }
  }

  for (const room of rooms) {
    const booking = new VenueBooking({
      hall: room.hall,
      roomNo: room.roomNo,
      name,
      societyName,
      eventName,
      department: (department || venueEnquiry?.department || '').trim(),
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
      bookingType: 'venue',
      isVenueBooking: true,
      isHallBooking: false,
      enquiryId: enquiryId || null,
    });

    await booking.save();
    createdBookings.push(booking);
  }

  if (venueEnquiry) {
    venueEnquiry.status = 'booked';
    venueEnquiry.reviewedBy = req.user?._id || venueEnquiry.reviewedBy;
    venueEnquiry.reviewedAt = venueEnquiry.reviewedAt || new Date();
    venueEnquiry.bookingIds = createdBookings.map((b) => b._id);
    await venueEnquiry.save();
  }

  try {
    const io = getSocketIO();
    io.emit('venueBookingCreated', { 
      bookings: createdBookings,
      type: 'venue',
      isolated: true,
    });
    if (venueEnquiry) {
      io.to('dashboard-room').emit('venue-enquiry-updated', { enquiry: venueEnquiry });
    }
  } catch (socketError) {
    console.error('⚠️ Socket emit failed (non-critical):', socketError.message);
  }

  // Send booking confirmation emails
  for (const booking of createdBookings) {
    try {
      await sendDirectBookingEmail(booking);
    } catch (emailError) {
      console.error('⚠️ Booking email failed (non-critical):', emailError.message);
    }
  }

  res.status(201).json({
    message: 'Venue booking(s) created successfully',
    bookings: createdBookings,
  });
};

// Get all venue bookings
const getAllVenueBookingsCore = async (req, res) => {
  const userRole = req.user?.role || '';
  
  // Apply role-based room filter
  const roleFilter = getVenueRoomFilterForRole(userRole, 'roomNo');
  const query = Object.keys(roleFilter).length > 0 ? roleFilter : {};
  
  const bookings = await VenueBooking.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json(bookings);
};

// Get venue bookings by hall/category name
const getVenueBookingsByVenueCore = async (req, res) => {
  const { venue } = req.params;
  const userRole = req.user?.role || '';

  // Apply role-based room filter
  const baseQuery = { hall: venue };
  const query = mergeRoleRoomFilter(baseQuery, userRole, 'roomNo');

  const bookings = await VenueBooking.find(query)
    .populate('createdBy', 'name email')
    .sort({ checkInDate: 1 });

  res.status(200).json(bookings);
};

// Get single venue booking by ID
const getVenueBookingByIdCore = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user?.role || '';

  const booking = await VenueBooking.findById(id).populate('createdBy', 'name email');

  if (!booking) {
    return res.status(404).json({ message: 'Venue booking not found' });
  }

  // Check room access
  if (!canAccessVenueRoom(userRole, booking.hall, booking.roomNo)) {
    return res.status(403).json({ message: 'Access denied to this room' });
  }

  res.status(200).json(booking);
};

// Extend venue booking
const extendVenueBookingCore = async (req, res) => {
  const { id } = req.params;
  const { extendedDate, extendedTime, remarks } = req.body;

  const booking = await VenueBooking.findById(id);

  if (!booking) {
    return res.status(404).json({ message: 'Venue booking not found' });
  }

  if (!canAccessVenueRoom(req.user?.role, booking.hall, booking.roomNo)) {
    return res.status(403).json({ message: 'Access denied to this room' });
  }

  // Send extension email
  try {
    await sendBookingExtendedEmail(booking);
  } catch (emailError) {
    console.error('⚠️ Extension email failed (non-critical):', emailError.message);
  }

  const overlappingBookings = await VenueBooking.find({
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
    io.emit('venueBookingExtended', { 
      booking,
      type: 'venue',
      isolated: true,
    });
  } catch (socketError) {
    console.error('⚠️ Socket emit failed (non-critical):', socketError.message);
  }

  res.status(200).json(booking);
};

// Cancel venue booking
const cancelVenueBookingCore = async (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;

  const booking = await VenueBooking.findById(id);

  if (!booking) {
    return res.status(404).json({ message: 'Venue booking not found' });
  }

  if (!canAccessVenueRoom(req.user?.role, booking.hall, booking.roomNo)) {
    return res.status(403).json({ message: 'Access denied to this room' });
  }

  booking.status = 'cancelled';
  booking.cancellationRemarks = remarks || '';
  booking.cancelledAt = new Date();

  await booking.save();

  try {
    const io = getSocketIO();
    io.emit('venueBookingCancelled', { 
      booking,
      type: 'venue',
      isolated: true,
    });
  } catch (socketError) {
    console.error('⚠️ Socket emit failed (non-critical):', socketError.message);
  }

  // Send cancellation email
  try {
    await sendBookingCancelledEmail(booking);
  } catch (emailError) {
    console.error('⚠️ Cancellation email failed (non-critical):', emailError.message);
  }

  res.status(200).json({
    message: 'Venue booking cancelled successfully',
    booking,
  });
};

// Update venue booking status
const updateVenueBookingStatusCore = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['booked', 'checked_in', 'checked_out', 'cancelled', 'no_show'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const existingBooking = await VenueBooking.findById(id);
  if (!existingBooking) {
    return res.status(404).json({ message: 'Venue booking not found' });
  }

  if (!canAccessVenueRoom(req.user?.role, existingBooking.hall, existingBooking.roomNo)) {
    return res.status(403).json({ message: 'Access denied to this room' });
  }

  const booking = await VenueBooking.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  res.status(200).json(booking);
};

// Delete venue booking
const deleteVenueBookingCore = async (req, res) => {
  const { id } = req.params;

  const booking = await VenueBooking.findById(id);
  if (!booking) {
    return res.status(404).json({ message: 'Venue booking not found' });
  }

  if (!canAccessVenueRoom(req.user?.role, booking.hall, booking.roomNo)) {
    return res.status(403).json({ message: 'Access denied to this room' });
  }

  await VenueBooking.findByIdAndDelete(id);

  res.status(200).json({
    message: 'Venue booking deleted successfully',
  });
};

// Get venue bookings by date range
const getVenueBookingsByDateRangeCore = async (req, res) => {
  const { startDate, endDate } = req.query;
  const userRole = req.user?.role || '';

  // Apply role-based room filter
  const baseQuery = {
    checkInDate: { $lte: endDate },
    checkOutDate: { $gte: startDate },
  };
  const query = mergeRoleRoomFilter(baseQuery, userRole, 'roomNo');

  const bookings = await VenueBooking.find(query)
    .populate('createdBy', 'name email')
    .sort({ checkInDate: 1 });

  res.status(200).json(bookings);
};

// ==================== EXPORTED ISOLATED VERSIONS ====================

export const createVenueBooking = isolatedHandler(createVenueBookingCore);
export const getAllVenueBookings = isolatedHandler(getAllVenueBookingsCore);
export const getVenueBookingsByVenue = isolatedHandler(getVenueBookingsByVenueCore);
export const getVenueBookingById = isolatedHandler(getVenueBookingByIdCore);
export const extendVenueBooking = isolatedHandler(extendVenueBookingCore);
export const cancelVenueBooking = isolatedHandler(cancelVenueBookingCore);
export const updateVenueBookingStatus = isolatedHandler(updateVenueBookingStatusCore);
export const deleteVenueBooking = isolatedHandler(deleteVenueBookingCore);
export const getVenueBookingsByDateRange = isolatedHandler(getVenueBookingsByDateRangeCore);
