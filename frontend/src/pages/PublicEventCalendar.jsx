import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import "../styles/eventcalendar.css";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  Home,
  Info,
  MapPin,
  Menu,
  Search,
  X,
} from "lucide-react";
import { io } from "socket.io-client";
import { useLocation } from "react-router-dom";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL;
const THAPAR_LOGO = "https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const VIEW_FILTERS = {
  all: {},
  venue: { sourceType: "venue-booking", recordType: "event" },
  institute: { calendarType: "institute_calendar", recordType: "event" },
  student: { calendarType: "student_calendar" },
};

const toDateKey = (value) => {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return toDateKey(parsed);
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const buildQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : "";
};

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

const fetchPublicEventMonth = async (year, month, viewMode = "all") => {
  const data = await fetchFirstSuccessful(
    [
      `/api/event-calendar/master/month/${year}/${month}${buildQuery(VIEW_FILTERS[viewMode] || {})}`,
      `/api/events/public/month/${year}/${month}`,
      `/api/event-calendar/public/month/${year}/${month}`,
    ],
    { method: "GET" }
  );
  return { events: asArray(data.events), sources: data.sources || null };
};

const fetchPublicUpcomingEvents = async (viewMode = "all") => {
  const data = await fetchFirstSuccessful(
    [
      `/api/event-calendar/master/upcoming${buildQuery(VIEW_FILTERS[viewMode] || {})}`,
      "/api/events/public/upcoming",
      "/api/event-calendar/public/upcoming",
    ],
    { method: "GET" }
  );
  return { events: asArray(data.events), sources: data.sources || null };
};

const fetchPublicAllEvents = async (viewMode = "all") => {
  const data = await fetchFirstSuccessful(
    [
      `/api/event-calendar/master/all${buildQuery({ ...(VIEW_FILTERS[viewMode] || {}), recordType: "event", limit: 1000 })}`,
      "/api/events/public",
      "/api/event-calendar/public",
    ],
    { method: "GET" }
  );
  return { events: asArray(data.events), sources: data.sources || null };
};

