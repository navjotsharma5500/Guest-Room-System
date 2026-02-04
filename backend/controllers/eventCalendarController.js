// backend/controllers/eventCalendarController.js
import { getSocketIO } from '../utils/socket.js';
import EventCalendar from '../models/EventCalendar.js';
import EventNameSuggestion from '../models/EventNameSuggestion.js';
import SocietyNameSuggestion from '../models/SocietyNameSuggestion.js';
import HallBooking from '../models/HallBooking.js';

// Helper function to create hall booking from event
const createHallBookingFromEvent = async (eventData, userId) => {
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

    const hallBooking = new HallBooking({
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
      bookingType: 'hall',
      isHallBooking: true,
    });

    await hallBooking.save();
    return hallBooking;
  } catch (error) {
    console.error('❌ Failed to create hall booking from event:', error);
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

    // Auto-create hall booking
    const hallBooking = await createHallBookingFromEvent({
      eventName,
      societyName,
      eventDate,
      eventTime,
      eventHall,
      attachments,
    }, req.user._id);

    if (hallBooking) {
      event.linkedHallBooking = hallBooking._id;
      await event.save();
    }

    // Emit socket event
    try {
      const io = getSocketIO();
      io.emit('eventCreated', { event, hallBooking });
    } catch (socketError) {
      console.error('⚠️ Socket emit failed (non-critical):', socketError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event,
      hallBooking,
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
    const events = await EventCalendar.find()
      .populate('createdBy', 'name email')
      .populate('linkedHallBooking')
      .sort({ eventDate: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      events,
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await EventCalendar.find({
      status: 'upcoming',
      eventDate: { $gte: today.toISOString().split('T')[0] },
    })
      .populate('createdBy', 'name email')
      .sort({ eventDate: 1 })
      .limit(3);

    res.status(200).json({
      success: true,
      count: events.length,
      events,
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
      .populate('linkedHallBooking');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    res.status(200).json({
      success: true,
      event,
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

    const events = await EventCalendar.find({ eventDate: date })
      .populate('createdBy', 'name email')
      .sort({ eventTime: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      events,
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
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    const events = await EventCalendar.find({
      eventDate: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate('createdBy', 'name email')
      .sort({ eventDate: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      events,
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

    // Delete linked hall booking if exists
    if (event.linkedHallBooking) {
      await HallBooking.findByIdAndDelete(event.linkedHallBooking);
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