// src/pages/PublicVenueCalendar.jsx
// Venue-wise Booking Calendar — Public Page
// Date → Venue Tree (sidebar) → Bookings → Detail popup
// Styling matches PublicEventCalendar (slate/white/red palette, same fonts)

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  ExternalLink,
  Building2,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Plus,
  X,
  FileText,
} from "lucide-react";
import { BACKEND_URL } from "../utils/apiConfig";
import thaparLogo from "../assets/thapar_logo.png";
import { io } from "socket.io-client";

const API = BACKEND_URL;

// ─── VENUE TREE (mirrors venueRoomsConfig sidebar) ───────────────────────────
// Each section can have child rooms; rooms map to roomNo patterns.
const VENUE_TREE = [
  {
    id: "auditoriums",
    label: "Auditorium / Halls",
    color: "#c0392b",
    icon: "🎭",
    rooms: [
      { id: "main-auditorium",  label: "Main Auditorium",  match: (r) => /main.?auditorium|mainauditorium/.test(r) },
      { id: "tan-auditorium",   label: "TAN Auditorium",   match: (r) => /tan.?auditorium|tanauditorium/.test(r)  },
      { id: "deans-auditorium", label: "Dean's Auditorium",match: (r) => /dean.?auditorium/.test(r)               },
      { id: "c-hall",           label: "C-Hall",           match: (r) => /^c.?hall$|chall/.test(r)                },
    ],
  },
  {
    id: "rooms",
    label: "Rooms",
    color: "#2563eb",
    icon: "🏫",
    rooms: [
      { id: "lt",   label: "Lecture Theatre (LT)", match: (r) => /^lt-\d/.test(r) },
      { id: "lp",   label: "Lecture Pavilion (LP)", match: (r) => /^lp-\d/.test(r) },
      { id: "tan-rooms",  label: "TAN Rooms",        match: (r) => /^t-10[56]/.test(r) },
      { id: "e-block",    label: "E-Block",           match: (r) => /e.?block/.test(r) },
      { id: "f-block",    label: "F-Block",           match: (r) => /f.?block/.test(r) },
      { id: "g-block",    label: "G-Block",           match: (r) => /g.?block/.test(r) },
      { id: "activity-rooms",  label: "Activity Rooms",  match: (r) => /activity.?room/.test(r) },
      { id: "activity-space",  label: "Activity Space",  match: (r) => /activity.?space/.test(r) },
    ],
  },
  {
    id: "creativity",
    label: "COS / Creativity Block",
    color: "#7c3aed",
    icon: "🎨",
    rooms: [
      { id: "cr", label: "Creativity Rooms (CR)", match: (r) => /^cr-\d/.test(r) },
      { id: "gr", label: "Green Rooms (GR)",       match: (r) => /^gr-\d/.test(r) },
    ],
  },
  {
    id: "open-areas",
    label: "Open & Desk Area",
    color: "#64748b",
    icon: "🌿",
    rooms: [
      { id: "open-spaces", label: "Open Spaces / OAT / Lawns", match: (r) =>
          /oat|lawn|jaggi|cafe|csed|sbi|sport|fete|chowk|street/.test(r) },
    ],
  },
];

// Flatten all rooms for quick reverse lookup
const ALL_ROOMS = VENUE_TREE.flatMap((g) => g.rooms.map((r) => ({ ...r, groupId: g.id, groupLabel: g.label, groupColor: g.color })));

// ─── UTILS ────────────────────────────────────────────────────────────────────
const normalizeStr = (s = "") => String(s).toLowerCase().replace(/\s+/g, "");

const resolveRoomId = (roomNo = "", hall = "") => {
  const combined = normalizeStr(`${roomNo} ${hall}`);
  for (const room of ALL_ROOMS) {
    if (room.match(combined)) return room.id;
  }
  return null;
};

const resolveGroupId = (roomId) => {
  const found = ALL_ROOMS.find((r) => r.id === roomId);
  return found?.groupId || null;
};

const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const humanDate = (dateKey) => {
  if (!dateKey) return "–";
  const p = new Date(`${dateKey}T00:00:00`);
  if (isNaN(p)) return dateKey;
  return p.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
};

const shortDate = (dateKey) => {
  if (!dateKey) return "–";
  const p = new Date(`${dateKey}T00:00:00`);
  if (isNaN(p)) return dateKey;
  return p.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
};

