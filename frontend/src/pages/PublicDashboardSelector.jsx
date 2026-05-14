import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Building2, CalendarDays, Moon, Search, Sparkles,
  ChevronDown, X, Mail, ArrowRight, AlertCircle,
  Package, Bell, LogIn, Home, Users, Github, Clock,
  SlidersHorizontal, Eye, Save, RotateCcw, ArrowUp,
  ArrowDown, MessageSquare, Send, Bot,
} from "lucide-react";
import EchoOrb from "../components/EchoOrb";

// ─── keep the original PublicPageWidgets import if it exists in your project
// import PublicPageWidgets from "../components/PublicPageWidgets";

/* ═══════════════════════════════════════════════════
   CONSTANTS — customize-my-view (mirrors original)
═══════════════════════════════════════════════════ */
const LOCAL_PREFS_KEY = "public_dashboard_selector_local_prefs_v1";

const THEME_OPTIONS = [
  { value: "light", label: "Light",  bg: "#ffffff" },
  { value: "cool",  label: "Cool",   bg: "#e0f2fe" },
  { value: "warm",  label: "Warm",   bg: "#fff7ed" },
  { value: "slate", label: "Slate",  bg: "#f1f5f9" },
];

const THEME_BG = {
  light: "#ffffff",
  cool:  "linear-gradient(135deg,#e0f2fe,#f0f9ff)",
  warm:  "linear-gradient(135deg,#fff7ed,#fef9f0)",
  slate: "linear-gradient(135deg,#f1f5f9,#e2e8f0)",
};

const CARD_STYLE_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "shadow",  label: "Shadowed" },
  { value: "outline", label: "Outline" },
];

const LAYOUT_OPTIONS = [
  { value: "grid-3", label: "Grid 3" },
  { value: "grid-2", label: "Grid 2" },
  { value: "list",   label: "List"   },
];

const CARD_IDS = [
  "guest-booking",
  "venue-booking",
  "event-calendar",
  "library-pass",
  "society-pass",
  "lost-found",
  "community-feedback",
];

const TIMELINE = [
  { year: "Oct 2025", label: "Idea",         desc: "Conceptualized by Dr. Meenakshi Rana, DoSA" },
  { year: "Nov 2025", label: "Development",  desc: "Core team assembled, tech stack finalized" },
  { year: "Jan 2026", label: "Testing",      desc: "Beta launched with Guest Room & Venue modules" },
  { year: "Feb 2026", label: "Launch",       desc: "Full platform live with 6 integrated services" },
];

const CARD_LABELS_MAP = {
  "guest-booking":       "Hostel Guest Room Booking",
  "venue-booking":       "Event Venue Booking",
  "event-calendar":      "Event Calendar",
  "library-pass":        "Library Night Pass",
  "society-pass":        "Society Night Pass",
  "lost-found":          "Lost & Found",
  "community-feedback":  "Community & Feedback",
};

function makeDefaultPrefs() {
  return {
    themePreset:  "light",
    cardStyle:    "default",
    layoutStyle:  "grid-3",
    accentColor:  "#c62828",
    cardOrder:    [...CARD_IDS],
    hiddenCardIds: [],
  };
}

function readLocalPrefs() {
  try {
    const raw = localStorage.getItem(LOCAL_PREFS_KEY);
    if (!raw) return null;
    
    const saved = JSON.parse(raw);
    if (!saved) return null;
    
    // ✨ MERGE STRATEGY: Ensure new cards are included
    // If saved cardOrder is missing new cards, add them automatically
    if (saved.cardOrder && Array.isArray(saved.cardOrder)) {
      // Add any new cards from CARD_IDS that aren't in saved.cardOrder
      const savedSet = new Set(saved.cardOrder);
      const newCards = CARD_IDS.filter(id => !savedSet.has(id));
      
      if (newCards.length > 0) {
        // Append new cards to the end (they'll be visible by default)
        saved.cardOrder = [...saved.cardOrder, ...newCards];
      }
    } else {
      // If saved.cardOrder is invalid, use default
      saved.cardOrder = [...CARD_IDS];
    }
    
    return saved;
  } catch { return null; }
}

/* ═══════════════════════════════════════════════════
   ANIMATION HELPER — FadeUp
═══════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════
   NAV DATA
═══════════════════════════════════════════════════ */
const NAV = [
  { label: "Home", action: "home" },
  { label: "Booking Form", items: [
    { label: "Hostel Guest-Room Booking", href: "https://campusconnect.thapar.edu/guest-enquiry" },
    { label: "Event Venue Booking",        href: "https://campusconnect.thapar.edu/venue-enquiry" },
  ]},
  { label: "Calendar", items: [
    { label: "Event Calendar", href: "https://campusconnect.thapar.edu/event-calendar" },
  ]},
  { label: "Night Pass", items: [
    { label: "Library Night Pass",  href: "https://permissions.thapar.edu/" },
    { label: "Society Night Pass",  action: "cs" },
  ]},
  { label: "Services", items: [
    { label: "Lost & Found", href: "https://campusconnect.thapar.edu/lostnfound" },
  ]},
  { label: "Support", items: [
    { label: "Any Queries",     action: "q1" },
    { label: "Reach Out To Us", action: "q2" },
  ]},
  { label: "About Us", action: "about" },
];

