import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Github, Calendar, Building2,
  Moon, BookOpen, Search, Sparkles, Target,
  Eye, Heart, Zap, Users, CheckCircle, Clock, Linkedin,
} from "lucide-react";

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
const FEATURES = [
  { icon: Building2, label: "Guest Room Booking",   status: "Live",         color: "#fce8e8", ic: "#c62828", working: "[Feature working description coming soon]" },
  { icon: Calendar,  label: "Event Venue Booking",  status: "Live",         color: "#e3eeff", ic: "#1a56db", working: "[Feature working description coming soon]" },
  { icon: BookOpen,  label: "Event Calendar",       status: "Live",         color: "#e6f9f0", ic: "#0d7a4e", working: "[Feature working description coming soon]" },
  { icon: Moon,      label: "Library Night Pass",   status: "Live",         color: "#f0ecff", ic: "#6d28d9", working: "[Feature working description coming soon]" },
  { icon: Sparkles,  label: "Society Night Pass",   status: "Coming Soon",  color: "#fff8e1", ic: "#b45309", working: "[Feature working description coming soon]" },
  { icon: Search,    label: "Lost & Found",         status: "Live",         color: "#fff3e0", ic: "#c2410c", working: "[Feature working description coming soon]" },
];

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

const COUNTERS = [
  { value: 6, label: "Modules", suffix: "" },
  { value: 12000, label: "Students Served", suffix: "+" },
  { value: 5, label: "Departments", suffix: "" },
  { value: 1, label: "Platform", suffix: "" },
];

const TIMELINE = [
  { year: "Oct 2025", label: "Idea",         desc: "Conceptualized by Dr. Meenakshi Rana, DoSA" },
  { year: "Nov 2025", label: "Development",  desc: "Core team assembled, tech stack finalized" },
  { year: "Jan 2026", label: "Testing",      desc: "Beta launched with Guest Room & Venue modules" },
  { year: "Feb 2026", label: "Launch",       desc: "Full platform live with 6 integrated services" },
];

const DEVELOPERS = [
  {
    name: "Navjot Sharma",
    role: "Lead Full Stack Developer",
    sub: "Associate IT, DoSA Office",
    photo: "https://ik.imagekit.io/7khjnlfow/email-assets/ChatGPT%20Image%20Mar%2013,%202026,%2002_52_10%20AM.png?updatedAt=1773433334832",
    linkedin: "https://www.linkedin.com/in/navjot-sharma-0bb7143b1",
    github: "https://github.com/navjotsharma5500",
    modules: ["Guest Room Booking", "Event Venue Booking", "Event Calendar", "Library Night Pass"],
    work: "Architected and developed the core backend infrastructure for the platform, including API design, database schema, and integration with frontend components. Led the development of the Guest Room Booking and Event Venue Booking modules, ensuring secure authentication and smooth user experience across all services.",
    tag: "Solopreneur",
    tagColor: "#c62828",
    tagBg: "#fce8e8",
  },
  {
    name: "Aman Kapoor",
    role: "Core Developer",
    sub: "AIML, 2nd Year",
    photo: "https://ik.imagekit.io/7khjnlfow/email-assets/1725703687306.jpg?updatedAt=1773176346179",
    linkedin: "https://www.linkedin.com/in/aman-kapoor201/",
    modules: ["Library Night Pass"],
    work: "Implemented the backend architecture for the Library Night Pass module, including API endpoints, database schema, and integration with the frontend. Ensured secure authentication and smooth user experience.",
    tag: "Core Dev",
    tagColor: "#1a56db",
    tagBg: "#e3eeff",
  },
  {
    name: "Sagarika Wankhede",
    role: "Frontend Developer",
    sub: "COE, 2nd Year",
    photo: "https://ik.imagekit.io/7khjnlfow/email-assets/1753485244517.jpg?updatedAt=1773176346191",
    linkedin: "https://www.linkedin.com/in/sagarikawankhede/",
    modules: ["Library Night Pass"],
    work: "Designed and implemented the user interface for the Library Night Pass module, ensuring a seamless experience for students applying for overnight study access.",
    tag: "Frontend",
    tagColor: "#0d7a4e",
    tagBg: "#e6f9f0",
  },
  {
    name: "Surya Kant Tiwari",
    role: "Lost & Found Lead Dev",
    sub: "COE, 3rd Year",
    photo: "https://ik.imagekit.io/7khjnlfow/email-assets/157281664.png",
    linkedin: "https://www.linkedin.com/in/surya-kant-tiwari-0707a52a9/",
    github: "https://github.com/navjotsharma5500/softwareProject",
    modules: ["Lost & Found Portal"],
    work: "Led the development of the Lost & Found portal, implementing features for reporting lost items, browsing found item listings, and managing the claim and handover process.",
    tag: "Module Lead",
    tagColor: "#c2410c",
    tagBg: "#fff3e0",
  },
  {
    name: "Akshat Kakkar",
    role: "Product & Strategy Lead",
    sub: "COE, 3rd Year",
    photo: "https://ik.imagekit.io/7khjnlfow/email-assets/215835845.jpg",
    linkedin: "https://www.linkedin.com/in/akshat-kakkar-452b13342/",
    modules: ["Lost & Found Portal"],
    work: "Led the product strategy and UX research for the platform, ensuring a user-centric approach to feature development.",
    tag: "Product",
    tagColor: "#6d28d9",
    tagBg: "#f0ecff",
  },
];

