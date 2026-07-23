import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, CalendarDays, Moon, Search, Sparkles,
  ChevronDown, X, ArrowRight,
  Package, Bell, LogIn, Home, Users,
  MessageSquare, Send, Bot, Lock,
} from "lucide-react";
import EchoOrb from "../components/EchoOrb";
import {
  DEFAULT_PUBLIC_UI_CONFIG,
  PUBLIC_CARD_IDS,
  fetchPublicUiConfig,
  normalizePublicUiConfig,
} from "../utils/publicUiConfig";

// ─── keep the original PublicPageWidgets import if it exists in your project
// import PublicPageWidgets from "../components/PublicPageWidgets";

const THEME_BG = {
  light: "#ffffff",
  cool:  "linear-gradient(135deg,#e0f2fe,#f0f9ff)",
  warm:  "linear-gradient(135deg,#fff7ed,#fef9f0)",
  slate: "linear-gradient(135deg,#f1f5f9,#e2e8f0)",
};

const ICONS = {
  building: Building2,
  calendar: CalendarDays,
  moon: Moon,
  sparkles: Sparkles,
  search: Search,
  message: MessageSquare,
  package: Package,
  login: LogIn,
  home: Home,
  users: Users,
};

const CARD_VISUALS = {
  "guest-booking": { Icon: Building2, iconBg: "#fce8e8", iconColor: "#c62828", dot: "#e57373" },
  "venue-booking": { Icon: CalendarDays, iconBg: "#e3eeff", iconColor: "#1a56db", dot: "#60a5fa" },
  "event-calendar": { Icon: CalendarDays, iconBg: "#e6f9f0", iconColor: "#0d7a4e", dot: "#34d399" },
  "library-pass": { Icon: Moon, iconBg: "#f0ecff", iconColor: "#6d28d9", dot: "#a78bfa" },
  "society-pass": { Icon: Sparkles, iconBg: "#fff8e1", iconColor: "#b45309", dot: "#fbbf24" },
  "lost-found": { Icon: Search, iconBg: "#fff3e0", iconColor: "#c2410c", dot: "#fb923c" },
  "community-feedback": { Icon: MessageSquare, iconBg: "#e8f5e9", iconColor: "#2e7d32", dot: "#4caf50" },
};