/* ═══════════════════════════════════════════════════
   CARD DATA
═══════════════════════════════════════════════════ */
const ALL_CARDS = {
  "guest-booking": {
    id: "guest-booking", title: "Hostel Guest Room Booking", sub: "Booking Form",
    Icon: Building2, iconBg: "#fce8e8", iconColor: "#c62828", dot: "#e57373",
    href: "https://campusconnect.thapar.edu/guest-enquiry",
    bullets: ["Single & Double Occupancy Rooms","Online Booking System","Guest Registration & Verification","Advance Booking up to 30 Days"],
  },
  "venue-booking": {
    id: "venue-booking", title: "Event Venue Booking", sub: "Booking Form",
    Icon: CalendarDays, iconBg: "#e3eeff", iconColor: "#1a56db", dot: "#60a5fa",
    href: "https://campusconnect.thapar.edu/venue-enquiry",
    bullets: ["Auditorium & Seminar Hall Booking","Open Air & Outdoor Spaces","Equipment & AV Support Request","Multi-day Event Scheduling"],
  },
  "event-calendar": {
    id: "event-calendar", title: "Event Calendar", sub: "Campus-wide schedule",
    Icon: CalendarDays, iconBg: "#e6f9f0", iconColor: "#0d7a4e", dot: "#34d399",
    href: "https://campusconnect.thapar.edu/event-calendar",
    bullets: ["Upcoming Fests & Competitions","Department & Club Events","Venue Availability Overview","Monthly & Weekly View"],
  },
  "library-pass": {
    id: "library-pass", title: "Library Night Pass", sub: "2 pass categories",
    Icon: Moon, iconBg: "#f0ecff", iconColor: "#6d28d9", dot: "#a78bfa",
    href: "https://permissions.thapar.edu/",
    bullets: ["Overnight Study Access","Research & Project Work","Barcode Scanning","Digital Pass on Mobile"],
  },
  "society-pass": {
    id: "society-pass", title: "Society Night Pass", sub: "Coming soon",
    Icon: Sparkles, iconBg: "#fff8e1", iconColor: "#b45309", dot: "#fbbf24",
    action: "cs",
    bullets: ["Late-Night Society Activities","Cultural & Technical Clubs","Coordinator Approval Flow","Security Gate Integration"],
  },
  "lost-found": {
    id: "lost-found", title: "Lost & Found", sub: "Online Portal",
    Icon: Search, iconBg: "#fff3e0", iconColor: "#c2410c", dot: "#fb923c",
    href: "https://campusconnect.thapar.edu/lostnfound",
    bullets: ["Report Lost Items Online","Browse Found Item Listings","Photo Upload & Description","Claim & Handover Process"],
  },
  "community-feedback": {
    id: "community-feedback", title: "Community & Feedback", sub: "Public forum",
    Icon: MessageSquare, iconBg: "#e8f5e9", iconColor: "#2e7d32", dot: "#4caf50",
    action: "community",
    bullets: ["Share Suggestions & Ideas","Report Issues & Problems","Ask Questions Publicly","Like, Comment & Engage with Posts"],
  },
};

/* ═══════════════════════════════════════════════════
   ECHO AI — canned responses
═══════════════════════════════════════════════════ */
const ECHO_RESPONSES = [
  { match: ["guest","room","hostel","book"],
    reply: "To book a hostel guest room, visit https://campusconnect.thapar.edu/guest-enquiry. You can check availability and make a reservation there." },
  { match: ["venue","event","hall","auditorium"],
    reply: "Event venue bookings are done at https://campusconnect.thapar.edu/venue-enquiry. You can book auditoriums, seminar halls, and open spaces." },
  { match: ["calendar","schedule","fest","event"],
    reply: "Check the Event Calendar at https://campusconnect.thapar.edu/event-calendar to see all upcoming campus events and fests." },
  { match: ["library","night","pass","permission"],
    reply: "Library Night Pass applications are handled at https://permissions.thapar.edu. Apply there for overnight study access." },
  { match: ["society","club","late"],
    reply: "Society Night Pass is coming soon! We're working on integrating it into this portal." },
  { match: ["lost","found","item"],
    reply: "Visit the Lost & Found portal at https://campusconnect.thapar.edu/lostnfound to report or search for lost items." },
  { match: ["login","admin","staff"],
    reply: "Admin/Staff login is at https://campusconnect.thapar.edu/login. Use your institutional credentials." },
  { match: ["help","support","query","contact"],
    reply: "For support, email itmh@thapar.edu for technical issues, or dosa.office@thapar.edu for general queries." },
  { match: ["hello","hi","hey","namaste"],
    reply: "Hello! 👋 I'm Echo, the DoSA Operations assistant. Ask me about guest rooms, venues, night passes, or any campus service!" },
];

function getEchoReply(input) {
  const low = input.toLowerCase();
  for (const r of ECHO_RESPONSES) {
    if (r.match.some(k => low.includes(k))) return r.reply;
  }
  return "I'm here to help with campus operations! You can ask me about guest room bookings, event venues, night passes, lost & found, or admin login.";
}

/* ═══════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════ */
function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:40 }}
      style={{ 
      position:"fixed",
      bottom:96,
      left:0,
      right:0,
      margin:"0 auto",
      width:"fit-content",
               background:"#1f2937", color:"#fff", padding:"10px 22px", borderRadius:100,
               fontSize:13, fontWeight:500, display:"flex", alignItems:"center", gap:8,
               whiteSpace:"nowrap", zIndex:600, boxShadow:"0 4px 20px rgba(0,0,0,.3)" }}>
      <Bell size={14}/> {msg}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   MODAL
