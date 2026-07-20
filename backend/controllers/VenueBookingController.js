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
import { isDailySlotOverlapping } from '../utils/venueConflictChecker.js';
import {
  sendDirectBookingEmail,
  sendBookingExtendedEmail,
  sendBookingCancelledEmail,
} from '../emails/venueEmailService.js';
import { asyncSendEmails } from '../utils/asyncEmail.js';

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

const VENUE_BOOKING_FOR_VALUES = ['student_calendar', 'institute_calendar'];
const DEFAULT_VENUE_BOOKING_FOR = 'institute_calendar';
const EDITABLE_VENUE_BOOKING_STATUSES = ['booked', 'checked_in'];

const normalizeString = (value = '') => String(value || '').trim();

const normalizeBookingFor = (value) => {
  const normalized = normalizeString(value || DEFAULT_VENUE_BOOKING_FOR);
  return VENUE_BOOKING_FOR_VALUES.includes(normalized)
    ? normalized
    : DEFAULT_VENUE_BOOKING_FOR;
};

const validateBookingFor = (value) =>
  VENUE_BOOKING_FOR_VALUES.includes(normalizeString(value));

const getBookingDateTime = (date, time) => {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isVenueBookingEditable = (booking) => {
  if (!booking || !EDITABLE_VENUE_BOOKING_STATUSES.includes(booking.status)) {
    return false;
  }

  const end = getBookingDateTime(booking.checkOutDate, booking.checkOutTime);
  return Boolean(end && end > new Date());
};

const arraysEqual = (left = [], right = []) =>
  Array.isArray(left) &&
  Array.isArray(right) &&
  left.length === right.length &&
  left.every((item, index) => item === right[index]);

const normalizeAttachmentList = (attachments) =>
  Array.isArray(attachments)
    ? attachments.map((item) => normalizeString(item)).filter(Boolean)
    : [];

const editableVenueBookingFields = [
  'hall',
  'roomNo',
  'name',
  'societyName',
  'eventName',
  'department',
  'contact',
  'email',
  'societyEmail',
  'presidentEmail',
  'checkInDate',
  'checkInTime',
  'checkOutDate',
  'checkOutTime',
  'purpose',
  'description',
  'attachments',
  'bookingFor',
];

const pickVenueBookingUpdates = (body = {}) => {
  const updates = {};
  for (const field of editableVenueBookingFields) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
    updates[field] =
      field === 'attachments'
        ? normalizeAttachmentList(body[field])
        : normalizeString(body[field]);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'bookingFor')) {
    updates.bookingFor = normalizeString(updates.bookingFor);
  }
  return updates;
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
    bookingFor,
  } = req.body;

  if (!rooms || rooms.length === 0) {
    return res.status(400).json({ message: 'At least one room is required' });
  }

  // Required: name, eventName, email | Optional: societyName, contact
  if (!name || !eventName || !email) {
    return res.status(400).json({ message: 'Name, event name, and email are mandatory fields' });
  }

  if (!checkInDate || !checkInTime || !checkOutDate || !checkOutTime) {
    return res.status(400).json({ message: 'Check-in and check-out dates/times are required' });
  }

  if (!attachments || attachments.length === 0) {
    return res.status(400).json({ message: 'At least one attachment is required' });
  }

  // Contact is optional but must be 10 digits if provided
  if (contact && !/^\d{10}$/.test(contact)) {
    return res.status(400).json({ message: 'Contact must be exactly 10 digits' });
  }

  if (!email.endsWith('@thapar.edu')) {
    return res.status(400).json({ message: 'Email must be @thapar.edu' });
  }

  if (!validateBookingFor(bookingFor)) {
    return res.status(400).json({ message: 'Booking calendar selection is required' });
  }

  const normalizedBookingFor = normalizeBookingFor(bookingFor);

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
      const hasOverlap = isDailySlotOverlapping(
        checkInDate,
        checkOutDate,
        checkInTime,
        checkOutTime,
        existing.checkInDate,
        existing.checkOutDate,
        existing.checkInTime,
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
      bookingFor: normalizedBookingFor,
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

  const response = res.status(201).json({
    message: 'Venue booking(s) created successfully',
    bookings: createdBookings,
  });

  for (const booking of createdBookings) {
    asyncSendEmails(() => sendDirectBookingEmail(booking));
  }

  return response;
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

// Update editable fields for an active/upcoming venue booking
const updateVenueBookingCore = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user?.role || '';

  const booking = await VenueBooking.findById(id);

  if (!booking) {
    return res.status(404).json({ message: 'Venue booking not found' });
  }

  if (!canAccessVenueRoom(userRole, booking.hall, booking.roomNo)) {
    return res.status(403).json({ message: 'Access denied to this room' });
  }

  if (!isVenueBookingEditable(booking)) {
    return res.status(400).json({
      message: 'Only upcoming or ongoing active bookings can be edited',
    });
  }

  const updates = pickVenueBookingUpdates(req.body);
  const merged = {
    hall: updates.hall ?? booking.hall,
    roomNo: updates.roomNo ?? booking.roomNo,
    name: updates.name ?? booking.name,
    societyName: updates.societyName ?? booking.societyName,
    eventName: updates.eventName ?? booking.eventName,
    department: updates.department ?? booking.department,
    contact: updates.contact ?? booking.contact,
    email: updates.email ?? booking.email,
    societyEmail: updates.societyEmail ?? booking.societyEmail,
    presidentEmail: updates.presidentEmail ?? booking.presidentEmail,
    checkInDate: updates.checkInDate ?? booking.checkInDate,
    checkInTime: updates.checkInTime ?? booking.checkInTime,
    checkOutDate: updates.checkOutDate ?? booking.checkOutDate,
    checkOutTime: updates.checkOutTime ?? booking.checkOutTime,
    purpose: updates.purpose ?? booking.purpose,
    description: updates.description ?? booking.description,
    attachments: Object.prototype.hasOwnProperty.call(updates, 'attachments')
      ? updates.attachments
      : normalizeAttachmentList(booking.attachments),
    bookingFor: updates.bookingFor ?? booking.bookingFor ?? DEFAULT_VENUE_BOOKING_FOR,
  };

  if (!merged.hall || !merged.roomNo) {
    return res.status(400).json({ message: 'Venue and room are required' });
  }

  if (!merged.name || !merged.eventName || !merged.email) {
    return res.status(400).json({ message: 'Name, event name, and email are mandatory fields' });
  }

  if (!merged.checkInDate || !merged.checkInTime || !merged.checkOutDate || !merged.checkOutTime) {
    return res.status(400).json({ message: 'Check-in and check-out dates/times are required' });
  }

  if (!merged.attachments.length) {
    return res.status(400).json({ message: 'At least one attachment is required' });
  }

  if (merged.contact && !/^\d{10}$/.test(merged.contact)) {
    return res.status(400).json({ message: 'Contact must be exactly 10 digits' });
  }

  if (!merged.email.endsWith('@thapar.edu')) {
    return res.status(400).json({ message: 'Email must be @thapar.edu' });
  }

  if (!validateBookingFor(merged.bookingFor)) {
    return res.status(400).json({ message: 'Booking calendar selection is required' });
  }

  if (!canAccessVenueRoom(userRole, merged.hall, merged.roomNo)) {
    return res.status(403).json({ message: `Access denied to room ${merged.roomNo}` });
  }

  const startDateTime = getBookingDateTime(merged.checkInDate, merged.checkInTime);
  const endDateTime = getBookingDateTime(merged.checkOutDate, merged.checkOutTime);

  if (!startDateTime || !endDateTime || endDateTime <= startDateTime) {
    return res.status(400).json({ message: 'Check-out date/time must be after check-in date/time' });
  }

  if (merged.checkOutTime <= merged.checkInTime) {
    return res.status(400).json({ message: 'Daily end time must be after daily start time' });
  }

  const overlappingBookings = await VenueBooking.find({
    _id: { $ne: booking._id },
    hall: merged.hall,
    roomNo: merged.roomNo,
    status: { $in: ['booked', 'checked_in'] },
  });

  for (const existing of overlappingBookings) {
    const hasOverlap = isDailySlotOverlapping(
      merged.checkInDate,
      merged.checkOutDate,
      merged.checkInTime,
      merged.checkOutTime,
      existing.checkInDate,
      existing.checkOutDate,
      existing.checkInTime,
      existing.checkOutTime
    );

    if (hasOverlap) {
      return res.status(400).json({
        message: `Time overlap detected for ${merged.hall} - ${merged.roomNo}`,
      });
    }
  }

  const previousValues = {};
  const updatedValues = {};

  for (const field of editableVenueBookingFields) {
    const before = field === 'attachments'
      ? normalizeAttachmentList(booking.attachments)
      : normalizeString(booking[field]);
    const after = field === 'attachments'
      ? normalizeAttachmentList(merged.attachments)
      : normalizeString(merged[field]);

    const changed = field === 'attachments'
      ? !arraysEqual(before, after)
      : before !== after;

    if (changed) {
      previousValues[field] = before;
      updatedValues[field] = after;
    }
  }

  if (Object.keys(updatedValues).length === 0) {
    return res.status(200).json({
      message: 'No changes detected',
      booking,
    });
  }

  const previousHall = booking.hall;
  const previousRoomNo = booking.roomNo;

  for (const field of editableVenueBookingFields) {
    booking[field] = merged[field];
  }

  booking.bookingFor = normalizeBookingFor(booking.bookingFor);
  booking.lastEditedBy = req.user?._id || null;
  booking.lastEditedAt = new Date();
  booking.editHistory.push({
    editedBy: req.user?._id || null,
    editedAt: booking.lastEditedAt,
    previousValues,
    updatedValues,
  });

  await booking.save();

  try {
    await Promise.all([
      touchSocietySuggestion(booking.societyName),
      touchEventSuggestion(booking.eventName),
    ]);
  } catch (suggestionError) {
    console.error('⚠️ Suggestion update failed (non-critical):', suggestionError.message);
  }

  try {
    const io = getSocketIO();
    io.emit('venueBookingUpdated', {
      booking,
      bookingId: booking._id,
      hall: booking.hall,
      roomNo: booking.roomNo,
      previousHall,
      previousRoomNo,
      type: 'venue',
      isolated: true,
    });
  } catch (socketError) {
    console.error('⚠️ Socket emit failed (non-critical):', socketError.message);
  }

  return res.status(200).json({
    message: 'Venue booking updated successfully',
    booking,
  });
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

  const overlappingBookings = await VenueBooking.find({
    _id: { $ne: id },
    hall: booking.hall,
    roomNo: booking.roomNo,
    status: { $in: ['booked', 'checked_in'] },
  });

  for (const existing of overlappingBookings) {
    const hasOverlap = isDailySlotOverlapping(
      booking.checkInDate,
      extendedDate,
      booking.checkInTime,
      extendedTime,
      existing.checkInDate,
      existing.checkOutDate,
      existing.checkInTime,
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

  const response = res.status(200).json(booking);
  asyncSendEmails(() => sendBookingExtendedEmail(booking));
  return response;
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

  const response = res.status(200).json({
    message: 'Venue booking cancelled successfully',
    booking,
  });

  asyncSendEmails(() => sendBookingCancelledEmail(booking));
  return response;
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
export const updateVenueBooking = isolatedHandler(updateVenueBookingCore);
export const extendVenueBooking = isolatedHandler(extendVenueBookingCore);
export const cancelVenueBooking = isolatedHandler(cancelVenueBookingCore);
export const updateVenueBookingStatus = isolatedHandler(updateVenueBookingStatusCore);
export const deleteVenueBooking = isolatedHandler(deleteVenueBookingCore);
export const getVenueBookingsByDateRange = isolatedHandler(getVenueBookingsByDateRangeCore);
