import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Smartphone, ChevronRight, ChevronLeft,
  Check, MoreVertical, Share, Plus, ArrowUp,
} from "lucide-react";

/* ─────────────────────────────────────────
   STEP DATA
───────────────────────────────────────── */
const ANDROID_STEPS = [
  {
    number: 1,
    title: "Open the Chrome menu",
    desc: "Tap the three-dot menu (⋮) at the top-right corner of Chrome.",
    tip: "Make sure you are using Google Chrome browser",
    tipIcon: "💡",
    icon: <MoreVertical size={22} color="#374151" />,
    iconBg: "#f3f4f6",
    phone: "chrome-menu",
  },
  {
    number: 2,
    title: "Add to Home screen",
    desc: 'Scroll down the menu and tap "Add to Home screen".',
    tip: "You may need to scroll down in the Chrome menu to find this option",
    tipIcon: "💡",
    icon: <Plus size={22} color="#374151" />,
    iconBg: "#f3f4f6",
    phone: "add-home",
  },
  {
    number: 3,
    title: "Tap Add or Install",
    desc: 'A dialog will appear. Tap "Add" or "Install" to confirm.',
    tip: "You can rename the shortcut before adding",
    tipIcon: "💡",
    icon: <Check size={22} color="#fff" />,
    iconBg: "#22c55e",
    phone: "confirm-add",
  },
];

const IOS_STEPS = [
  {
    number: 1,
    title: "Tap the Share button",
    desc: "Tap the Share icon (□↑) at the bottom of Safari's toolbar.",
    tip: "Make sure you are using Safari browser on iOS",
    tipIcon: "💡",
    icon: <Share size={22} color="#374151" />,
    iconBg: "#f3f4f6",
    phone: "ios-share",
  },
  {
    number: 2,
    title: "Add to Home Screen",
    desc: 'Scroll down in the share sheet and tap "Add to Home Screen".',
    tip: "The option may require scrolling in the share sheet",
    tipIcon: "💡",
    icon: <Plus size={22} color="#374151" />,
    iconBg: "#f3f4f6",
    phone: "ios-add-home",
  },
  {
    number: 3,
    title: "Confirm — tap Add",
    desc: 'Tap "Add" in the top-right of the dialog. The app icon will appear on your Home Screen.',
    tip: "You can rename the shortcut before adding",
    tipIcon: "💡",
    icon: <Check size={22} color="#fff" />,
    iconBg: "#22c55e",
    phone: "ios-confirm",
  },
];