═══════════════════════════════════════════════════ */
function Modal({ title, children, onClose }) {
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:500,
               display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <motion.div initial={{ scale:.93, opacity:0 }} animate={{ scale:1, opacity:1 }}
        exit={{ scale:.93, opacity:0 }} transition={{ type:"spring", damping:22 }}
        onClick={e => e.stopPropagation()}
        style={{ background:"#fff", borderRadius:16, maxWidth:440, width:"100%",
                 padding:36, position:"relative", boxShadow:"0 24px 60px rgba(0,0,0,.2)" }}>
        <button onClick={onClose}
          style={{ position:"absolute", top:14, right:14, background:"none", border:"none",
                   cursor:"pointer", padding:6, borderRadius:8, lineHeight:1, display:"flex" }}>
          <X size={18} color="#6b7280"/>
        </button>
        <h2 style={{ fontFamily:"'EB Garamond',Georgia,serif", fontSize:22, fontWeight:600,
                     color:"#111", margin:"0 0 18px" }}>{title}</h2>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   DROPDOWN
═══════════════════════════════════════════════════ */
function DropMenu({ items, onAction }) {
  return (
    <motion.div initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:5 }} transition={{ duration:.11 }}
      style={{ position:"absolute", top:"calc(100% + 4px)", left:0, background:"#fff",
               borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,.13)",
               border:"1px solid #e5e7eb", padding:"6px 0", minWidth:220, zIndex:400 }}>
      {items.map(it => (
        <button key={it.label}
          onClick={() => { if(it.href) window.open(it.href,"_blank"); else if(it.action) onAction(it.action); }}
          style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                   width:"100%", padding:"10px 16px", background:"none", border:"none",
                   cursor:"pointer", fontSize:13, color:"#374151", textAlign:"left",
                   fontFamily:"inherit", gap:8 }}
          onMouseEnter={e=>{ e.currentTarget.style.background="#fef2f2"; e.currentTarget.style.color="#c62828"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color="#374151"; }}>
          <span>{it.label}</span>
          {it.action==="cs" && (
            <span style={{ fontSize:10, background:"#fef3c7", color:"#92400e",
                           padding:"2px 8px", borderRadius:20, fontWeight:600 }}>Soon</span>
          )}
        </button>
      ))}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   NAV ITEM
