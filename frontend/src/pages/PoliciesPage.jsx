/* ─────────────────────────────────────────────
   PoliciesPage.jsx
   Route: /policies
   ───────────────────────────────────────────── */
import LegalLayout from "../components/legal/LegalLayout";
import SectionBlock from "../components/legal/SectionBlock";
import ClauseList   from "../components/legal/ClauseList";

/* ── inline mini-table helper ── */
function Table({ rows }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr>
            {rows[0].map((h, i) => (
              <th key={i} style={{
                textAlign: "left", padding: "10px 14px",
                background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
                fontWeight: 600, color: "#374151", fontSize: 12,
                textTransform: "uppercase", letterSpacing: ".06em",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, ri) => (
            <tr key={ri} style={{ borderBottom: "1px solid #f3f4f6" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "10px 14px", color: "#4b5563" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── small info box ── */
function InfoBox({ children, color = "#eff6ff", border = "#bfdbfe" }) {
  return (
    <div style={{
      background: color, border: `1px solid ${border}`,
      borderRadius: 10, padding: "12px 16px",
      fontSize: 13.5, color: "#4b5563", lineHeight: 1.65,
      marginTop: 12,
    }}>
      {children}
    </div>
  );
}

const HR = () => <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "32px 0" }} />;

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */
export default function PoliciesPage() {
  return (
    <LegalLayout
      eyebrow="Thapar Campus Connect · Legal Center"
      heroTitle={"Policies &\nLegal Center"}
      heroSub="Official operational policies governing Guest Room Bookings, Venue Bookings, Payments, Privacy, and System Usage."
      pills={["📜 Guest Room Policy", "🏛️ Venue Policy", "💳 Payment Policy", "🔐 Privacy Policy"]}
    >

      {/* ══ SECTION 1: GUEST ROOM ══════════════════════ */}
      <SectionBlock icon="🏨" title="Guest Room Booking Policies">

        {/* 1.1 Eligibility */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8, marginTop: 4 }}>
          1. Eligibility &amp; Booking Methods
        </p>

        <p style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>
          🔹 Enquiry Booking (Public Form)
        </p>
        <ClauseList items={[
          { type: "allow",   text: "Thapar students, faculty, and staff with an official Thapar email ID" },
          { type: "allow",   text: "Address proof attachment is mandatory for all enquiry bookings" },
          { type: "neutral", text: "Maximum booking duration: 5 days — requests beyond 5 days are automatically restricted" },
        ]} />

        <p style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 6, marginTop: 16 }}>
          🔹 Direct Booking (Offline — Caretaker Assisted)
        </p>
        <ClauseList items={[
          { type: "allow",   text: "Available only for Thapar students with warden approval" },
          { type: "allow",   text: "Form is filled by the hostel caretaker; external email IDs are permitted" },
          { type: "neutral", text: "Maximum duration: 3 days — longer stays require a formal Extension approval" },
          { type: "info",    text: "Guest receives an official confirmation email with booking dates, room details, and payment instructions" },
        ]} />

        <HR />

        {/* 1.2 Approval */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          2. Approval Workflow
        </p>
        <ClauseList items={[
          { type: "neutral", text: "All enquiries are manually reviewed by the Hostel Manager for room availability and document validity" },
          { type: "info",    text: "After approval, guest receives an official email with hostel name, room number, and payment details" },
          { type: "warn",    text: "Guest must physically check in within 23 hours of approval — no exceptions" },
          { type: "deny",    text: "Failure to check in within 23 hours results in automatic system cancellation" },
        ]} />

        <HR />

        {/* 1.3 No-Show */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          3. No-Show Policy
        </p>
        <InfoBox color="#fff5f5" border="#fecaca">
          ⏱ If guest does not report within <strong style={{ color: "#c62828" }}>23 hours from approval time</strong>, the booking is automatically cancelled by the system.
        </InfoBox>

        <HR />

        {/* 1.4 Payment */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          4. Payment Policy
        </p>
        <ClauseList items={[
          { type: "info",    text: "Payment is strongly advised at the time of check-in, not before" },
          { type: "warn",    text: "Early payment is discouraged — if the guest cancels or reduces stay, payment is non-refundable" },
          { type: "allow",   text: "Partial payment is available — remaining balance is recalculated on checkout" },
          { type: "neutral", text: "Department-sponsored payment is available with DoSA approval for institute guests" },
        ]} />

        <Table rows={[
          ["Scenario", "Outcome"],
          ["Full payment, early checkout", "❌ No refund"],
          ["Partial payment, early checkout", "✅ Recalculated"],
          ["No payment on checkout", "⚠️ Marked as Defaulter"],
        ]} />

        <HR />

        {/* 1.5 Stay Calculation */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          5. Stay Calculation Rules
        </p>
        <ClauseList items={[
          { type: "neutral", text: "Minimum stay is 1 day — even a 1-hour stay counts as a full day" },
          { type: "neutral", text: "Billing is based on the midnight cycle" },
        ]} />

        <HR />

        {/* 1.6 Extension */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          6. Extension Policy
        </p>
        <ClauseList items={[
          { type: "neutral", text: "Extensions can only be initiated by the hostel caretaker — not the guest" },
          { type: "neutral", text: "Caretaker must provide: revised dates, reason for extension, and supporting attachment" },
          { type: "info",    text: "Extension request is submitted to DoSA Office for approval — guest is notified by email on decision" },
        ]} />

        <HR />

        {/* 1.7 Defaulter */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          7. Defaulter Policy
        </p>
        <ClauseList items={[
          { type: "deny", text: "A guest is marked as Defaulter if checkout is completed with pending payment" },
          { type: "deny", text: "Defaulter guests receive payment reminder emails automatically" },
          { type: "deny", text: "Future check-in is blocked for defaulters until all dues are cleared" },
          { type: "info", text: "Caretaker is notified of pending dues at the time of any future check-in attempt" },
        ]} />

        <HR />

        {/* 1.8 Department Booking */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          8. Department Booking Policy
        </p>
        <ClauseList items={[
          { type: "allow",   text: "Thapar departments can sponsor guest stays with full payment responsibility" },
          { type: "neutral", text: "Requires formal DoSA Office approval before booking is confirmed" },
        ]} />

        <HR />

        {/* 1.9 Feedback */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          9. Feedback System
        </p>
        <ClauseList items={[
          { type: "info",    text: "A feedback email is sent to the guest automatically on checkout" },
          { type: "info",    text: "QR code available inside rooms for direct feedback scanning" },
          { type: "neutral", text: "All feedback is directly reviewed by the DoSA Office" },
        ]} />
      </SectionBlock>

      <HR />

      {/* ══ SECTION 2: VENUE ═══════════════════════════ */}
      <SectionBlock icon="🏛️" title="Venue Booking Policies">

        {/* 2.1 Eligibility */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8, marginTop: 4 }}>
          1. Eligibility
        </p>
        <ClauseList items={[
          { type: "allow", text: "Student societies (with president and society details)" },
          { type: "allow", text: "Faculty members" },
          { type: "allow", text: "External student organizers" },
        ]} />

        <HR />

        {/* 2.2 Booking Process */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          2. Booking Process
        </p>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>
          🔹 Enquiry Booking (Online Form)
        </p>
        <ClauseList items={[
          { type: "neutral", text: "Fill form with event details, society info, reason, and all required attachments" },
          { type: "info",    text: "Venue availability can be checked on the form or via the Event Calendar before submission" },
        ]} />

        <p style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 6, marginTop: 16 }}>
          🔹 Direct Booking (Office-Based)
        </p>
        <ClauseList items={[
          { type: "neutral", text: "Handled directly by DoSA or DD Office staff — office verifies and fills the form" },
          { type: "info",    text: "Booking person receives confirmation email with full venue, date, and important details" },
        ]} />

        <HR />

        {/* 2.3 Approval */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          3. Approval Policy
        </p>
        <ClauseList items={[
          { type: "neutral", text: "ALL bookings require manual approval — there is no auto-approval" },
          { type: "info",    text: "Bookings are approved or rejected by DoSA Office or DD Office" },
          { type: "info",    text: "Both the booking person and the society receive email notification on approval or rejection" },
        ]} />

        <HR />

        {/* 2.4 Priority */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          4. Priority Rules
        </p>
        <ClauseList items={[
          { type: "neutral", text: "Equal priority is given to student society events and institutional events" },
        ]} />

        <HR />

        {/* 2.5 Time Rules */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          5. Time &amp; Availability Rules
        </p>
        <ClauseList items={[
          { type: "deny",    text: "Strict NO overlap policy — two events cannot be booked for the same venue at the same time" },
          { type: "neutral", text: "Venue availability must be verified before submitting a booking request" },
        ]} />

        <HR />

        {/* 2.6 Cancellation */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          6. Cancellation Policy
        </p>
        <ClauseList items={[
          { type: "allow",   text: "Bookings can be cancelled at any time by authorized staff" },
          { type: "neutral", text: "No penalty is applied for cancellations" },
        ]} />

        <HR />

        {/* 2.7 Payment */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          7. Payment Policy
        </p>
        <ClauseList items={[
          { type: "allow", text: "No payment is required for venue bookings — venue usage is free of charge" },
        ]} />
      </SectionBlock>

      <HR />

      {/* ══ SECTION 3: PAYMENT ════════════════════════ */}
      <SectionBlock icon="💳" title="Billing & Payment Policy">
        <ClauseList items={[
          { type: "deny",    text: "No refunds for completed guest room bookings with full payment" },
          { type: "allow",   text: "Partial payments are adjusted and recalculated on early checkout" },
          { type: "allow",   text: "Department-sponsored payments are permitted with DoSA authorization" },
          { type: "neutral", text: "Defaulter tracking is enforced — unpaid dues block future check-ins" },
          { type: "allow",   text: "Venue bookings carry zero payment obligation" },
        ]} />
      </SectionBlock>

      <HR />

      {/* ══ SECTION 4: PRIVACY ════════════════════════ */}
      <SectionBlock icon="🔐" title="Privacy Policy">
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8, marginTop: 4 }}>
          Data Collected
        </p>
        <ClauseList items={[
          { type: "neutral", text: "Full name of the guest or booking requester" },
          { type: "neutral", text: "Email address (official or external, depending on booking method)" },
          { type: "neutral", text: "Contact number" },
          { type: "neutral", text: "ID proof documents (uploaded files stored securely)" },
        ]} />

        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8, marginTop: 20 }}>
          Data Usage
        </p>
        <ClauseList items={[
          { type: "allow",   text: "Used exclusively for booking processing and approval workflows" },
          { type: "allow",   text: "Analytics are shared only with the DoSA Office — not accessible to all staff" },
          { type: "deny",    text: "No data is shared with any third party, external organization, or individual" },
          { type: "neutral", text: "All data access is restricted to authorized internal personnel only" },
        ]} />
      </SectionBlock>

    </LegalLayout>
  );
}