const parseTimeToMinutes = (t = "") => {
  const s = String(t).trim();
  if (!s) return 0;
  if (/AM|PM/i.test(s)) {
    const [part, per] = s.split(" ");
    const [h, m] = (part || "").split(":").map(Number);
    let hrs = h || 0;
    if (/PM/i.test(per) && hrs !== 12) hrs += 12;
    if (/AM/i.test(per) && hrs === 12) hrs = 0;
    return hrs * 60 + (m || 0);
  }
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const formatTime = (t = "") => {
  if (!t) return "–";
  if (/AM|PM/i.test(t)) return t;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m || 0).padStart(2, "0")} ${period}`;
};

const getEventStatus = (event, todayStr, currentMinutes) => {
  const start = event.startDate || event.eventDate || "";
  const end   = event.endDate   || event.eventDate || "";
  if (todayStr > end)   return "completed";
  if (todayStr < start) return "upcoming";
  const sMin = parseTimeToMinutes(event.eventTime);
  const eMin = event.checkOutTime ? parseTimeToMinutes(event.checkOutTime) : sMin + 120;
  if (currentMinutes >= sMin && currentMinutes <= eMin) return "live";
  return "active";
};

const STATUS_CONFIG = {
  live:      { label: "Live",     bg: "#dcfce7", text: "#166534", dot: "#16a34a" },
  active:    { label: "Active",   bg: "#fef3c7", text: "#92400e", dot: "#d97706" },
  upcoming:  { label: "Upcoming", bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
  completed: { label: "Done",     bg: "#f1f5f9", text: "#475569", dot: "#94a3b8" },
};

const getVenueColor = (roomId) => {
  const room = ALL_ROOMS.find((r) => r.id === roomId);
  return room?.groupColor || "#94a3b8";
};

// ─── NORMALIZE EVENT ──────────────────────────────────────────────────────────
const normalizeEvent = (e) => {
  const roomNo  = e.eventHall?.roomNo || "";
  const hall    = e.eventHall?.hall   || "";
  const roomId  = resolveRoomId(roomNo, hall);
  const groupId = resolveGroupId(roomId);
  return {
    ...e,
    uid:      String(e._id || e.id || Math.random()),
    startDate: e.eventDate     || "",
    endDate:   e.eventEndDate  || e.eventDate || "",
    roomId,
    groupId,
  };
};

// ─── DATA FETCH ───────────────────────────────────────────────────────────────
const fetchAny = async (paths) => {
  for (const p of paths) {
    try {
      const r = await fetch(`${API}${p}`);
      if (r.ok) return r.json();
    } catch (_) {}
  }
  return null;
};

const fetchMonth = async (year, month) => {
  const data = await fetchAny([
    `/api/events/public/month/${year}/${month}`,
    `/api/event-calendar/public/month/${year}/${month}`,
  ]);
  return Array.isArray(data?.events) ? data.events : [];
};

const fetchUpcoming = async () => {
  const data = await fetchAny([
    "/api/events/public/upcoming",
    "/api/event-calendar/public/upcoming",
  ]);
  return Array.isArray(data?.events) ? data.events : [];
};

// ─── MINI CALENDAR ────────────────────────────────────────────────────────────
function MiniCalendar({ currentDate, selectedDateKey, onDateSelect, onMonthChange, eventsForDate }) {
  const year       = currentDate.getFullYear();
  const month      = currentDate.getMonth();
  const firstDay   = new Date(year, month, 1).getDay();
  const totalDays  = new Date(year, month + 1, 0).getDate();
  const todayKey   = toDateKey(new Date());
  const monthLabel = currentDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const DAYS       = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= totalDays; i++) cells.push(i);

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onMonthChange(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-slate-700">{monthLabel}</span>
        <button onClick={() => onMonthChange(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const dateKey   = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEvents = eventsForDate(dateKey);
          const isToday   = dateKey === todayKey;
          const isSel     = dateKey === selectedDateKey;
          const isPast    = dateKey < todayKey;
          const dots      = dayEvents.slice(0, 3).map((e) => getVenueColor(e.roomId));

          return (
            <button
              key={dateKey}
              onClick={() => onDateSelect(dateKey)}
              className={`
                relative flex flex-col items-center justify-center rounded-lg h-8 text-xs transition-all
                ${isSel  ? "bg-slate-800 text-white font-bold" : ""}
                ${isToday && !isSel ? "bg-red-600 text-white font-bold" : ""}
                ${!isSel && !isToday ? (isPast ? "text-slate-300" : "text-slate-700 hover:bg-slate-100") : ""}
              `}
            >
              <span>{day}</span>
              {dots.length > 0 && !isSel && (
                <div className="flex gap-0.5 absolute bottom-0.5">
                  {dots.map((c, ci) => (
                    <span key={ci} className="w-1 h-1 rounded-full" style={{ background: c }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── BOOKING DETAIL MODAL ────────────────────────────────────────────────────
function BookingDetailModal({ event, todayStr, currentMinutes, onClose }) {
  const status = getEventStatus(event, todayStr, currentMinutes);
  const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
  const color  = getVenueColor(event.roomId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Color stripe */}
        <div className="h-1.5" style={{ background: color }} />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex-1 min-w-0">
              <span
                className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2"
                style={{ background: cfg.bg, color: cfg.text }}
              >
                {cfg.label}
              </span>
              <h3 className="text-xl font-bold text-slate-800 leading-snug">{event.eventName}</h3>
              <p className="text-sm font-semibold mt-1" style={{ color }}>{event.societyName}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition flex-shrink-0">
              <X size={18} />
            </button>
          </div>

          {/* Detail cards */}
          <div className="space-y-2.5">
            {/* Start */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <CalendarDays size={16} className="text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Start</p>
                <p className="text-sm font-semibold text-slate-700">
                  {shortDate(event.startDate || event.eventDate)}
                  {event.eventTime && <span className="text-slate-500 font-normal ml-1.5">at {formatTime(event.eventTime)}</span>}
                </p>
              </div>
            </div>

            {/* End */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Clock size={16} className="text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">End</p>
                <p className="text-sm font-semibold text-slate-700">
                  {shortDate(event.endDate || event.eventDate)}
                  {event.checkOutTime && <span className="text-slate-500 font-normal ml-1.5">at {formatTime(event.checkOutTime)}</span>}
                </p>
              </div>
            </div>

            {/* Venue */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <MapPin size={16} className="text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Venue</p>
                <p className="text-sm font-semibold text-slate-700">
                  {event.eventHall?.roomNo || event.eventHall?.hall || "–"}
                </p>
                {event.eventHall?.roomNo && event.eventHall?.hall && event.eventHall.roomNo !== event.eventHall.hall && (
                  <p className="text-xs text-slate-400">{event.eventHall.hall}</p>
                )}
              </div>
            </div>

            {/* Society */}
            {event.societyName && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <Users size={16} className="text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Organised By</p>
                  <p className="text-sm font-semibold text-slate-700">{event.societyName}</p>
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <FileText size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider mb-1">Description</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── BOOKING CARD ─────────────────────────────────────────────────────────────
function BookingCard({ event, todayStr, currentMinutes, onClick }) {
  const status = getEventStatus(event, todayStr, currentMinutes);
  const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
  const color  = getVenueColor(event.roomId);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      whileHover={{ scale: 1.012, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
      onClick={() => onClick(event)}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm flex items-stretch cursor-pointer overflow-hidden hover:border-slate-200 transition-all"
    >
      {/* Color bar */}
      <div className="w-1 flex-shrink-0" style={{ background: color }} />

      {/* Content */}
      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-800 leading-snug">{event.eventName}</h4>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: cfg.bg, color: cfg.text }}
          >
            {cfg.label}
          </span>
        </div>
        {event.societyName && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{event.societyName}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatTime(event.eventTime)}
            {event.checkOutTime && <> – {formatTime(event.checkOutTime)}</>}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {event.eventHall?.roomNo || event.eventHall?.hall || "–"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── VENUE SIDEBAR TREE ───────────────────────────────────────────────────────
function VenueTreeSidebar({ allEvents, selectedDateKey, selectedRoomId, onRoomSelect, todayStr }) {
  const [openGroups, setOpenGroups] = useState({ auditoriums: true });

  // Count bookings for a roomId on selectedDate
  const countForRoom = useCallback(
    (roomId) =>
      allEvents.filter(
        (e) => e.roomId === roomId && selectedDateKey >= e.startDate && selectedDateKey <= e.endDate
      ).length,
    [allEvents, selectedDateKey]
  );

  const countForGroup = useCallback(
    (groupId) =>
      allEvents.filter(
        (e) =>
          e.groupId === groupId &&
          selectedDateKey >= e.startDate &&
          selectedDateKey <= e.endDate
      ).length,
    [allEvents, selectedDateKey]
  );

  const toggleGroup = (id) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-0.5">
      {/* "All Venues" option */}
      <button
        onClick={() => onRoomSelect(null)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          selectedRoomId === null
            ? "bg-slate-800 text-white"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        <Building2 size={15} />
        <span className="flex-1 text-left">All Venues</span>
        {(() => {
          const total = allEvents.filter(
            (e) => selectedDateKey >= e.startDate && selectedDateKey <= e.endDate
          ).length;
          return total > 0 ? (
            <span className={`text-xs rounded-full px-2 py-0.5 font-bold ${selectedRoomId === null ? "bg-white text-slate-800" : "bg-slate-200 text-slate-600"}`}>
              {total}
            </span>
          ) : null;
        })()}
      </button>

      {VENUE_TREE.map((group) => {
        const groupCount = countForGroup(group.id);
        const isOpen = !!openGroups[group.id];

        return (
          <div key={group.id}>
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <span className="text-base leading-none">{group.icon}</span>
              <span className="flex-1 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                {group.label}
              </span>
              {groupCount > 0 && (
                <span
                  className="text-xs rounded-full px-2 py-0.5 font-bold text-white"
                  style={{ background: group.color }}
                >
                  {groupCount}
                </span>
              )}
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Rooms */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden pl-3"
                >
                  {group.rooms.map((room) => {
                    const count    = countForRoom(room.id);
                    const isActive = selectedRoomId === room.id;

                    return (
                      <motion.button
                        key={room.id}
                        whileHover={{ x: 2 }}
                        onClick={() => onRoomSelect(room.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all mb-0.5 ${
                          isActive
                            ? "text-white font-semibold"
                            : count > 0
                            ? "text-slate-700 hover:bg-slate-50 font-medium"
                            : "text-slate-400 hover:bg-slate-50"
                        }`}
                        style={isActive ? { background: group.color } : {}}
                      >
                        <div
                          className="w-2 h-2 rounded-sm flex-shrink-0"
                          style={{ background: isActive ? "rgba(255,255,255,0.7)" : group.color }}
                        />
                        <span className="flex-1 text-left text-xs truncate">{room.label}</span>
                        {count > 0 && (
                          <span
                            className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${
                              isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PublicVenueCalendar() {
  const [currentDate,     setCurrentDate]    = useState(new Date());
  const [events,          setEvents]         = useState([]);
  const [upcomingEvents,  setUpcomingEvents] = useState([]);
  const [loading,         setLoading]        = useState(true);
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(new Date()));
  const [selectedRoomId,  setSelectedRoomId] = useState(null); // null = all
  const [selectedEvent,   setSelectedEvent]  = useState(null);
  const [now,             setNow]            = useState(new Date());

  // Real-time clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const todayStr       = toDateKey(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const year  = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const [monthRes, upRes] = await Promise.allSettled([
        fetchMonth(year, month),
        fetchUpcoming(),
      ]);
      setEvents(monthRes.status         === "fulfilled" ? monthRes.value  : []);
      setUpcomingEvents(upRes.status === "fulfilled" ? upRes.value : []);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadData();
    const socket = io(API, { reconnection: true, reconnectionAttempts: 5 });
    let t;
    const debounced = () => { clearTimeout(t); t = setTimeout(loadData, 500); };
    [
      "venueBookingCreated", "venueBookingUpdated", "venueBookingCancelled", "venueBookingExtended",
      "eventCreated", "eventUpdated", "eventDeleted",
    ].forEach((ev) => socket.on(ev, debounced));
    return () => { clearTimeout(t); socket.disconnect(); };
  }, [loadData]);

  // ── Deduplication + normalization ─────────────────────────────────────────────
  const allEventsPool = useMemo(() => {
    const map = new Map();
    [...events, ...upcomingEvents]
      .map(normalizeEvent)
      .forEach((ev) => { if (!map.has(ev.uid)) map.set(ev.uid, ev); });
    return Array.from(map.values());
  }, [events, upcomingEvents]);

  // Events active on a given date (for calendar dots)
  const eventsForDate = useCallback(
    (dateKey) =>
      allEventsPool.filter((e) => dateKey >= e.startDate && dateKey <= e.endDate),
    [allEventsPool]
  );

  // Events for the currently selected date
  const dateEvents = useMemo(
    () =>
      allEventsPool
        .filter((e) => selectedDateKey >= e.startDate && selectedDateKey <= e.endDate)
        .sort((a, b) => parseTimeToMinutes(a.eventTime) - parseTimeToMinutes(b.eventTime)),
    [allEventsPool, selectedDateKey]
  );

  // Filter by selected room
  const displayedEvents = useMemo(
    () =>
      selectedRoomId
        ? dateEvents.filter((e) => e.roomId === selectedRoomId)
        : dateEvents,
    [dateEvents, selectedRoomId]
  );

  // Stats for header
  const totalOnDate = dateEvents.length;

  // Selected room label
  const selectedRoomLabel = useMemo(() => {
    if (!selectedRoomId) return null;
    return ALL_ROOMS.find((r) => r.id === selectedRoomId)?.label || null;
  }, [selectedRoomId]);

  const handleDateSelect = useCallback((dateKey) => {
    setSelectedDateKey(dateKey);
    setSelectedRoomId(null);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={thaparLogo} alt="Thapar" className="h-8 w-auto" />
            <div className="hidden sm:block">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 leading-none">Thapar Institute</p>
              <p className="text-sm font-bold text-slate-800 leading-none mt-0.5">Venue Bookings</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.a
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              href="https://campusconnect.thapar.edu/venue-enquiry"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition shadow-sm"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Request Booking</span>
              <span className="sm:hidden">Book</span>
            </motion.a>
            <a
              href="/event-calendar"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition border border-slate-200"
            >
              <CalendarDays size={14} />
              <span className="hidden sm:inline">Event Calendar</span>
            </a>
            <a
              href="/"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition border border-slate-200"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Back</span>
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* ── DATE HEADLINE ────────────────────────────────────────────────── */}
        <div className="mb-5 flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {selectedDateKey === todayStr ? "Today – " : ""}
              {humanDate(selectedDateKey)}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {totalOnDate === 0
                ? "No bookings on this date"
                : `${totalOnDate} booking${totalOnDate !== 1 ? "s" : ""} across all venues`}
              {selectedRoomLabel && <span className="ml-1 text-slate-600 font-medium">· filtered to {selectedRoomLabel}</span>}
            </p>
          </div>
          {selectedRoomId && (
            <button
              onClick={() => setSelectedRoomId(null)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition"
            >
              <X size={12} /> Clear filter
            </button>
          )}
        </div>

        {/* ── 3-COLUMN GRID ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] gap-5 items-start">

          {/* LEFT: Calendar ─────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Select Date</p>
              <MiniCalendar
                currentDate={currentDate}
                selectedDateKey={selectedDateKey}
                onDateSelect={handleDateSelect}
                onMonthChange={(dir) =>
                  setCurrentDate((prev) => {
                    const next = new Date(prev);
                    next.setMonth(prev.getMonth() + dir);
                    return next;
                  })
                }
                eventsForDate={eventsForDate}
              />
            </div>

            {/* Status key */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Status Key</p>
              <div className="space-y-1.5">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                    <span className="text-xs text-slate-500">{cfg.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER: Bookings list ────────────────────────────────────────── */}
          <div className="space-y-3 min-h-[400px]">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 h-20 animate-pulse" />
              ))
            ) : displayedEvents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
              >
                <Building2 size={36} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-400">
                  {selectedRoomId
                    ? "No bookings for this venue on selected date"
                    : "No bookings on this date"}
                </p>
                <p className="text-xs text-slate-300 mt-1">Try another date or venue</p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {displayedEvents.map((event) => (
                  <BookingCard
                    key={event.uid}
                    event={event}
                    todayStr={todayStr}
                    currentMinutes={currentMinutes}
                    onClick={setSelectedEvent}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* RIGHT: Venue tree sidebar ────────────────────────────────────── */}
          <div className="sticky top-20 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Halls &amp; Venues
              </p>
              <VenueTreeSidebar
                allEvents={allEventsPool}
                selectedDateKey={selectedDateKey}
                selectedRoomId={selectedRoomId}
                onRoomSelect={setSelectedRoomId}
                todayStr={todayStr}
              />
            </div>

            {/* Contact box */}
            <div className="bg-slate-800 rounded-2xl p-4 text-white">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Contact</p>
              <p className="text-xs text-slate-300 leading-relaxed">For venue queries, contact DoSA Office:</p>
              <a href="mailto:dosa.office@thapar.edu" className="text-xs text-blue-400 hover:text-blue-300 mt-1 block">
                dosa.office@thapar.edu
              </a>
              <p className="text-xs text-slate-500 mt-1">Mon – Fri · 9 AM – 5:30 PM</p>
              <a
                href="https://campusconnect.thapar.edu/venue-enquiry"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition"
              >
                <Plus size={12} /> Request a Booking
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white mt-10 py-8">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={thaparLogo} alt="Thapar" className="h-7 w-auto" />
            <p className="text-xs text-slate-400">Thapar Institute of Engineering &amp; Technology · DoSA Office</p>
          </div>
          <p className="text-xs text-slate-400">
            Developed by{" "}
            <a
              href="https://www.linkedin.com/in/navjot-sharma-8360631a7/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:underline"
            >
              Navjot Sharma
            </a>
            {" "}· DoSA Office
          </p>
        </div>
      </footer>

      {/* ── BOOKING DETAIL MODAL ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedEvent && (
          <BookingDetailModal
            event={selectedEvent}
            todayStr={todayStr}
            currentMinutes={currentMinutes}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
