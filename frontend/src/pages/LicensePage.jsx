/* ─────────────────────────────────────────────
   LicensePage.jsx
   Route: /license
   ───────────────────────────────────────────── */
import LegalLayout from "../components/legal/LegalLayout";
import SectionBlock from "../components/legal/SectionBlock";
import ClauseList   from "../components/legal/ClauseList";

const HR = () => <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "32px 0" }} />;

export default function LicensePage() {
  return (
    <LegalLayout
      eyebrow="Thapar Campus Connect · v3.0.0"
      heroTitle={"Software License &\nUsage Agreement"}
      heroSub="Guest Room & Venue Management System — Intellectual Property of Thapar Institute of Engineering & Technology"
      pills={["✦ Production Active", "🔐 All Rights Reserved", "© 2026 TIET"]}
    >

      {/* ── COPYRIGHT CARD ── */}
      <div style={{
        background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16,
        padding: "28px 32px", display: "flex", alignItems: "center",
        gap: 20, marginBottom: 40, boxShadow: "0 1px 4px rgba(0,0,0,.05)",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 12, background: "#fce8e8",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, fontSize: 22,
        }}>©</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
            Copyright Notice
          </div>
          <div style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 20, fontWeight: 600, color: "#111", lineHeight: 1.2, marginBottom: 2 }}>
            Thapar Institute of Engineering &amp; Technology
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Patiala, Punjab, India &nbsp;·&nbsp; campusconnect.thapar.edu
          </div>
        </div>
        <div style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 36, fontWeight: 700, color: "#c62828", opacity: .15, flexShrink: 0, lineHeight: 1 }}>
          2026
        </div>
      </div>

      {/* ── OWNERSHIP ── */}
      <SectionBlock icon="⚖️" title="Intellectual Property & Ownership">
        <p style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.75 }}>
          This software system — including all source code, architecture, design patterns, database schemas,
          and business logic — is the exclusive intellectual property of Thapar Institute of Engineering &amp; Technology.
          All rights are unconditionally reserved under applicable intellectual property laws.
        </p>
      </SectionBlock>

      <HR />

      {/* ── USAGE RIGHTS ── */}
      <SectionBlock icon="✦" title="Permitted Usage">
        <ClauseList items={[
          { type: "allow",   text: "Internal use by authorized and credentialed institute personnel of TIET" },
          { type: "deny",    text: "Redistribution of this software in any form, digital or physical, to any third party" },
          { type: "deny",    text: "Modification of source code without express written permission from the institute" },
          { type: "deny",    text: "Commercial use or deployment outside the institutional boundaries of TIET" },
        ]} />
      </SectionBlock>

      <HR />

      {/* ── RESTRICTIONS ── */}
      <SectionBlock icon="🚫" title="Strict Prohibitions">
        <ClauseList items={[
          { type: "deny", text: "Copying, cloning, or redistribution of any part of the codebase or assets" },
          { type: "deny", text: "Reverse engineering, decompiling, or extracting system logic or architecture" },
          { type: "deny", text: "Deployment or use of this system for any commercial purposes outside the institute" },
          { type: "deny", text: "Sharing, disclosing, or transferring system credentials or access privileges to unauthorized individuals" },
        ]} />
      </SectionBlock>

      <HR />

      {/* ── LIABILITY ── */}
      <SectionBlock icon="◈" title="Limitation of Liability">
        <p style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.75, marginBottom: 14 }}>
          The institute assumes no liability whatsoever for the following:
        </p>
        <ClauseList items={[
          { type: "neutral", text: "Consequences arising from unauthorized use or deliberate misuse of the system" },
          { type: "neutral", text: "Any damages resulting from unsanctioned modifications to the codebase" },
          { type: "neutral", text: "Data loss or corruption occurring outside the official, sanctioned deployment environment" },
        ]} />
      </SectionBlock>

      <HR />

      {/* ── SECURITY ── */}
      <SectionBlock icon="🔐" title="Security Notice">
        <p style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.75, marginBottom: 14 }}>
          This system employs enterprise-grade security controls including secure JWT authentication via
          HttpOnly cookies, role-based access control (RBAC), HTTPS/TLS full encryption, rate limiting,
          CSRF protection, and Mongoose-based injection protection — compliant with OWASP Top 10 and GDPR principles.
        </p>
        <div style={{
          background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 12,
          padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c62828", flexShrink: 0, marginTop: 5 }} />
          <p style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.65, margin: 0 }}>
            Any misuse, breach attempt, credential sharing, or unauthorized access attempt will be treated as a{" "}
            <strong style={{ color: "#c62828" }}>formal security violation</strong> and pursued through appropriate
            institutional and legal channels.
          </p>
        </div>
      </SectionBlock>

      <HR />

      {/* ── CONTACT ── */}
      <SectionBlock icon="✉️" title="Contact & Permissions">
        <p style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.75, marginBottom: 12 }}>
          For licensing inquiries, permission requests, or any usage clarifications:
        </p>
        {[
          { icon: "✉️", label: "Official Administration", email: "dosa.office@thapar.edu" },
          { icon: "💻", label: "Technical Support",       email: "itmh@thapar.edu" },
        ].map(({ icon, label, email }) => (
          <div key={email} style={{
            border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px",
            display: "flex", alignItems: "center", gap: 14, background: "#f9fafb",
            marginTop: 10,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fce8e8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>{label}</div>
              <a href={`mailto:${email}`} style={{ fontSize: 14, fontWeight: 600, color: "#c62828", textDecoration: "none" }}>{email}</a>
            </div>
          </div>
        ))}
      </SectionBlock>

      {/* ── FINAL CARD ── */}
      <div style={{
        background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 16,
        padding: "24px 28px", textAlign: "center", marginTop: 40,
      }}>
        <h2 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 22, fontWeight: 600, color: "#111", marginBottom: 8 }}>
          Built for Institutional Excellence
        </h2>
        <p style={{ fontSize: 13.5, color: "#6b7280", lineHeight: 1.7, maxWidth: 500, margin: "0 auto 20px" }}>
          This system is a modular campus operating platform built for reliability, security, and long-term
          institutional service. Unauthorized usage is strictly prohibited.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {["✔ Scalable", "✔ Secure", "✔ Real-Time", "✔ Enterprise-Ready", "✔ OWASP Compliant"].map(tag => (
            <span key={tag} style={{
              fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 100,
              background: "#fce8e8", color: "#c62828", border: "1px solid #fecaca",
            }}>{tag}</span>
          ))}
        </div>
      </div>

    </LegalLayout>
  );
}
