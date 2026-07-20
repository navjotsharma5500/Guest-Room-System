// backend/controllers/eventCalendarController.js
import { getSocketIO } from '../utils/socket.js';
import EventCalendar from '../models/EventCalendar.js';
import EventNameSuggestion from '../models/EventNameSuggestion.js';
import SocietyNameSuggestion from '../models/SocietyNameSuggestion.js';
import VenueBooking from '../models/VenueBooking.js';
import { filterRecordsByVenueRole } from '../utils/venueAccessPolicy.js';

const todayDateString = () => new Date().toISOString().split('T')[0];

const parseTimeToMinutes = (timeString = '') => {
  if (!timeString) return 0;

  const trimmed = String(timeString).trim();
  const hasAmPm = /\b(AM|PM)\b/i.test(trimmed);

  if (hasAmPm) {
    const [timePart, periodRaw] = trimmed.split(' ');
    const [h, m] = timePart.split(':').map(Number);
    const period = (periodRaw || '').toUpperCase();
    let hours = h || 0;
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return (hours * 60) + (m || 0);
  }

  const [hours, minutes] = trimmed.split(':').map(Number);
  return ((hours || 0) * 60) + (minutes || 0);
};

const to12Hour = (timeString = '') => {
  if (!timeString) return '';
  if (/\b(AM|PM)\b/i.test(timeString)) return timeString;
  const [h, m] = String(timeString).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeString;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

const bookingToCalendarEvent = (booking) => {
  const today = todayDateString();
  let derivedStatus = 'upcoming';

  if (booking.status === 'cancelled' || booking.status === 'no_show') {
    derivedStatus = 'cancelled';
  } else if (booking.status === 'checked_out' || booking.checkOutDate < today) {
    derivedStatus = 'completed';
  } else if (booking.status === 'checked_in' || (booking.checkInDate <= today && booking.checkOutDate >= today)) {
    derivedStatus = 'ongoing';
  }

  return {
    _id: booking._id,
    eventName: booking.eventName || 'Venue Booking',
    societyName: booking.societyName || booking.name || 'Venue',
    eventDate: booking.checkInDate,
    eventEndDate: booking.checkOutDate,
    eventTime: to12Hour(booking.checkInTime),
    checkOutTime: to12Hour(booking.checkOutTime),
    eventHall: {
      hall: booking.hall,
      roomNo: booking.roomNo,
    },
    attachments: booking.attachments || [],
    createdBy: booking.createdBy || null,
    status: derivedStatus,
    sourceType: booking.enquiryId ? 'assistant-enquiry-booking' : 'direct-venue-booking',
    bookingFor: booking.bookingFor || 'institute_calendar',
    calendarType: booking.bookingFor || 'institute_calendar',
    bookingStatus: booking.status,
    contact: booking.contact,
    email: booking.email,
    purpose: booking.purpose || '',
    description: booking.description || '',
    createdAt: booking.createdAt,
  };
};

const mergeAndSortEvents = (eventDocs = [], bookingDocs = []) => {
  const calendarEvents = eventDocs.map((doc) => (doc?.toObject ? doc.toObject() : doc));
  const linkedVenueBookingIds = new Set(
    calendarEvents
      .map((e) => String(e.linkedVenueBooking || ''))
      .filter(Boolean)
  );

  const mappedVenueBookings = bookingDocs
    .filter((booking) => !linkedVenueBookingIds.has(String(booking._id)))
    .map(bookingToCalendarEvent);

  return [...calendarEvents, ...mappedVenueBookings].sort((a, b) => {
    if (a.eventDate !== b.eventDate) return a.eventDate.localeCompare(b.eventDate);
    return parseTimeToMinutes(a.eventTime) - parseTimeToMinutes(b.eventTime);
  });
};

// Helper function to create venue booking from event
const createVenueBookingFromEvent = async (eventData, userId) => {
  try {
    // Calculate check-out time (2 hours after event)
    const [time, period] = eventData.eventTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    const checkInTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Add 2 hours for checkout
    let checkOutHours = hours + 2;
    const checkOutTime = `${checkOutHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    const venueBooking = new VenueBooking({
      hall: eventData.eventHall.hall,
      roomNo: eventData.eventHall.roomNo,
      name: 'Event Organizer',
      societyName: eventData.societyName,
      eventName: eventData.eventName,
      contact: '0000000000', // Placeholder
      email: 'event@thapar.edu',
      checkInDate: eventData.eventDate,
      checkInTime: checkInTime,
      checkOutDate: eventData.eventDate,
      checkOutTime: checkOutTime,
      purpose: 'Event Calendar Booking',
      description: `Auto-created from Event Calendar: ${eventData.eventName}`,
      attachments: eventData.attachments,
      status: 'booked',
      createdBy: userId,
      bookingType: 'venue',
      isVenueBooking: true,
      isHallBooking: false,
    });

    await venueBooking.save();
    return venueBooking;
  } catch (error) {
    console.error('❌ Failed to create venue booking from event:', error);
    return null;
  }
};

// Create new event
export const createEvent = async (req, res) => {
  try {
    const {
      eventName,
      societyName,
      eventDate,
      eventTime,
      eventHall,
      attachments,
    } = req.body;

    // Validation
    if (!eventName || !societyName || !eventDate || !eventTime || !eventHall) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!attachments || attachments.length === 0) {
      return res.status(400).json({ message: 'At least one attachment is required' });
    }

    if (attachments.length > 5) {
      return res.status(400).json({ message: 'Maximum 5 attachments allowed' });
    }

    // Create event
    const event = new EventCalendar({
      eventName,
      societyName,
      eventDate,
      eventTime,
      eventHall,
      attachments,
      createdBy: req.user._id,
    });

    await event.save();

    // Update/Create event name suggestion
    await EventNameSuggestion.findOneAndUpdate(
      { name: eventName },
      { 
        $inc: { usageCount: 1 },
        $set: { lastUsed: new Date() }
      },
      { upsert: true, new: true }
    );

    // Update/Create society name suggestion
    await SocietyNameSuggestion.findOneAndUpdate(
      { name: societyName },
      { 
        $inc: { usageCount: 1 },
        $set: { lastUsed: new Date() }
      },
      { upsert: true, new: true }
    );

    // Auto-create venue booking
    const venueBooking = await createVenueBookingFromEvent({
      eventName,
      societyName,
      eventDate,
      eventTime,
      eventHall,
      attachments,
    }, req.user._id);

    if (venueBooking) {
      event.linkedVenueBooking = venueBooking._id;
      await event.save();
    }

    // Emit socket event
    try {
      const io = getSocketIO();
      io.emit('eventCreated', { event, venueBooking });
    } catch (socketError) {
      console.error('⚠️ Socket emit failed (non-critical):', socketError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event,
      venueBooking,
    });

  } catch (error) {
    console.error('❌ Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: error.message,
    });
  }
};

// Get all events
export const getAllEvents = async (req, res) => {
  try {
    const eventDocs = await EventCalendar.find()
      .populate('createdBy', 'name email')
      .populate('linkedVenueBooking')
      .sort({ eventDate: 1 });

    const bookingDocs = await VenueBooking.find({
      status: { $nin: ['cancelled', 'no_show'] },
    }).populate('createdBy', 'name email');

    const events = mergeAndSortEvents(eventDocs, bookingDocs);

    res.status(200).json({
      success: true,
      count: events.length,
      events: events,
    });
  } catch (error) {
    console.error('❌ Get all events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
    });
  }
};

// Get upcoming events (top 3)
export const getUpcomingEvents = async (req, res) => {
  try {
    const today = todayDateString();

    const eventDocs = await EventCalendar.find({
      status: { $in: ['upcoming', 'ongoing'] },
      eventDate: { $gte: today },
    })
      .populate('createdBy', 'name email')
      .sort({ eventDate: 1 });

    const bookingDocs = await VenueBooking.find({
      status: { $in: ['booked', 'checked_in'] },
      checkOutDate: { $gte: today },
    }).populate('createdBy', 'name email');

    const events = mergeAndSortEvents(eventDocs, bookingDocs);

    res.status(200).json({
      success: true,
      count: events.length,
      events: events,
    });
  } catch (error) {
    console.error('❌ Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming events',
    });
  }
};

// Get event by ID
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await EventCalendar.findById(id)
      .populate('createdBy', 'name email')
      .populate('linkedVenueBooking');

    if (event) {
      return res.status(200).json({
        success: true,
        event,
      });
    }

    const booking = await VenueBooking.findById(id).populate('createdBy', 'name email');
    if (booking) {
      return res.status(200).json({
        success: true,
        event: bookingToCalendarEvent(booking),
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  } catch (error) {
    console.error('❌ Get event by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
    });
  }
};

// Get events by date
export const getEventsByDate = async (req, res) => {
  try {
    const { date } = req.params;

    const eventDocs = await EventCalendar.find({ eventDate: date })
      .populate('createdBy', 'name email')
      .sort({ eventTime: 1 });

    const bookingDocs = await VenueBooking.find({
      status: { $nin: ['cancelled', 'no_show'] },
      checkInDate: { $lte: date },
      checkOutDate: { $gte: date },
    }).populate('createdBy', 'name email');

    const events = mergeAndSortEvents(eventDocs, bookingDocs);

    res.status(200).json({
      success: true,
      count: events.length,
      events: events,
    });
  } catch (error) {
    console.error('❌ Get events by date error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events for date',
    });
  }
};

// Get events by month
export const getEventsByMonth = async (req, res) => {
  try {
    const { year, month } = req.params;

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const today = todayDateString();

    // User requirement update: Show past bookings in the event calendar.
    // We query from the start of the month to show full history.
    
    const queryStartDate = startDate;

    let eventDocs = await EventCalendar.find({
      eventDate: {
        $gte: queryStartDate,
        $lte: endDate,
      },
    })
      .populate('createdBy', 'name email')
      .sort({ eventDate: 1 });

    let bookingDocs = await VenueBooking.find({
      status: { $nin: ['cancelled', 'no_show'] },
      checkInDate: { $lte: endDate },
      checkOutDate: { $gte: queryStartDate },
    }).populate('createdBy', 'name email');

    // Check for access control if needed (though public calendar usually shows all approved)
    // eventDocs = await filterRecordsByVenueRole(req, eventDocs);
    // bookingDocs = await filterRecordsByVenueRole(req, bookingDocs);

    const events = mergeAndSortEvents(eventDocs, bookingDocs);

    res.status(200).json({
      success: true,
      count: events.length,
      events: events,
    });
  } catch (error) {
    console.error('❌ Get events by month error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events for month',
    });
  }
};

// Update event
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const event = await EventCalendar.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Emit socket event
    try {
      const io = getSocketIO();
      io.emit('eventUpdated', { event });
    } catch (socketError) {
      console.error('⚠️ Socket emit failed (non-critical):', socketError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event,
    });
  } catch (error) {
    console.error('❌ Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event',
    });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await EventCalendar.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Delete linked venue booking if exists
    if (event.linkedVenueBooking) {
      await VenueBooking.findByIdAndDelete(event.linkedVenueBooking);
    }

    await EventCalendar.findByIdAndDelete(id);

    // Emit socket event
    try {
      const io = getSocketIO();
      io.emit('eventDeleted', { eventId: id });
    } catch (socketError) {
      console.error('⚠️ Socket emit failed (non-critical):', socketError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('❌ Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
    });
  }
};

// Get event name suggestions
export const getEventNameSuggestions = async (req, res) => {
  try {
    const { query } = req.query;

    let suggestions;
    if (query && query.length >= 2) {
      suggestions = await EventNameSuggestion.find({
        name: { $regex: query, $options: 'i' }
      })
        .sort({ usageCount: -1, lastUsed: -1 })
        .limit(10);
    } else {
      suggestions = await EventNameSuggestion.find()
        .sort({ usageCount: -1, lastUsed: -1 })
        .limit(10);
    }

    res.status(200).json({
      success: true,
      suggestions: suggestions.map(s => s.name),
    });
  } catch (error) {
    console.error('❌ Get event name suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suggestions',
    });
  }
};

// Get society name suggestions
export const getSocietyNameSuggestions = async (req, res) => {
  try {
    const { query } = req.query;

    let suggestions;
    if (query && query.length >= 2) {
      suggestions = await SocietyNameSuggestion.find({
        name: { $regex: query, $options: 'i' }
      })
        .sort({ usageCount: -1, lastUsed: -1 })
        .limit(10);
    } else {
      suggestions = await SocietyNameSuggestion.find()
        .sort({ usageCount: -1, lastUsed: -1 })
        .limit(10);
    }

    res.status(200).json({
      success: true,
      suggestions: suggestions.map(s => s.name),
    });
  } catch (error) {
    console.error('❌ Get society name suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suggestions',
    });
  }
};
