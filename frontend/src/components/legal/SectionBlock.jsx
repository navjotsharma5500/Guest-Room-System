/* ─────────────────────────────────────────────
   SectionBlock.jsx  — reusable legal section card
   ───────────────────────────────────────────── */
export default function SectionBlock({ icon, title, description, children, style = {} }) {
  return (
    <div style={{
      marginBottom: 32,
      ...style,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        marginBottom: 16, paddingBottom: 14,
        borderBottom: "1px solid #f3f4f6",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "#fce8e8", display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>
          {icon}
        </div>
        <h2 style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: 20, fontWeight: 600, color: "#111", margin: 0,
        }}>
          {title}
        </h2>
      </div>

      {/* Optional description */}
      {description && (
        <p style={{
          fontSize: 13.5, color: "#4b5563",
          lineHeight: 1.75, marginBottom: 14,
        }}>
          {description}
        </p>
      )}

      {/* Children (ClauseList, tables, etc.) */}
      {children}
    </div>
  );
}