const fetchCalendarColorMap = async (year, month) => {
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  try {
    const response = await fetch(`${API}/api/event-calendar/master/date-colors${buildQuery({ start, end })}`);
    if (!response.ok) return {};
    const data = await response.json();
    return data?.data?.map || {};
  } catch {
    return {};
  }
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

const shortDate = (dateKey) => {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey || "-";
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatHyphenDate = (dateKey) => shortDate(dateKey).replaceAll(" ", "-");

const getTeachingDates = (mapping) => {
  const candidates = [
    mapping.teachingDates,
    mapping.lieuDates,
    mapping.replacementDates,
    mapping.workingDates,
    mapping.teachingDate,
    mapping.lieuDate,
    mapping.replacementDate,
    mapping.workingDate,
  ];

  return candidates
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map(toDateKey)
    .filter(Boolean);
};

const getNonTeachingDate = (mapping) => (
  toDateKey(mapping.nonTeachingDate) ||
  toDateKey(mapping.originalDate) ||
  toDateKey(mapping.holidayDate) ||
  toDateKey(mapping.inLieuOfDate) ||
  toDateKey(mapping.eventDate)
);

const getDateColors = (dateColorValue) => {
  if (!dateColorValue) return [];
  return Array.isArray(dateColorValue) ? dateColorValue.filter(Boolean) : [dateColorValue];
};

const getContrastTextColor = (hex) => {
  const value = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return "#111827";
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? "#111827" : "#FFFFFF";
};

const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const [time, period] = String(timeStr).split(" ");
  let [h, m] = String(time || "00:00").split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + (m || 0);
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();
const eventKey = (event) => event.unifiedId || event._id || event.id || `${event.sourceType || "event"}-${event.eventName}-${event.eventDate}-${event.eventTime}`;
const eventVenue = (event) => event.eventHall?.roomNo || event.eventHall?.hall || event.venue || event.location || "";
const eventSourceLabel = (event) => {
  if (event.sourceType === "venue-booking") return "Venue Booking";
  if (event.sourceType === "student-calendar" || event.calendarType === "student_calendar") return "Student Calendar";
  if (event.sourceType === "institute-calendar" || event.calendarType === "institute_calendar") return "Institute Calendar";
  return event.sourceName || "Event Calendar";
};

const isCalendarEvent = (event) => (event.recordType || "event") === "event";

const getEventStatus = (event, todayStr, currentMinutes) => {
  const startDate = event.eventDate;
  const endDate = event.eventEndDate || event.eventDate;
  if (todayStr > endDate) return "completed";
  if (todayStr < startDate) return "upcoming";
  const startMinutes = parseTime(event.eventTime);
  const endMinutes = event.checkOutTime ? parseTime(event.checkOutTime) : startMinutes + 120;
  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) return "live";
  return "active";
};

const rangesOverlap = (aStart, aEnd, bStart, bEnd) => aStart <= bEnd && bStart <= aEnd;
const eventHasTime = (event) => Boolean(event.eventTime);

const detectConflicts = (events) => {
  const ids = new Set();
  const comparable = events.filter((event) => {
    if (!isCalendarEvent(event)) return false;
    if (event.conflictResolved === true) return false;
    if (!eventHasTime(event)) return false;
    if (!normalizeText(eventVenue(event))) return false;
    return true;
  });

  for (let i = 0; i < comparable.length; i += 1) {
    for (let j = i + 1; j < comparable.length; j += 1) {
      const first = comparable[i];
      const second = comparable[j];
      if (eventKey(first) === eventKey(second)) continue;
      if (normalizeText(eventVenue(first)) !== normalizeText(eventVenue(second))) continue;

      const firstStart = first.eventDate;
      const firstEnd = first.eventEndDate || first.eventDate;
      const secondStart = second.eventDate;
      const secondEnd = second.eventEndDate || second.eventDate;
      if (!rangesOverlap(firstStart, firstEnd, secondStart, secondEnd)) continue;

      const firstTimeStart = parseTime(first.eventTime);
      const firstTimeEnd = first.checkOutTime ? parseTime(first.checkOutTime) : firstTimeStart + 120;
      const secondTimeStart = parseTime(second.eventTime);
      const secondTimeEnd = second.checkOutTime ? parseTime(second.checkOutTime) : secondTimeStart + 120;
      if (!rangesOverlap(firstTimeStart, firstTimeEnd, secondTimeStart, secondTimeEnd)) continue;

      ids.add(eventKey(first));
      ids.add(eventKey(second));
    }
  }

  return ids;
};

const mergeSameSourceRecords = (list) => {
  const seen = new Set();
  return list.filter((event) => {
    const id = eventKey(event);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const statusBadge = (status) => {
  const map = {
    live: "badge-live",
    active: "badge-active",
    upcoming: "badge-upcoming",
    completed: "badge-completed",
  };
  return map[status] || "badge-upcoming";
};

function CalendarLegend({ dateColorMap }) {
  const categories = [];
  const seen = new Set();
  Object.values(dateColorMap || {}).forEach((dateValue) => {
    getDateColors(dateValue).forEach((color) => {
      const id = String(color._id || color.name || color.color);
      if (seen.has(id)) return;
      seen.add(id);
      categories.push(color);
    });
  });

  if (categories.length === 0) return null;

  return (
    <div className="px-7 sm:px-10 pb-4 shrink-0">
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Calendar Legend</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-1">
          {categories.map((category) => (
            <div key={category._id || `${category.name}-${category.color}`} className="flex items-start gap-2 min-w-0">
              <span className="mt-1 h-3 w-3 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: category.color }} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{category.name}</p>
                {category.showDescription !== false && category.description && (
                  <p className="text-[11px] text-gray-500 truncate">{category.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventTile({ event, todayStr, currentMinutes, onOpen }) {
  const status = getEventStatus(event, todayStr, currentMinutes);
  const venue = eventVenue(event);
  const dateRange = event.eventDate === (event.eventEndDate || event.eventDate)
    ? shortDate(event.eventDate)
    : `${shortDate(event.eventDate)} to ${shortDate(event.eventEndDate || event.eventDate)}`;

  return (
    <motion.article
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onOpen(event)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(event);
      }}
      className={`student-event-tile ${event.__hasConflict ? "student-event-tile-conflict" : ""}`}
    >
      <div className="student-event-tile-main">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h3 className="student-event-title">{event.eventName}</h3>
            {event.__hasConflict && <span className="badge-conflict rounded-lg"><AlertTriangle size={10} /> Conflict</span>}
            <span className={`${statusBadge(status)} rounded-lg`}>{status === "live" ? "Live" : status === "active" ? "Active" : status === "completed" ? "Completed" : "Upcoming"}</span>
          </div>
          <p className="student-event-source">{event.societyName || event.department || eventSourceLabel(event)}</p>
          {event.description && <p className="student-event-description">{event.description}</p>}
        </div>
        <div className="student-event-meta">
          <span><Clock size={14} /> {event.eventTime || "-"}{event.checkOutTime ? ` - ${event.checkOutTime}` : ""}</span>
          <span><MapPin size={14} /> {venue || "-"}</span>
          <span><CalendarIcon size={14} /> {dateRange}</span>
        </div>
      </div>
    </motion.article>
  );
}

export default function PublicEventCalendar() {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthDirection, setMonthDirection] = useState(0);
  const [events, setEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [allCalendarEvents, setAllCalendarEvents] = useState([]);
  const [dateColorMap, setDateColorMap] = useState({});
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [selectedDateLoading, setSelectedDateLoading] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(new Date()));
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [now, setNow] = useState(new Date());
  const [filters, setFilters] = useState({
    search: "",
    location: "",
    source: "",
    department: "",
    fromDate: "",
    toDate: "",
    conflictsOnly: false,
  });
  const calendarRequestRef = useRef(0);
  const currentDateRef = useRef(currentDate);
  const selectedDateInitializedRef = useRef(false);

  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);

  useEffect(() => {
    if (location.pathname === "/ic") setViewMode("institute");
    else if (location.pathname === "/tc") setViewMode("student");
  }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadCalendarData = useCallback(async (targetDate = currentDateRef.current, options = {}) => {
    const requestId = calendarRequestRef.current + 1;
    calendarRequestRef.current = requestId;
    setCalendarLoading(true);
    try {
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const [monthEventsResult, upcomingEventsResult, allEventsResult, colorMapResult] = await Promise.allSettled([
        fetchPublicEventMonth(year, month, viewMode),
        fetchPublicUpcomingEvents(viewMode),
        fetchPublicAllEvents(viewMode),
        fetchCalendarColorMap(year, month),
      ]);

      if (requestId !== calendarRequestRef.current) return;

      setEvents(monthEventsResult.status === "fulfilled" ? monthEventsResult.value.events : []);
      setUpcomingEvents(upcomingEventsResult.status === "fulfilled" ? upcomingEventsResult.value.events : []);
      setAllCalendarEvents(allEventsResult.status === "fulfilled" ? allEventsResult.value.events : []);
      setDateColorMap(colorMapResult.status === "fulfilled" ? colorMapResult.value : {});

      if (options.commitMonth) {
        setMonthDirection(options.direction || 0);
        setCurrentDate(targetDate);
      }
    } catch (error) {
      if (requestId !== calendarRequestRef.current) return;
      console.error("Failed to load calendar data:", error);
      setEvents([]);
      setUpcomingEvents([]);
      setAllCalendarEvents([]);
      setDateColorMap({});
    } finally {
      if (requestId === calendarRequestRef.current) {
        setCalendarLoading(false);
      }
    }
  }, [viewMode]);

  useEffect(() => {
    loadCalendarData();

    const socket = io(API, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    let updateTimeout;
    const debouncedUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(loadCalendarData, 500);
    };

    socket.on("venueBookingCreated", debouncedUpdate);
    socket.on("venueBookingUpdated", debouncedUpdate);
    socket.on("venueBookingCancelled", debouncedUpdate);
    socket.on("venueBookingExtended", debouncedUpdate);
    socket.on("eventCreated", debouncedUpdate);
    socket.on("eventUpdated", debouncedUpdate);
    socket.on("eventDeleted", debouncedUpdate);
    socket.on("master-calendar-updated", debouncedUpdate);
    socket.on("venue-enquiry-updated", debouncedUpdate);

    return () => {
      clearTimeout(updateTimeout);
      socket.disconnect();
    };
  }, [loadCalendarData]);

  const allFetchedEvents = useMemo(() => mergeSameSourceRecords([...events, ...upcomingEvents, ...allCalendarEvents]), [events, upcomingEvents, allCalendarEvents]);
  const conflictIds = useMemo(() => detectConflicts(allFetchedEvents), [allFetchedEvents]);
  const eventsWithConflicts = useMemo(
    () => events.map((event) => ({ ...event, __hasConflict: conflictIds.has(eventKey(event)) })),
    [events, conflictIds]
  );
  const allCalendarEventsWithConflicts = useMemo(
    () => allCalendarEvents.map((event) => ({ ...event, __hasConflict: conflictIds.has(eventKey(event)) })),
    [allCalendarEvents, conflictIds]
  );

  const eventsForDate = useCallback(
    (dateKey) =>
      eventsWithConflicts.filter((event) => {
        if (!isCalendarEvent(event)) return false;
        const start = event.eventDate;
        const end = event.eventEndDate || event.eventDate;
        return dateKey >= start && dateKey <= end;
      }),
    [eventsWithConflicts]
  );

  useEffect(() => {
    if (calendarLoading || selectedDateInitializedRef.current) return;
    setSelectedDateEvents(eventsForDate(selectedDateKey));
    selectedDateInitializedRef.current = true;
  }, [calendarLoading, eventsForDate, selectedDateKey]);

  const todayStr = toDateKey(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const hasFilters = Object.values(filters).some(Boolean);
  const filterSearchPool = useMemo(
    () => mergeSameSourceRecords(allCalendarEventsWithConflicts).filter(isCalendarEvent),
    [allCalendarEventsWithConflicts]
  );

  const filteredSelectedDateEvents = useMemo(() => {
    const searchText = normalizeText(filters.search);
    const sourceEvents = hasFilters ? filterSearchPool : selectedDateEvents;
    return sourceEvents.filter((event) => {
      if (filters.conflictsOnly && !event.__hasConflict) return false;
      if (filters.location && normalizeText(eventVenue(event)) !== normalizeText(filters.location)) return false;
      if (filters.source && eventSourceLabel(event) !== filters.source) return false;
      if (filters.department && normalizeText(event.department || event.societyName) !== normalizeText(filters.department)) return false;
      if (filters.fromDate && (event.eventEndDate || event.eventDate) < filters.fromDate) return false;
      if (filters.toDate && event.eventDate > filters.toDate) return false;
      if (searchText) {
        const haystack = [event.eventName, event.societyName, event.department, event.description, eventVenue(event)].map(normalizeText).join(" ");
        if (!haystack.includes(searchText)) return false;
      }
      return true;
    }).sort((a, b) => {
      const dateCompare = String(b.eventDate || "").localeCompare(String(a.eventDate || ""));
      if (dateCompare !== 0) return dateCompare;
      return parseTime(b.eventTime) - parseTime(a.eventTime);
    });
  }, [filterSearchPool, filters, hasFilters, selectedDateEvents]);

  const locationOptions = useMemo(() => {
    return [...new Set(filterSearchPool.map(eventVenue).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [filterSearchPool]);

  const sourceOptions = useMemo(() => {
    return [...new Set(filterSearchPool.map(eventSourceLabel).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [filterSearchPool]);

  const departmentOptions = useMemo(() => {
    return [...new Set(filterSearchPool.map((event) => event.department || event.societyName).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [filterSearchPool]);

  const holidays = useMemo(
    () => events.filter((event) => event.recordType === "holiday").sort((a, b) => String(a.eventDate || "").localeCompare(String(b.eventDate || ""))),
    [events]
  );

  const teachingDays = useMemo(
    () => events.filter((event) => event.recordType === "teaching-day").sort((a, b) => String(a.eventDate || "").localeCompare(String(b.eventDate || ""))),
    [events]
  );

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDayOfWeek = new Date(year, month, 1).getDay();
    return [
      ...Array.from({ length: startingDayOfWeek }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [currentDate]);

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const visibleMonthLabel = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
  const monthVariants = {
    enter: (direction) => ({
      x: prefersReducedMotion ? 0 : direction > 0 ? 20 : -20,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({
      x: prefersReducedMotion ? 0 : direction > 0 ? -20 : 20,
      opacity: 0,
    }),
  };

  const changeMonth = (direction) => {
    const baseDate = currentDateRef.current || currentDate;
    const next = new Date(baseDate);
    next.setMonth(baseDate.getMonth() + direction);
    currentDateRef.current = next;
    loadCalendarData(next, { commitMonth: true, direction });
  };

  const handleDateSelect = (dateKey) => {
    setSelectedDateLoading(true);
    setSelectedDateKey(dateKey);
    setSelectedDateEvents(eventsForDate(dateKey));
    setSelectedDateLoading(false);
  };

  const sidebarItems = [
    { id: "add-booking", label: "Add Booking", icon: CalendarIcon, href: "/venue-enquiry" },
    { id: "all", label: "All Events", icon: CalendarIcon, href: "/event-calendar/all-events" },
    { id: "venue", label: "Venue Booking", icon: Home, href: "/venue-calendar" },
    { id: "institute", label: "Institute Calendar", icon: CalendarIcon, href: "/ic" },
    { id: "student", label: "Student Calendar", icon: CalendarIcon, href: "/tc" },
  ];

  const handleSidebarAction = (item) => {
    if (item.href) {
      window.location.href = item.href;
      return;
    }
    setViewMode(item.id);
    setSidebarOpen(false);
  };

  const openEvent = (event) => {
    setSelectedEvent(event);
  };

  const clearFilters = () => {
    setFilters({ search: "", location: "", source: "", department: "", fromDate: "", toDate: "", conflictsOnly: false });
  };

  return (
    <div className="event-calendar-page min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="student-calendar-header">
          <div className="student-calendar-brand">
            <img src={THAPAR_LOGO} alt="Thapar Logo" />
            <div>
              <p>Thapar Institute of Engineering and Technology</p>
              <span>Event Calendar</span>
            </div>
          </div>

          <div className="student-calendar-title">
            <CalendarIcon size={19} className="text-blue-600" />
            <h1>Thapar Event Calendar</h1>
          </div>

          <div className="student-calendar-actions">
            <a href="/ic"><CalendarIcon size={15} /> Institute Calendar</a>
            <a href="/tc"><CalendarIcon size={15} /> Student Calendar</a>
            <a href="/"><ArrowLeft size={15} /> Back</a>
          </div>
        </div>
      </header>

      <main className="student-calendar-main">
        <button type="button" onClick={() => setSidebarOpen(true)} className="event-calendar-menu-btn">
          <Menu size={18} /> Event Calendar Menu
        </button>
        {sidebarOpen && <div className="event-calendar-drawer-backdrop" onClick={() => setSidebarOpen(false)} />}

        <div className="event-calendar-shell">
          <aside className={`event-calendar-sidebar ${sidebarOpen ? "open" : ""}`}>
            <div className="event-calendar-sidebar-head">
              <p>Event Calendar</p>
              <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close calendar menu">
                <X size={18} />
              </button>
            </div>
            <div className="event-calendar-sidebar-list">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === viewMode && !item.href;
                return (
                  <button key={item.id} type="button" onClick={() => handleSidebarAction(item)} className={isActive ? "active" : ""}>
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="event-calendar-content">
            <section className="event-calendar-top-grid">
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="student-calendar-card">
                <AnimatePresence mode="wait" custom={monthDirection}>
                  <motion.div
                    key={monthKey}
                    custom={monthDirection}
                    variants={monthVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: prefersReducedMotion ? 0.08 : 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="student-month-transition"
                  >
                    <div className="student-calendar-month-head">
                      <button onClick={() => changeMonth(-1)} aria-label="Previous month">
                        <ChevronLeft size={24} />
                      </button>
                      <h2>{monthName}</h2>
                      <button onClick={() => changeMonth(1)} aria-label="Next month">
                        <ChevronRight size={24} />
                      </button>
                    </div>

                    <div className="student-weekdays">
                      {WEEKDAYS.map((day) => <div key={day}>{day}</div>)}
                    </div>

                    <div className="student-date-grid">
                      {calendarDays.map((day, index) => {
                        if (!day) return <div key={`empty-${index}`} className="student-empty-day" />;
                        const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const dayEvents = eventsForDate(dateKey);
                        const hasEvents = dayEvents.length > 0;
                        const hasConflict = dayEvents.some((event) => event.__hasConflict);
                        const isSelected = selectedDateKey === dateKey;
                        const isToday = dateKey === toDateKey(new Date());
                        const dateColors = getDateColors(dateColorMap[dateKey]);
                        const boxColor = dateColors[0];
                        const circleColor = dateColors[1];
                        const title = dateColors.map((color) => `${color.name}${color.description ? `: ${color.description}` : ""}`).join("\n") || undefined;

                        return (
                          <motion.button
                            key={dateKey}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDateSelect(dateKey)}
                            style={boxColor ? { backgroundColor: boxColor.color } : undefined}
                            title={title}
                            className={`student-day-cell ${isSelected ? "selected" : ""} ${isToday ? "today" : ""} ${boxColor ? "has-color" : ""}`}
                          >
                            <span style={circleColor ? { backgroundColor: circleColor.color, color: getContrastTextColor(circleColor.color) } : undefined}>{day}</span>
                            {hasEvents && (
                              <em>
                                {dayEvents.length > 3 ? (
                                  <i className={hasConflict ? "conflict" : ""} />
                                ) : (
                                  dayEvents.slice(0, 3).map((_, dotIndex) => <i key={dotIndex} className={hasConflict ? "conflict" : ""} />)
                                )}
                              </em>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {calendarLoading && (
                  <div className="student-calendar-loading">
                    <div />
                  </div>
                )}

                <CalendarLegend dateColorMap={dateColorMap} />
              </motion.div>

              <motion.section initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} className="student-details-card">
                <div className="student-details-head">
                  <div>
                    <h2>{hasFilters ? "Filtered Events" : `Bookings on ${humanDate(selectedDateKey)}`}</h2>
                    <p>{filteredSelectedDateEvents.length} booking{filteredSelectedDateEvents.length !== 1 ? "s" : ""} shown</p>
                  </div>
                  <div className="student-details-actions">
                    {hasFilters && (
                      <button type="button" onClick={clearFilters} className="clear">
                        <X size={13} /> Clear
                      </button>
                    )}
                    <button type="button" onClick={() => setShowFilters((value) => !value)} className={showFilters || hasFilters ? "active" : ""}>
                      <Filter size={15} /> Filters
                    </button>
                  </div>
                </div>

                {showFilters && (
                  <div className="student-filter-panel">
                    <label>
                      <span>From Date</span>
                      <input type="date" value={filters.fromDate} onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))} />
                    </label>
                    <label>
                      <span>To Date</span>
                      <input type="date" value={filters.toDate} onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))} />
                    </label>
                    <label>
                      <span>Search</span>
                      <div className="input-icon"><Search size={14} /><input placeholder="Event, society or department" value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} /></div>
                    </label>
                    <label>
                      <span>Location / Venue</span>
                      <select value={filters.location} onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}>
                        <option value="">All Venues</option>
                        {locationOptions.map((venue) => <option key={venue} value={venue}>{venue}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Source</span>
                      <select value={filters.source} onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}>
                        <option value="">All Sources</option>
                        {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Department</span>
                      <select value={filters.department} onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}>
                        <option value="">All Departments</option>
                        {departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
                      </select>
                    </label>
                    <label className="student-checkbox-filter">
                      <input type="checkbox" checked={filters.conflictsOnly} onChange={(e) => setFilters((prev) => ({ ...prev, conflictsOnly: e.target.checked }))} />
                      Conflicts only
                    </label>
                  </div>
                )}

                <div className="student-details-list">
                  {selectedDateLoading ? (
                    <div className="student-empty-state"><div className="loading-spinner" /></div>
                  ) : filteredSelectedDateEvents.length === 0 ? (
                    <div className="student-empty-state">
                      <CalendarIcon size={36} />
                      <p>{hasFilters ? "No matching events found" : "No bookings on this day"}</p>
                      <span>{hasFilters ? "Try changing the filters." : "Select another date or source."}</span>
                    </div>
                  ) : (
                    filteredSelectedDateEvents.map((event) => (
                      <EventTile key={eventKey(event)} event={event} todayStr={todayStr} currentMinutes={currentMinutes} onOpen={openEvent} />
                    ))
                  )}
                </div>
              </motion.section>
            </section>

            <section className="student-info-sections">
              <div className="student-info-card">
                <div className="student-info-head">
                  <h2>Holidays</h2>
                  <p>{visibleMonthLabel}</p>
                </div>
                {holidays.length === 0 ? (
                  <p className="student-info-empty">No holidays added for this month.</p>
                ) : (
                  <div className="student-info-list">
                    {holidays.map((holiday) => (
                      <div key={eventKey(holiday)}>
                        <strong>{shortDate(holiday.eventDate)}</strong>
                        <span>{holiday.eventName || holiday.description || "Holiday"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="student-info-card">
                <div className="student-info-head">
                  <h2>Teaching Days in Lieu of Non-Teaching Days</h2>
                  <p>{visibleMonthLabel}</p>
                </div>
                {teachingDays.length === 0 ? (
                  <p className="student-info-empty">No teaching day mappings added for this month.</p>
                ) : (
                  <div className="student-teaching-table-wrap">
                    <table className="student-teaching-table">
                      <thead>
                        <tr>
                          <th>Non-Teaching Date</th>
                          <th>Teaching Date</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachingDays.map((mapping) => {
                          const teachingDateList = getTeachingDates(mapping);
                          return (
                            <tr key={eventKey(mapping)}>
                              <td>{formatHyphenDate(getNonTeachingDate(mapping))}</td>
                              <td>{teachingDateList.length ? teachingDateList.map(formatHyphenDate).join(", ") : "-"}</td>
                              <td>{mapping.remarks || mapping.description || mapping.eventName || "Teaching Day"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>
      </main>

      <footer className="student-calendar-footer">
        <div className="event-footer-grid">
          <div className="space-y-4">
            <h3>Quick Links</h3>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setShowAboutModal(true)}><Info size={15} /> About Societies</button>
              <a href="https://campusconnect.thapar.edu/venue-enquiry"><CalendarIcon size={15} /> Venue Booking</a>
              <a href="https://campusconnect.thapar.edu/guest-room"><Home size={15} /> Guest Room</a>
              <a href="/ic"><CalendarIcon size={15} /> Institute Calendar</a>
              <a href="/tc"><CalendarIcon size={15} /> Student Calendar</a>
              <a href="https://studentsocieties.thapar.edu/" target="_blank" rel="noreferrer"><ExternalLink size={15} /> Student Societies</a>
            </div>
          </div>
          <div className="space-y-4">
            <h3>Contact Us</h3>
            <div className="space-y-5 text-xs sm:text-sm leading-relaxed text-gray-600">
              <div>
                <p className="footer-label">Timings</p>
                <p>9:00 AM to 5:30 PM</p>
                <p>Monday to Friday</p>
              </div>
              <div>
                <p className="footer-label">Any General Query or Assistance</p>
                <p>Email:</p>
                <a href="mailto:dosa.office@thapar.edu">dosa.office@thapar.edu</a>
              </div>
              <div>
                <a href="mailto:Queries_studentaffairs@thapar.edu">Queries_studentaffairs@thapar.edu</a>
              </div>
              <div>
                <p className="footer-label">Technical Support</p>
                <p>Email:</p>
                <a href="mailto:itmh@thapar.edu">itmh@thapar.edu</a>
              </div>
            </div>
            <div className="student-footer-credit">
              <p>Powered by Thapar Institute of Engineering &amp; Technology</p>
              <p>Created and Maintained by DoSA Office</p>
            </div>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {showAboutModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="event-modal-backdrop" onClick={() => setShowAboutModal(false)}>
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="event-modal-card" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowAboutModal(false)}><X size={20} /></button>
              <h2>About Societies, Clubs &amp; Chapters</h2>
              <p>
                Thapar Institute of Engineering &amp; Technology offers students avenues to engage beyond the classroom through student organizations, events and leadership opportunities.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="event-modal-backdrop" onClick={() => setSelectedEvent(null)}>
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="event-modal-card event-detail-modal" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelectedEvent(null)}><X size={20} /></button>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className={`${statusBadge(getEventStatus(selectedEvent, todayStr, currentMinutes))} rounded-lg`}>
                  {getEventStatus(selectedEvent, todayStr, currentMinutes)}
                </span>
                {selectedEvent.__hasConflict && <span className="badge-conflict rounded-lg"><AlertTriangle size={10} /> Conflict</span>}
              </div>
              <h2>{selectedEvent.eventName}</h2>
              <p className="event-detail-source">{selectedEvent.societyName || eventSourceLabel(selectedEvent)}</p>
              <div className="event-detail-grid">
                <div><span>Time</span><strong>{selectedEvent.eventTime || "-"}{selectedEvent.checkOutTime ? ` - ${selectedEvent.checkOutTime}` : ""}</strong></div>
                <div><span>Venue</span><strong>{eventVenue(selectedEvent) || "-"}</strong></div>
                <div><span>Start Date</span><strong>{shortDate(selectedEvent.eventDate)}</strong></div>
                <div><span>End Date</span><strong>{shortDate(selectedEvent.eventEndDate || selectedEvent.eventDate)}</strong></div>
              </div>
              {selectedEvent.description && <p className="event-detail-description">{selectedEvent.description}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
