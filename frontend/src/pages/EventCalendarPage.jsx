// src/pages/EventCalendarPage.jsx - UPDATED WITH EVENTCALENDAR CSS
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import '../styles/eventcalendar.css';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Clock,
  MapPin,
  Users,
  Home,
  Moon,
  Sun
} from "lucide-react";
import DateEventsModal from "../components/EventCalendar/DateEventsModal";
import EventDetailsModal from "../components/EventCalendar/EventDetailsModal";

export default function EventCalendarPage() {
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('eventCalendarTheme') || 'light';
  });

  // ==========================================================================
  // THEME TOGGLE
  // ==========================================================================
  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('eventCalendarTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // ==========================================================================
  // FETCH EVENTS DATA
  // ==========================================================================
  useEffect(() => {
    fetchEvents();
    fetchUpcomingEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/events/public/month/${year}/${month}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/events/public/upcoming`
      );
      
      if (response.ok) {
        const data = await response.json();
        setUpcomingEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      setUpcomingEvents([]);
    }
  };

  // ==========================================================================
  // CALENDAR LOGIC
  // ==========================================================================
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getEventsForDate = (date) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    return events.filter(event => event.eventDate === dateStr);
  };

  const changeMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Create calendar grid
  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="floating-element absolute top-20 left-10 w-96 h-96 rounded-full blur-3xl opacity-20 bg-blue-400 dark:bg-blue-600"
          animate={{ 
            y: [0, -40, 0],
            x: [0, 20, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="floating-element absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl opacity-20 bg-purple-400 dark:bg-purple-600"
          animate={{ 
            y: [0, 40, 0],
            x: [0, -20, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 25, repeat: Infinity }}
        />
      </div>

      {/* Header */}
      <header className={`relative z-10 border-b backdrop-blur-md ${
        theme === 'dark' 
          ? 'bg-gray-800/80 border-gray-700' 
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="calendar-gradient-bg p-3 rounded-2xl shadow-lg">
                <CalendarIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Event Calendar
                </h1>
                <p className={`text-sm mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Discover upcoming events and activities
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-3 rounded-xl transition ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Back to Home */}
              <a
                href="/"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Home size={18} />
                <span className="hidden sm:inline">Back to Home</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Calendar Section */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl shadow-xl overflow-hidden ${
                theme === 'dark' 
                  ? 'bg-gray-800 border border-gray-700' 
                  : 'bg-white border border-gray-200'
              }`}
            >
              {/* Calendar Header */}
              <div className={`p-6 border-b ${
                theme === 'dark' ? 'bg-gray-700/50 border-gray-700' : 'gradient-blue-purple'
              }`}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => changeMonth(-1)}
                    className={`p-2 rounded-lg transition ${
                      theme === 'dark'
                        ? 'hover:bg-gray-600 text-white'
                        : 'hover:bg-white/20 text-white'
                    }`}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  
                  <h2 className="text-2xl font-bold text-white">
                    {monthName}
                  </h2>
                  
                  <button
                    onClick={() => changeMonth(1)}
                    className={`p-2 rounded-lg transition ${
                      theme === 'dark'
                        ? 'hover:bg-gray-600 text-white'
                        : 'hover:bg-white/20 text-white'
                    }`}
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="p-6">
                {/* Days of Week */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div
                      key={day}
                      className={`text-center text-sm font-semibold py-2 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} />;
                    }

                    const dayEvents = getEventsForDate(day);
                    const hasEvents = dayEvents.length > 0;
                    const isToday = 
                      day === new Date().getDate() &&
                      currentDate.getMonth() === new Date().getMonth() &&
                      currentDate.getFullYear() === new Date().getFullYear();

                    return (
                      <motion.button
                        key={day}
                        whileHover={{ scale: hasEvents ? 1.05 : 1 }}
                        onClick={() => {
                          if (hasEvents) {
                            setSelectedDate({
                              date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                              events: dayEvents
                            });
                          }
                        }}
                        className={`
                          calendar-day aspect-square rounded-xl p-2 text-center transition relative
                          ${hasEvents ? 'calendar-day-has-events cursor-pointer' : 'cursor-default'}
                          ${isToday ? 'calendar-day-today' : ''}
                          ${!isToday && !hasEvents && (theme === 'dark' ? 'text-gray-400' : 'text-gray-700')}
                        `}
                      >
                        <span className="text-sm font-semibold">{day}</span>
                        {hasEvents && (
                          <div className="flex justify-center gap-1 mt-1">
                            {dayEvents.slice(0, 3).map((_, i) => (
                              <div
                                key={i}
                                className={`event-dot ${
                                  isToday
                                    ? 'bg-white'
                                    : theme === 'dark'
                                      ? 'bg-blue-400'
                                      : 'bg-blue-600'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {loading && (
                  <div className="flex justify-center items-center py-8">
                    <div className="loading-spinner" />
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Upcoming Events Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`rounded-2xl shadow-xl overflow-hidden ${
                theme === 'dark'
                  ? 'bg-gray-800 border border-gray-700'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <div className={`p-6 border-b ${
                theme === 'dark' ? 'bg-gray-700/50 border-gray-700' : 'gradient-purple-pink'
              }`}>
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">
                    Upcoming Events
                  </h3>
                </div>
              </div>

              <div className="custom-scrollbar p-6 space-y-4 max-h-[600px] overflow-y-auto">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event, index) => (
                    <motion.div
                      key={event._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedEvent(event)}
                      className={`event-card p-4 rounded-xl border cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-gray-700/30 border-gray-600'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <h4 className={`font-bold mb-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {event.eventName}
                      </h4>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className={`w-4 h-4 ${
                            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                          }`} />
                          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                            {event.societyName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <CalendarIcon className={`w-4 h-4 ${
                            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                          }`} />
                          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                            {new Date(event.eventDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className={`w-4 h-4 ${
                            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                          }`} />
                          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                            {event.eventTime}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className={`w-4 h-4 ${
                            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                          }`} />
                          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                            {event.eventHall.hall}
                          </span>
                        </div>
                      </div>

                      {event.attachments && event.attachments.length > 0 && (
                        <div className="image-overlay mt-3">
                          <img
                            src={event.attachments[0]}
                            alt={event.eventName}
                            className="event-card-image w-full h-32 object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className={`text-center py-12 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <CalendarIcon className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No upcoming events</p>
                    <p className="text-sm mt-1">Check back later!</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
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