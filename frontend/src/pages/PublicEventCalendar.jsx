import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/eventcalendar.css";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Home,
  ArrowLeft,
  Info,
  ExternalLink,
  Code
} from "lucide-react";
import { BACKEND_URL } from "../utils/apiConfig";
import thaparLogo from "../assets/thapar_logo.png";
import CreatorProfileRectangular from "../components/CreatorProfile";
import { io } from "socket.io-client";

const API = BACKEND_URL;

const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const humanDate = (dateKey) => {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const fetchFirstSuccessful = async (paths, options = {}) => {
  let lastError = null;
  for (const path of paths) {
    try {
      const response = await fetch(`${API}${path}`, options);
      if (!response.ok) {
        lastError = new Error(`Fetch failed for ${path}: ${response.status}`);
        continue;
      }
      return response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("All endpoint attempts failed");
};

const fetchPublicEventMonth = async (year, month) => {
  const data = await fetchFirstSuccessful(
    [
      `/api/events/public/month/${year}/${month}`,
      `/api/event-calendar/public/month/${year}/${month}`,
    ],
    { method: "GET" }
  );
  return asArray(data.events);
};

const fetchPublicUpcomingEvents = async () => {
  const data = await fetchFirstSuccessful(
    ["/api/events/public/upcoming", "/api/event-calendar/public/upcoming"],
    { method: "GET" }
  );
  return asArray(data.events);
};

// Helper for time parsing (HH:MM AM/PM -> minutes)
const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const [time, period] = timeStr.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
};

// Helper to check if event is "live" (based on time range)
const isEventLive = (event, todayStr, currentMinutes) => {
    // MUST be on today's date first
    if (event.eventDate !== todayStr) return false;

    // Then check time overlap
    const startMinutes = parseTime(event.eventTime);
    let endMinutes;

    if (event.checkOutTime) {
        endMinutes = parseTime(event.checkOutTime);
        // Handle overnight events (end time < start time)
        if (endMinutes < startMinutes) {
            endMinutes += 24 * 60; // Add 24 hours
        }
    } else {
        // Default to 2 hours if no check-out time
        endMinutes = startMinutes + 120;
    }

    // Check if current time is within the event time range
    // Must be strictly between start and end time
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

// Helper to determine event status based on dates and current time
const getEventStatus = (event, todayStr, currentMinutes) => {
    const eventEndDate = event.eventEndDate || event.eventDate;
    
    // Completed: if event's end date is before today
    if (eventEndDate < todayStr) {
        return 'completed';
    }
    
    // Ongoing: if today's date is between start and end dates AND time is within range
    if (event.eventDate <= todayStr && todayStr <= eventEndDate) {
        // Check if current time is within the event time range
        const startMinutes = parseTime(event.eventTime);
        let endMinutes;
        
        if (event.checkOutTime) {
            endMinutes = parseTime(event.checkOutTime);
            // Handle overnight events
            if (endMinutes < startMinutes) {
                endMinutes += 24 * 60;
            }
        } else {
            endMinutes = startMinutes + 120;
        }
        
        // Only show as ongoing if we're within the time range
        if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
            return 'ongoing';
        }
    }
    
    // Upcoming: if event date is after today
    if (event.eventDate > todayStr) {
        return 'upcoming';
    }
    
    return 'upcoming';
};

export default function PublicEventCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(new Date()));
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [panelMode, setPanelMode] = useState("list");
  const [theme] = useState(() => localStorage.getItem("eventCalendarTheme") || "light");
  const [activeTab, setActiveTab] = useState("today");
  
  // New States
  const [showCreatorProfile, setShowCreatorProfile] = useState(false);
  const [societies, setSocieties] = useState([]);
  const [showAboutModal, setShowAboutModal] = useState(false);
  
  // Clock for real-time updates
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem("eventCalendarTheme", theme);
  }, [theme]);

  // Fetch Society List
  useEffect(() => {
    const fetchSocieties = async () => {
      try {
        // Limit increased to 100 to get full list
        const response = await fetch(`${API}/api/venue/enquiry/society-suggestions?limit=100`);
        if (response.ok) {
          const data = await response.json();
          setSocieties(data.suggestions || []); 
        }
      } catch (err) {
        console.error("Failed to fetch societies", err);
      }
    };
    fetchSocieties();
  }, []);

  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const [monthEventsResult, upcomingEventsResult] = await Promise.allSettled([
        fetchPublicEventMonth(year, month),
        fetchPublicUpcomingEvents(),
      ]);

      const monthEvents =
        monthEventsResult.status === "fulfilled" ? monthEventsResult.value : [];
      const upcoming =
        upcomingEventsResult.status === "fulfilled" ? upcomingEventsResult.value : [];

      setEvents(monthEvents);
      setUpcomingEvents(upcoming);
    } catch (error) {
      console.error("Failed to load calendar data:", error);
      setEvents([]);
      setUpcomingEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadCalendarData();

    // Socket.io for real-time updates with debouncing
    const socket = io(API, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });
    
    // Debounce function to prevent multiple rapid updates
    let updateTimeout;
    const debouncedUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        loadCalendarData();
      }, 500);
    };

    // Listen for any venue booking changes (create, update, delete, extend, cancel)
    socket.on('venueBookingCreated', debouncedUpdate);
    socket.on('venueBookingUpdated', debouncedUpdate);
    socket.on('venueBookingCancelled', debouncedUpdate);
    socket.on('venueBookingExtended', debouncedUpdate);
    
    // Listen for event calendar changes
    socket.on('eventCreated', debouncedUpdate);
    socket.on('eventUpdated', debouncedUpdate);
    socket.on('eventDeleted', debouncedUpdate);
    
    // Listen for venue enquiry updates that might affect bookings
    socket.on('venue-enquiry-updated', debouncedUpdate);
    
    // Listen for connection events
    socket.on('connect', () => {
      console.log('Socket connected');
    });
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      clearTimeout(updateTimeout);
      socket.disconnect();
    };
  }, [loadCalendarData]);

  const eventsForDate = useCallback(
    (dateKey) =>
      events.filter((event) => {
        // Show all events including past ones - removed status filtering
        const start = event.eventDate;
        const end = event.eventEndDate || event.eventDate;
        return dateKey >= start && dateKey <= end;
      }),
    [events]
  );

  const selectedDateEvents = useMemo(
    () => eventsForDate(selectedDateKey),
    [eventsForDate, selectedDateKey]
  );

  useEffect(() => {
    if (selectedDateEvents.length === 1) {
      setPanelMode("detail");
      setSelectedEvent(selectedDateEvents[0]);
    } else {
      setPanelMode("list");
      setSelectedEvent(null);
    }
  }, [selectedDateEvents, selectedDateKey]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return {
      daysInMonth: lastDay.getDate(),
      startingDayOfWeek: firstDay.getDay(),
    };
  };

  const changeMonth = (direction) => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  // --- TAB FILTERING LOGIC ---
  const todayStr = toDateKey(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Helper to deduplicate events by ID
  const uniqueEvents = (list) => {
      const seen = new Set();
      return list.filter(e => {
          const id = e._id || e.id;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
      });
  };

  // Combine sources for Upcoming to ensure we don't miss anything
  const allEventsPool = useMemo(() => uniqueEvents([...events, ...upcomingEvents]), [events, upcomingEvents]);

  const filterTabEvents = (list) => {
    // Allow all events including completed ones - removed status filtering to show history
    return list;
  };

  const todayEvents = useMemo(() => {
    // "Today events Tab it should show events of the same date."
    // Only show events that are on "todayStr"
    const filtered = filterTabEvents(allEventsPool);
    return filtered.filter(e => e.eventDate === todayStr)
                   .sort((a, b) => parseTime(a.eventTime) - parseTime(b.eventTime));
  }, [allEventsPool, todayStr]);

  const liveEvents = useMemo(() => {
    // "Live Booking Tab - shows the Live Booking"
    // "if the time is over , completed or passed then the booking is not shown in the live tab"
    // Strict check using isEventLive
    const filtered = filterTabEvents(allEventsPool);
    return filtered.filter(e => isEventLive(e, todayStr, currentMinutes));
  }, [allEventsPool, todayStr, currentMinutes]);

  const filteredUpcomingEvents = useMemo(() => {
      // "Upcoming tab it should show only those events which are on next Date"
      // "like if today is 15 feb then it should show there events of 16 feb"
      const filtered = filterTabEvents(allEventsPool);
      return filtered.filter(e => e.eventDate > todayStr)
                     .sort((a, b) => {
                         if (a.eventDate !== b.eventDate) return a.eventDate.localeCompare(b.eventDate);
                         return parseTime(a.eventTime) - parseTime(b.eventTime);
                     });
  }, [allEventsPool, todayStr]);

  const displayedTabEvents = useMemo(() => {
    if (activeTab === "today") return todayEvents;
    if (activeTab === "live") return liveEvents;
    return filteredUpcomingEvents;
  }, [activeTab, todayEvents, liveEvents, filteredUpcomingEvents]);

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col ${
      theme === "dark" ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 via-white to-purple-50"
    }`}>
        {/* Creator Profile Modal */}
        <CreatorProfileRectangular open={showCreatorProfile} onClose={() => setShowCreatorProfile(false)} />

        {/* About Modal */}
        <AnimatePresence>
            {showAboutModal && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setShowAboutModal(false)}
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className={`max-w-2xl w-full rounded-2xl p-6 sm:p-8 shadow-2xl relative ${
                            theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-900"
                        }`}
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setShowAboutModal(false)}
                            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
                                theme === "dark" ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"
                            }`}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="text-2xl sm:text-3xl font-bold mb-6">About Societies, Clubs & Chapters</h2>
                        <div className={`space-y-4 leading-relaxed text-sm sm:text-base ${
                            theme === "dark" ? "text-gray-300" : "text-gray-600"
                        }`}>
                            <p>
                                With a wide range of student organizations, events, and leadership opportunities, Thapar Institute of Engineering & Technology offers students numerous avenues to engage beyond the classroom, build meaningful connections, and contribute to campus life. Societies, clubs, and chapters form a vital component of the student ecosystem at Thapar, enabling students to pursue interests across technical, cultural, literary, sports, and social domains alongside their academic journey.
                            </p>
                            <p>
                                Through activities such as workshops, competitions, seminars, flagship events, and community outreach initiatives, these student bodies foster innovation, teamwork, leadership, and professional development. Active participation not only enhances personal growth but also contributes to a vibrant, inclusive, and dynamic campus culture.
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Background Particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="floating-element absolute top-20 left-10 w-96 h-96 rounded-full blur-3xl opacity-20 bg-blue-400 dark:bg-blue-600"
          animate={{ y: [0, -40, 0], x: [0, 20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="floating-element absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl opacity-20 bg-purple-400 dark:bg-purple-600"
          animate={{ y: [0, 40, 0], x: [0, -20, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity }}
        />
      </div>

      <header className={`relative z-10 border-b backdrop-blur-md ${
        theme === "dark" ? "bg-gray-800/80 border-gray-700" : "bg-white/80 border-gray-200"
      }`}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-center relative flex-wrap gap-3 sm:gap-4">
            {/* Center: Title with Logo */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
              <img src={thaparLogo} alt="Thapar Logo" className="h-12 sm:h-16 w-auto" />
              <div className="calendar-gradient-bg p-1.5 sm:p-2 rounded-xl shadow-md hidden sm:flex items-center justify-center">
                <CalendarIcon className="w-6 sm:w-8 h-6 sm:h-8 text-white" />
              </div>
              <h1 className={`text-xl sm:text-3xl lg:text-4xl font-extrabold text-center ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Thapar Event Calendar
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 flex-grow max-w-7xl mx-auto">
        {/* Top Section: Calendar and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {/* Left Side: Calendar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl shadow-xl overflow-hidden h-[600px] flex flex-col ${
                theme === "dark" ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
              }`}
            >
              <div className={`p-6 border-b shrink-0 ${
                theme === "dark" ? "bg-gray-700/50 border-gray-700" : "gradient-blue-purple"
              }`}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => changeMonth(-1)}
                    className={`p-2 rounded-lg transition ${
                      theme === "dark" ? "hover:bg-gray-600 text-white" : "hover:bg-white/20 text-white"
                    }`}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <h2 className="text-2xl font-bold text-white">{monthName}</h2>
                  <button
                    onClick={() => changeMonth(1)}
                    className={`p-2 rounded-lg transition ${
                      theme === "dark" ? "hover:bg-gray-600 text-white" : "hover:bg-white/20 text-white"
                    }`}
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 flex-grow flex flex-col">
                <div className="grid grid-cols-7 gap-2 mb-4 shrink-0">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className={`text-center text-sm font-semibold py-2 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}>
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2 flex-grow auto-rows-fr">
                  {calendarDays.map((day, index) => {
                    if (day === null) return <div key={`empty-${index}`} />;

                    const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const dayEvents = eventsForDate(dateKey);
                    const hasEvents = dayEvents.length > 0;
                    const isSelected = selectedDateKey === dateKey;
                    const isToday = dateKey === toDateKey(new Date());

                    return (
                      <button
                        key={dateKey}
                        onClick={() => setSelectedDateKey(dateKey)}
                        className={`
                          rounded-xl p-1 sm:p-2 text-center transition relative flex flex-col items-center justify-center
                          ${hasEvents ? "calendar-day-has-events cursor-pointer" : "cursor-pointer"}
                          ${isToday ? "calendar-day-today" : ""}
                          ${isSelected ? "ring-2 ring-blue-500" : ""}
                          ${!isToday && !hasEvents && (theme === "dark" ? "text-gray-400" : "text-gray-700")}
                        `}
                      >
                        <span className="text-sm font-semibold">{day}</span>
                        {hasEvents && (
                          <div className="flex justify-center gap-1 mt-1">
                            {dayEvents.slice(0, 3).map((_, i) => (
                              <div
                                key={i}
                                className={`event-dot ${
                                  isToday ? "bg-white" : theme === "dark" ? "bg-blue-400" : "bg-blue-600"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                 {loading && (
                  <div className="flex justify-center items-center py-4 shrink-0">
                    <div className="loading-spinner" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right Side: Booking Details Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`rounded-2xl shadow-xl overflow-hidden flex flex-col h-[600px] ${
                theme === "dark" ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
              }`}
            >
              {/* Panel Header */}
              <div className={`p-5 border-b shrink-0 ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                <div className="flex items-center justify-between">
                     <h3 className={`font-bold text-lg ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {panelMode === "detail" ? "Booking Details" : `Bookings on ${humanDate(selectedDateKey)}`}
                    </h3>
                     {panelMode === "detail" && selectedDateEvents.length > 1 && (
                        <button
                          onClick={() => {
                              setPanelMode("list");
                              setSelectedEvent(null);
                          }}
                          className={`text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                             theme === "dark" ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                          }`}
                        >
                            <ArrowLeft size={14} /> Back to List
                        </button>
                     )}
                </div>
              </div>

              {/* Panel Content */}
              <div className="p-5 overflow-y-auto flex-1 relative">
                 <AnimatePresence mode="wait">
                    {panelMode === "list" ? (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-3"
                        >
                            {selectedDateEvents.length > 0 ? (
                                selectedDateEvents.map((event) => (
                                    <motion.button
                                        whileHover={{ scale: 1.03, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        key={event._id}
                                        onClick={() => {
                                            setSelectedEvent(event);
                                            setPanelMode("detail");
                                        }}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group relative overflow-hidden ${
                                            theme === "dark"
                                            ? "bg-gray-700/40 border-gray-600 hover:border-blue-500/50 hover:bg-gray-700/70 hover:shadow-lg hover:shadow-blue-500/10"
                                            : "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-lg hover:shadow-blue-200/30"
                                        }`}
                                    >
                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                                            theme === "dark" ? "bg-gradient-to-r from-blue-500/5 to-purple-500/5" : "bg-gradient-to-r from-blue-400/10 to-purple-400/10"
                                        }`} />
                                        
                                        <div className="relative flex justify-between items-start">
                                            <div className="flex-grow">
                                                <p className={`font-semibold group-hover:text-blue-500 transition-colors ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                                    {event.eventName}
                                                </p>
                                                <p className={`text-sm mt-1.5 font-medium ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
                                                    {event.societyName}
                                                </p>
                                            </div>
                                            {(() => {
                                                const eventStatus = getEventStatus(event, todayStr, currentMinutes);
                                                const statusConfig = {
                                                    completed: {
                                                        label: 'Completed',
                                                        classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    },
                                                    ongoing: {
                                                        label: '🟢 Live',
                                                        classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    },
                                                    upcoming: {
                                                        label: 'Upcoming',
                                                        classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    }
                                                };
                                                
                                                const config = statusConfig[eventStatus] || statusConfig.upcoming;
                                                
                                                return (
                                                    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${config.classes}`}>
                                                        {config.label}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                                            <span className={`flex items-center gap-1.5 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                                                <Clock size={14} className="shrink-0" /> {event.eventTime}
                                            </span>
                                            <span className={`flex items-center gap-1.5 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                                                <MapPin size={14} className="shrink-0" /> {event.eventHall?.hall}
                                            </span>
                                        </div>
                                    </motion.button>
                                ))
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center h-40 text-center">
                                    <div className={`p-3 rounded-full mb-3 ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-100"}`}>
                                        <CalendarIcon className={`w-6 h-6 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
                                    </div>
                                    <p className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                                        No bookings available for this date.
                                    </p>
                                </motion.div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="detail"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            {selectedEvent && (
                                <>
                                    {/* Event Name (Header) */}
                                    <div>
                                      <h4 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                        {selectedEvent.eventName}
                                      </h4>
                                      {/* Society Name */}
                                      <p className={`text-lg mt-1 font-medium ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                                        {selectedEvent.societyName}
                                      </p>
                                      {/* Department */}
                                      {selectedEvent.department && (
                                        <p className={`text-sm mt-1 font-medium ${theme === "dark" ? "text-blue-300" : "text-blue-500"}`}>
                                          {selectedEvent.department}
                                        </p>
                                      )}
                                    </div>

                                    <div className={`p-4 rounded-xl ${theme === "dark" ? "bg-gray-700/30" : "bg-gray-50"}`}>
                                        <div className="space-y-4">
                                            {/* Starting Date & Time */}
                                            <div className="flex items-center gap-3">
                                                <CalendarIcon className={`w-5 h-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                                                <div>
                                                    <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Start</p>
                                                    <p className={`text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                                                        {humanDate(selectedEvent.eventDate)} at {selectedEvent.eventTime}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Ending Date & Time */}
                                            <div className="flex items-center gap-3">
                                                <Clock className={`w-5 h-5 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                                                <div>
                                                    <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>End</p>
                                                    <p className={`text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                                                        {selectedEvent.eventEndDate 
                                                            ? `${humanDate(selectedEvent.eventEndDate)}${selectedEvent.checkOutTime ? ` at ${selectedEvent.checkOutTime}` : ''}`
                                                            : `${humanDate(selectedEvent.eventDate)}${selectedEvent.checkOutTime ? ` at ${selectedEvent.checkOutTime}` : ' (Same day)'}`
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Venue */}
                                            <div className="flex items-center gap-3">
                                                <MapPin className={`w-5 h-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                                                <div>
                                                    <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Venue</p>
                                                    <p className={`text-sm font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                                                        {selectedEvent.eventHall?.roomNo}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Description */}
                                    {selectedEvent.description && (
                                        <div>
                                            <h5 className={`text-sm font-semibold mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Description</h5>
                                            <p className={`text-sm leading-relaxed ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                                                {selectedEvent.description}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}
                 </AnimatePresence>
              </div>
            </motion.div>
        </div>

        {/* Bottom Section: Tabs and List */}
        <div className="space-y-6 w-full">
            {/* Tabs */}
            <div className="flex justify-center px-0">
                <div className={`flex p-1 rounded-xl gap-2 ${theme === "dark" ? "bg-gray-800" : "bg-gray-100"}`}>
                    {[
                        { id: "today", label: "Today Events" },
                        { id: "upcoming", label: "Upcoming Events" },
                        { id: "live", label: "Live Events" }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? (theme === "dark" ? "bg-gray-700 text-white shadow-sm" : "bg-white text-gray-900 shadow-sm")
                                    : (theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700")
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List View (Long Time) */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
            >
                {displayedTabEvents.length > 0 ? (
                    displayedTabEvents.map(event => (
                        <motion.div
                            whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(59, 130, 246, 0.2)" }}
                            whileTap={{ y: -2 }}
                            key={event._id}
                            onClick={() => {
                                setSelectedDateKey(event.eventDate);
                                setSelectedEvent(event);
                                setPanelMode("detail");
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`group cursor-pointer rounded-2xl overflow-hidden border transition-all flex flex-col sm:flex-row ${
                                theme === "dark"
                                    ? "bg-gray-800/50 border-gray-700 hover:border-blue-500/50 hover:bg-gray-800"
                                    : "bg-white border-gray-200 hover:border-blue-300"
                            }`}
                        >
                            <div className={`w-full sm:w-1 shrink-0 h-1 sm:h-auto ${
                                event.status === 'ongoing' || isEventLive(event, todayStr, currentMinutes) ? 'bg-gradient-to-r sm:bg-gradient-to-b from-green-400 to-green-500' :
                                activeTab === 'upcoming' ? 'bg-gradient-to-r sm:bg-gradient-to-b from-purple-400 to-purple-500' : 'bg-gradient-to-r sm:bg-gradient-to-b from-blue-400 to-blue-500'
                            }`} />
                            <div className="p-5 sm:p-6 flex-grow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="space-y-2 flex-grow">
                                     <div className="flex items-start sm:items-center gap-3 flex-wrap">
                                         <h3 className={`text-base sm:text-lg font-bold group-hover:text-blue-500 transition-colors ${
                                             theme === "dark" ? "text-white" : "text-gray-900"
                                         }`}>
                                             {event.eventName}
                                         </h3>
                                         <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider shrink-0 ${
                                             theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                                         }`}>
                                             {event.eventHall?.hall}
                                         </span>
                                     </div>
                                     <p className={`text-xs sm:text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                                         {event.societyName}
                                     </p>
                                     {event.department && (
                                       <p className={`text-xs sm:text-sm font-medium ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                                           {event.department}
                                       </p>
                                     )}
                                </div>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 text-xs sm:text-sm shrink-0">
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                        <CalendarIcon size={16} />
                                        <span>{humanDate(event.eventDate)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                        <Clock size={16} />
                                        <span>{event.eventTime}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                ) : (
                     <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-12 text-center">
                        <div className={`inline-flex p-4 rounded-full mb-4 ${theme === "dark" ? "bg-gray-800" : "bg-gray-100"}`}>
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 3, repeat: Infinity }}
                            >
                                <Sparkles className={`w-8 h-8 ${theme === "dark" ? "text-gray-600" : "text-gray-400"}`} />
                            </motion.div>
                        </div>
                        <h3 className={`text-lg font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                            No {activeTab} events found
                        </h3>
                        <p className={`mt-1 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                            Check back later for updates
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </div>
      </main>

      {/* Footer / Quick Links */}
      <footer className={`relative z-10 border-t py-8 sm:py-12 px-4 sm:px-6 lg:px-8 mt-12 ${
          theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white border-gray-200 text-gray-600"
      }`}>
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {/* Block 1: General Query */}
              <div className="space-y-4">
                  <h3 className={`font-bold text-base sm:text-lg ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      Any General Query
                  </h3>
                  <div className="text-xs sm:text-sm space-y-2">
                      <p className="font-semibold">Contact us for any assistance:</p>
                      <a href="mailto:shabnam.rani@thapar.edu" className="block text-blue-500 hover:underline break-all">shabnam.rani@thapar.edu</a>
                  </div>
                  <div className="pt-2">
                       <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Technical Support</p>
                       <a href="mailto:itmh@thapar.edu" className="text-xs sm:text-sm text-blue-500 hover:underline break-all">itmh@thapar.edu</a>
                  </div>
              </div>

              {/* Block 2: Quick Links & Actions */}
              <div className="space-y-4">
                   <h3 className={`font-bold text-base sm:text-lg ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      Quick Links
                  </h3>
                  <div className="flex flex-col gap-2">
                      <motion.button 
                        whileHover={{ x: 4 }}
                        onClick={() => setShowAboutModal(true)}
                        className={`text-left px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-200 group ${
                            theme === "dark" ? "bg-gray-700/50 hover:bg-gray-700 hover:shadow-lg hover:shadow-blue-500/10" : "bg-gray-50 hover:bg-gray-100 hover:shadow-md"
                        }`}
                      >
                          <Info size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                          <span className="font-medium text-sm">About Societies</span>
                      </motion.button>

                      <motion.a 
                        whileHover={{ x: 4 }}
                        href="https://guestapp.in/venue-guest-enquiry"
                        className={`text-left px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-200 group ${
                            theme === "dark" ? "bg-gray-700/50 hover:bg-gray-700 hover:shadow-lg hover:shadow-purple-500/10" : "bg-gray-50 hover:bg-gray-100 hover:shadow-md"
                        }`}
                      >
                          <CalendarIcon size={16} className="text-purple-500 group-hover:scale-110 transition-transform" />
                          <span className="font-medium text-sm">Venue Booking</span>
                      </motion.a>

                       <motion.a 
                        whileHover={{ x: 4 }}
                        href="https://guestapp.in/guest-enquiry"
                        className={`text-left px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-200 group ${
                            theme === "dark" ? "bg-gray-700/50 hover:bg-gray-700 hover:shadow-lg hover:shadow-green-500/10" : "bg-gray-50 hover:bg-gray-100 hover:shadow-md"
                        }`}
                      >
                          <Home size={16} className="text-green-500 group-hover:scale-110 transition-transform" />
                          <span className="font-medium text-sm">Book A Guest Room</span>
                      </motion.a>
                      
                       <motion.a 
                        whileHover={{ x: 4 }}
                        href="https://www.thapar.edu/students/pages/hostels"
                        target="_blank"
                        rel="noreferrer"
                        className={`text-left px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-200 group ${
                            theme === "dark" ? "bg-gray-700/50 hover:bg-gray-700 hover:shadow-lg hover:shadow-orange-500/10" : "bg-gray-50 hover:bg-gray-100 hover:shadow-md"
                        }`}
                      >
                          <ExternalLink size={16} className="text-orange-500 group-hover:scale-110 transition-transform" />
                          <span className="font-medium text-sm">Student Amenities</span>
                      </motion.a>
                  </div>
              </div>



              {/* Block 3: Contact & Footer Info */}
              <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className={`font-bold text-base sm:text-lg mb-3 sm:mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        Contact Us
                    </h3>
                    <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm leading-relaxed">
                        <p>Timings: 9 AM to 5:30 PM, Monday to Friday</p>
                        <p>E-mail : <a href="mailto:dosa.office@thapar.edu" className="text-blue-500 hover:underline break-all">dosa.office@thapar.edu</a></p>
                    </div>
                  </div>

                  <div className="pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700 space-y-2 sm:space-y-3">
                      <p className="text-xs">Powered by Thapar Institute of Engineering & Technology</p>
                      <div className="flex flex-col items-start gap-1">
                        <p className="text-xs font-medium">
                          <a 
                            href="https://www.linkedin.com/in/navjot-sharma-8360631a7/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-blue-400 transition-colors"
                          >
                            Created and Maintained by <span className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>DoSA Office</span>
                          </a>
                        </p>
                      </div>
                  </div>
              </div>
          </div>
      </footer>
    </div>
  );
}

function Sparkles({ className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 3v4"/><path d="M3 5h4"/><path d="M3 9h4"/></svg>
    )
}
