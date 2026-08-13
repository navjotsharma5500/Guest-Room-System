import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Building2,
  Target,
  Eye, Heart, Zap, Users, CheckCircle, Linkedin, Home, Package, MessageSquare, ChevronDown, ChevronLeft, ChevronRight,
  Mail, Copy, Check, Clock3, Landmark,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import {
  DEFAULT_PUBLIC_UI_CONFIG,
  fetchPublicUiConfig,
  normalizePublicUiConfig,
} from "../utils/publicUiConfig";
import PublicPageWidgets from "../components/PublicPageWidgets";
import CampusFeedbackSection from "../components/CampusFeedbackSection";
import "../styles/CampusPublicChrome.css";

/* ─────────────────────────────────────────
   ANIMATION HELPER
───────────────────────────────────────── */
function FadeUp({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
const WHY_POINTS = [
  "Manual approvals were slow and paperwork-heavy",
  "Multiple departments were completely disconnected",
  "No centralized student service platform existed",
  "Lack of transparency in request status",
  "Students had to visit offices physically for every task",
];

const VALUES = [
  { icon: Target,       label: "Simplicity",    desc: "Clean, intuitive design that every student can use without training." },
  { icon: Zap,          label: "Speed",          desc: "Instant approvals, real-time status, and zero waiting at counters." },
  { icon: Eye,          label: "Transparency",   desc: "Every request is trackable. No black boxes, no unanswered queries." },
  { icon: Heart,        label: "Student First",  desc: "Every decision is made with the student experience at the centre." },
  { icon: CheckCircle,  label: "Automation",     desc: "Reduce human error with smart workflows and digital records." },
  { icon: Users,        label: "Community",      desc: "Connecting students, faculty, and administration seamlessly." },
];

const resolveApplicationIcon = (iconKey) => {
  const rawKey = String(iconKey || "").trim();
  const pascalKey = rawKey
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
  return LucideIcons[rawKey] || LucideIcons[pascalKey] || LucideIcons.Sparkles;
};

function HeaderNavItem({ item, onOpen }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const children = (item.items || []).filter((child) => child?.enabled !== false);
  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };
  useEffect(() => () => closeTimer.current && clearTimeout(closeTimer.current), []);

  if (!children.length) {
    return <button onClick={() => onOpen(item)} style={{ border: 0, background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "#374151" }}>{item.title}</button>;
  }
  return (
    <div onMouseEnter={show} onMouseLeave={hide} style={{ position: "relative" }}>
      <button type="button" style={{ display: "flex", alignItems: "center", gap: 3, border: 0, background: "none", cursor: "default", fontFamily: "inherit", fontSize: 13, color: "#374151" }}>
        {item.title}<ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .18s" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: .11 }}
            style={{ position: "absolute", top: "calc(100% + 4px)", left: "50%", minWidth: 220, padding: 8, transform: "translateX(-50%)", border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", boxShadow: "0 16px 40px rgba(0,0,0,.12)" }}>
            {children.map((child) => <button key={child.id || child.title} onClick={() => { setOpen(false); onOpen(child); }} style={{ display: "block", width: "100%", padding: "10px 12px", border: 0, borderRadius: 8, background: "none", textAlign: "left", cursor: "pointer", color: "#374151" }}>{child.title}</button>)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlatformCarousel({ apps, onOpen }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const count = apps.length;

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (paused || count < 2) return undefined;
    const timer = setInterval(() => setActiveIndex((index) => (index + 1) % count), 1600);
    return () => clearInterval(timer);
  }, [paused, count]);

  useEffect(() => {
    if (activeIndex >= count) setActiveIndex(0);
  }, [activeIndex, count]);

  if (!count) return null;
  const activeApp = apps[activeIndex] || apps[0];
  const visibleDistance = viewportWidth < 640 ? 1 : viewportWidth < 980 ? 2 : 3;
  const step = viewportWidth < 640 ? 126 : viewportWidth < 980 ? 155 : 185;
  const move = (direction) => setActiveIndex((index) => (index + direction + count) % count);
  const relativePosition = (index) => {
    let position = (index - activeIndex + count) % count;
    if (position > count / 2) position -= count;
    return position;
  };
  const isComingSoon = (app) => app.comingSoon || app.status === "Coming Soon" || !app.destination;

  return (
    <div className="platform-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <motion.div
        className="platform-carousel-stage"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.16}
        onDragEnd={(_, info) => {
          if (info.offset.x < -45 || info.velocity.x < -350) move(1);
          else if (info.offset.x > 45 || info.velocity.x > 350) move(-1);
        }}
      >
        {apps.map((app, index) => {
          const position = relativePosition(index);
          const distance = Math.abs(position);
          const isActive = position === 0;
          const Icon = app.icon;
          return (
            <motion.button
              type="button"
              key={app.id}
              className={`platform-orbit-card ${isActive ? "active" : ""}`}
              animate={{
                x: position * step,
                y: distance * 23,
                scale: isActive ? 1.16 : Math.max(.7, 1 - distance * .12),
                rotate: position * -6,
                opacity: distance <= visibleDistance ? (isActive ? 1 : Math.max(.3, .82 - distance * .17)) : 0,
                zIndex: 20 - distance,
              }}
              transition={{ type: "spring", stiffness: 155, damping: 24, mass: .8 }}
              onClick={() => {
                if (!isActive) setActiveIndex(index);
                else if (app.locked) onOpen(app);
                else if (!isComingSoon(app)) onOpen(app);
              }}
              disabled={isActive && !app.locked && isComingSoon(app)}
              aria-label={`${app.title}${app.locked ? " — Locked" : isComingSoon(app) ? " — Coming Soon" : ""}`}
            >
              {app.image ? <img src={app.image} alt="" /> : <span className="platform-orbit-icon" style={{ background: app.color, color: app.ic }}><Icon size={isActive ? 38 : 30} /></span>}
              {(app.locked || isComingSoon(app)) && <span className="platform-orbit-soon">{app.locked ? "Locked" : "Coming Soon"}</span>}
            </motion.button>
          );
        })}
      </motion.div>
      <div className="platform-carousel-controls">
        <button type="button" onClick={() => move(-1)} aria-label="Previous application"><ChevronLeft size={18} /></button>
        <AnimatePresence mode="wait">
          <motion.div key={activeApp.id} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -9 }} transition={{ duration: .25 }} className="platform-active-copy">
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 9 }}>
              <h3>{activeApp.title}</h3>
              {(activeApp.locked || isComingSoon(activeApp)) && <span>{activeApp.locked ? "Locked" : "Coming Soon"}</span>}
            </div>
            <p>{activeApp.description}</p>
          </motion.div>
        </AnimatePresence>
        <button type="button" onClick={() => move(1)} aria-label="Next application"><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}