/* ─────────────────────────────────────────
   PHONE MOCKUP SCREENS
───────────────────────────────────────── */
function PhoneScreen({ type }) {
  const isIOS = type.startsWith("ios");

  // Chrome menu screen
  if (type === "chrome-menu") return (
    <div style={{ width: "100%", height: "100%", background: "#f9fafb", display: "flex", flexDirection: "column" }}>
      {/* address bar */}
      <div style={{ background: "#fff", padding: "8px 10px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 20, padding: "5px 10px", fontSize: 10, color: "#374151", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 8 }}>🔒</span>
          <span>campusconnect.thapar.edu</span>
        </div>
        <div style={{ background: "#fef3c7", borderRadius: 6, padding: "4px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 14, height: 2, background: "#92400e", borderRadius: 2 }}/>)}
        </div>
      </div>
      {/* page content skeleton */}
      <div style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#c62828" }}/>
          <div style={{ height: 8, background: "#d1d5db", borderRadius: 4, flex: 1 }}/>
          <div style={{ height: 8, background: "#d1d5db", borderRadius: 4, width: 40 }}/>
        </div>
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, width: "90%" }}/>
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, width: "75%" }}/>
        <div style={{ height: 44, background: "#fce8e8", borderRadius: 8, marginTop: 4 }}/>
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, width: "85%" }}/>
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, width: "60%" }}/>
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, width: "70%" }}/>
      </div>
      {/* dropdown menu overlay */}
      <div style={{ position: "absolute", top: 40, right: 10, background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,.15)", padding: "4px 0", width: 160, zIndex: 10 }}>
        {["New tab","New incognito tab","Bookmarks","Add to Home screen","Settings"].map((item, i) => (
          <div key={i} style={{ padding: "8px 14px", fontSize: 10, color: i === 3 ? "#c62828" : "#374151", fontWeight: i === 3 ? 600 : 400, background: i === 3 ? "#fef2f2" : "none" }}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );

  // Add to home screen dialog
  if (type === "add-home") return (
    <div style={{ width: "100%", height: "100%", background: "#f9fafb", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", padding: "8px 10px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 20, padding: "5px 10px", fontSize: 10, color: "#374151" }}>campusconnect.thapar.edu</div>
      </div>
      <div style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, width: "90%" }}/>
        <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, width: "70%" }}/>
        <div style={{ height: 40, background: "#fce8e8", borderRadius: 8, marginTop: 4 }}/>
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, width: "80%" }}/>
      </div>
      {/* Bottom sheet */}
      <div style={{ background: "#fff", borderRadius: "14px 14px 0 0", padding: 14, boxShadow: "0 -4px 20px rgba(0,0,0,.1)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#111", marginBottom: 10 }}>Add to Home screen</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f9fafb", borderRadius: 10, padding: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#c62828", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>T</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>Thapar Campus Connect</div>
            <div style={{ fontSize: 9, color: "#6b7280" }}>campusconnect.thapar.edu</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280" }}>Cancel</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#c62828" }}>Add</div>
        </div>
      </div>
    </div>
  );

  // Confirm/installed
  if (type === "confirm-add") return (
    <div style={{ width: "100%", height: "100%", background: "#f9fafb", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ background: "#f3f4f6", borderRadius: 20, padding: "5px 10px", fontSize: 10, color: "#374151" }}>campusconnect.thapar.edu</div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, padding: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "#c62828", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(198,40,40,.3)" }}>
          <span style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>T</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#111" }}>Thapar Campus Connect</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", borderRadius: 20, padding: "6px 14px" }}>
          <Check size={12} color="#16a34a"/>
          <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 600 }}>Added to Home Screen!</span>
        </div>
      </div>
    </div>
  );

  // iOS share
  if (type === "ios-share") return (
    <div style={{ width: "100%", height: "100%", background: "#f9fafb", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", padding: "8px 10px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, background: "#e5e7eb", borderRadius: 8, padding: "5px 10px", fontSize: 10, color: "#374151", textAlign: "center" }}>campusconnect.thapar.edu</div>
        <div style={{ display: "flex", gap: 8 }}>
          <ChevronLeft size={14} color="#007aff"/>
          <ChevronRight size={14} color="#ccc"/>
        </div>
      </div>
      <div style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, width: "90%" }}/>
        <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, width: "70%" }}/>
        <div style={{ height: 40, background: "#fce8e8", borderRadius: 8, marginTop: 4 }}/>
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, width: "80%" }}/>
      </div>
      {/* iOS toolbar */}
      <div style={{ background: "#f8f8f8", borderTop: "0.5px solid #d1d5db", padding: "8px 14px", display: "flex", justifyContent: "space-around" }}>
        {["←","→","↑","⊡","☰"].map((icon, i) => (
          <div key={i} style={{ fontSize: i === 2 ? 13 : 12, color: i === 2 ? "#007aff" : "#9ca3af", fontWeight: i === 2 ? 600 : 400 }}>{icon}</div>
        ))}
      </div>
      {/* Share sheet overlay */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderRadius: "18px 18px 0 0", padding: 12, boxShadow: "0 -4px 20px rgba(0,0,0,.12)", zIndex: 10 }}>
        <div style={{ width: 36, height: 4, background: "#d1d5db", borderRadius: 2, margin: "0 auto 10px" }}/>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
          {[
            { label: "AirDrop", color: "#007aff" },
            { label: "Message", color: "#22c55e" },
            { label: "Mail", color: "#3b82f6" },
            { label: "Add to\nHome", color: "#c62828", highlight: true },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 52 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: item.highlight ? "#fce8e8" : "#f3f4f6",
                border: item.highlight ? "2px solid #c62828" : "none",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 16, color: item.color }}>{i === 0 ? "📡" : i === 1 ? "💬" : i === 2 ? "✉️" : "+"}</span>
              </div>
              <span style={{ fontSize: 8, color: item.highlight ? "#c62828" : "#6b7280", fontWeight: item.highlight ? 700 : 400, whiteSpace: "pre", textAlign: "center" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // iOS add to home screen
  if (type === "ios-add-home") return (
    <div style={{ width: "100%", height: "100%", background: "#f0f0f5", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ background: "#e5e7eb", borderRadius: 8, padding: "5px 10px", fontSize: 10, color: "#374151", textAlign: "center" }}>campusconnect.thapar.edu</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 10, gap: 6 }}>
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, width: "90%" }}/>
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, width: "70%" }}/>
      </div>
      {/* iOS sheet */}
      <div style={{ background: "#fff", borderRadius: "14px 14px 0 0", padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 10, color: "#007aff" }}>Cancel</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>Add to Home Screen</span>
          <span style={{ fontSize: 10, color: "#007aff", fontWeight: 600 }}>Add</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f9fafb", borderRadius: 10, padding: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#c62828", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>T</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>Thapar Campus Connect</div>
            <div style={{ fontSize: 9, color: "#6b7280" }}>campusconnect.thapar.edu</div>
          </div>
        </div>
      </div>
    </div>
  );

  // iOS confirm
  if (type === "ios-confirm") return (
    <div style={{ width: "100%", height: "100%", background: "#f0f0f5", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ background: "#e5e7eb", borderRadius: 8, padding: "5px 10px", fontSize: 10, color: "#374151", textAlign: "center" }}>campusconnect.thapar.edu</div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, padding: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "#c62828", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(198,40,40,.3)" }}>
          <span style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>T</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#111" }}>Thapar Campus Connect</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", borderRadius: 20, padding: "6px 14px" }}>
          <Check size={12} color="#16a34a"/>
          <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 600 }}>Added to Home Screen!</span>
        </div>
      </div>
    </div>
  );

  return null;
}

