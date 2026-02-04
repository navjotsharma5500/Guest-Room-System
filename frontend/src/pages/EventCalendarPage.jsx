// src/pages/EventCalendarPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Plus, X, ChevronLeft, ChevronRight, Clock, MapPin, Users, Image as ImageIcon, Paperclip } from "lucide-react";
import { BACKEND_URL } from "../utils/apiConfig";
import { useAuth } from "../context/AuthContext";
import io from "socket.io-client";

// Import modal components
import AddEventModal from "../components/EventCalendar/AddEventModal";
import DateEventsModal from "../components/EventCalendar/DateEventsModal";
import EventDetailsModal from "../components/EventCalendar/EventDetailsModal";

export default function EventCalendarPage({ theme }) {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const isAdminOrAssistant = ['admin', 'assistant'].includes(role);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch all events for the current month
  const fetchEvents = useCallback(async () => {
    try {
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString();

      const response = await fetch(
        `${BACKEND_URL}/api/event-calendar/public/month/${year}/${month}`
      );

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('❌ Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  // Fetch upcoming events
  const fetchUpcomingEvents = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/event-calendar/public/upcoming`);

      if (response.ok) {
        const data = await response.json();
        setUpcomingEvents(data.events || []);
      }
    } catch (error) {
      console.error('❌ Failed to fetch upcoming events:', error);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchUpcomingEvents();
  }, [fetchEvents, fetchUpcomingEvents]);

  // Socket.IO for real-time updates
  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('eventCreated', () => {
      fetchEvents();
      fetchUpcomingEvents();
    });

    socket.on('eventUpdated', () => {
      fetchEvents();
      fetchUpcomingEvents();
    });

    socket.on('eventDeleted', () => {
      fetchEvents();
      fetchUpcomingEvents();
    });

    return () => socket.disconnect();
  }, [fetchEvents, fetchUpcomingEvents]);

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const formatDateKey = (date) => {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  };

  const getEventsForDate = (dateKey) => {
    return events.filter(event => event.eventDate === dateKey);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day) => {
    const dateKey = formatDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    const dayEvents = getEventsForDate(dateKey);
    
    if (dayEvents.length > 0) {
      setSelectedDate({ date: dateKey, events: dayEvents });
    }
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  // Create calendar grid
  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden pb-8">
      {/* Glassmorphism Background */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute inset-0 ${
          theme === "dark"
            ? "bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900"
            : "bg-gradient-to-br from-blue-50 via-white to-blue-100"
        }`} />
        
        {/* Animated Blobs */}
        <div className={`absolute top-0 -left-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob ${
          theme === "dark" ? "opacity-10" : ""
        }`} />
        <div className={`absolute top-0 -right-4 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000 ${
          theme === "dark" ? "opacity-10" : ""
        }`} />
        <div className={`absolute -bottom-8 left-20 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000 ${
          theme === "dark" ? "opacity-10" : ""
        }`} />
      </div>

      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`backdrop-blur-xl border-b shadow-lg sticky top-0 z-50 ${
          theme === "dark"
            ? "bg-gray-800/80 border-gray-700"
            : "bg-white/80 border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Event Calendar
                </h2>
                <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  View and manage all events
                </p>
              </div>
            </div>
            
            {isAdminOrAssistant && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAddEventModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl shadow-lg hover:shadow-xl transition font-semibold"
              >
                <Plus size={18} />
                Add Event
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar - Left Side (2/3 width) */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`backdrop-blur-xl rounded-2xl border shadow-xl p-6 ${
                theme === "dark"
                  ? "bg-gray-800/60 border-gray-700"
                  : "bg-white/60 border-gray-200"
              }`}
            >
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-2xl font-bold ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>
                  {monthName} {year}
                </h3>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePrevMonth}
                    className={`p-2 rounded-lg transition ${
                      theme === "dark"
                        ? "hover:bg-gray-700 text-gray-300"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <ChevronLeft size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentDate(new Date())}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      theme === "dark"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    Today
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNextMonth}
                    className={`p-2 rounded-lg transition ${
                      theme === "dark"
                        ? "hover:bg-gray-700 text-gray-300"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <ChevronRight size={20} />
                  </motion.button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div
                    key={day}
                    className={`text-center py-2 font-semibold text-sm ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const dateKey = formatDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                  const dayEvents = getEventsForDate(dateKey);
                  const hasEvents = dayEvents.length > 0;
                  const isToday = dateKey === formatDateKey(new Date());

                  return (
                    <motion.button
                      key={day}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDateClick(day)}
                      className={`aspect-square p-2 rounded-xl transition relative ${
                        isToday
                          ? "bg-blue-600 text-white font-bold"
                          : hasEvents
                          ? theme === "dark"
                            ? "bg-blue-900/40 border-2 border-blue-600 text-white hover:bg-blue-900/60"
                            : "bg-blue-100 border-2 border-blue-400 text-blue-900 hover:bg-blue-200"
                          : theme === "dark"
                          ? "bg-gray-700/30 text-gray-300 hover:bg-gray-700/50"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center h-full">
                        <span className="text-lg">{day}</span>
                        {hasEvents && (
                          <div className="flex gap-1 mt-1">
                            {dayEvents.slice(0, 3).map((_, idx) => (
                              <div
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isToday ? "bg-white" : "bg-blue-600"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Upcoming Events - Right Side (1/3 width) */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`backdrop-blur-xl rounded-2xl border shadow-xl p-6 sticky top-24 ${
                theme === "dark"
                  ? "bg-gray-800/60 border-gray-700"
                  : "bg-white/60 border-gray-200"
              }`}
            >
              <h3 className={`text-lg font-bold mb-4 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}>
                Upcoming Events
              </h3>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto"></div>
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className={`w-12 h-12 mx-auto mb-3 ${
                    theme === "dark" ? "text-gray-600" : "text-gray-400"
                  }`} />
                  <p className={`text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    No upcoming events
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event, index) => (
                    <motion.div
                      key={event._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedEvent(event)}
                      className={`p-4 rounded-xl border cursor-pointer transition ${
                        theme === "dark"
                          ? "bg-gray-700/30 border-gray-600 hover:bg-gray-700/50"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <h4 className={`font-semibold mb-2 ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}>
                        {event.eventName}
                      </h4>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <Users className={`w-3 h-3 ${
                            theme === "dark" ? "text-blue-400" : "text-blue-600"
                          }`} />
                          <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                            {event.societyName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <CalendarIcon className={`w-3 h-3 ${
                            theme === "dark" ? "text-blue-400" : "text-blue-600"
                          }`} />
                          <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                            {new Date(event.eventDate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Clock className={`w-3 h-3 ${
                            theme === "dark" ? "text-blue-400" : "text-blue-600"
                          }`} />
                          <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                            {event.eventTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className={`w-3 h-3 ${
                            theme === "dark" ? "text-blue-400" : "text-blue-600"
                          }`} />
                          <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                            {event.eventHall.hall} - {event.eventHall.roomNo}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddEventModal && (
          <AddEventModal
            theme={theme}
            onClose={() => setShowAddEventModal(false)}
            onSuccess={() => {
              setShowAddEventModal(false);
              fetchEvents();
              fetchUpcomingEvents();
            }}
          />
        )}

        {selectedDate && (
          <DateEventsModal
            theme={theme}
            date={selectedDate}
            onClose={() => setSelectedDate(null)}
            onEventClick={(event) => {
              setSelectedDate(null);
              setSelectedEvent(event);
            }}
          />
        )}

        {selectedEvent && (
          <EventDetailsModal
            theme={theme}
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}