const COMING_SOON = [
  { icon: "🎓", label: "Society Night Pass",       desc: "Late-night permissions for student societies" },
  { icon: "📝", label: "Campus Complaint Portal",  desc: "Raise and track campus complaints digitally" },
  { icon: "📋", label: "Student Request System",   desc: "Any student request, processed instantly" },
  { icon: "📸", label: "Main Gate Management",  desc: "Automated gate entry with facial recognition" },
  { icon: "🏛️", label: "Hostel Allotment",       desc: "Hostel room allocation and management" },
  { icon: "🪪", label: "Feedback System",  desc: "Provide feedback about the Hostel" },
];

/* ─────────────────────────────────────────
   ANIMATED COUNTER
───────────────────────────────────────── */
function Counter({ value, suffix, label }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1800;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <div ref={ref} style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: "clamp(2.4rem,5vw,3.8rem)", fontWeight: 700, color: "#111", lineHeight: 1 }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6, fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   STICKY NAV
───────────────────────────────────────── */
const NAV_SECTIONS = ["About", "Why", "Vision", "Leadership", "Features", "Team", "Coming Soon"];

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
      `}</style>

      {/* ══════════════════════════════════════
          TOP NAVBAR (logo + back)
      ══════════════════════════════════════ */}
      <header style={{ position: "sticky", top: 0, zIndex: 300, background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744" alt="Thapar" style={{ height: 40, width: "auto", objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#111", lineHeight: 1.2 }}>THAPAR INSTITUTE OF</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#111", lineHeight: 1.2 }}>ENGINEERING &amp; TECHNOLOGY</div>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#374151", fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#c62828"; e.currentTarget.style.color = "#c62828"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#374151"; }}
          >
            <ArrowLeft size={14} /> Back to Portal
          </button>
        </div>
      </header>

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
          COUNTERS
      ══════════════════════════════════════ */}
      <section style={{ background: "#b3b3b3", padding: "60px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 32 }}>
          {COUNTERS.map(c => (
            <div key={c.label} style={{ color: "#ffffff" }}>
              <Counter value={c.value} suffix={c.suffix} label={c.label} />
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          WHY — light grey bg, slide-up cards
      ══════════════════════════════════════ */}
      <section id="section-why" style={{ background: "#f9fafb", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeUp>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#c62828", letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 12 }}>
              THE PROBLEM
            </p>
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
          TIMELINE
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
            {TIMELINE.map((t, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div style={{ display: "flex", justifyContent: i % 2 === 0 ? "flex-start" : "flex-end", marginBottom: 32, position: "relative" }}>
                  {/* dot */}
                  <div style={{ position: "absolute", left: "50%", top: 20, transform: "translateX(-50%)", width: 14, height: 14, borderRadius: "50%", background: "#c62828", border: "3px solid #fff", boxShadow: "0 0 0 2px #c62828", zIndex: 1 }} />
                  <div style={{ width: "44%", background: "#f9fafb", borderRadius: 12, padding: "18px 22px", border: "1px solid #e5e7eb" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#c62828", letterSpacing: ".1em", marginBottom: 6 }}>{t.year}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 4 }}>{t.label}</p>
                    <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{t.desc}</p>
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
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeUp key={f.label} delay={i * 0.07}>
                  <div
                    onClick={() => setSelectedFeature(f)}
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
                        background: f.status === "Live" ? "#f0fdf4" : "#fef3c7",
                        color: f.status === "Live" ? "#15803d" : "#92400e",
                        border: `1px solid ${f.status === "Live" ? "#86efac" : "#fde68a"}`,
                      }}>
                        {f.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.65, marginBottom: 16 }}>
                      {f.status === "Live" ? "Fully operational and available to all students." : "Under development — launching soon."}
                    </p>
                    <button style={{ width: "100%", padding: "8px 12px", background: "#64748b", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
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
              THE TEAM
            </p>
            <h2 className="garamond" style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, color: "#111", marginBottom: 12 }}>
              Built With Dedication By
            </h2>
            <p style={{ fontSize: 14.5, color: "#6b7280", marginBottom: 52, maxWidth: 540, lineHeight: 1.7 }}>
              A passionate team of developers and strategists working under the DoSA Office, TIET.
            </p>
          </FadeUp>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24 }}>
            {DEVELOPERS.map((dev, i) => (
              <FadeUp key={dev.name} delay={i * 0.08}>
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
                    <span style={{ position: "absolute", top: 12, right: 12, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: dev.tagBg, color: dev.tagColor, border: `1px solid ${dev.tagColor}30` }}>
                      {dev.tag}
                    </span>
                  </div>

                  {/* content */}
                  <div style={{ padding: "22px 22px 20px", display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111", marginBottom: 4 }}>{dev.name}</h3>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#c62828", marginBottom: 2 }}>{dev.role}</p>
                    <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>{dev.sub}</p>

                    {/* modules */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
                      {dev.modules.map(m => (
                        <span key={m} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#f3f4f6", color: "#374151", fontWeight: 500 }}>
                          {m}
                        </span>
                      ))}
                    </div>

                    {/* work */}
                    <div style={{ flex: 1 }}>
                      {dev.work && (
                        <div style={{ padding: "12px 14px", borderRadius: 8, background: "#fafafa", borderLeft: `3px solid ${dev.tagColor}`, marginBottom: 16 }}>
                          <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}>{dev.work}</p>
                        </div>
                      )}
                    </div>

                    {/* links */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <a href={dev.linkedin} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "#0077b5", color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
                        <Linkedin size={13} /> LinkedIn
                      </a>
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
          COMING SOON
      ══════════════════════════════════════ */}
      <section id="section-coming-soon" style={{ background: "linear-gradient(135deg,#111 0%,#1f1f1f 100%)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeUp>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#c62828", letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 10 }}>
              WHAT'S NEXT
            </p>
            <h2 className="garamond" style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, color: "#fff", marginBottom: 12 }}>
              Coming Soon
            </h2>
            <p style={{ fontSize: 14.5, color: "#9ca3af", marginBottom: 48, maxWidth: 480, lineHeight: 1.7 }}>
              We're continuously expanding. Here's what the team is building next.
            </p>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
            {COMING_SOON.map((item, i) => (
              <FadeUp key={item.label} delay={i * 0.07}>
                <div style={{ background: "rgba(255,255,255,.05)", borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", padding: "24px 20px", backdropFilter: "blur(8px)" }}>
                  <div style={{ fontSize: 32, marginBottom: 14 }}>{item.icon}</div>
                  <h3 style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{item.label}</h3>
                  <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>{item.desc}</p>
                  <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "rgba(234,179,8,.15)", border: "1px solid rgba(234,179,8,.3)" }}>
                    <Clock size={11} color="#fbbf24" />
                    <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 600 }}>Coming Soon</span>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
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
                          background: selectedFeature.status === "Live" ? "#f0fdf4" : "#fef3c7",
                          color: selectedFeature.status === "Live" ? "#15803d" : "#92400e",
                          border: `1px solid ${selectedFeature.status === "Live" ? "#86efac" : "#fde68a"}`,
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
                    {selectedFeature.status === "Live" ? "Fully operational and available to all students." : "Under development — launching soon."}
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

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb", padding: "36px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744" alt="Thapar" style={{ height: 32, width: "auto", objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>Thapar Campus Connect</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Developed under DoSA Office · TIET</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "right" }}>
            © {new Date().getFullYear()} Thapar Institute of Engineering &amp; Technology<br />
            <span style={{ color: "#c62828", fontWeight: 500 }}>Created and Maintained by DoSA Office</span>
          </div>
        </div>
      </footer>
    </>
  );
}
