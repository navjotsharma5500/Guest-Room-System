/* ─────────────────────────────────────────────
   LegalLayout.jsx  — shared navbar + hero + footer
   wrapper for License / Policies / Terms pages
   ───────────────────────────────────────────── */
import { useNavigate } from "react-router-dom";

const LOGO = "https://ik.imagekit.io/7khjnlfow/email-assets/thapar_logo.png";

export default function LegalLayout({ heroTitle, heroSub, eyebrow, pills = [], children }) {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
        .legal-footer-cols { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 48px; }
        @media (max-width: 768px) { .legal-footer-cols { grid-template-columns: 1fr !important; gap: 32px !important; } }
        .legal-footer-link { display:flex; align-items:center; gap:8px; font-size:13.5px; color:#4b5563; text-decoration:none; padding:2px 0; transition:color .15s; background:none; border:none; cursor:pointer; font-family:inherit; }
        .legal-footer-link:hover { color: #c62828; }
        .legal-divider { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
      `}</style>

      <div style={{ background: "#fff", minHeight: "100vh" }}>

        {/* ── NAVBAR ── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 300,
          background: "#fff", borderBottom: "1px solid #e5e7eb",
          boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        }}>
          <div style={{
            maxWidth: 1280, margin: "0 auto", padding: "0 24px",
            height: 70, display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 16,
          }}>
            {/* Logo */}
            <button
              onClick={() => navigate("/")}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                flexShrink: 0, background: "none", border: "none",
                cursor: "pointer", padding: 0,
              }}
            >
              <img src={LOGO} alt="Thapar" style={{ height: 42, width: "auto", objectFit: "contain" }} />
              <div style={{ textAlign: "left" }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: "#111", lineHeight: 1.2, margin: 0 }}>
                  Thapar Institute of Engineering and Technology
                </p>
                <p style={{ fontSize: 11, color: "#c62828", fontWeight: 500, margin: 0 }}>
                  Created by DoSA Office
                </p>
              </div>
            </button>

            {/* Nav links */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {[
                { label: "← Home",    path: "/" },
                { label: "License",   path: "/license" },
                { label: "Policies",  path: "/policies" },
                { label: "Terms",     path: "/terms" },
              ].map(({ label, path }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  style={{
                    fontSize: 12.5, fontWeight: 500, color: "#374151",
                    background: "none", border: "none", cursor: "pointer",
                    padding: "6px 10px", borderRadius: 6, fontFamily: "inherit",
                    transition: "color .15s, background .15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#c62828"; e.currentTarget.style.background = "#fef2f2"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#374151"; e.currentTarget.style.background = "none"; }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Admin badge */}
            <a
              href="https://campusconnect.thapar.edu/login"
              target="_blank" rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "#c62828", color: "#fff", fontSize: 12.5,
                fontWeight: 600, padding: "8px 16px", borderRadius: 6,
                textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap",
              }}
            >
              🔐 Admin / Staff Login
            </a>
          </div>
        </header>

        {/* ── HERO ── */}
        <div style={{
          position: "relative",
          background: "linear-gradient(135deg, #c62828 0%, #8b1a1a 100%)",
          padding: "64px 24px 56px", textAlign: "center", overflow: "hidden",
        }}>
          {/* subtle grid pattern */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "repeating-linear-gradient(45deg,rgba(255,255,255,.03) 0,rgba(255,255,255,.03) 1px,transparent 1px,transparent 40px),repeating-linear-gradient(-45deg,rgba(255,255,255,.03) 0,rgba(255,255,255,.03) 1px,transparent 1px,transparent 40px)",
          }}/>
          <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.65)", letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 14, position: "relative" }}>
            {eyebrow || "Thapar Campus Connect · v3.0.0"}
          </p>
          <h1 style={{
            fontFamily: "'EB Garamond', Georgia, serif",
            fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 700,
            color: "#fff", lineHeight: 1.1, marginBottom: 16, position: "relative",
          }}>
            {heroTitle}
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.8)", maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.7, position: "relative" }}>
            {heroSub}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap", position: "relative" }}>
            {pills.map((p, i) => (
              <span key={i} style={{
                background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)",
                color: "#fff", fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 100,
              }}>{p}</span>
            ))}
          </div>
        </div>

        {/* ── PAGE CONTENT ── */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "56px 24px 80px" }}>
          {children}
        </div>

        {/* ── FOOTER ── */}
        <footer style={{ background: "#f0f1f3", borderTop: "1px solid #e5e7eb" }}>
          <div className="legal-footer-cols" style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px 40px" }}>

            {/* Left */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <img src={LOGO} alt="Thapar" style={{ height: 36, width: "auto", objectFit: "contain" }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>Thapar Operations</span>
              </div>
              <p style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.7, maxWidth: 260 }}>
                Helping manage and streamline Thapar operations including bookings, permissions, and student services — all in one place.
              </p>
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 14 }}>
                © {new Date().getFullYear()} DoSA Office, TIET
              </p>
            </div>

            {/* Centre */}
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 14 }}>Legal</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "📄 License",  path: "/license" },
                  { label: "📜 Policies", path: "/policies" },
                  { label: "⚖️ Terms",    path: "/terms" },
                ].map(({ label, path }) => (
                  <button key={path} className="legal-footer-link" onClick={() => navigate(path)}>{label}</button>
                ))}
              </div>
            </div>

            {/* Right */}
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 14 }}>Contact Us</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5, color: "#4b5563", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🕐</span><span>Timings: 9 AM to 5:30 PM, Mon–Fri</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>✉️</span>
                  <a href="mailto:dosa.office@thapar.edu" style={{ color: "#2563eb", textDecoration: "none" }}>dosa.office@thapar.edu</a>
                </div>
              </div>
              <hr style={{ border: "none", borderTop: "1px solid #d1d5db", marginBottom: 14 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: "#6b7280" }}>
                <p>Powered by Thapar Institute of Engineering &amp; Technology</p>
                <p style={{ fontWeight: 700, color: "#374151" }}>Created and Maintained by DoSA Office</p>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            borderTop: "1px solid #d1d5db", background: "#e5e6e8",
            padding: "12px 24px", display: "flex", alignItems: "center",
            justifyContent: "space-between", flexWrap: "wrap", gap: 8,
          }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>Managed by DOSA Office</span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>Crafted by DoSA Office &nbsp;·&nbsp; Unauthorized usage strictly prohibited</span>
          </div>
        </footer>

      </div>
    </>
  );
}
