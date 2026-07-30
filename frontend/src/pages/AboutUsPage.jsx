import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Building2, LogIn,
  Target,
  Eye, Heart, Zap, Users, CheckCircle, Linkedin, Home, Package, MessageSquare, ChevronDown,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import {
  DEFAULT_PUBLIC_UI_CONFIG,
  fetchPublicUiConfig,
  normalizePublicUiConfig,
} from "../utils/publicUiConfig";

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

function PublicHeader({ config, onOpen }) {
  const header = config.header || DEFAULT_PUBLIC_UI_CONFIG.header;
  const navigation = [...(config.navigation || [])].filter((item) => item?.enabled !== false).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
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
        <a href={header.loginDestination || "/login"} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 6, background: "#c62828", color: "#fff", textDecoration: "none", fontSize: 12.5, fontWeight: 600 }}><LogIn size={13} />{header.loginText || "Admin Login"}</a>
      </div>
    </header>
  );
}

function PublicQuickLinks({ config, onOpen }) {
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
        <span>{footer.copyright}</span>
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
export default function AboutUsPage() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState("About");
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [publicConfig, setPublicConfig] = useState(() => normalizePublicUiConfig(DEFAULT_PUBLIC_UI_CONFIG));

  useEffect(() => {
    fetchPublicUiConfig().then(setPublicConfig).catch(() => {});
  }, []);

  const openItem = (item) => {
    const destination = item?.destination || item?.href;
    if (destination?.startsWith("/")) navigate(destination);
    else if (/^https?:\/\//i.test(destination || "")) window.open(destination, "_blank", "noopener,noreferrer");
    else if (item?.action === "home" || item?.action === "about") window.scrollTo({ top: 0, behavior: "smooth" });
    else if (item?.action === "community") navigate("/community-feedback");
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

  const selectorCards = new Map((publicConfig.selector?.cards || []).map((card) => [card.id, card]));
  const applicationCards = (publicConfig.selector?.cardOrder || [])
    .map((id) => selectorCards.get(id))
    .filter((card) => card?.enabled === true)
    .map((card) => ({
      ...card,
      label: card.title,
      description: card.shortDescription || card.description || "",
      working: card.detailedDescription || card.working || "",
      status: card.status || (card.comingSoon ? "Coming Soon" : "Active"),
      icon: resolveApplicationIcon(card.icon),
      color: `${card.accentColor || "#c62828"}18`,
      ic: card.accentColor || "#c62828",
    }));
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
        .about-public-header { max-width:1280px; min-height:96px; margin:0 auto; padding:0 24px; display:flex; align-items:center; justify-content:space-between; gap:18px; }
        .about-public-nav { display:flex; align-items:center; justify-content:center; gap:24px; flex:1; }
        .about-footer-grid { max-width:1040px; margin:0 auto; padding:48px 24px 40px; display:grid; grid-template-columns:1fr 1fr; gap:64px; }
        .about-footer-links-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px 28px; }
        .about-footer-link { display:flex; align-items:center; gap:9px; padding:8px 0; border:0; background:none; color:#4b5563; cursor:pointer; font-family:inherit; font-size:14px; }
        @media(max-width:900px) { .about-public-nav { display:none; } }
        @media(max-width:650px) { .about-public-header { min-height:auto; padding:12px 16px; align-items:flex-start; flex-wrap:wrap; } .about-footer-grid { grid-template-columns:1fr; gap:34px; } .about-footer-links-grid { grid-template-columns:1fr; gap:4px; } }
      `}</style>

      <PublicHeader config={publicConfig} onOpen={openItem} />

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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.6 }}
            style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap", justifyContent: "center" }}>
            <a href="#section-features"
              style={{ padding: "12px 28px", borderRadius: 8, background: "#c62828", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", border: "none" }}>
              Explore Features
            </a>
            <a href="#section-team"
              style={{ padding: "12px 28px", borderRadius: 8, background: "rgba(255,255,255,.15)", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", border: "1px solid rgba(255,255,255,.4)", backdropFilter: "blur(8px)" }}>
              Meet Developers
            </a>
          </motion.div>
        </div>
      </div>

      <section style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeUp>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#c62828", letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 10 }}>CAMPUS CONNECT APPLICATIONS</p>
            <h2 className="garamond" style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, color: "#111", marginBottom: 12 }}>Everything on campus, connected.</h2>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 20, marginTop: 42 }}>
            {applicationCards.map((app, index) => {
              const Icon = app.icon;
              return <FadeUp key={app.id} delay={index * .06}><button onClick={() => app.comingSoon || app.status === "Coming Soon" || !app.destination ? setSelectedFeature(app) : openItem(app)} style={{ width: "100%", minHeight: 210, padding: 26, border: "1px solid #e5e7eb", borderRadius: 16, background: "#fff", textAlign: "left", cursor: "pointer", transition: "box-shadow .25s, transform .25s" }} onMouseEnter={(event) => { event.currentTarget.style.boxShadow = "0 10px 34px rgba(0,0,0,.1)"; event.currentTarget.style.transform = "translateY(-4px)"; }} onMouseLeave={(event) => { event.currentTarget.style.boxShadow = "none"; event.currentTarget.style.transform = "none"; }}>{app.image ? <img src={app.image} alt="" style={{ width: "100%", height: 96, objectFit: "cover", borderRadius: 12, marginBottom: 18 }} /> : <div style={{ width: 48, height: 48, display: "grid", placeItems: "center", marginBottom: 20, borderRadius: 14, background: app.color, color: app.ic }}><Icon size={22} /></div>}<h3 style={{ margin: 0, color: "#111", fontSize: 16, fontWeight: 700 }}>{app.title}</h3><p style={{ margin: "10px 0 22px", color: "#6b7280", fontSize: 13, lineHeight: 1.6 }}>{app.description}</p><ArrowRight size={17} color={app.ic} /></button></FadeUp>;
            })}
          </div>
        </div>
      </section>

      {/* Sticky section nav */}
      <StickyNav active={activeNav} />

      {/* ══════════════════════════════════════
          ABOUT — two column (TIET style)
      ══════════════════════════════════════ */}
      <section id="section-about" style={{ background: "#fff", padding: "80px 24px" }}>
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
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
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
      <section id="section-why" style={{ background: "#f9fafb", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeUp>
            <h2 className="garamond" style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, color: "#111", marginBottom: 48, maxWidth: 600 }}>
              Why Thapar Campus Connect?
            </h2>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, marginBottom: 40 }}>
            {WHY_POINTS.map((pt, i) => (
              <FadeUp key={i} delay={i * 0.08}>
                <div style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", border: "1px solid #e5e7eb", display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#fce8e8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#c62828" }}>{i + 1}</span>
                  </div>
                  <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{pt}</p>
                </div>
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

      {/* ══════════════════════════════════════
          OUR JOURNEY
      ══════════════════════════════════════ */}
      <section style={{ background: "#fff", padding: "72px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeUp>
            <h2 className="garamond" style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 700, color: "#111", marginBottom: 48, textAlign: "center" }}>
              Our Journey
            </h2>
          </FadeUp>
          <div style={{ position: "relative" }}>
            {/* line */}
            <div style={{ position: "absolute", left: "50%", top: 24, bottom: 24, width: 1, background: "#e5e7eb", transform: "translateX(-50%)" }} />
            {journey.map((t, i) => (
              <FadeUp key={t.id || `${t.year}-${i}`} delay={i * 0.1}>
                <div style={{ display: "flex", justifyContent: i % 2 === 0 ? "flex-start" : "flex-end", marginBottom: 32, position: "relative" }}>
                  {/* dot */}
                  <div style={{ position: "absolute", left: "50%", top: 20, transform: "translateX(-50%)", width: 14, height: 14, borderRadius: "50%", background: "#c62828", border: "3px solid #fff", boxShadow: "0 0 0 2px #c62828", zIndex: 1 }} />
                  <div style={{ width: "44%", background: "#f9fafb", borderRadius: 12, padding: "18px 22px", border: "1px solid #e5e7eb" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#c62828", letterSpacing: ".1em", marginBottom: 6 }}>{t.year}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 4 }}>{t.title || t.label}</p>
                    <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{t.description || t.desc}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          VISION / MISSION / VALUES (TIET style)
      ══════════════════════════════════════ */}
      <section id="section-vision" style={{ background: "#f4f5f0", padding: "0" }}>
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
      <section id="section-leadership" style={{ background: "#fff", padding: "0" }}>
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
      <section id="section-features" style={{ background: "#f9fafb", padding: "80px 24px" }}>
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
                      if (f.comingSoon || !f.destination) {
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
                        background: f.status !== "Coming Soon" ? "#f0fdf4" : "#fef3c7",
                        color: f.status !== "Coming Soon" ? "#15803d" : "#92400e",
                        border: `1px solid ${f.status !== "Coming Soon" ? "#86efac" : "#fde68a"}`,
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
      <section id="section-team" style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeUp>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#c62828", letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 10 }}>
              THE DEVELOPERS TEAM
            </p>
            <h2 className="garamond" style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, color: "#111", marginBottom: 12 }}>
              Built With Dedication By
            </h2>
            <p style={{ fontSize: 14.5, color: "#6b7280", marginBottom: 52, maxWidth: 540, lineHeight: 1.7 }}>
              A passionate team of developers and strategists working under the DoSA Office, TIET.
            </p>
          </FadeUp>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24 }}>
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

          {/* Feature Modal */}
        </div>
      </section>

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
                          background: selectedFeature.status !== "Coming Soon" ? "#f0fdf4" : "#fef3c7",
                          color: selectedFeature.status !== "Coming Soon" ? "#15803d" : "#92400e",
                          border: `1px solid ${selectedFeature.status !== "Coming Soon" ? "#86efac" : "#fde68a"}`,
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
                  <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, marginBottom: 16 }}>
                    {selectedFeature.description || (selectedFeature.status !== "Coming Soon" ? "Fully operational and available to all students." : "Under development — launching soon.")}
                  </p>
                  <div style={{ padding: "16px 14px", borderRadius: 12, background: "#f9fafb", borderLeft: `3px solid ${selectedFeature.ic}` }}>
                    <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
                      <strong>Working:</strong> {selectedFeature.working}
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

      <PublicQuickLinks config={publicConfig} onOpen={openItem} />
    </>
  );
}
