/* ─────────────────────────────────────────────
   TermsPage.jsx
   Route: /terms
   ───────────────────────────────────────────── */
import LegalLayout from "../components/legal/LegalLayout";
import SectionBlock from "../components/legal/SectionBlock";
import ClauseList   from "../components/legal/ClauseList";

const HR = () => <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "32px 0" }} />;

function HighlightBox({ children }) {
  return (
    <div style={{
      background: "#fff5f5", border: "1px solid #fecaca",
      borderRadius: 12, padding: "16px 18px",
      display: "flex", alignItems: "flex-start", gap: 12, marginTop: 12,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c62828", flexShrink: 0, marginTop: 5 }} />
      <p style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.65, margin: 0 }}>{children}</p>
    </div>
  );
}

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Thapar Campus Connect · Legal Center"
      heroTitle={"Terms &\nConditions"}
      heroSub="By accessing or using Thapar Campus Connect, you agree to be bound by these terms. Please read them carefully."
      pills={["⚖️ Terms of Use", "🔐 User Responsibilities", "🚫 Prohibited Actions", "📋 Enforcement"]}
    >

      {/* ══ ACCEPTANCE ════════════════════════════════ */}
      <SectionBlock
        icon="📋"
        title="1. Acceptance of Terms"
        description="By accessing, using, or interacting with any feature of Thapar Campus Connect — including Guest Room Booking, Venue Booking, Event Calendar, Night Pass, or any other module — you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions."
      >
        <ClauseList items={[
          { type: "neutral", text: "These terms apply to all users: students, faculty, staff, and caretaker personnel" },
          { type: "neutral", text: "Continued use of the system constitutes acceptance of any updates to these terms" },
          { type: "info",    text: "Terms are enforced under the institutional authority of Thapar Institute of Engineering & Technology" },
        ]} />
      </SectionBlock>

      <HR />

      {/* ══ USER RESPONSIBILITIES ═════════════════════ */}
      <SectionBlock icon="👤" title="2. User Responsibilities">
        <ClauseList items={[
          { type: "allow",   text: "Use the system only for legitimate institutional purposes as an authorized user" },
          { type: "allow",   text: "Provide accurate, truthful, and complete information in all booking forms" },
          { type: "allow",   text: "Upload only genuine and valid documents when address proof or attachments are required" },
          { type: "allow",   text: "Make payments promptly to avoid being marked as a defaulter" },
          { type: "allow",   text: "Report any technical issues or discrepancies to the DoSA Office or support team" },
          { type: "neutral", text: "You are responsible for all actions performed using your institutional credentials" },
        ]} />
      </SectionBlock>

      <HR />

      {/* ══ PROHIBITED ACTIONS ════════════════════════ */}
      <SectionBlock icon="🚫" title="3. Prohibited Actions">
        <ClauseList items={[
          { type: "deny", text: "Unauthorized access to any section of the system without proper credentials" },
          { type: "deny", text: "Sharing, transferring, or disclosing login credentials to any other person" },
          { type: "deny", text: "Submitting false, forged, or misleading documents or information in any form" },
          { type: "deny", text: "Attempting to bypass, exploit, or tamper with any booking logic, approval workflow, or payment system" },
          { type: "deny", text: "Reverse engineering, decompiling, scraping, or extracting any system data or logic" },
          { type: "deny", text: "Using the system for any commercial purpose outside the institutional boundary" },
          { type: "deny", text: "Booking guest rooms or venues on behalf of unauthorized third parties" },
          { type: "deny", text: "Interfering with or disrupting system availability, security, or other users' access" },
        ]} />

        <HighlightBox>
          Any of the above actions constitutes a <strong style={{ color: "#c62828" }}>formal violation</strong> and will be escalated to institutional authorities for appropriate action.
        </HighlightBox>
      </SectionBlock>

      <HR />

      {/* ══ SYSTEM ACCESS RULES ═══════════════════════ */}
      <SectionBlock icon="🔐" title="4. System Access Rules">
        <ClauseList items={[
          { type: "neutral", text: "Access to the system is restricted to users with valid institutional credentials" },
          { type: "neutral", text: "Role-based access control (RBAC) is strictly enforced — users can only access their assigned modules" },
          { type: "neutral", text: "JWT tokens are issued via secure HttpOnly cookies — tokens are never accessible on the client side" },
          { type: "deny",    text: "Attempting to access admin or staff dashboards without authorized credentials is strictly forbidden" },
          { type: "info",    text: "All sessions are monitored — suspicious access patterns may trigger automatic lockout" },
        ]} />
      </SectionBlock>

      <HR />

      {/* ══ DATA & PRIVACY ════════════════════════════ */}
      <SectionBlock
        icon="🗄️"
        title="5. Data Collection & Privacy"
        description="By using this system you consent to the collection and use of the following data for booking operations and institutional analytics:"
      >
        <ClauseList items={[
          { type: "neutral", text: "Personal identifiers: name, email address, contact number" },
          { type: "neutral", text: "Identity documents: address proof and any other uploaded attachments" },
          { type: "allow",   text: "Data is used solely for processing bookings, approvals, and restricted DoSA-level analytics" },
          { type: "deny",    text: "No personal data is shared with any third party under any circumstance" },
          { type: "neutral", text: "Data is stored securely and access is restricted to authorized DoSA personnel only" },
        ]} />
      </SectionBlock>

      <HR />

      {/* ══ LIABILITY ═════════════════════════════════ */}
      <SectionBlock
        icon="⚖️"
        title="6. Limitation of Liability"
        description="Thapar Institute of Engineering & Technology and the DoSA Office shall not be held liable for:"
      >
        <ClauseList items={[
          { type: "neutral", text: "Consequences arising from unauthorized use or misuse of the system by any user" },
          { type: "neutral", text: "Data loss resulting from user error, unsanctioned modifications, or force majeure events" },
          { type: "neutral", text: "Financial loss due to non-refundable payments made before check-in against institutional advice" },
          { type: "neutral", text: "Any damages resulting from third-party interference or unauthorized access outside official deployment" },
        ]} />
      </SectionBlock>

      <HR />

      {/* ══ ENFORCEMENT ═══════════════════════════════ */}
      <SectionBlock icon="⚠️" title="7. Enforcement & Consequences">
        <p style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.75, marginBottom: 14 }}>
          Violations of these Terms may result in one or more of the following actions at the sole discretion of the institution:
        </p>
        <ClauseList items={[
          { type: "warn", text: "Immediate suspension of system access without prior notice" },
          { type: "warn", text: "Account blocked from making future bookings until investigation is complete" },
          { type: "warn", text: "Escalation to institutional disciplinary committee or warden" },
          { type: "warn", text: "Legal or institutional action as deemed appropriate by TIET authorities" },
        ]} />

        <HighlightBox>
          The institution reserves the right to modify these terms at any time. Continued use of the system after any modification constitutes your acceptance of the updated terms.
        </HighlightBox>
      </SectionBlock>

      <HR />

      {/* ══ FINAL NOTE ════════════════════════════════ */}
      <div style={{
        background: "#f9fafb", border: "1px solid #e5e7eb",
        borderRadius: 16, padding: "24px 28px", textAlign: "center",
      }}>
        <h2 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 22, fontWeight: 600, color: "#111", marginBottom: 8 }}>
          Institutional Commitment
        </h2>
        <p style={{ fontSize: 13.5, color: "#6b7280", lineHeight: 1.7, maxWidth: 500, margin: "0 auto 20px" }}>
          This system is designed for secure institutional use. All policies and terms are strictly enforced to protect students, staff, and the institute.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {["✔ Secure", "✔ Fair", "✔ Transparent", "✔ Institutional", "✔ Enforced"].map(t => (
            <span key={t} style={{
              fontSize: 12, fontWeight: 600, padding: "4px 12px",
              borderRadius: 100, background: "#fce8e8", color: "#c62828", border: "1px solid #fecaca",
            }}>{t}</span>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 20 }}>
          © 2026 Thapar Institute of Engineering &amp; Technology · All rights reserved
        </p>
      </div>

    </LegalLayout>
  );
}