/* ─────────────────────────────────────────
   PHONE FRAME
───────────────────────────────────────── */
function PhoneFrame({ type, isIOS }) {
  return (
    <div style={{ position: "relative", width: 200, height: 400, flexShrink: 0 }}>
      {/* phone body */}
      <div style={{
        position: "absolute", inset: 0,
        background: "#1a1a1a",
        borderRadius: 36,
        boxShadow: "0 20px 60px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.1)",
        overflow: "hidden",
      }}>
        {/* notch / dynamic island */}
        {isIOS ? (
          <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 80, height: 22, background: "#1a1a1a", borderRadius: 12, zIndex: 20 }}/>
        ) : (
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 10, height: 10, background: "#1a1a1a", borderRadius: "50%", zIndex: 20 }}/>
        )}

        {/* status bar */}
        <div style={{ height: 36, background: "#fff", display: "flex", alignItems: "flex-end", padding: "0 14px 4px", justifyContent: "space-between", position: "relative", zIndex: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#111" }}>9:41</span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
              {[3,5,7,9].map(h => <div key={h} style={{ width: 2, height: h, background: "#111", borderRadius: 1 }}/>)}
            </div>
            <span style={{ fontSize: 7 }}>📶</span>
            <span style={{ fontSize: 7 }}>🔋</span>
          </div>
        </div>

        {/* screen content */}
        <div style={{ position: "absolute", top: 36, bottom: isIOS ? 24 : 36, left: 0, right: 0, overflow: "hidden" }}>
          <PhoneScreen type={type} />
        </div>

        {/* home bar (iOS) or nav buttons (Android) */}
        {isIOS ? (
          <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", width: 80, height: 4, background: "#d1d5db", borderRadius: 2 }}/>
        ) : (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 36, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 30px" }}>
            {["□","○","‹"].map((s, i) => <span key={i} style={{ fontSize: 13, color: "#374151" }}>{s}</span>)}
          </div>
        )}
      </div>

      {/* side buttons */}
      <div style={{ position: "absolute", right: -3, top: 80, width: 3, height: 40, background: "#333", borderRadius: "0 3px 3px 0" }}/>
      <div style={{ position: "absolute", left: -3, top: 70, width: 3, height: 28, background: "#333", borderRadius: "3px 0 0 3px" }}/>
      <div style={{ position: "absolute", left: -3, top: 108, width: 3, height: 28, background: "#333", borderRadius: "3px 0 0 3px" }}/>
    </div>
  );
}