export function PublicHeader({ config, onOpen, applications }) {
  const header = config.header || DEFAULT_PUBLIC_UI_CONFIG.header;
  const applicationMap = new Map((applications || []).map((application) => [application.id, application]));
  const navigation = [...(config.navigation || [])]
    .filter((item) => item?.enabled !== false && item?.id !== "about" && item?.action !== "about")
    .map((item) => item.id === "night-pass" ? {
      ...item,
      items: (item.items || [])
        .map((child) => applicationMap.has(child.id) ? { ...child, ...applicationMap.get(child.id), title: applicationMap.get(child.id).title } : child)
        .filter((child) => child?.enabled !== false),
    } : item)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 300, background: "#fff", borderBottom: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
      <div className="about-public-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={header.logoUrl} alt={header.logoAlt || "Thapar"} style={{ height: "clamp(56px,6vw,72px)", width: "auto", objectFit: "contain" }} />
          <strong style={{ maxWidth: 250, fontSize: 12.5, lineHeight: 1.25 }}>{header.title}</strong>
        </div>
        <nav className="about-public-nav">
          {navigation.map((item) => <HeaderNavItem key={item.id || item.title} item={item} onOpen={onOpen} />)}
        </nav>
      </div>
    </header>
  );
}

export function PublicQuickLinks({ config, onOpen }) {
  const footer = config.footer || DEFAULT_PUBLIC_UI_CONFIG.footer;
  const widgets = config.widgets || DEFAULT_PUBLIC_UI_CONFIG.widgets;
  const iconFor = (id) => id === "home" ? Home : id === "install" ? Package : id === "community" ? MessageSquare : id === "about" ? Building2 : ArrowRight;
  const serviceLinks = [
    { id: "guest-room-service", title: "Guest Room Booking", destination: "/guest-room" },
    { id: "library-pass-service", title: "Library Night Pass", destination: "https://permissions.thapar.edu/" },
    { id: "venue-service", title: "Venue Booking", destination: "/venue-enquiry" },
    { id: "societies-service", title: "Student Societies", destination: "https://studentsocieties.thapar.edu/" },
    { id: "lost-found-service", title: "Lost & Found", destination: "/lostnfound" },
  ];
  return (
    <>
      <footer style={{ background: "#f0f1f3", borderTop: "1px solid #e5e7eb" }}>
        <div className="about-footer-grid">
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 14 }}>{footer.quickLinksTitle}</p>
            <div className="about-footer-links-grid">
              <div>{(footer.quickLinks || []).filter((item) => item?.enabled !== false).map((item) => {
                const Icon = iconFor(item.id);
                return <button key={item.id || item.title} onClick={() => onOpen(item)} className="about-footer-link"><Icon size={15} />{item.title}</button>;
              })}</div>
              <div>{serviceLinks.map((item) => <button key={item.id} onClick={() => onOpen(item)} className="about-footer-link"><ArrowRight size={15} />{item.title}</button>)}</div>
            </div>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 14 }}>{footer.contactTitle}</p>
            <div style={{ display: "grid", gap: 18 }}>{(footer.contactBlocks || []).filter((item) => item?.enabled !== false).map((block) => <div key={block.id || block.label} style={{ display: "grid", gap: 5, color: "#4b5563", fontSize: 13.5 }}><strong style={{ color: "#9ca3af", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>{block.label}</strong>{(block.lines || []).map((line, index) => <span key={index}>{line}</span>)}{(block.emails || []).map((email) => <a key={email} href={`mailto:${email}`} style={{ color: "#2563eb" }}>{email}</a>)}</div>)}</div>
            <div style={{ marginTop: 22, display: "grid", gap: 6, color: "#6b7280", fontSize: 12.5, lineHeight: 1.5 }}>
              <p>{widgets.poweredByText || "Powered by Thapar Institute of Engineering & Technology"}</p>
              <p>{widgets.maintainedByText || "Created and Maintained by DoSA Office"}</p>
            </div>
          </div>
        </div>
      </footer>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", padding: "16px 24px", color: "#9ca3af", fontSize: 12 }}>
        <span>{footer.copyright === "© 2026 TIET" ? "© 2026 TIET. All rights reserved." : footer.copyright}</span>
        {(footer.legalLinks || []).filter((item) => item?.enabled !== false).map((item) => <button key={item.id || item.title} onClick={() => onOpen(item)} style={{ border: 0, background: "none", color: "#6b7280", cursor: "pointer" }}>{item.title}</button>)}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   STICKY NAV
───────────────────────────────────────── */
const NAV_SECTIONS = ["About", "Why", "Vision", "Leadership", "Features", "Team"];

function StickyNav({ active }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 200, background: "rgba(255,255,255,.96)",
      backdropFilter: "blur(12px)", borderBottom: "1px solid #e5e7eb",
      boxShadow: "0 1px 4px rgba(0,0,0,.06)",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
        {NAV_SECTIONS.map(s => (
          <a key={s} href={`#section-${s.toLowerCase().replace(" ", "-")}`}
            style={{
              padding: "14px 16px", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
              color: active === s ? "#c62828" : "#4b5563",
              borderBottom: active === s ? "2px solid #c62828" : "2px solid transparent",
              textDecoration: "none", transition: "color .2s, border-color .2s",
            }}>
            {s}
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function CampusConnect() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState("About");
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [supportModal, setSupportModal] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState("");
  const [developersOpen, setDevelopersOpen] = useState(false);
  const [publicConfig, setPublicConfig] = useState(() => normalizePublicUiConfig(DEFAULT_PUBLIC_UI_CONFIG));

  useEffect(() => {
    fetchPublicUiConfig().then(setPublicConfig).catch(() => {});
  }, []);

  const openItem = (item) => {
    if (item?.action === "q1" || item?.action === "q2") {
      setSupportModal(item.action);
      return;
    }
    if (item?.locked) {
      setSelectedFeature({
        ...item,
        label: item.title || item.label,
        status: "Locked",
        working: item.lockMessage || "This service is currently unavailable.",
        icon: item.icon || LucideIcons.Lock,
        color: item.color || "#f3f4f6",
        ic: item.ic || "#475569",
      });
      return;
    }
    const destination = item?.destination || item?.href;
    if (destination?.startsWith("/")) navigate(destination);
    else if (/^https?:\/\//i.test(destination || "")) window.open(destination, "_blank", "noopener,noreferrer");
    else if (item?.action === "home" || item?.action === "about") window.scrollTo({ top: 0, behavior: "smooth" });
    else if (item?.action === "community") navigate("/student-notices");
    else if (item?.action === "cs" || item?.action === "libraryUnavailable") {
      setSelectedFeature({
        label: item.title,
        status: "Coming Soon",
        color: "#fff8e1",
        ic: "#b45309",
        icon: resolveApplicationIcon(item.icon),
        working: item.lockMessage || `${item.title} will be available soon.`,
      });
    }
  };

  const copySupportEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(""), 1800);
    } catch (_) {
      window.location.href = `mailto:${email}`;
    }
  };

  const selectorCards = new Map((publicConfig.selector?.cards || []).map((card) => [card.id, card]));
  const universalCards = (publicConfig.selector?.cardOrder || [])
    .map((id) => selectorCards.get(id))
    .filter(Boolean)
    .map((card) => ({
      ...card,
      label: card.title,
      description: card.shortDescription || card.description || "",
      working: card.locked
        ? (card.lockMessage || "This service is currently unavailable.")
        : (card.detailedDescription || card.working || ""),
      status: card.locked ? "Locked" : (card.status || (card.comingSoon ? "Coming Soon" : "Active")),
      icon: resolveApplicationIcon(card.icon),
      color: `${card.accentColor || "#c62828"}18`,
      ic: card.accentColor || "#c62828",
    }));
  const applicationCards = universalCards.filter((card) => card.enabled === true);
  const journey = (publicConfig.timeline || []).filter((item) => item?.enabled !== false);
  const features = applicationCards;
  const developers = (publicConfig.developers || [])
    .filter((developer) => developer?.enabled === true)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  // Track scroll for sticky nav highlight
  useEffect(() => {
    const handleScroll = () => {
      const sections = NAV_SECTIONS.map(s => ({
        name: s,
        el: document.getElementById(`section-${s.toLowerCase().replace(" ", "-")}`),
      }));
      for (let i = sections.length - 1; i >= 0; i--) {
        if (sections[i].el && sections[i].el.getBoundingClientRect().top <= 120) {
          setActiveNav(sections[i].name);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', sans-serif; background: #fff; -webkit-font-smoothing: antialiased; }
        .garamond { font-family: 'EB Garamond', Georgia, serif; }
        img { display: block; }
        .premium-section { position:relative; isolation:isolate; overflow:hidden; border-top:1px solid rgba(148,163,184,.18); border-bottom:1px solid rgba(148,163,184,.18); box-shadow:0 24px 70px rgba(15,23,42,.035); }
        .premium-section::before { content:""; position:absolute; top:0; left:50%; width:min(72%,860px); height:1px; transform:translateX(-50%); background:linear-gradient(90deg,transparent,rgba(198,40,40,.42),transparent); }
        .premium-section::after { content:""; position:absolute; inset:0; z-index:-1; pointer-events:none; opacity:.25; background-image:radial-gradient(rgba(15,23,42,.12) .55px,transparent .55px); background-size:18px 18px; mask-image:linear-gradient(to bottom,transparent,#000 18%,#000 82%,transparent); }
        .premium-surface { border:1px solid rgba(255,255,255,.75); border-radius:28px; box-shadow:0 24px 70px rgba(15,23,42,.07); backdrop-filter:blur(16px); }
        .about-app-tile { transition:transform .35s cubic-bezier(.22,1,.36,1),box-shadow .35s,border-color .35s; }
        .about-app-tile:hover { transform:translateY(-5px) scale(1.02); border-color:rgba(198,40,40,.22)!important; box-shadow:0 14px 32px rgba(198,40,40,.08); }
        .about-app-tile span:first-child { transition:transform .35s cubic-bezier(.22,1,.36,1); }
        .about-app-tile:hover span:first-child { transform:scale(1.16) rotate(-6deg); }
        .journey-glow { background:radial-gradient(circle at 50% 40%,rgba(198,40,40,.11),transparent 42%),linear-gradient(145deg,#fff 0%,#fff7f7 48%,#f8fafc 100%)!important; }
        .journey-sparkle { position:absolute; width:5px; height:5px; border-radius:50%; background:#ef9a9a; box-shadow:0 0 14px 4px rgba(198,40,40,.2); animation:journeyFloat 7s ease-in-out infinite; }
        @keyframes journeyFloat { 0%,100% { transform:translate3d(0,0,0); opacity:.2 } 50% { transform:translate3d(12px,-28px,0); opacity:.75 } }
        .premium-modal-button { transition:transform .22s,box-shadow .22s,background .22s; }
        .premium-modal-button:hover { transform:translateY(-2px); box-shadow:0 10px 24px rgba(15,23,42,.12); }
        .platform-carousel { margin-top:48px; overflow:hidden; padding:26px 0 4px; }
        .platform-carousel-stage { position:relative; height:310px; display:flex; align-items:flex-start; justify-content:center; touch-action:pan-y; cursor:grab; }
        .platform-carousel-stage:active { cursor:grabbing; }
        .platform-orbit-card { position:absolute; top:20px; width:168px; height:190px; display:grid; place-items:center; overflow:hidden; padding:18px; border:1px solid #e4e7ec; border-radius:28px; background:linear-gradient(145deg,#fff,#f8fafc); box-shadow:0 16px 42px rgba(15,23,42,.1); cursor:pointer; transform-origin:center bottom; }
        .platform-orbit-card.active { border-color:#d0d5dd; box-shadow:0 26px 60px rgba(15,23,42,.16); }
        .platform-orbit-card:disabled { cursor:default; }
        .platform-orbit-card img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .platform-orbit-icon { width:76px; height:76px; display:grid; place-items:center; border-radius:23px; }
        .platform-orbit-soon { position:absolute; right:10px; bottom:10px; padding:4px 8px; border-radius:999px; background:#fef3c7; color:#92400e; font-size:9px; font-weight:700; }
        .platform-carousel-controls { max-width:690px; margin:-10px auto 0; display:grid; grid-template-columns:42px 1fr 42px; align-items:center; gap:20px; }
        .platform-carousel-controls > button { width:42px; height:42px; display:grid; place-items:center; border:1px solid #e4e7ec; border-radius:50%; background:#fff; color:#344054; cursor:pointer; box-shadow:0 6px 18px rgba(15,23,42,.06); transition:transform .2s,box-shadow .2s; }
        .platform-carousel-controls > button:hover { transform:translateY(-2px); box-shadow:0 9px 22px rgba(15,23,42,.11); }
        .platform-active-copy { min-height:86px; text-align:center; }
        .platform-active-copy h3 { color:#101828; font-size:22px; font-weight:700; }
        .platform-active-copy span { padding:4px 8px; border-radius:999px; background:#fef3c7; color:#92400e; font-size:9px; font-weight:700; }
        .platform-active-copy p { max-width:540px; margin:9px auto 0; color:#667085; font-size:13.5px; line-height:1.65; }
        @media(max-width:650px) { .platform-carousel { margin-left:-24px; margin-right:-24px; } .platform-carousel-stage { height:260px; } .platform-orbit-card { width:136px; height:158px; border-radius:23px; } .platform-orbit-icon { width:64px; height:64px; border-radius:19px; } .platform-carousel-controls { grid-template-columns:36px 1fr 36px; gap:9px; padding:0 16px; } .platform-carousel-controls > button { width:36px; height:36px; } .platform-active-copy h3 { font-size:18px; } .platform-active-copy p { font-size:12.5px; } .journey-row { justify-content:flex-end!important; } .journey-card { width:calc(100% - 42px)!important; } .journey-dot { left:10px!important; } .journey-line { left:10px!important; } }
      `}</style>

      <PublicHeader config={publicConfig} onOpen={openItem} applications={universalCards} />

      {/* ══════════════════════════════════════
          HERO — full bleed campus image
      ══════════════════════════════════════ */}
      <div style={{ position: "relative", height: "70vh", minHeight: 480, overflow: "hidden" }}>
        <img
          src="https://ik.imagekit.io/7khjnlfow/email-assets/03_dsyrsv.png"
          alt="Thapar Campus"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,.25) 0%, rgba(0,0,0,.55) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.7)", letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 16 }}>
            Thapar Campus Connect
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25 }}
            className="garamond"
            style={{ fontSize: "clamp(2.4rem,6vw,5rem)", fontWeight: 700, color: "#fff", lineHeight: 1.1, marginBottom: 20, maxWidth: 800 }}>
            One Platform.<br />Every Student Need.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45 }}
            style={{ fontSize: 16, color: "rgba(255,255,255,.85)", maxWidth: 560, lineHeight: 1.7 }}>
            Seamlessly Connected.
          </motion.p>
        </div>
      </div>

      <section className="premium-section" style={{ background: "linear-gradient(180deg,#fff 0%,#f8fafc 100%)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeUp>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#c62828", letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 10 }}>CAMPUS CONNECT APPLICATIONS</p>
            <h2 className="garamond" style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, color: "#111", marginBottom: 12 }}>Everything on campus, connected.</h2>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 20, marginTop: 42 }}>
            {applicationCards.map((app, index) => {
              const Icon = app.icon;
              return <FadeUp key={app.id} delay={index * .06}><button onClick={() => app.locked ? openItem(app) : app.comingSoon || app.status === "Coming Soon" || !app.destination ? setSelectedFeature(app) : openItem(app)} style={{ position: "relative", width: "100%", minHeight: 210, padding: 26, border: "1px solid #e5e7eb", borderRadius: 16, background: "#fff", textAlign: "left", cursor: "pointer", transition: "box-shadow .25s, transform .25s" }} onMouseEnter={(event) => { event.currentTarget.style.boxShadow = "0 10px 34px rgba(0,0,0,.1)"; event.currentTarget.style.transform = "translateY(-4px)"; }} onMouseLeave={(event) => { event.currentTarget.style.boxShadow = "none"; event.currentTarget.style.transform = "none"; }}>{app.locked && <span style={{ position: "absolute", top: 18, right: 18, padding: "4px 9px", borderRadius: 999, background: "#f1f5f9", color: "#475569", fontSize: 10, fontWeight: 700 }}>Locked</span>}{app.image ? <img src={app.image} alt="" style={{ width: "100%", height: 96, objectFit: "cover", borderRadius: 12, marginBottom: 18 }} /> : <div style={{ width: 48, height: 48, display: "grid", placeItems: "center", marginBottom: 20, borderRadius: 14, background: app.color, color: app.ic }}><Icon size={22} /></div>}<h3 style={{ margin: 0, color: "#111", fontSize: 16, fontWeight: 700 }}>{app.title}</h3><p style={{ margin: "10px 0 22px", color: "#6b7280", fontSize: 13, lineHeight: 1.6 }}>{app.description}</p><ArrowRight size={17} color={app.ic} /></button></FadeUp>;
            })}
          </div>
        </div>
      </section>

      {/* Sticky section nav */}
      <StickyNav active={activeNav} />

      {/* ══════════════════════════════════════
          ABOUT — two column (TIET style)
      ══════════════════════════════════════ */}
      <section id="section-about" className="premium-section" style={{ background: "radial-gradient(circle at 10% 20%,rgba(198,40,40,.055),transparent 34%),#fff", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 2fr", gap: 64, alignItems: "flex-start" }}>
          <FadeUp>
            <div>
              <h2 className="garamond" style={{ fontSize: "clamp(3rem,7vw,5.5rem)", fontWeight: 700, color: "#111", lineHeight: 0.95, marginBottom: 20 }}>
                ABOUT
              </h2>
              <p className="garamond" style={{ fontSize: 18, color: "#374151", lineHeight: 1.6, marginBottom: 20 }}>
                Thapar Campus Connect
              </p>
              <div style={{ width: 1, height: 80, background: "#e5e7eb", marginLeft: 2 }} />
            </div>
          </FadeUp>
          <FadeUp delay={0.15}>
            <div>
              <p style={{ fontSize: 15.5, color: "#374151", lineHeight: 1.85, marginBottom: 20 }}>
                Thapar Campus Connect is a unified digital platform designed to simplify student services at Thapar Institute of Engineering &amp; Technology. The platform integrates multiple campus utilities into a single interface, providing a seamless experience for students, faculty, and administration.
              </p>
              <p style={{ fontSize: 15.5, color: "#374151", lineHeight: 1.85, marginBottom: 32 }}>
                From guest room bookings and event venue reservations to night passes and lost &amp; found — every campus service is now just one click away. Built under the DoSA Office, this initiative eliminates paper-based workflows and brings transparency to every student interaction.
              </p>

              {/* icon grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                {[
                  { icon: "📅", label: "Event Calendar" },
                  { icon: "🏨", label: "Guest Room" },
                  { icon: "📍", label: "Venue Booking" },
                  { icon: "🌙", label: "Night Pass" },
                  { icon: "📚", label: "Library Pass" },
                  { icon: "🔎", label: "Lost & Found" },
                ].map(item => (
                  <div key={item.label} className="about-app-tile" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,.82)", borderRadius: 12, border: "1px solid #eef0f3", boxShadow: "0 6px 20px rgba(15,23,42,.035)" }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: "#374151" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══════════════════════════════════════
          WHY — light grey bg, slide-up cards
      ══════════════════════════════════════ */}
      <section id="section-why" className="premium-section" style={{ background: "radial-gradient(circle at 85% 10%,rgba(59,130,246,.08),transparent 31%),linear-gradient(180deg,#f6f8fb,#eef2f7)", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeUp>
            <h2 className="garamond" style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, color: "#111", marginBottom: 48, maxWidth: 600 }}>
              Why Thapar Campus Connect?
            </h2>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, marginBottom: 40 }}>
            {WHY_POINTS.map((pt, i) => (
              <FadeUp key={i} delay={i * 0.08}>
                <motion.div whileHover={{ y: -9, rotate: i % 2 === 0 ? -0.8 : 0.8, scale: 1.015 }} transition={{ type: "spring", stiffness: 280, damping: 20 }} style={{ background: "rgba(255,255,255,.9)", borderRadius: 18, padding: "22px 24px", border: "1px solid rgba(255,255,255,.9)", display: "flex", alignItems: "flex-start", gap: 14, boxShadow: "0 12px 35px rgba(15,23,42,.065)", backdropFilter: "blur(12px)" }}>
                  <motion.div whileHover={{ rotate: 360, scale: 1.12 }} transition={{ duration: .55 }} style={{ width: 30, height: 30, borderRadius: "50%", background: "#fce8e8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 5px rgba(198,40,40,.04)" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#c62828" }}>{i + 1}</span>
                  </motion.div>
                  <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{pt}</p>
                </motion.div>
              </FadeUp>
            ))}
          </div>
          <FadeUp delay={0.4}>
            <div style={{ background: "#c62828", borderRadius: 16, padding: "24px 32px", display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 28 }}>✅</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.75)", marginBottom: 4 }}>The Solution</p>
                <p className="garamond" style={{ fontSize: 22, color: "#fff", fontWeight: 600 }}>
                  A unified digital campus experience — one platform for everything.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="premium-section" style={{ background: "linear-gradient(145deg,#fff,#f7f8fa)", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeUp>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#c62828", letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 12 }}>Platform Showcase</p>
            <h2 className="garamond" style={{ fontSize: "clamp(2.2rem,4.8vw,3.8rem)", fontWeight: 700, color: "#111", lineHeight: 1.08, maxWidth: 760 }}>
              Everything You Need, One Campus Platform
            </h2>
            <p style={{ marginTop: 18, maxWidth: 760, color: "#667085", fontSize: 15, lineHeight: 1.75 }}>
              Access every major Campus Connect application from one unified platform.<br />
              Designed to simplify the digital experience for students, faculty, staff and visitors.
            </p>
          </FadeUp>
          <PlatformCarousel apps={applicationCards} onOpen={openItem} />
        </div>
      </section>

      {/* ══════════════════════════════════════
          OUR JOURNEY
      ══════════════════════════════════════ */}
      <section className="premium-section journey-glow" style={{ padding: "96px 24px" }}>
        {[12, 28, 46, 67, 84].map((left, index) => <span key={left} className="journey-sparkle" style={{ left: `${left}%`, top: `${18 + (index % 3) * 26}%`, animationDelay: `${index * 1.1}s` }} />)}
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeUp>
            <h2 className="garamond" style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 700, color: "#111", marginBottom: 48, textAlign: "center" }}>
              Our Journey
            </h2>
          </FadeUp>
          <div style={{ position: "relative" }}>
            {/* line */}
            <div className="journey-line" style={{ position: "absolute", left: "50%", top: 24, bottom: 24, width: 3, background: "rgba(198,40,40,.12)", transform: "translateX(-50%)", borderRadius: 99 }} />
            <motion.div className="journey-line" initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true, amount: .15 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} style={{ position: "absolute", left: "50%", top: 24, bottom: 24, width: 3, background: "linear-gradient(to top,#c62828,#ef9a9a)", transform: "translateX(-50%)", transformOrigin: "bottom", borderRadius: 99, boxShadow: "0 0 20px rgba(198,40,40,.45)" }} />
            {journey.map((t, i) => (
              <FadeUp key={t.id || `${t.year}-${i}`} delay={i * 0.1}>
                <div className="journey-row" style={{ display: "flex", justifyContent: i % 2 === 0 ? "flex-start" : "flex-end", marginBottom: 32, position: "relative" }}>
                  {/* dot */}
                  <motion.div className="journey-dot" whileInView={{ scale: [1, 1.35, 1.1] }} viewport={{ once: true }} transition={{ duration: .65, delay: i * .12 }} style={{ position: "absolute", left: "50%", top: 20, transform: "translateX(-50%)", width: 14, height: 14, borderRadius: "50%", background: "#c62828", border: "3px solid #fff", boxShadow: "0 0 0 2px #c62828,0 0 22px rgba(198,40,40,.5)", zIndex: 1 }} />
                  <motion.div className="journey-card" whileHover={{ scale: 1.035, y: -4 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} style={{ width: "44%", background: "rgba(255,255,255,.78)", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(255,255,255,.9)", boxShadow: "0 14px 38px rgba(15,23,42,.08)", backdropFilter: "blur(14px)" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#c62828", letterSpacing: ".1em", marginBottom: 6 }}>{t.year}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 4 }}>{t.title || t.label}</p>
                    <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{t.description || t.desc}</p>
                  </motion.div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          VISION / MISSION / VALUES (TIET style)
      ══════════════════════════════════════ */}
      <section id="section-vision" className="premium-section" style={{ background: "linear-gradient(135deg,#f3f5ef,#eef2f4)", padding: "0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {/* Left: Mission + Vision */}
          <div style={{ padding: "72px 48px 72px 24px", borderRight: "1px solid #e5e7eb" }}>
            <FadeUp>
              <div style={{ marginBottom: 64 }}>
                <h2 className="garamond" style={{ fontSize: "2.2rem", fontWeight: 700, color: "#111", marginBottom: 24, letterSpacing: "-.01em" }}>
                  MISSION
                </h2>
                <div style={{ display: "flex", gap: 20 }}>
                  <p style={{ fontSize: 14.5, color: "#374151", lineHeight: 1.8, flex: 1 }}>
                    Digitize student services at TIET and improve accessibility, transparency, and efficiency across all campus operations.
                  </p>
                  <div style={{ fontSize: 48, opacity: 0.25, flexShrink: 0 }}>💡</div>
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={0.15}>
              <div>
                <h2 className="garamond" style={{ fontSize: "2.2rem", fontWeight: 700, color: "#111", marginBottom: 24 }}>
                  VISION
                </h2>
                <div style={{ display: "flex", gap: 20 }}>
                  <p style={{ fontSize: 14.5, color: "#374151", lineHeight: 1.8, flex: 1 }}>
                    Build a unified digital ecosystem that connects every campus service — from administration to student life — into a single seamless platform.
                  </p>
                  <div style={{ fontSize: 48, opacity: 0.25, flexShrink: 0 }}>🏔️</div>
                </div>
              </div>
            </FadeUp>
          </div>

          {/* Right: Core Values */}
          <div style={{ padding: "72px 24px 72px 48px" }}>
            <FadeUp>
              <h2 className="garamond" style={{ fontSize: "2.8rem", fontWeight: 700, color: "#111", lineHeight: 1, marginBottom: 40 }}>
                OUR CORE VALUES
              </h2>
            </FadeUp>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
              {VALUES.map((v, i) => {
                const Icon = v.icon;
                return (
                  <FadeUp key={v.label} delay={i * 0.07}>
                    <div>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(198,40,40,.08)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                        <Icon size={18} color="#c62828" />
                      </div>
                      <p style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 6 }}>{v.label}</p>
                      <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.65 }}>{v.desc}</p>
                    </div>
                  </FadeUp>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          LEADERSHIP — Dr. Meenakshi Rana
          (Exact TIET "From our Vice Chancellor" layout)
      ══════════════════════════════════════ */}
      <section id="section-leadership" className="premium-section" style={{ background: "radial-gradient(circle at 85% 35%,rgba(198,40,40,.06),transparent 30%),#fff", padding: "0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeUp>
            <h2 className="garamond" style={{ fontSize: "clamp(1.6rem,3vw,2.4rem)", fontWeight: 700, color: "#111", textAlign: "center", padding: "60px 24px 0", letterSpacing: ".04em", textTransform: "uppercase" }}>
              Inspired by Leadership
            </h2>
          </FadeUp>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 500 }}>
            {/* Left: photo — large, flush */}
            <motion.div
              initial={{ opacity: 0, scale: 1.04 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ overflow: "hidden" }}
            >
              <img
                src="https://ik.imagekit.io/7khjnlfow/email-assets/Dr.MR.JPG"
                alt="Dr. Meenakshi Rana"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", minHeight: 480 }}
              />
            </motion.div>

            {/* Right: content */}
            <FadeUp delay={0.2}>
              <div style={{ padding: "60px 48px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#c62828", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 16 }}>
                  Inspired by the Vision
                </p>
                <h2 className="garamond" style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 700, color: "#111", marginBottom: 8, lineHeight: 1.2 }}>
                  Dr. Meenakshi Rana
                </h2>
                <p style={{ fontSize: 15, color: "#6b7280", marginBottom: 32, fontWeight: 500 }}>
                  Dean of Student Affairs<br />
                  Thapar Institute of Engineering &amp; Technology
                </p>

                {/* Quote block */}
                <div style={{ borderLeft: "3px solid #c62828", paddingLeft: 24, marginBottom: 28 }}>
                  <p className="garamond" style={{ fontSize: 18, color: "#111", lineHeight: 1.75, fontStyle: "italic" }}>
                    "Thapar Campus Connect was envisioned to simplify student access to campus services and create a seamless digital ecosystem for the entire Thapar community."
                  </p>
                </div>

                <p style={{ fontSize: 14.5, color: "#4b5563", lineHeight: 1.8 }}>
                  Under her guidance, this initiative was transformed into a scalable platform connecting students, administration, and campus services — eliminating paperwork and bringing transparency to every student interaction.
                </p>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES GRID
      ══════════════════════════════════════ */}
      <section id="section-features" className="premium-section" style={{ background: "linear-gradient(160deg,#f8fafc,#eef2f7)", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeUp>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#c62828", letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 10 }}>
              WHAT WE PROVIDE
            </p>
            <h2 className="garamond" style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, color: "#111", marginBottom: 48 }}>
              Platform Features
            </h2>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeUp key={f.label} delay={i * 0.07}>
                  <div
                    onClick={() => {
                      if (f.locked) {
                        openItem(f);
                      } else if (f.comingSoon || !f.destination) {
                        setSelectedFeature(f);
                      } else {
                        openItem(f);
                      }
                    }}
                    style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "28px 24px", cursor: "pointer", transition: "box-shadow .25s, transform .25s" }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,.1)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
                  >
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: f.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                      <Icon size={22} color={f.ic} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "#111" }}>{f.label}</h3>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                        background: f.status === "Locked" ? "#f1f5f9" : f.status !== "Coming Soon" ? "#f0fdf4" : "#fef3c7",
                        color: f.status === "Locked" ? "#475569" : f.status !== "Coming Soon" ? "#15803d" : "#92400e",
                        border: `1px solid ${f.status === "Locked" ? "#cbd5e1" : f.status !== "Coming Soon" ? "#86efac" : "#fde68a"}`,
                      }}>
                        {f.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.65, marginBottom: 16 }}>
                      {f.description}
                    </p>
                    <button onClick={(event) => { event.stopPropagation(); setSelectedFeature(f); }} style={{ width: "100%", padding: "8px 12px", background: "#64748b", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Learn More
                    </button>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          DEVELOPER CARDS
      ══════════════════════════════════════ */}
      <section id="section-team" className="premium-section" style={{ background: "radial-gradient(circle at 50% 0%,rgba(198,40,40,.07),transparent 30%),#fff", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeUp>
            <h2 className="garamond" style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, color: "#111", marginBottom: 12 }}>
              Built With Dedication By
            </h2>
            <p style={{ fontSize: "clamp(12px,1.25vw,14.5px)", color: "#6b7280", marginBottom: 18, lineHeight: 1.7, whiteSpace: "nowrap" }}>
              A passionate team of developers and strategists working under the DoSA Office, TIET.
            </p>
            <motion.button
              type="button"
              onClick={() => setDevelopersOpen((open) => !open)}
              whileHover={{ scale: 1.035, y: -2 }}
              whileTap={{ scale: .98 }}
              className="premium-modal-button"
              aria-expanded={developersOpen}
              style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 52, padding: "11px 17px", borderRadius: 999, border: "1px solid rgba(198,40,40,.18)", background: "rgba(255,255,255,.8)", color: "#c62828", fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer", boxShadow: "0 8px 26px rgba(198,40,40,.08)", backdropFilter: "blur(12px)" }}
            >
              <Users size={15} /> Meet the Developers
              <ChevronDown size={15} style={{ transform: developersOpen ? "rotate(180deg)" : "none", transition: "transform .3s" }} />
            </motion.button>
          </FadeUp>

          <AnimatePresence initial={false}>
            {developersOpen && (
              <motion.div
                key="developers-grid"
                initial={{ height: 0, opacity: 0, y: -16 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -16 }}
                transition={{ duration: .65, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24, paddingTop: 6 }}>
                  {developers.map((dev, i) => (
              <FadeUp key={dev.id || dev.name} delay={i * 0.08}>
                <div
                  style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb", overflow: "hidden", transition: "box-shadow .25s, transform .25s" }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,.1)"; e.currentTarget.style.transform = "translateY(-5px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
                >
                  {/* photo strip */}
                  <div style={{ height: 280, overflow: "hidden", position: "relative", background: "#f3f4f6" }}>
                    <img
                      src={dev.photo}
                      alt={dev.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%", filter: "grayscale(20%)", transition: "filter .3s, transform .3s" }}
                      onMouseEnter={e => { e.currentTarget.style.filter = "grayscale(0%)"; e.currentTarget.style.transform = "scale(1.04)"; }}
                      onMouseLeave={e => { e.currentTarget.style.filter = "grayscale(20%)"; e.currentTarget.style.transform = "scale(1)"; }}
                    />
                    <span style={{ position: "absolute", top: 12, right: 12, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "#fce8e8", color: "#c62828", border: "1px solid #c6282830" }}>
                      {dev.role}
                    </span>
                  </div>

                  {/* content */}
                  <div style={{ padding: "22px 22px 20px", display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111", marginBottom: 4 }}>{dev.name}</h3>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#c62828", marginBottom: 2 }}>{dev.role}</p>
                    {dev.description && <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>{dev.description}</p>}
                    {(dev.tags || []).length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
                        {dev.tags.map((tag) => <span key={tag} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#f3f4f6", color: "#374151", fontWeight: 500 }}>{tag}</span>)}
                      </div>
                    )}

                    {/* work */}
                    <div style={{ flex: 1 }}>
                      {dev.contribution && (
                        <div style={{ padding: "12px 14px", borderRadius: 8, background: "#fafafa", borderLeft: "3px solid #c62828", marginBottom: 16 }}>
                          <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}>{dev.contribution}</p>
                        </div>
                      )}
                    </div>

                    {/* links */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {dev.linkedin && <a href={dev.linkedin} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "#0077b5", color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
                        <Linkedin size={13} /> LinkedIn
                      </a>}
                      {dev.github && <a href={dev.github} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 12px", borderRadius: 8, background: "#111", color: "#fff", fontSize: 12, textDecoration: "none" }}>GitHub</a>}
                      {dev.portfolio && <a href={dev.portfolio} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", color: "#374151", fontSize: 12, textDecoration: "none" }}>Portfolio</a>}
                      {dev.email && <a href={`mailto:${dev.email}`} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", color: "#374151", fontSize: 12, textDecoration: "none" }}>Email</a>}
                    </div>
                  </div>
                </div>
              </FadeUp>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feature Modal */}
        </div>
      </section>

      <AnimatePresence>
        {supportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSupportModal(null)}
            role="presentation"
            style={{ position: "fixed", inset: 0, zIndex: 1100, display: "grid", placeItems: "center", padding: 20, background: "rgba(15,23,42,.55)", backdropFilter: "blur(12px)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 28, scale: .95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: .97 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="support-modal-title"
              style={{ position: "relative", width: "min(100%,540px)", padding: "34px", border: "1px solid rgba(255,255,255,.85)", borderRadius: 26, background: "linear-gradient(145deg,rgba(255,255,255,.98),rgba(248,250,252,.96))", boxShadow: "0 30px 90px rgba(15,23,42,.28)", overflow: "hidden" }}
            >
              <div style={{ position: "absolute", width: 180, height: 180, top: -100, right: -70, borderRadius: "50%", background: "rgba(198,40,40,.09)", filter: "blur(8px)" }} />
              <button type="button" onClick={() => setSupportModal(null)} aria-label="Close support popup" className="premium-modal-button" style={{ position: "absolute", top: 18, right: 18, width: 36, height: 36, display: "grid", placeItems: "center", border: "1px solid #e2e8f0", borderRadius: "50%", background: "#fff", color: "#475569", cursor: "pointer" }}>✕</button>

              {supportModal === "q1" ? (
                <>
                  <div style={{ width: 52, height: 52, display: "grid", placeItems: "center", marginBottom: 20, borderRadius: 16, background: "#fce8e8", color: "#c62828" }}><Mail size={24} /></div>
                  <h2 id="support-modal-title" className="garamond" style={{ marginBottom: 24, color: "#111827", fontSize: 30 }}>Queries</h2>
                  {[
                    ["For any general queries, kindly email us at:", "dosa.office@thapar.edu"],
                    ["For technical support, kindly email:", "itmh@thapar.edu"],
                  ].map(([label, email]) => (
                    <div key={email} style={{ marginTop: 14, padding: "17px 18px", border: "1px solid #e5e7eb", borderRadius: 16, background: "rgba(255,255,255,.82)", boxShadow: "0 8px 24px rgba(15,23,42,.045)" }}>
                      <p style={{ marginBottom: 8, color: "#64748b", fontSize: 13, lineHeight: 1.55 }}>{label}</p>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <a href={`mailto:${email}`} style={{ color: "#c62828", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>{email}</a>
                        <button type="button" onClick={() => copySupportEmail(email)} className="premium-modal-button" aria-label={`Copy ${email}`} style={{ width: 38, height: 38, display: "grid", placeItems: "center", border: "1px solid #e2e8f0", borderRadius: 11, background: "#fff", color: copiedEmail === email ? "#15803d" : "#475569", cursor: "pointer" }}>{copiedEmail === email ? <Check size={16} /> : <Copy size={16} />}</button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div style={{ width: 52, height: 52, display: "grid", placeItems: "center", marginBottom: 20, borderRadius: 16, background: "#fce8e8", color: "#c62828" }}><Landmark size={25} /></div>
                  <h2 id="support-modal-title" className="garamond" style={{ marginBottom: 24, color: "#111827", fontSize: 30 }}>Reach Out To Us</h2>
                  <div style={{ padding: "22px", border: "1px solid #e5e7eb", borderRadius: 18, background: "rgba(255,255,255,.84)", boxShadow: "0 10px 30px rgba(15,23,42,.055)" }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}><Landmark size={20} color="#c62828" /><div><strong style={{ color: "#111827", fontSize: 15 }}>DoSA Office</strong><p style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>Thapar Institute of Engineering &amp; Technology</p></div></div>
                    <div style={{ height: 1, margin: "20px 0", background: "#e5e7eb" }} />
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}><Clock3 size={20} color="#c62828" /><div><strong style={{ color: "#111827", fontSize: 15 }}>Timings</strong><p style={{ marginTop: 4, color: "#64748b", fontSize: 13, lineHeight: 1.7 }}>Monday – Friday<br />9:00 AM – 5:30 PM</p></div></div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          FEATURE MODAL
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {selectedFeature && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFeature(null)}
              style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(0,0,0,.5)", backdropFilter: "blur(4px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 1000, padding: 16
              }}
            >
              {/* Modal Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                style={{
                  background: "#fff", borderRadius: 20, maxWidth: 500, width: "100%",
                  boxShadow: "0 20px 60px rgba(0,0,0,.15)", overflow: "hidden"
                }}
              >
                {/* Header */}
                <div style={{ padding: "32px 28px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: selectedFeature.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <selectedFeature.icon size={24} color={selectedFeature.ic} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111", margin: 0 }}>{selectedFeature.label}</h2>
                        <span style={{
                          display: "inline-block", marginTop: 4, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                          background: selectedFeature.status === "Locked" ? "#f1f5f9" : selectedFeature.status !== "Coming Soon" ? "#f0fdf4" : "#fef3c7",
                          color: selectedFeature.status === "Locked" ? "#475569" : selectedFeature.status !== "Coming Soon" ? "#15803d" : "#92400e",
                          border: `1px solid ${selectedFeature.status === "Locked" ? "#cbd5e1" : selectedFeature.status !== "Coming Soon" ? "#86efac" : "#fde68a"}`,
                        }}>
                          {selectedFeature.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedFeature(null)} style={{ background: "none", border: "none", fontSize: 24, color: "#9ca3af", cursor: "pointer", padding: 0 }}>
                    ✕
                  </button>
                </div>

                {/* Body */}
                <div style={{ padding: "24px 28px" }}>
                  {selectedFeature.status !== "Locked" && (
                    <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, marginBottom: 16 }}>
                      {selectedFeature.description || (selectedFeature.status !== "Coming Soon" ? "Fully operational and available to all students." : "Under development — launching soon.")}
                    </p>
                  )}
                  <div style={{ padding: "16px 14px", borderRadius: 12, background: "#f9fafb", borderLeft: `3px solid ${selectedFeature.ic}` }}>
                    <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
                      <strong>{selectedFeature.status === "Locked" ? "Notice:" : "Working:"}</strong> {selectedFeature.working}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: "16px 28px", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>
                  <button onClick={() => setSelectedFeature(null)} style={{ padding: "8px 20px", background: selectedFeature.ic, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CampusFeedbackSection />
      <PublicQuickLinks config={publicConfig} onOpen={openItem} />
      <PublicPageWidgets hideFooter />
    </>
  );
}