function getEchoReply(input, echoConfig) {
  const low = input.toLowerCase();
  const responses = Array.isArray(echoConfig?.responses)
    ? [...echoConfig.responses].filter((item) => item?.enabled !== false).sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))
    : DEFAULT_PUBLIC_UI_CONFIG.echo.responses;
  for (const r of responses) {
    const keywords = r.keywords || r.match || [];
    if (keywords.some(k => low.includes(String(k).toLowerCase()))) return r.reply;
  }
  return echoConfig?.defaultReply ?? "I'm here to help with campus operations!";
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
  const enabledItems = (items || []).filter((item) => item?.enabled !== false);
  return (
    <motion.div initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:5 }} transition={{ duration:.11 }}
      style={{ position:"absolute", top:"calc(100% + 4px)", left:0, background:"#fff",
               borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,.13)",
               border:"1px solid #e5e7eb", padding:"6px 0", minWidth:220, zIndex:400 }}>
      {enabledItems.map(it => (
        <button key={it.id || it.title || it.label}
          onClick={() => onAction(it)}
          style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                   width:"100%", padding:"10px 16px", background:"none", border:"none",
                   cursor:"pointer", fontSize:13, color:"#374151", textAlign:"left",
                   fontFamily:"inherit", gap:8 }}
          onMouseEnter={e=>{ e.currentTarget.style.background="#fef2f2"; e.currentTarget.style.color="#c62828"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color="#374151"; }}>
          <span>{it.title || it.label}</span>
          {(it.badge || it.action==="cs") && (
            <span style={{ fontSize:10, background:"#fef3c7", color:"#92400e",
                           padding:"2px 8px", borderRadius:20, fontWeight:600 }}>{it.badge || "Soon"}</span>
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
  const visibleChildren = (item.items || []).filter((child) => child?.enabled !== false);
  if (!visibleChildren.length) return (
    <button style={base} onClick={() => onAction(item)}
      onMouseEnter={e=>e.currentTarget.style.color="#c62828"}
      onMouseLeave={e=>e.currentTarget.style.color="#374151"}>
      {item.title || item.label}
    </button>
  );
  return (
    <div ref={ref} style={{ position:"relative" }}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button style={base}
        onMouseEnter={e=>e.currentTarget.style.color="#c62828"}
        onMouseLeave={e=>e.currentTarget.style.color="#374151"}>
        {item.title || item.label}
        <ChevronDown size={13} style={{ transform:open?"rotate(180deg)":"none", transition:"transform .18s" }}/>
      </button>
      <AnimatePresence>{open && <DropMenu items={visibleChildren} onAction={onAction}/>}</AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SERVICE CARD
═══════════════════════════════════════════════════ */
function Card({ card, onAction, onLocked, onOpenDestination, cardStyle, accentColor }) {
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
        if (card.locked) {
          onLocked?.({
            title: card.title,
            message: card.lockMessage || "This service is currently unavailable.",
          });
          return;
        }

        if(card.id === "library-pass") {
          onAction("libraryUnavailable");
          return;
        }
        if(card.href && onOpenDestination?.(card.href)) return;
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
          {card.description ? (
            <p style={{ margin:"7px 0 0", fontSize:13, color:"#6b7280", lineHeight:1.55 }}>
              {card.description}
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ flex:1 }} />

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
function EchoChatbot({ onClose, echoConfig }) {
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
      setMessages(m => [...m, { from:"bot", text:getEchoReply(q, echoConfig) }]);
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
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
export default function ThaparPublicDashboard() {
  const navigate = useNavigate();
  const topRef = useRef(null);

  // ── state ──
  const [toast,   setToast]   = useState(null);
  const [modal,   setModal]   = useState(null);
  const [chat,    setChat]    = useState(false);
  const [lockModal, setLockModal] = useState(null);
  const [publicConfig, setPublicConfig] = useState(() =>
    normalizePublicUiConfig(DEFAULT_PUBLIC_UI_CONFIG)
  );

  useEffect(() => {
    let mounted = true;
    fetchPublicUiConfig()
      .then((config) => {
        if (mounted) setPublicConfig(config);
      })
      .catch(() => {
        if (mounted) setPublicConfig(normalizePublicUiConfig(DEFAULT_PUBLIC_UI_CONFIG));
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectorConfig = publicConfig.selector || DEFAULT_PUBLIC_UI_CONFIG.selector;
  const headerConfig = publicConfig.header || DEFAULT_PUBLIC_UI_CONFIG.header;
  const heroConfig = publicConfig.hero || DEFAULT_PUBLIC_UI_CONFIG.hero;
  const footerConfig = publicConfig.footer || DEFAULT_PUBLIC_UI_CONFIG.footer;
  const echoConfig = publicConfig.echo || DEFAULT_PUBLIC_UI_CONFIG.echo;
  const accentColor = selectorConfig.accentColor || "#c62828";
  const sectionMap = useMemo(
    () => new Map((publicConfig.sections || []).map((section) => [section.id, section])),
    [publicConfig.sections]
  );
  const isSectionEnabled = (id) => sectionMap.get(id)?.enabled !== false;
  const navigationItems = useMemo(
    () => [...(publicConfig.navigation || [])]
      .filter((item) => item?.enabled !== false)
      .sort((a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0)),
    [publicConfig.navigation]
  );
  const cardConfigMap = useMemo(
    () => new Map((selectorConfig.cards || []).map((card) => [card.id, card])),
    [selectorConfig.cards]
  );

  // ── derived cards list (global admin CMS config) ──
  const visibleCards = useMemo(() => {
    const order = selectorConfig.cardOrder || PUBLIC_CARD_IDS;
    return order
      .map(id => {
        const base = { id, title: "", sub: "", bullets: [] };
        const saved = cardConfigMap.get(id) || {};
        const visual = CARD_VISUALS[id] || {
          Icon: ICONS[saved.icon] || Sparkles,
          iconBg: "#f3f4f6",
          iconColor: saved.accentColor || accentColor,
          dot: saved.accentColor || accentColor,
        };
        return {
          ...base,
          ...saved,
          Icon: ICONS[saved.icon] || visual.Icon,
          iconBg: saved.iconBg || visual.iconBg,
          iconColor: saved.accentColor || saved.iconColor || visual.iconColor,
          dot: saved.accentColor || saved.dot || visual.dot,
          sub: saved.subtitle ?? base.sub,
          href: Object.prototype.hasOwnProperty.call(saved, "destination") ? saved.destination : "",
          bullets: Array.isArray(saved.features) ? saved.features : base.bullets,
        };
      })
      .filter(card => card.id !== "community-feedback" && card.enabled !== false);
  }, [selectorConfig.cardOrder, cardConfigMap, accentColor]);

  // ── grid cols from layoutStyle ──
  const layoutStyle = selectorConfig.layoutStyle || "grid-3";
  const gridCols = layoutStyle==="grid-4" ? "repeat(4,1fr)"
                 : layoutStyle==="grid-2" ? "repeat(2,1fr)"
                 : layoutStyle==="list" || layoutStyle==="horizontal" ? "1fr"
                 : layoutStyle==="compact" ? "repeat(4,minmax(0,1fr))"
                 : layoutStyle==="featured" ? "minmax(0,1.4fr) repeat(2,minmax(0,1fr))"
                 : layoutStyle==="bento" ? "repeat(6,minmax(0,1fr))"
                 : layoutStyle==="masonry" ? "repeat(3,minmax(0,1fr))"
                 : "repeat(3,1fr)";

  const act = a => {
    if (a==="home") topRef.current?.scrollIntoView({ behavior:"smooth" });
    else if (a==="cs")        setToast("Coming Soon!");
    else if (a==="q1")        setModal("q1");
    else if (a==="q2")        setModal("q2");
    else if (a==="about")     navigate("/about-us");
    else if (a==="community") navigate("/community-feedback");
    else if (a==="libraryUnavailable") setModal("libraryUnavailable");
  };

  // ── page background from theme ──
  const pageBg = THEME_BG[selectorConfig.themePreset] || "#ffffff";
  const cardStyle = selectorConfig.cardStyle === "glass"
    ? "default"
    : selectorConfig.cardStyle === "solid"
      ? "shadow"
      : selectorConfig.cardStyle || "default";
  const openDestination = (destination) => {
    if (!destination) return false;
    if (destination.startsWith("/")) {
      navigate(destination);
      return true;
    }
    if (/^https?:\/\//i.test(destination)) {
      window.open(destination, "_blank", "noopener,noreferrer");
      return true;
    }
    return false;
  };

  const handleCmsAction = (itemOrAction) => {
    if (!itemOrAction) return;
    if (typeof itemOrAction === "string") {
      act(itemOrAction);
      return;
    }
    if (itemOrAction.id === "library-pass" || itemOrAction.action === "libraryUnavailable") {
      act("libraryUnavailable");
      return;
    }
    if (itemOrAction.destination && openDestination(itemOrAction.destination)) return;
    if (itemOrAction.href && openDestination(itemOrAction.href)) return;
    if (itemOrAction.action) act(itemOrAction.action);
  };

  const renderCmsModal = (key) => {
    const modalConfig = publicConfig.modals?.[key];
    if (!modalConfig) return null;
    const blocks = Array.isArray(modalConfig.blocks)
      ? modalConfig.blocks.filter((block) => block?.enabled !== false)
      : [];
    const emails = Array.isArray(modalConfig.emails) ? modalConfig.emails.filter(Boolean) : [];
    const hasContent = modalConfig.description || emails.length || blocks.length;
    if (!hasContent) return null;

    return (
      <Modal title={modalConfig.title || ""} onClose={() => setModal(null)}>
        <div style={{ display:"flex", flexDirection:"column", gap:14,
                      fontSize:13.5, color:"#4b5563", lineHeight:1.65 }}>
          {modalConfig.description && <p>{modalConfig.description}</p>}
          {emails.map((email) => (
            <a key={email} href={`mailto:${email}`} style={{ color:"#2563eb", textDecoration:"none", fontWeight:500 }}>
              {email}
            </a>
          ))}
          {blocks.map((block) => (
            <div key={block.id || block.label}>
              {block.label && (
                <p style={{ fontSize:11, fontWeight:700, color:"#9ca3af",
                           textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>
                  {block.label}
                </p>
              )}
              {(block.lines || []).filter(Boolean).map((line) => (
                <p key={line} style={{ fontSize:13, color:"#4b5563", marginBottom:4 }}>{line}</p>
              ))}
              {(block.emails || []).filter(Boolean).map((email) => (
                <a key={email} href={`mailto:${email}`} style={{ color:"#2563eb", textDecoration:"none", fontWeight:500, display:"block", marginBottom:4 }}>
                  {email}
                </a>
              ))}
            </div>
          ))}
        </div>
      </Modal>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased}
        .card-grid{display:grid;gap:20px}
        .card-grid.layout-horizontal{display:flex;flex-direction:column}
        .card-grid.layout-compact{gap:14px}
        .card-grid.layout-compact > div article,.card-grid.layout-compact > div > div{min-height:170px}
        .card-grid.layout-bento > div:nth-child(1){grid-column:span 3}
        .card-grid.layout-bento > div:nth-child(2){grid-column:span 3}
        .card-grid.layout-bento > div{grid-column:span 2}
        .card-grid.layout-featured > div:first-child{grid-row:span 2}
        .card-grid.layout-masonry{align-items:start}
        .card-grid.layout-masonry > div:nth-child(3n+1){margin-top:24px}
        @media(max-width:960px){.card-grid{grid-template-columns:repeat(2,1fr)!important}}
        @media(max-width:960px){.card-grid.layout-bento > div,.card-grid.layout-featured > div:first-child{grid-column:auto!important;grid-row:auto!important;margin-top:0!important}}
        @media(max-width:600px){.card-grid{grid-template-columns:1fr!important}.card-grid.layout-masonry > div{margin-top:0!important}}
        .public-header-inner{max-width:1280px;margin:0 auto;padding:0 24px;min-height:96px;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .public-brand{display:flex;align-items:center;gap:12px;min-width:0;flex-shrink:0}
        .public-logo{height:clamp(56px,6vw,72px);width:auto;object-fit:contain;flex-shrink:0}
        .public-title{font-size:12.5px;font-weight:600;color:#111;line-height:1.2;margin:0}
        .public-subtitle{font-size:11px;color:#c62828;font-weight:500;margin:0}
        .public-login-btn{display:flex;align-items:center;justify-content:center;gap:6px;background:#c62828;color:#fff;font-size:12.5px;font-weight:600;padding:8px 16px;border-radius:6px;text-decoration:none;flex-shrink:0;white-space:nowrap}
        .footer-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:64px}
        .footer-link{display:flex;align-items:center;gap:9px;background:none;border:none;cursor:pointer;font-size:14px;color:#4b5563;font-family:inherit;padding:8px 0;text-decoration:none;text-align:left;line-height:1.35}
        .footer-link:hover{color:#c62828}
        .footer-link svg{color:#9ca3af;flex-shrink:0}
        .contact-block{display:flex;flex-direction:column;gap:6px;font-size:13.5px;color:#4b5563;line-height:1.55}
        .contact-label{font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em}
        .contact-email{color:#2563eb;text-decoration:none;font-weight:500;overflow-wrap:anywhere}
        .nav-row{display:flex}
        @media(max-width:1024px){.nav-row{display:none!important}}
        @media(max-width:767px){
          .public-header-inner{min-height:auto;padding:14px 16px;align-items:flex-start;flex-direction:column;gap:10px}
          .public-brand{width:100%;align-items:center}
          .public-logo{height:54px}
          .public-title{font-size:12px;line-height:1.25}
          .public-subtitle{font-size:10.5px;margin-top:2px}
          .public-login-btn{align-self:flex-end;min-height:34px;font-size:12px;padding:7px 13px;border-radius:999px}
          .footer-cols{grid-template-columns:1fr!important;gap:34px!important}
        }
        @media(min-width:768px) and (max-width:1024px){
          .public-header-inner{min-height:92px;padding:12px 22px}
          .public-brand{flex:1}
          .public-title{font-size:12.5px}
          .public-login-btn{max-width:220px}
          .footer-cols{gap:40px}
        }
      `}</style>

      <div ref={topRef} style={{ background: pageBg, minHeight:"100vh", transition:"background .3s" }}>

        {/* ══ NAVBAR ══════════════════════════════════ */}
        {headerConfig.announcement && (
          <div style={{ background: accentColor, color:"#fff", textAlign:"center", padding:"8px 16px", fontSize:13, fontWeight:600 }}>
            {headerConfig.announcement}
          </div>
        )}
        <header style={{ position:"sticky", top:0, zIndex:300, background:"#fff",
                         borderBottom:"1px solid #e5e7eb", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
          <div className="public-header-inner">
            {/* logo */}
            <div className="public-brand">
              {headerConfig.logoUrl && (
                <img src={headerConfig.logoUrl}
                  alt={headerConfig.logoAlt || "Logo"} className="public-logo"/>
              )}
              <div style={{ minWidth:0 }}>
                {headerConfig.title && (
                  <p className="public-title">
                    {headerConfig.title}
                  </p>
                )}
              </div>
            </div>
            {/* tabs */}
            {headerConfig.navigationVisible !== false && (
              <nav className="nav-row" style={{ alignItems:"center", gap:24, flex:1, justifyContent:"center" }}>
                {navigationItems.map(it => <NavItem key={it.id || it.title} item={it} onAction={handleCmsAction}/>)}
              </nav>
            )}
            {/* admin */}
            <a href={headerConfig.loginDestination || "/login"} target="_blank" rel="noopener noreferrer"
              className="public-login-btn">
              <LogIn size={13}/> Admin Login
            </a>
          </div>
          {headerConfig.topNotice && (
            <div style={{ borderTop:"1px solid #f3f4f6", textAlign:"center", padding:"7px 16px", fontSize:12.5, color:"#6b7280" }}>
              {headerConfig.topNotice}
            </div>
          )}
        </header>

        {/* ══ HERO ════════════════════════════════════ */}
        {heroConfig.enabled !== false && isSectionEnabled("hero") && (
        <div style={{ position: "relative", height: heroConfig.height || "70vh", minHeight: Number(heroConfig.minHeight || 480), overflow: "hidden" }}>
          {heroConfig.backgroundUrl && (
            <img
              src={heroConfig.backgroundUrl}
              alt={heroConfig.backgroundAlt || "Campus"}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
            />
          )}
          <div style={{ position: "absolute", inset: 0, background: heroConfig.overlay || "linear-gradient(to bottom, rgba(0,0,0,.25) 0%, rgba(0,0,0,.55) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
            {heroConfig.badge && <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
              style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.7)", letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 16 }}>
              {heroConfig.badge}
            </motion.p>}
            {heroConfig.title && <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25 }}
              style={{ fontFamily:"'EB Garamond',Georgia,serif", fontSize: "clamp(2.4rem,6vw,5rem)", fontWeight: 700, color: "#fff", lineHeight: 1.1, marginBottom: 20, maxWidth: 800 }}>
              {heroConfig.title}
            </motion.h1>}
            {heroConfig.subtitle && <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45 }}
              style={{ fontSize: 16, color: "rgba(255,255,255,.85)", maxWidth: 560, lineHeight: 1.7 }}>
              {heroConfig.subtitle}
            </motion.p>}
            {heroConfig.description && <p style={{ fontSize: 14, color: "rgba(255,255,255,.78)", maxWidth: 620, marginTop: 12, lineHeight: 1.7 }}>{heroConfig.description}</p>}
          </div>
        </div>
        )}

        {/* ══ CARDS ═══════════════════════════════════ */}
        {isSectionEnabled("services") && <section style={{ background:"transparent", padding:"120px 24px 80px" }}>
          <div className={`card-grid layout-${layoutStyle}`}
            style={{ maxWidth:1280, margin:"0 auto", gridTemplateColumns:gridCols }}>
            {visibleCards.map((c, i) => (
              <motion.div key={c.id}
                initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true, margin:"-20px" }}
                transition={{ duration:.35, delay:i*.06 }}>
                <Card card={c} onAction={act}
                  onLocked={setLockModal}
                  onOpenDestination={openDestination}
                  cardStyle={cardStyle}
                  accentColor={accentColor}/>
              </motion.div>
            ))}
          </div>
        </section>}

        {/* ══ FOOTER ══════════════════════════════════ */}
        {footerConfig.enabled !== false && isSectionEnabled("footer") && <footer style={{ background:"#f0f1f3", borderTop:"1px solid #e5e7eb" }}>
          <div className="footer-cols" style={{ maxWidth:1040, margin:"0 auto", padding:"48px 24px 40px" }}>
            <div>
              {footerConfig.quickLinksTitle && <p style={{ fontWeight:700, fontSize:15, color:"#111", marginBottom:14 }}>{footerConfig.quickLinksTitle}</p>}
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {(footerConfig.quickLinks || []).filter((link) => link?.enabled !== false).map((link) => {
                  const LinkIcon = ICONS[link.icon] || (
                    link.id === "home" ? Home :
                    link.id === "install" ? Package :
                    link.id === "signin" ? LogIn :
                    link.id === "societies" ? Users :
                    link.id === "about" ? Building2 :
                    link.id === "community" ? MessageSquare :
                    CalendarDays
                  );
                  return (
                    <button key={link.id || link.title} onClick={() => handleCmsAction(link)}
                      className="footer-link">
                      <LinkIcon size={15}/> {link.title}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              {footerConfig.contactTitle && <p style={{ fontWeight:700, fontSize:15, color:"#111", marginBottom:14 }}>{footerConfig.contactTitle}</p>}
              <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                {(footerConfig.contactBlocks || []).filter((block) => block?.enabled !== false).map((block) => (
                  <div key={block.id || block.label} className="contact-block">
                    {block.label && <span className="contact-label">{block.label}</span>}
                    {(block.lines || []).map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}
                    {(block.emails || []).map((email) => (
                      <a key={email} className="contact-email" href={`mailto:${email}`}>{email}</a>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </footer>}
      </div>{/* end page wrapper */}

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
        {footerConfig.copyright && <span style={{ fontSize:12, color:"#9ca3af", marginRight:10 }}>{footerConfig.copyright}</span>}
        {(footerConfig.legalLinks || []).filter((link) => link?.enabled !== false).map((link) => (
          <span key={link.id || link.title} style={{ display:"flex", alignItems:"center" }}>
            <span style={{ color:"#d1d5db", margin:"0 8px", fontSize:11 }}>|</span>
            <button
              onClick={() => handleCmsAction(link)}
              style={{
                background:"none", border:"none", cursor:"pointer",
                fontSize:12, fontWeight:500, color:"#6b7280",
                fontFamily:"inherit", padding:"2px 0",
                transition:"color .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color="#c62828"}
              onMouseLeave={e => e.currentTarget.style.color="#6b7280"}
            >
              {link.title}
            </button>
          </span>
        ))}
      </div>

      {/* ══ FIXED: ECHO AI CHATBOT ═══════════════════
          — EchoOrb bot face (floating mode)
          — full chat panel with keyword responses
      ═══════════════════════════════════════════════ */}
      {publicConfig.widgets?.echoEnabled !== false && isSectionEnabled("echo") && (
        <EchoOrb 
          mode="floating"
          onClick={() => setChat(v => !v)}
        />
      )}

      {/* Echo chat modal */}
      <AnimatePresence>
        {publicConfig.widgets?.echoEnabled !== false && isSectionEnabled("echo") && chat && (
          <EchoChatbot onClose={() => setChat(false)} echoConfig={echoConfig}/>
        )}
      </AnimatePresence>

      {/* ══ MODALS ══════════════════════════════════ */}
      <AnimatePresence>
        {lockModal && (
          <Modal title={lockModal.title || "Service Unavailable"} onClose={() => setLockModal(null)}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:12, background:"#fff7ed",
                            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Lock size={17} color="#c62828"/>
              </div>
              <p style={{ fontSize:14, color:"#4b5563", lineHeight:1.65, margin:0 }}>
                {lockModal.message || "This service is currently unavailable."}
              </p>
            </div>
          </Modal>
        )}
        {modal && renderCmsModal(modal)}
      </AnimatePresence>

      {/* ══ TOAST ═══════════════════════════════════ */}
      <AnimatePresence>
        {toast && <Toast msg={toast} onClose={() => setToast(null)}/>}
      </AnimatePresence>
    </>
  );
}