/* ─────────────────────────────────────────
   STEP LIST ITEM
───────────────────────────────────────── */
function StepListItem({ step, current, done }) {
  const bg = done ? "#f0fdf4" : current ? "#fef2f2" : "#fff";
  const borderColor = done ? "#86efac" : current ? "#fca5a5" : "#e5e7eb";
  const numBg = done ? "#22c55e" : current ? "#c62828" : "#e5e7eb";
  const numColor = done || current ? "#fff" : "#6b7280";
  const textColor = done ? "#374151" : current ? "#c62828" : "#6b7280";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 18px", borderRadius: 12,
      background: bg, border: `1px solid ${borderColor}`,
      transition: "all .25s",
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", background: numBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "background .25s",
      }}>
        {done
          ? <Check size={14} color="#fff" strokeWidth={3} />
          : <span style={{ fontSize: 13, fontWeight: 700, color: numColor }}>{step.number}</span>
        }
      </div>
      <span style={{ fontSize: 14, fontWeight: current ? 600 : 400, color: textColor, transition: "color .25s" }}>
        {step.title}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function InstallApp() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState("android"); // "android" | "ios"
  const [step, setStep] = useState(0); // 0-indexed

  const steps = platform === "android" ? ANDROID_STEPS : IOS_STEPS;
  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const isIOS = platform === "ios";

  const goNext = () => { if (!isLast) setStep(s => s + 1); };
  const goPrev = () => { if (!isFirst) setStep(s => s - 1); };

  const handlePlatform = (p) => { setPlatform(p); setStep(0); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #f0f1f3; -webkit-font-smoothing: antialiased; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f0f1f3", fontFamily: "'DM Sans', sans-serif" }}>

        {/* ─── HEADER ─── */}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <button onClick={() => navigate("/")} style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: 2 }}>
                <ArrowLeft size={16} color="#374151" />
              </button>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", lineHeight: 1.2, marginBottom: 4 }}>
                  Install the App
                </h1>
                <p style={{ fontSize: 13.5, color: "#6b7280" }}>
                  Add Thapar Campus Connect to your home screen
                </p>
              </div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Smartphone size={18} color="#374151" />
            </div>
          </div>

          {/* ─── PLATFORM TABS ─── */}
          <div style={{ display: "flex", background: "#e5e7eb", borderRadius: 12, padding: 4, marginTop: 20, gap: 4 }}>
            {[
              { value: "android", label: "Android Chrome" },
              { value: "ios", label: "iOS Safari" },
            ].map(p => (
              <button
                key={p.value}
                onClick={() => handlePlatform(p.value)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 9,
                  border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  background: platform === p.value ? "#fff" : "transparent",
                  color: platform === p.value ? "#111" : "#6b7280",
                  boxShadow: platform === p.value ? "0 1px 4px rgba(0,0,0,.1)" : "none",
                  transition: "all .2s",
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <div style={{ maxWidth: 760, margin: "20px auto 0", padding: "0 20px 40px" }}>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

            {/* Phone mockup */}
            <div style={{ flexShrink: 0, display: "flex", justifyContent: "center" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${platform}-${step}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.25 }}
                >
                  <PhoneFrame type={current.phone} isIOS={isIOS} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right panel */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Step detail card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`detail-${platform}-${step}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22 }}
                  style={{
                    background: "#fff", borderRadius: 16,
                    border: "1px solid #e5e7eb", padding: 22,
                    marginBottom: 12,
                    boxShadow: "0 1px 6px rgba(0,0,0,.05)",
                  }}
                >
                  {/* step number + icon row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#c62828", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{current.number}</span>
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: current.number === 3 ? "#22c55e" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {current.number === 3
                        ? <Check size={20} color="#fff" strokeWidth={2.5} />
                        : isIOS && current.number === 1
                          ? <Share size={20} color="#374151" />
                          : current.number === 2
                            ? <Plus size={20} color="#374151" />
                            : <MoreVertical size={20} color="#374151" />
                      }
                    </div>
                  </div>

                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 8 }}>
                    {current.title}
                  </h2>
                  <p style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.65, marginBottom: 16 }}>
                    {current.desc}
                  </p>

                  {/* tip */}
                  <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{current.tipIcon}</span>
                    <span style={{ fontSize: 12.5, color: "#713f12", lineHeight: 1.55 }}>{current.tip}</span>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Step list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {steps.map((s, i) => (
                  <StepListItem
                    key={s.number}
                    step={s}
                    current={i === step}
                    done={i < step}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
                <button
                  onClick={goPrev}
                  disabled={isFirst}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "12px 20px", borderRadius: 10,
                    background: "none", border: "none", cursor: isFirst ? "default" : "pointer",
                    fontSize: 14, fontWeight: 500, color: isFirst ? "#d1d5db" : "#374151",
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "color .2s",
                  }}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                {/* dot indicators */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      onClick={() => setStep(i)}
                      style={{
                        width: i === step ? 28 : 8,
                        height: 8,
                        borderRadius: 4,
                        background: i === step ? "#c62828" : "#d1d5db",
                        cursor: "pointer",
                        transition: "all .25s",
                      }}
                    />
                  ))}
                </div>

                {isLast ? (
                  <button
                    onClick={() => navigate("/")}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "12px 28px", borderRadius: 10,
                      background: "#c62828", border: "none", cursor: "pointer",
                      fontSize: 14, fontWeight: 700, color: "#fff",
                      fontFamily: "'DM Sans', sans-serif",
                      boxShadow: "0 4px 16px rgba(198,40,40,.3)",
                      transition: "background .2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#b71c1c"}
                    onMouseLeave={e => e.currentTarget.style.background = "#c62828"}
                  >
                    Done ✓
                  </button>
                ) : (
                  <button
                    onClick={goNext}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "12px 28px", borderRadius: 10,
                      background: "#c62828", border: "none", cursor: "pointer",
                      fontSize: 14, fontWeight: 700, color: "#fff",
                      fontFamily: "'DM Sans', sans-serif",
                      boxShadow: "0 4px 16px rgba(198,40,40,.3)",
                      transition: "background .2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#b71c1c"}
                    onMouseLeave={e => e.currentTarget.style.background = "#c62828"}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