═══════════════════════════════════════════════════ */
function NavItem({ item, onAction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const base = { background:"none", border:"none", cursor:"pointer", fontSize:13.5,
                 fontWeight:500, color:"#374151", padding:"4px 0", fontFamily:"inherit",
                 display:"flex", alignItems:"center", gap:3 };
  if (!item.items) return (
    <button style={base} onClick={() => onAction(item.action)}
      onMouseEnter={e=>e.currentTarget.style.color="#c62828"}
      onMouseLeave={e=>e.currentTarget.style.color="#374151"}>
      {item.label}
    </button>
  );
  return (
    <div ref={ref} style={{ position:"relative" }}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button style={base}
        onMouseEnter={e=>e.currentTarget.style.color="#c62828"}
        onMouseLeave={e=>e.currentTarget.style.color="#374151"}>
        {item.label}
        <ChevronDown size={13} style={{ transform:open?"rotate(180deg)":"none", transition:"transform .18s" }}/>
      </button>
      <AnimatePresence>{open && <DropMenu items={item.items} onAction={onAction}/>}</AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SERVICE CARD
═══════════════════════════════════════════════════ */
function Card({ card, onAction, cardStyle, accentColor }) {
  const { Icon } = card;
  const [hov, setHov] = useState(false);

  const borderStyle = cardStyle === "outline"
    ? (hov ? "2px solid " + accentColor : "2px solid #d1d5db")
    : (hov ? "1.5px solid #d1d5db" : "1.5px solid #e5e7eb");

  const shadowStyle = cardStyle === "shadow"
    ? (hov ? "0 12px 36px rgba(0,0,0,.13)" : "0 2px 8px rgba(0,0,0,.07)")
    : (hov ? "0 8px 28px rgba(0,0,0,.09)" : "none");

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => {

        // 🎯 Library Night Pass control
        if (card.id === "library-pass") {
          window.open("https://permissions.thapar.edu/", "_blank");
          return;
        }

        // default behavior
        if(card.href) window.open(card.href,"_blank");
        else if(card.action) onAction(card.action);
      }}
      style={{ background:"#fff", borderRadius:16, border:borderStyle, padding:"24px 24px 20px",
               cursor:"pointer", display:"flex", flexDirection:"column", height:"100%",
               transition:"border-color .2s, box-shadow .2s, transform .2s",
               transform:hov?"translateY(-4px)":"translateY(0)", boxShadow:shadowStyle }}>

      {/* header */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:20 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:card.iconBg, flexShrink:0,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon size={20} color={card.iconColor}/>
        </div>
        <div style={{ flex:1 }}>
          <p style={{ margin:0, fontWeight:700, fontSize:15.5, color:"#111", lineHeight:1.25 }}>{card.title}</p>
          <p style={{ margin:"3px 0 0", fontSize:12.5, color:"#9ca3af" }}>{card.sub}</p>
        </div>
        {card.action==="cs" && (
          <span style={{ fontSize:10, background:"#fef9c3", color:"#92400e", border:"1px solid #fde68a",
                         padding:"3px 8px", borderRadius:20, fontWeight:600, whiteSpace:"nowrap", marginTop:2 }}>
            Coming Soon
          </span>
        )}
      </div>

      {/* bullets */}
      <ul style={{ margin:0, padding:0, listStyle:"none", flex:1, display:"flex", flexDirection:"column", gap:11 }}>
        {card.bullets.map(b => (
          <li key={b} style={{ display:"flex", alignItems:"flex-start", gap:10, fontSize:13.5, color:"#4b5563", lineHeight:1.4 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:card.dot, flexShrink:0, marginTop:5 }}/>
            {b}
          </li>
        ))}
      </ul>

      {/* cta */}
      <div style={{ borderTop:"1px solid #f3f4f6", marginTop:20, paddingTop:16 }}>
        <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:13.5, fontWeight:600,
                       color:hov ? accentColor : "#111", transition:"color .2s" }}>
          Click Here To Open <ArrowRight size={14}/>
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ECHO AI CHATBOT WIDGET
═══════════════════════════════════════════════════ */
function EchoChatbot({ onClose }) {
  const [messages, setMessages] = useState([
    { from:"bot", text:"Hello! 👋 I'm Echo, your DoSA Operations assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, typing]);

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setMessages(m => [...m, { from:"user", text:q }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(m => [...m, { from:"bot", text:getEchoReply(q) }]);
    }, 900);
  };

  const handleKey = e => { if(e.key === "Enter") send(); };

  return (
    <motion.div initial={{ opacity:0, scale:.9, y:14 }} animate={{ opacity:1, scale:1, y:0 }}
      exit={{ opacity:0, scale:.9, y:14 }}
      style={{ position:"fixed", bottom:92, right:24, zIndex:350, width:320,
               background:"#fff", borderRadius:16, overflow:"hidden",
               boxShadow:"0 12px 48px rgba(0,0,0,.2)", border:"1px solid #e5e7eb",
               display:"flex", flexDirection:"column" }}>

      {/* header */}
      <div style={{ background:"#c62828", padding:"14px 16px",
                    display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,.2)",
                        display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Bot size={18} color="#fff"/>
          </div>
          <div>
            <p style={{ color:"#fff", fontWeight:700, fontSize:14, margin:0, lineHeight:1 }}>Echo AI</p>
            <p style={{ color:"#fca5a5", fontSize:11, margin:"2px 0 0" }}>DoSA Operations Assistant</p>
          </div>
        </div>
        <button onClick={onClose}
          style={{ background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer",
                   padding:6, borderRadius:8, lineHeight:1, display:"flex" }}>
          <X size={16} color="#fff"/>
        </button>
      </div>

      {/* messages */}
      <div style={{ flex:1, overflowY:"auto", padding:14, display:"flex",
                    flexDirection:"column", gap:10, maxHeight:320, minHeight:200 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:"flex", justifyContent:m.from==="user"?"flex-end":"flex-start" }}>
            {m.from==="bot" && (
              <div style={{ width:28, height:28, borderRadius:"50%", background:"#fce8e8",
                            display:"flex", alignItems:"center", justifyContent:"center",
                            flexShrink:0, marginRight:8, marginTop:2 }}>
                <Bot size={14} color="#c62828"/>
              </div>
            )}
            <div style={{
              maxWidth:"78%", padding:"9px 13px", borderRadius:12, fontSize:13, lineHeight:1.55,
              background: m.from==="user" ? "#c62828" : "#f3f4f6",
              color: m.from==="user" ? "#fff" : "#1f2937",
              borderBottomRightRadius: m.from==="user" ? 3 : 12,
              borderBottomLeftRadius:  m.from==="bot"  ? 3 : 12,
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:"#fce8e8",
                          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Bot size={14} color="#c62828"/>
            </div>
            <div style={{ background:"#f3f4f6", borderRadius:12, borderBottomLeftRadius:3,
                          padding:"9px 13px", display:"flex", gap:4 }}>
              {[0,1,2].map(i => (
                <motion.span key={i} animate={{ y:[0,-4,0] }} transition={{ repeat:Infinity, duration:.6, delay:i*.15 }}
                  style={{ width:6, height:6, borderRadius:"50%", background:"#9ca3af", display:"block" }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* input */}
      <div style={{ borderTop:"1px solid #f3f4f6", padding:"10px 12px",
                    display:"flex", gap:8, alignItems:"center" }}>
        <input
          value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Ask Echo anything..."
          style={{ flex:1, border:"1px solid #e5e7eb", borderRadius:10, padding:"8px 12px",
                   fontSize:13, outline:"none", fontFamily:"inherit", background:"#f9fafb",
                   color:"#111" }}
          onFocus={e => e.target.style.borderColor="#c62828"}
          onBlur={e => e.target.style.borderColor="#e5e7eb"}
        />
        <button onClick={send}
          style={{ width:36, height:36, borderRadius:10, background:"#c62828", border:"none",
                   cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                   flexShrink:0, transition:"background .2s" }}
          onMouseEnter={e => e.currentTarget.style.background="#b71c1c"}
          onMouseLeave={e => e.currentTarget.style.background="#c62828"}>
          <Send size={15} color="#fff"/>
        </button>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   CUSTOMIZE MY VIEW — full panel (mirrors original)
═══════════════════════════════════════════════════ */
function CustomizePanel({ prefs, onUpdate, onMove, onToggleHide, onSave, onReset, onClose }) {
  const [preview, setPreview] = useState(false);

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.35)", zIndex:500,
               backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-start",
               justifyContent:"center", padding:"16px", overflowY:"auto" }}>
      <motion.div initial={{ y:30, opacity:0 }} animate={{ y:0, opacity:1 }}
        exit={{ y:30, opacity:0 }} transition={{ type:"spring", damping:22 }}
        style={{ width:"100%", maxWidth:680, background:"#fff", borderRadius:20,
                 border:"1px solid #e5e7eb", boxShadow:"0 24px 60px rgba(0,0,0,.18)",
                 padding:28, marginTop:48, marginBottom:24 }}>

        {/* title row */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
          <h2 style={{ fontFamily:"'EB Garamond',Georgia,serif", fontSize:22, fontWeight:600, color:"#111", margin:0 }}>
            Customize My Dashboard View
          </h2>
          <button onClick={onClose}
            style={{ padding:"6px 8px", border:"1px solid #e5e7eb", borderRadius:8,
                     background:"none", cursor:"pointer", lineHeight:1, display:"flex" }}>
            <X size={16} color="#6b7280"/>
          </button>
        </div>
        <p style={{ fontSize:13, color:"#6b7280", marginBottom:20 }}>
          Settings are saved only in your browser. They do not change the footer, heading, or logo.
        </p>

        {/* controls grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16, marginBottom:24 }}>
          {/* Theme */}
          <label style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Theme</span>
            <select value={prefs.themePreset} onChange={e => onUpdate({ themePreset:e.target.value })}
              style={{ border:"1px solid #e5e7eb", borderRadius:8, padding:"8px 10px",
                       fontSize:13, fontFamily:"inherit", background:"#fff", color:"#111" }}>
              {THEME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>

          {/* Card Style */}
          <label style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Card Style</span>
            <select value={prefs.cardStyle} onChange={e => onUpdate({ cardStyle:e.target.value })}
              style={{ border:"1px solid #e5e7eb", borderRadius:8, padding:"8px 10px",
                       fontSize:13, fontFamily:"inherit", background:"#fff", color:"#111" }}>
              {CARD_STYLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          {/* Layout */}
          <label style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Layout</span>
            <select value={prefs.layoutStyle} onChange={e => onUpdate({ layoutStyle:e.target.value })}
              style={{ border:"1px solid #e5e7eb", borderRadius:8, padding:"8px 10px",
                       fontSize:13, fontFamily:"inherit", background:"#fff", color:"#111" }}>
              {LAYOUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          {/* Accent Color */}
          <label style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Accent Color</span>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input type="color" value={prefs.accentColor}
                onChange={e => onUpdate({ accentColor:e.target.value })}
                style={{ width:44, height:38, border:"1px solid #e5e7eb", borderRadius:8,
                         padding:3, cursor:"pointer", background:"#fff" }}/>
              <span style={{ fontSize:13, color:"#6b7280", fontFamily:"monospace" }}>{prefs.accentColor}</span>
            </div>
          </label>
        </div>

        {/* Card order & visibility */}
        <p style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:10 }}>
          Card Order &amp; Visibility
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:24 }}>
          {(prefs.cardOrder || CARD_IDS).map((id, idx) => {
            const hidden = (prefs.hiddenCardIds||[]).includes(id);
            return (
              <div key={id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                                     border:"1px solid #e5e7eb", borderRadius:10,
                                     padding:"10px 14px", background:hidden?"#f9fafb":"#fff" }}>
                <div>
                  <p style={{ margin:0, fontSize:13.5, fontWeight:600, color:hidden?"#9ca3af":"#111" }}>
                    {CARD_LABELS_MAP[id]}
                  </p>
                  <p style={{ margin:0, fontSize:11, color:hidden?"#d1d5db":"#6b7280" }}>
                    {hidden ? "Hidden" : "Visible"}
                  </p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <button disabled={idx===0} onClick={() => onMove(id,"up")}
                    style={{ padding:"5px 7px", border:"1px solid #e5e7eb", borderRadius:7,
                             background:"none", cursor:idx===0?"not-allowed":"pointer",
                             opacity:idx===0?.35:1, lineHeight:1, display:"flex" }}>
                    <ArrowUp size={14} color="#6b7280"/>
                  </button>
                  <button disabled={idx===(prefs.cardOrder||CARD_IDS).length-1} onClick={() => onMove(id,"down")}
                    style={{ padding:"5px 7px", border:"1px solid #e5e7eb", borderRadius:7,
                             background:"none", cursor:idx===(prefs.cardOrder||CARD_IDS).length-1?"not-allowed":"pointer",
                             opacity:idx===(prefs.cardOrder||CARD_IDS).length-1?.35:1, lineHeight:1, display:"flex" }}>
                    <ArrowDown size={14} color="#6b7280"/>
                  </button>
                  <button onClick={() => onToggleHide(id)}
                    style={{ padding:"5px 12px", border:`1px solid ${hidden?"#fbbf24":"#6ee7b7"}`,
                             borderRadius:7, background:hidden?"#fef9c3":"#ecfdf5",
                             color:hidden?"#92400e":"#065f46", fontSize:12, fontWeight:600,
                             cursor:"pointer", fontFamily:"inherit" }}>
                    {hidden ? "Show" : "Hide"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* action buttons — mirror original exactly */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"flex-end" }}>
          <button onClick={() => setPreview(v=>!v)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 16px",
                     border:"1px solid #d1d5db", borderRadius:8, background:"#fff",
                     color:"#374151", fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
            <Eye size={15}/> {preview ? "Stop Preview" : "Preview"}
          </button>
          <button onClick={onReset}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 16px",
                     border:"1px solid #d1d5db", borderRadius:8, background:"#fff",
                     color:"#374151", fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
            <RotateCcw size={15}/> Reset My View
          </button>
          <button onClick={onSave}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px",
                     border:"none", borderRadius:8, background:"#2563eb",
                     color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            <Save size={15}/> Save on This Device
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
export default function ThaparPublicDashboard() {
  const navigate = useNavigate();
  const topRef = useRef(null);

  // ── state ──
  const [toast,   setToast]   = useState(null);
  const [modal,   setModal]   = useState(null);
  const [chat,    setChat]    = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  // ── prefs (mirrors original pattern) ──
  const [prefs, setPrefs] = useState(() => readLocalPrefs() || makeDefaultPrefs());

  const updatePrefs = patch => setPrefs(p => ({ ...p, ...patch }));

  const moveCard = (id, dir) => {
    setPrefs(p => {
      const order = [...(p.cardOrder || CARD_IDS)];
      const idx = order.indexOf(id);
      const next = dir==="up" ? idx-1 : idx+1;
      if (next<0 || next>=order.length) return p;
      [order[idx], order[next]] = [order[next], order[idx]];
      return { ...p, cardOrder:order };
    });
  };

  const toggleHide = id => {
    setPrefs(p => {
      const hidden = new Set(p.hiddenCardIds||[]);
      if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
      return { ...p, hiddenCardIds:[...hidden] };
    });
  };

  const savePrefs = () => {
    localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(prefs));
    setShowCustomizer(false);
    setToast("View saved to this device ✓");
  };

  const resetPrefs = () => {
    localStorage.removeItem(LOCAL_PREFS_KEY);
    setPrefs(makeDefaultPrefs());
    setToast("View reset to default ✓");
  };

  // ── derived cards list (respects order + hidden) ──
  const visibleCards = useMemo(() => {
    const order = prefs.cardOrder || CARD_IDS;
    const hidden = new Set(prefs.hiddenCardIds || []);
    return order
      .filter(id => ALL_CARDS[id] && !hidden.has(id))
      .map(id => ALL_CARDS[id]);
  }, [prefs.cardOrder, prefs.hiddenCardIds]);

  // ── grid cols from layoutStyle ──
  const gridCols = prefs.layoutStyle==="grid-2" ? "repeat(2,1fr)"
                 : prefs.layoutStyle==="list"   ? "1fr"
                 : "repeat(3,1fr)";

  const act = a => {
    if (a==="home") topRef.current?.scrollIntoView({ behavior:"smooth" });
    else if (a==="cs")        setToast("Coming Soon!");
    else if (a==="q1")        setModal("q1");
    else if (a==="q2")        setModal("q2");
    else if (a==="about")     navigate("/about-us");
    else if (a==="community") navigate("/community-feedback");
  };

  // ── page background from theme ──
  const pageBg = THEME_BG[prefs.themePreset] || "#ffffff";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased}
        .card-grid{display:grid;gap:20px}
        @media(max-width:960px){.card-grid{grid-template-columns:repeat(2,1fr)!important}}
        @media(max-width:600px){.card-grid{grid-template-columns:1fr!important}}
        .footer-cols{display:grid;grid-template-columns:1fr 1fr 1fr;gap:48px}
        @media(max-width:768px){.footer-cols{grid-template-columns:1fr!important;gap:32px!important}}
        .nav-row{display:flex}
        @media(max-width:1024px){.nav-row{display:none!important}}
      `}</style>

      <div ref={topRef} style={{ background: pageBg, minHeight:"100vh", transition:"background .3s" }}>

        {/* ══ NAVBAR ══════════════════════════════════ */}
        <header style={{ position:"sticky", top:0, zIndex:300, background:"#fff",
                         borderBottom:"1px solid #e5e7eb", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
          <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 24px", minHeight:96,
                        display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
            {/* logo */}
            <div style={{ display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
              <img src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744"
                alt="Thapar" style={{ height:"clamp(56px, 6vw, 72px)", width:"auto", objectFit:"contain" }}/>
              <div>
                <p style={{ fontSize:12.5, fontWeight:600, color:"#111", lineHeight:1.2, margin:0 }}>
                  Thapar Institute of Engineering and Technology
                </p>
                <p style={{ fontSize:11, color:"#c62828", fontWeight:500, margin:0 }}>
                  Created by DoSA Office
                </p>
              </div>
            </div>
            {/* tabs */}
            <nav className="nav-row" style={{ alignItems:"center", gap:24, flex:1, justifyContent:"center" }}>
              {NAV.map(it => <NavItem key={it.label} item={it} onAction={act}/>)}
            </nav>
            {/* admin */}
            <a href="https://campusconnect.thapar.edu/login" target="_blank" rel="noopener noreferrer"
              style={{ display:"flex", alignItems:"center", gap:6, background:"#c62828", color:"#fff",
                       fontSize:12.5, fontWeight:600, padding:"8px 16px", borderRadius:6,
                       textDecoration:"none", flexShrink:0, whiteSpace:"nowrap" }}>
              <LogIn size={13}/> Admin/Staff Login
            </a>
          </div>
        </header>

        {/* ══ HERO ════════════════════════════════════ */}
        <div style={{ position: "relative", height: "70vh", minHeight: 480, overflow: "hidden" }}>
          <img
            src="https://ik.imagekit.io/7khjnlfow/email-assets/03_dsyrsv.png?updatedAt=1774118995455"
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
              style={{ fontFamily:"'EB Garamond',Georgia,serif", fontSize: "clamp(2.4rem,6vw,5rem)", fontWeight: 700, color: "#fff", lineHeight: 1.1, marginBottom: 20, maxWidth: 800 }}>
              One Platform.<br />Every Student Need.
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45 }}
              style={{ fontSize: 16, color: "rgba(255,255,255,.85)", maxWidth: 560, lineHeight: 1.7 }}>
              Seamlessly Connected.
            </motion.p>
          </div>
        </div>

        {/* ══ CARDS ═══════════════════════════════════ */}
        <section style={{ background:"transparent", padding:"120px 24px 80px" }}>
          <div className="card-grid"
            style={{ maxWidth:1280, margin:"0 auto", gridTemplateColumns:gridCols }}>
            {visibleCards.map((c, i) => (
              <motion.div key={c.id}
                initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true, margin:"-20px" }}
                transition={{ duration:.35, delay:i*.06 }}>
                <Card card={c} onAction={act}
                  cardStyle={prefs.cardStyle}
                  accentColor={prefs.accentColor}/>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ══ FOOTER ══════════════════════════════════ */}
        <footer style={{ background:"#f0f1f3", borderTop:"1px solid #e5e7eb" }}>
          <div className="footer-cols"
            style={{ maxWidth:1280, margin:"0 auto", padding:"48px 24px 40px" }}>

            {/* LEFT: logo + description */}
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                <img src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744"
                  alt="Thapar" style={{ height:36, width:"auto", objectFit:"contain" }}/>
                <span style={{ fontWeight:700, fontSize:14, color:"#111" }}>Thapar Operations</span>
              </div>
              <p style={{ fontSize:13.5, color:"#4b5563", lineHeight:1.7, maxWidth:260 }}>
                Helping manage and streamline Thapar operations including bookings, permissions,
                and student services — all in one place.
              </p>
              <p style={{ fontSize:12, color:"#9ca3af", marginTop:14 }}>
                © {new Date().getFullYear()} DoSA Office, TIET
              </p>
            </div>

            {/* CENTRE: Quick Links + Any General Query */}
            <div>
              <p style={{ fontWeight:700, fontSize:15, color:"#111", marginBottom:14 }}>Quick Links</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:24 }}>
                <button onClick={() => act("home")}
                  style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none",
                           cursor:"pointer", fontSize:13.5, color:"#4b5563", fontFamily:"inherit", padding:"2px 0" }}
                  onMouseEnter={e=>e.currentTarget.style.color="#c62828"}
                  onMouseLeave={e=>e.currentTarget.style.color="#4b5563"}>
                  <Home size={14} color="#9ca3af"/> Home
                </button>
                <button onClick={() => navigate("/install-app")}
                  style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none",
                           cursor:"pointer", fontSize:13.5, color:"#4b5563", fontFamily:"inherit", padding:"2px 0" }}
                  onMouseEnter={e=>e.currentTarget.style.color="#c62828"}
                  onMouseLeave={e=>e.currentTarget.style.color="#4b5563"}>
                  <Package size={14} color="#9ca3af"/> How to Install
                </button>
                <button onClick={() => act("about")}
                  style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none",
                           cursor:"pointer", fontSize:13.5, color:"#4b5563", fontFamily:"inherit", padding:"2px 0" }}
                  onMouseEnter={e=>e.currentTarget.style.color="#c62828"}
                  onMouseLeave={e=>e.currentTarget.style.color="#4b5563"}>
                  <Users size={14} color="#9ca3af"/> About Us
                </button>
              </div>

              <p style={{ fontWeight:700, fontSize:15, color:"#111", marginBottom:12 }}>Any General Query</p>
              <div style={{ display:"flex", flexDirection:"column", gap:12, fontSize:13.5, color:"#4b5563" }}>
                <div>
                  <p style={{ color:"#6b7280", marginBottom:3 }}>Contact us for any assistance:</p>
                  <a href="mailto:Queries_studentaffairs@thapar.edu"
                    style={{ color:"#2563eb", textDecoration:"none", fontWeight:500 }}>
                    Queries_studentaffairs@thapar.edu
                  </a>
                </div>
                <div>
                  <p style={{ fontSize:11, fontWeight:700, color:"#9ca3af",
                               textTransform:"uppercase", letterSpacing:".08em", marginBottom:3 }}>
                    Technical Support
                  </p>
                  <a href="mailto:itmh@thapar.edu"
                    style={{ color:"#2563eb", textDecoration:"none", fontWeight:500 }}>
                    itmh@thapar.edu
                  </a>
                </div>
              </div>
            </div>

            {/* RIGHT: Contact Us */}
            <div>
              <p style={{ fontWeight:700, fontSize:15, color:"#111", marginBottom:14 }}>Contact Us</p>
              <div style={{ display:"flex", flexDirection:"column", gap:10,
                            fontSize:13.5, color:"#4b5563", marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                  <Clock size={14} color="#9ca3af" style={{ marginTop:2, flexShrink:0 }}/>
                  <span>Timings: 9 AM to 5:30 PM, Monday to Friday</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Mail size={14} color="#9ca3af" style={{ flexShrink:0 }}/>
                  <span>E-mail:{" "}
                    <a href="mailto:dosa.office@thapar.edu" style={{ color:"#2563eb", textDecoration:"none" }}>
                      dosa.office@thapar.edu
                    </a>
                  </span>
                </div>
              </div>
              <hr style={{ border:"none", borderTop:"1px solid #d1d5db", marginBottom:14 }}/>
              <div style={{ display:"flex", flexDirection:"column", gap:4, fontSize:12.5, color:"#6b7280" }}>
                <p>Powered by Thapar Institute of Engineering &amp; Technology</p>
                <p style={{ fontWeight:700, color:"#374151" }}>Created and Maintained by DoSA Office</p>
              </div>
            </div>
          </div>

          {/* bottom bar */}
          <div style={{ borderTop:"1px solid #d1d5db", background:"#e5e6e8",
                        padding:"12px 24px", display:"flex", alignItems:"center",
                        justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
            <span style={{ fontSize:12, color:"#6b7280" }}>Managed by DOSA Office</span>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#6b7280" }}>
              Crafted by <span style={{ color:"#374151", marginLeft:4 }}>DoSA Office</span>
            </div>
          </div>
        </footer>
      </div>{/* end page wrapper */}

      {/* ══ FIXED: CUSTOMIZE MY VIEW ════════════════
          — button is always visible bottom-left
          — mirrors original SlidersHorizontal icon + label
      ═══════════════════════════════════════════════ */}
      <button
        onClick={() => setShowCustomizer(true)}
        style={{ position:"fixed", bottom:40, left:24, zIndex:350,
                 display:"flex", alignItems:"center", gap:8,
                 background:"rgba(255,255,255,.92)", backdropFilter:"blur(8px)",
                 border:"1px solid #d1d5db", borderRadius:12,
                 padding:"10px 16px", fontSize:13, fontWeight:500, color:"#374151",
                 cursor:"pointer", fontFamily:"inherit",
                 boxShadow:"0 2px 16px rgba(0,0,0,.12)",
                 transition:"box-shadow .2s, transform .2s" }}
        onMouseEnter={e=>{ e.currentTarget.style.boxShadow="0 4px 24px rgba(0,0,0,.18)"; e.currentTarget.style.transform="translateY(-2px)"; }}
        onMouseLeave={e=>{ e.currentTarget.style.boxShadow="0 2px 16px rgba(0,0,0,.12)"; e.currentTarget.style.transform="none"; }}>
        <SlidersHorizontal size={15} color="#6b7280"/>
        Customize My View
      </button>

      {/* ══ FIXED: LEGAL FOOTER BAR ══════════════════
          © 2026 TIET | License | Policies | Terms
      ═══════════════════════════════════════════════ */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:340,
        background:"rgba(255,255,255,.94)", backdropFilter:"blur(10px)",
        borderTop:"1px solid #e5e7eb",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"7px 24px",
        boxShadow:"0 -1px 12px rgba(0,0,0,.06)",
      }}>
        <span style={{ fontSize:12, color:"#9ca3af", marginRight:10 }}>© 2026 TIET</span>
        {[
          { label:"License",  path:"/license"  },
          { label:"Policies", path:"/policies" },
          { label:"Terms",    path:"/terms"    },
        ].map(({ label, path }) => (
          <span key={path} style={{ display:"flex", alignItems:"center" }}>
            <span style={{ color:"#d1d5db", margin:"0 8px", fontSize:11 }}>|</span>
            <button
              onClick={() => navigate(path)}
              style={{
                background:"none", border:"none", cursor:"pointer",
                fontSize:12, fontWeight:500, color:"#6b7280",
                fontFamily:"inherit", padding:"2px 0",
                transition:"color .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color="#c62828"}
              onMouseLeave={e => e.currentTarget.style.color="#6b7280"}
            >
              {label}
            </button>
          </span>
        ))}
      </div>

      {/* ══ FIXED: ECHO AI CHATBOT ═══════════════════
          — EchoOrb bot face (floating mode)
          — full chat panel with keyword responses
      ═══════════════════════════════════════════════ */}
      <EchoOrb 
        mode="floating"
        onClick={() => setChat(v => !v)}
      />

      {/* Echo chat modal */}
      <AnimatePresence>
        {chat && <EchoChatbot onClose={() => setChat(false)}/>}
      </AnimatePresence>

      {/* Customize panel */}
      <AnimatePresence>
        {showCustomizer && (
          <CustomizePanel
            prefs={prefs}
            onUpdate={updatePrefs}
            onMove={moveCard}
            onToggleHide={toggleHide}
            onSave={savePrefs}
            onReset={resetPrefs}
            onClose={() => setShowCustomizer(false)}
          />
        )}
      </AnimatePresence>

      {/* ══ MODALS ══════════════════════════════════ */}
      <AnimatePresence>
        {modal==="q1" && (
          <Modal title="Any Queries?" onClose={() => setModal(null)}>
            <div style={{ display:"flex", flexDirection:"column", gap:14,
                          fontSize:13.5, color:"#4b5563", lineHeight:1.65 }}>
              <div>
                <p style={{ fontSize:13, color:"#6b7280", marginBottom:6 }}>Contact us for any assistance:</p>
                <a href="mailto:Queries_studentaffairs@thapar.edu" style={{ color:"#2563eb", textDecoration:"none", fontWeight:500 }}>
                  Queries_studentaffairs@thapar.edu
                </a>
              </div>
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:"#9ca3af",
                           textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>
                  Technical Support
                </p>
                <a href="mailto:itmh@thapar.edu" style={{ color:"#2563eb", textDecoration:"none", fontWeight:500 }}>
                  itmh@thapar.edu
                </a>
              </div>
            </div>
          </Modal>
        )}
        {modal==="q2" && (
          <Modal title="Reach Out To Us" onClose={() => setModal(null)}>
            <div style={{ display:"flex", flexDirection:"column", gap:14,
                          fontSize:13.5, color:"#4b5563", lineHeight:1.65 }}>
              <p>For any feedback you can contact us on <strong style={{ color:"#111" }}>DoSA Office</strong></p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                  <Clock size={14} color="#9ca3af" style={{ marginTop:2, flexShrink:0 }}/>
                  <span style={{ fontSize:13, color:"#4b5563" }}>Timings: 9 AM to 5:30 PM, Monday to Friday</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Mail size={14} color="#9ca3af" style={{ flexShrink:0 }}/>
                  <span style={{ fontSize:13, color:"#4b5563" }}>E-mail:{" "}
                    <a href="mailto:dosa.office@thapar.edu" style={{ color:"#2563eb", textDecoration:"none" }}>
                      dosa.office@thapar.edu
                    </a>
                  </span>
                </div>
              </div>
            </div>
          </Modal>
        )}
        {modal==="about" && (
          <Modal title="About Thapar Operations" onClose={() => setModal(null)}>
            <div style={{ display:"flex", flexDirection:"column", gap:14,
                          fontSize:13.5, color:"#4b5563", lineHeight:1.65 }}>
              <p>The <strong style={{ color:"#111" }}>Thapar Operations Portal</strong> was conceptualized
                under the leadership of our Dean to digitize and centralize campus services.</p>
              <p>Developed and maintained by the <strong style={{ color:"#111" }}>DoSA Office</strong> at
                Thapar Institute of Engineering and Technology, Patiala.</p>
              <div style={{ background:"#f9fafb", borderRadius:10, padding:14 }}>
                <p style={{ fontWeight:600, color:"#111", marginBottom:8, fontSize:13.5 }}>Development Team</p>
                <p style={{ fontSize:12.5, color:"#6b7280" }}>Created by <strong>DoSA Office</strong></p>
                <p style={{ fontSize:12.5, color:"#6b7280" }}>Crafted by <strong>DoSA Office</strong></p>
                <p style={{ fontSize:12, color:"#9ca3af", marginTop:8 }}>Version 1.0 · Campus Connect &amp; DoSA Office</p>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ══ TOAST ═══════════════════════════════════ */}
      <AnimatePresence>
        {toast && <Toast msg={toast} onClose={() => setToast(null)}/>}
      </AnimatePresence>
    </>
  );
}
