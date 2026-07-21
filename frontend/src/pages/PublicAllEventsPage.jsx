import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import "../styles/eventcalendar.css";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL;
const PAGE_SIZE = 10;

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

const formatDate = (dateKey) => {
  if (!dateKey) return "-";
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const venueLabel = (event) => {
  const hall = event?.eventHall?.hall || event?.hall || "";
  const room = event?.eventHall?.roomNo || event?.roomNo || "";
  if (hall && room) return `${hall} - ${room}`;
  return room || hall || "Venue not specified";
};

const eventDescription = (event) =>
  event?.description ||
  event?.purpose ||
  event?.remarks ||
  "No description available.";

const eventStatus = (event) => {
  const today = new Date().toISOString().slice(0, 10);
  const start = event.eventDate;
  const end = event.eventEndDate || event.eventDate;

  if (event.status === "cancelled") return "cancelled";
  if (end < today) return "completed";
  if (start <= today && end >= today) return "active";
  return "upcoming";
};

const statusClasses = {
  upcoming: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

export default function PublicAllEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [venueFilter, setVenueFilter] = useState("");
  const [societyFilter, setSocietyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [theme] = useState(() => localStorage.getItem("eventCalendarTheme") || "light");

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const loadEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchFirstSuccessful(
        [
          "/api/event-calendar/master/all?recordType=event&limit=500",
          "/api/events/public",
          "/api/event-calendar/public",
        ],
        { method: "GET" }
      );
      setEvents(asArray(data.events));
    } catch (err) {
      console.error("Failed to load all events:", err);
      setError("Unable to load events right now.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aDate = a.eventDate || "";
      const bDate = b.eventDate || "";
      if (aDate !== bDate) return bDate.localeCompare(aDate);
      return String(b.eventTime || "").localeCompare(String(a.eventTime || ""));
    });
  }, [events]);

  const venues = useMemo(
    () => [...new Set(sortedEvents.map(venueLabel).filter(Boolean))].sort(),
    [sortedEvents]
  );

  const societies = useMemo(
    () => [...new Set(sortedEvents.map((event) => event.societyName).filter(Boolean))].sort(),
    [sortedEvents]
  );

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sortedEvents.filter((event) => {
      const venue = venueLabel(event);
      const status = eventStatus(event);
      const end = event.eventEndDate || event.eventDate;
      const matchesSearch =
        !q ||
        [
          event.eventName,
          event.societyName,
          venue,
          event.description,
          event.purpose,
          event.email,
          event.contact,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));

      const matchesVenue = !venueFilter || venue === venueFilter;
      const matchesSociety = !societyFilter || event.societyName === societyFilter;
      const matchesStatus = !statusFilter || status === statusFilter;
      const matchesDate = !dateFilter || (event.eventDate <= dateFilter && end >= dateFilter);

      return matchesSearch && matchesVenue && matchesSociety && matchesStatus && matchesDate;
    });
  }, [sortedEvents, search, venueFilter, societyFilter, statusFilter, dateFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, venueFilter, societyFilter, statusFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedEvents = filteredEvents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const clearFilters = () => {
    setSearch("");
    setVenueFilter("");
    setSocietyFilter("");
    setStatusFilter("");
    setDateFilter("");
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 flex flex-col ${
        theme === "dark"
          ? "bg-gray-900"
          : "bg-gradient-to-br from-blue-50 via-white to-purple-50"
      }`}
    >
      <header
        className={`sticky top-0 z-30 border-b ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}
      >
        <style>{`
          .public-all-events-filter-card {
            width: 100%;
            max-width: 100%;
            overflow: hidden;
          }

          .public-all-events-filter-grid {
            display: grid;
            grid-template-columns: minmax(320px, 2fr) minmax(180px, 1fr) minmax(180px, 1fr) minmax(150px, .8fr) minmax(150px, .8fr) auto;
            gap: 12px;
            width: 100%;
            max-width: 100%;
            align-items: center;
          }

          .public-all-events-filter-grid > * {
            min-width: 0;
          }

          .public-all-events-filter-control {
            width: 100%;
            min-width: 0;
          }

          .public-all-events-search-input {
            min-width: 0;
            text-overflow: ellipsis;
          }

          .public-all-events-clear-btn {
            min-width: 96px;
            white-space: nowrap;
          }

          @media (max-width: 1180px) {
            .public-all-events-filter-grid {
              grid-template-columns: minmax(260px, 1.4fr) repeat(2, minmax(160px, 1fr)) repeat(2, minmax(140px, .8fr));
            }

            .public-all-events-clear-btn {
              grid-column: 1 / -1;
              justify-self: end;
            }
          }

          @media (max-width: 900px) {
            .public-all-events-filter-grid {
              grid-template-columns: 1fr 1fr;
            }

            .public-all-events-search-field {
              grid-column: 1 / -1;
            }
          }

          @media (max-width: 767px) {
            .public-all-events-header {
              min-height: auto !important;
              padding: 14px 16px 16px !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: flex-start !important;
              justify-content: flex-start !important;
              gap: 12px !important;
              overflow: hidden;
            }

            .public-all-events-brand {
              width: 100%;
              min-width: 0;
              align-items: center !important;
            }

            .public-all-events-logo {
              height: 54px !important;
              flex-shrink: 0;
            }

            .public-all-events-brand-title {
              font-size: 12px !important;
              line-height: 1.15 !important;
              max-width: 280px;
            }

            .public-all-events-mobile-label {
              display: flex !important;
              align-items: center;
              gap: 6px;
              font-size: 13px !important;
              font-weight: 700 !important;
              margin-top: 6px !important;
            }

            .public-all-events-center-title {
              display: none !important;
            }

            .public-all-events-actions {
              width: 100%;
              justify-content: flex-start;
              overflow: hidden;
            }

            .public-all-events-back {
              max-width: 100%;
            }

            .public-all-events-main {
              padding-left: 14px !important;
              padding-right: 14px !important;
              overflow-x: hidden;
            }

            .public-all-events-filter-card {
              padding: 14px !important;
              border-radius: 18px !important;
            }

            .public-all-events-filter-grid {
              grid-template-columns: 1fr;
              gap: 10px;
            }

            .public-all-events-clear-btn {
              width: 100%;
              min-width: 0;
              justify-self: stretch;
            }
          }
        `}</style>
        <div
          className="public-all-events-header w-full max-w-[1280px] mx-auto px-6"
          style={{ minHeight: 96, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}
        >
          <div className="public-all-events-brand" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <img
              src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744"
              alt="Thapar Logo"
              className="public-all-events-logo"
              style={{ height: "clamp(56px, 6vw, 72px)", width: "auto", objectFit: "contain" }}
            />
            <div>
              <p className={`public-all-events-brand-title text-[12.5px] font-semibold leading-tight ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Thapar Institute of Engineering and Technology
              </p>
              <p className={`public-all-events-mobile-label text-[11px] font-medium leading-tight mt-0.5 ${theme === "dark" ? "text-red-300" : "text-red-700"}`}>
                <CalendarIcon size={14} /> All Events
              </p>
            </div>
          </div>

          <div className="public-all-events-center-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarIcon size={18} className="text-red-700" />
            <h1
              className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              style={{ fontSize: "clamp(1rem,2.2vw,1.3rem)" }}
            >
              All Events
            </h1>
          </div>

          <div className="public-all-events-actions" style={{ display: "flex", alignItems: "center" }}>
            <a
              href="/event-calendar"
              className={`public-all-events-back flex items-center gap-1 sm:gap-2 border rounded-lg transition-colors text-xs sm:text-sm font-medium ${
                theme === "dark"
                  ? "border-gray-600 text-gray-300 hover:border-red-500 hover:text-red-400"
                  : "border-gray-200 text-gray-600 hover:border-red-600 hover:text-red-600"
              }`}
              style={{ padding: "6px 10px", textDecoration: "none" }}
            >
              <ArrowLeft size={14} /> Back
            </a>
          </div>
        </div>
      </header>

      <main className="public-all-events-main relative z-10 w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 flex-grow max-w-7xl mx-auto">
        <section
          className={`public-all-events-filter-card rounded-2xl shadow-xl border p-4 sm:p-5 ${
            theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <div className="public-all-events-filter-grid">
            <label className="public-all-events-search-field relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search event, society, venue..."
                className={`public-all-events-filter-control public-all-events-search-input w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none ${
                  theme === "dark"
                    ? "bg-gray-900 border-gray-700 text-white"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
              />
            </label>

            <select
              value={venueFilter}
              onChange={(event) => setVenueFilter(event.target.value)}
              className={`public-all-events-filter-control rounded-xl border px-3 py-2.5 text-sm outline-none ${
                theme === "dark" ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200"
              }`}
            >
              <option value="">All Venues</option>
              {venues.map((venue) => (
                <option key={venue} value={venue}>{venue}</option>
              ))}
            </select>

            <select
              value={societyFilter}
              onChange={(event) => setSocietyFilter(event.target.value)}
              className={`public-all-events-filter-control rounded-xl border px-3 py-2.5 text-sm outline-none ${
                theme === "dark" ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200"
              }`}
            >
              <option value="">All Societies</option>
              {societies.map((society) => (
                <option key={society} value={society}>{society}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className={`public-all-events-filter-control rounded-xl border px-3 py-2.5 text-sm outline-none ${
                theme === "dark" ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200"
              }`}
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={`public-all-events-filter-control rounded-xl border px-3 py-2.5 text-sm outline-none ${
                theme === "dark" ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200"
              }`}
            >
              <option value="">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              onClick={clearFilters}
              className={`public-all-events-clear-btn inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                theme === "dark"
                  ? "border-gray-700 text-gray-200 hover:bg-gray-700"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Filter size={15} /> Clear
            </button>
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Showing {paginatedEvents.length ? (safePage - 1) * PAGE_SIZE + 1 : 0} to{" "}
            {Math.min(safePage * PAGE_SIZE, filteredEvents.length)} of {filteredEvents.length} events
          </p>
          <button
            onClick={loadEvents}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
              theme === "dark" ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-white text-gray-700 hover:bg-gray-50"
            } border border-gray-200`}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="loading-spinner" />
          </div>
        ) : error ? (
          <div className={`rounded-2xl border p-10 text-center ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white border-gray-200 text-gray-600"}`}>
            {error}
          </div>
        ) : paginatedEvents.length === 0 ? (
          <div className={`rounded-2xl border p-10 text-center ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white border-gray-200 text-gray-600"}`}>
            No events found.
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedEvents.map((event, index) => {
              const status = eventStatus(event);
              const end = event.eventEndDate || event.eventDate;
              return (
                <motion.article
                  key={event._id || `${event.eventName}-${event.eventDate}-${index}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`event-card rounded-2xl border p-5 shadow-lg ${
                    theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-wide ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
                        {event.societyName || "Society"}
                      </p>
                      <h2 className={`mt-1 text-lg font-bold leading-snug ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {event.eventName || "Untitled Event"}
                      </h2>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[status] || statusClasses.upcoming}`}>
                      {status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm">
                    <div className={`flex items-center gap-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                      <MapPin size={15} className="text-red-600" />
                      <span>{venueLabel(event)}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                      <CalendarIcon size={15} className="text-blue-600" />
                      <span>{formatDate(event.eventDate)} to {formatDate(end)}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                      <Clock size={15} className="text-purple-600" />
                      <span>{event.eventTime || "-"}{event.checkOutTime ? ` to ${event.checkOutTime}` : ""}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                      <Users size={15} className="text-green-600" />
                      <span>{event.societyName || "-"}</span>
                    </div>
                  </div>

                  <p className={`mt-4 text-sm leading-relaxed ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    {eventDescription(event)}
                  </p>
                </motion.article>
              );
            })}
          </section>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={safePage <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
              theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700 bg-white"
            }`}
          >
            Previous
          </button>
          <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
            Page {safePage} of {totalPages}
          </span>
          <button
            disabled={safePage >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
              theme === "dark" ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700 bg-white"
            }`}
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
}
