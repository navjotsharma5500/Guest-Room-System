import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar as CalendarIcon, ChevronDown, Clock, ExternalLink, Home, Info, MapPin, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/eventcalendar.css";
import { BACKEND_URL } from "../utils/apiConfig";
import { DEFAULT_PUBLIC_UI_CONFIG, fetchPublicUiConfig, normalizePublicUiConfig } from "../utils/publicUiConfig";

const asArray = (value) => (Array.isArray(value) ? value : []);
const localDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const formatDate = (dateKey) => {
  if (!dateKey) return "-";
  const parsed = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? dateKey : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const venueLabel = (event) => {
  const hall = event?.eventHall?.hall || event?.hall || "";
  const room = event?.eventHall?.roomNo || event?.roomNo || "";
  return hall && room ? `${hall} - ${room}` : room || hall || "Venue not specified";
};
const description = (event) => event?.description || event?.purpose || event?.remarks || "No description available.";

async function fetchEvents() {
  const paths = [
    "/api/event-calendar/master/all?recordType=event&limit=500",
    "/api/events/public",
    "/api/event-calendar/public",
  ];
  let lastError;
  for (const path of paths) {
    try {
      const response = await fetch(`${BACKEND_URL}${path}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Unable to load events");
}

function HeaderNavItem({ item, onOpen }) {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const children = (item.items || []).filter((child) => child?.enabled !== false);
  const show = () => { clearTimeout(timer.current); setOpen(true); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 150); };
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!children.length) return <button type="button" onClick={() => onOpen(item)} className="upcoming-header-link">{item.title}</button>;
  return (
    <div className="upcoming-nav-parent" onMouseEnter={show} onMouseLeave={hide}>
      <span className="upcoming-header-link">{item.title}<ChevronDown size={13} /></span>
      <AnimatePresence>{open && <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="upcoming-dropdown">
        {children.map((child) => <button type="button" key={child.id || child.title} onClick={() => onOpen(child)}>{child.title}</button>)}
      </motion.div>}</AnimatePresence>
    </div>
  );
}

export default function PublicUpcomingEventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [config, setConfig] = useState(() => normalizePublicUiConfig(DEFAULT_PUBLIC_UI_CONFIG));

  useEffect(() => { fetchPublicUiConfig().then(setConfig).catch(() => {}); }, []);
  useEffect(() => {
    fetchEvents()
      .then((data) => setEvents(asArray(data.events)))
      .catch(() => setError("Unable to load upcoming events right now."))
      .finally(() => setLoading(false));
  }, []);

  const openItem = (item) => {
    const destination = item?.destination || item?.href;
    if (destination?.startsWith("/")) navigate(destination);
    else if (/^https?:\/\//i.test(destination || "")) window.open(destination, "_blank", "noopener,noreferrer");
    else if (item?.action === "home" || item?.action === "about") navigate("/");
    else if (item?.action === "community") navigate("/community-feedback");
  };

  const upcomingEvents = useMemo(() => {
    const today = localDateKey(new Date());
    const weekEndDate = new Date();
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekEnd = localDateKey(weekEndDate);
    return events
      .filter((event) => {
        const start = event.eventDate || "";
        const end = event.eventEndDate || start;
        return event.status !== "cancelled" && start <= weekEnd && end >= today;
      })
      .sort((a, b) => String(a.eventDate || "").localeCompare(String(b.eventDate || "")) || String(a.eventTime || "").localeCompare(String(b.eventTime || "")));
  }, [events]);

  const navigation = [...(config.navigation || [])].filter((item) => item?.enabled !== false).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const header = config.header || DEFAULT_PUBLIC_UI_CONFIG.header;

  return (
    <div className="upcoming-events-page">
      <style>{`
        .upcoming-events-page{min-height:100vh;background:#f4f8ff;color:#17345f;font-family:'DM Sans',sans-serif}
        .upcoming-universal-header{position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid #e5e7eb;box-shadow:0 1px 4px rgba(0,0,0,.06)}
        .upcoming-header-inner{max-width:1280px;min-height:96px;margin:auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between;gap:18px}
        .upcoming-brand{display:flex;align-items:center;gap:12px}.upcoming-brand img{height:clamp(56px,6vw,72px);width:auto}.upcoming-brand strong{max-width:250px;font-size:12.5px;line-height:1.25}
        .upcoming-nav{display:flex;align-items:center;justify-content:center;gap:24px;flex:1}.upcoming-header-link{display:flex;align-items:center;gap:3px;border:0;background:none;color:#374151;font:500 13px inherit;cursor:pointer}
        .upcoming-nav-parent{position:relative}.upcoming-dropdown{position:absolute;top:calc(100% + 7px);left:50%;transform:translateX(-50%);min-width:220px;padding:7px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.12)}
        .upcoming-dropdown button{display:block;width:100%;padding:10px 12px;border:0;border-radius:8px;background:none;text-align:left;color:#374151;cursor:pointer}.upcoming-dropdown button:hover{background:#fef2f2;color:#b91c1c}
        .upcoming-login{padding:9px 16px;border-radius:6px;background:#c62828;color:#fff;text-decoration:none;font-size:12.5px;font-weight:600}
        .upcoming-main{max-width:1200px;margin:auto;padding:64px 24px 72px}.upcoming-eyebrow{color:#245fa8;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.upcoming-main h1{font-family:'EB Garamond',Georgia,serif;font-size:clamp(2.3rem,5vw,4rem);margin:10px 0 12px;color:#17345f}.upcoming-intro{max-width:640px;color:#60738f;line-height:1.7}
        .upcoming-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:40px}.upcoming-card{padding:24px;border:1px solid #dce5f1;border-radius:18px;background:#fff;box-shadow:0 7px 22px rgba(52,87,130,.09);cursor:pointer;transition:transform .25s,box-shadow .25s,border-color .25s}.upcoming-card:hover{transform:translateY(-3px);border-color:#bfd2e9;box-shadow:0 12px 30px rgba(52,87,130,.14)}
        .upcoming-card-head{display:flex;justify-content:space-between;gap:14px}.upcoming-society{color:#24558f;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.upcoming-card h2{font-size:18px;line-height:1.35;margin:5px 0;color:#17345f}.upcoming-badge{height:max-content;padding:5px 11px;border-radius:999px;background:#e2edfb;color:#24558f;font-size:11px;font-weight:700}.upcoming-meta{display:grid;gap:9px;margin-top:18px;color:#405875;font-size:13px}.upcoming-meta span{display:flex;align-items:center;gap:8px}.upcoming-description{margin-top:17px;color:#60738f;font-size:13px;line-height:1.65}
        .upcoming-empty{margin-top:38px;padding:48px 20px;border:1px solid #e5e7eb;border-radius:18px;background:#fff;text-align:center;color:#6b7280}
        .upcoming-modal-backdrop{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.52);backdrop-filter:blur(4px);display:grid;place-items:center;padding:16px}.upcoming-modal{position:relative;width:min(560px,100%);max-height:90vh;overflow:auto;padding:30px;border-radius:20px;background:#fff;box-shadow:0 24px 70px rgba(0,0,0,.24)}.upcoming-close{position:absolute;top:14px;right:14px;border:0;background:#f3f4f6;border-radius:8px;padding:7px;cursor:pointer}.upcoming-modal h2{font-family:'EB Garamond',Georgia,serif;font-size:28px;margin:8px 34px 6px 0}.upcoming-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:22px 0}.upcoming-modal-grid div{padding:13px;border-radius:10px;background:#f9fafb}.upcoming-modal-grid span{display:block;color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.upcoming-modal-grid strong{display:block;margin-top:5px;font-size:13px}
        @media(max-width:900px){.upcoming-nav{display:none}.upcoming-grid{grid-template-columns:1fr}}@media(max-width:600px){.upcoming-header-inner{min-height:auto;padding:12px 16px;flex-wrap:wrap}.upcoming-brand strong{max-width:180px;font-size:11px}.upcoming-login{padding:8px 11px}.upcoming-main{padding:42px 15px 54px}.upcoming-card{padding:19px}.upcoming-card-head{display:block}.upcoming-badge{display:inline-block;margin-top:8px}.upcoming-modal{padding:24px 18px}.upcoming-modal-grid{grid-template-columns:1fr}}
      `}</style>

      <header className="upcoming-universal-header">
        <div className="upcoming-header-inner">
          <div className="upcoming-brand"><img src={header.logoUrl} alt={header.logoAlt || "Thapar"} /><strong>{header.title}</strong></div>
          <nav className="upcoming-nav">{navigation.map((item) => <HeaderNavItem key={item.id || item.title} item={item} onOpen={openItem} />)}</nav>
          <a className="upcoming-login" href={header.loginDestination || "/login"}>{header.loginText || "Admin Login"}</a>
        </div>
      </header>

      <main className="upcoming-main">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <p className="upcoming-eyebrow">Event Calendar</p>
          <h1>Upcoming Events</h1>
          <p className="upcoming-intro">Events taking place today and during the next seven days.</p>
        </motion.div>
        {loading ? <div className="upcoming-empty">Loading upcoming events…</div> : error ? <div className="upcoming-empty">{error}</div> : upcomingEvents.length === 0 ? <div className="upcoming-empty">No events are scheduled for the upcoming week.</div> :
          <section className="upcoming-grid">{upcomingEvents.map((event, index) => {
            const end = event.eventEndDate || event.eventDate;
            return <motion.article role="button" tabIndex={0} onClick={() => setSelectedEvent(event)} onKeyDown={(keyEvent) => { if (keyEvent.key === "Enter" || keyEvent.key === " ") setSelectedEvent(event); }} key={event._id || `${event.eventName}-${event.eventDate}-${index}`} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }} className="upcoming-card">
              <div className="upcoming-card-head"><div><p className="upcoming-society">{event.societyName || "Campus Event"}</p><h2>{event.eventName || "Untitled Event"}</h2></div><span className="upcoming-badge">Upcoming</span></div>
              <div className="upcoming-meta"><span><MapPin size={15} color="#3478c9" />{venueLabel(event)}</span><span><CalendarIcon size={15} color="#3478c9" />{formatDate(event.eventDate)}{end !== event.eventDate ? ` to ${formatDate(end)}` : ""}</span><span><Clock size={15} color="#3478c9" />{event.eventTime || "-"}{event.checkOutTime ? ` to ${event.checkOutTime}` : ""}</span><span><Users size={15} color="#3478c9" />{event.societyName || "-"}</span></div>
              <p className="upcoming-description">{description(event)}</p>
            </motion.article>;
          })}</section>}
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
              <div><p className="footer-label">Timings</p><p>9:00 AM to 5:30 PM</p><p>Monday to Friday</p></div>
              <div><p className="footer-label">Any General Query or Assistance</p><p>Email:</p><a href="mailto:dosa.office@thapar.edu">dosa.office@thapar.edu</a></div>
              <div><a href="mailto:Queries_studentaffairs@thapar.edu">Queries_studentaffairs@thapar.edu</a></div>
              <div><p className="footer-label">Technical Support</p><p>Email:</p><a href="mailto:itmh@thapar.edu">itmh@thapar.edu</a></div>
            </div>
            <div className="student-footer-credit"><p>Powered by Thapar Institute of Engineering &amp; Technology</p><p>Created and Maintained by DoSA Office</p></div>
          </div>
        </div>
      </footer>

      <AnimatePresence>{showAboutModal && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="event-modal-backdrop" onClick={() => setShowAboutModal(false)}>
        <motion.div initial={{ scale: .96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 12 }} className="event-modal-card" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => setShowAboutModal(false)}><X size={20} /></button>
          <h2>About Societies, Clubs &amp; Chapters</h2>
          <p>Thapar Institute of Engineering &amp; Technology offers students avenues to engage beyond the classroom through student organizations, events and leadership opportunities.</p>
        </motion.div>
      </motion.div>}</AnimatePresence>

      <AnimatePresence>{selectedEvent && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="upcoming-modal-backdrop" onClick={() => setSelectedEvent(null)}>
        <motion.div initial={{ opacity: 0, scale: .95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .95, y: 12 }} className="upcoming-modal" onClick={(event) => event.stopPropagation()}>
          <button type="button" aria-label="Close event details" className="upcoming-close" onClick={() => setSelectedEvent(null)}><X size={18} /></button>
          <p className="upcoming-eyebrow">{selectedEvent.societyName || "Campus Event"}</p><h2>{selectedEvent.eventName}</h2>
          <div className="upcoming-modal-grid"><div><span>Venue</span><strong>{venueLabel(selectedEvent)}</strong></div><div><span>Time</span><strong>{selectedEvent.eventTime || "-"}{selectedEvent.checkOutTime ? ` to ${selectedEvent.checkOutTime}` : ""}</strong></div><div><span>Start Date</span><strong>{formatDate(selectedEvent.eventDate)}</strong></div><div><span>End Date</span><strong>{formatDate(selectedEvent.eventEndDate || selectedEvent.eventDate)}</strong></div></div>
          <p className="upcoming-description">{description(selectedEvent)}</p>
        </motion.div>
      </motion.div>}</AnimatePresence>
    </div>
  );
}
