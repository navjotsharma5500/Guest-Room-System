/* ─────────────────────────────────────────────
   ClauseList.jsx  — allow / deny / neutral items
   ───────────────────────────────────────────── */

const STYLES = {
  allow: {
    wrap:   { background: "#f0fdf4", border: "1px solid #bbf7d0" },
    badge:  { background: "#dcfce7", color: "#166534" },
    label:  "ALLOWED",
  },
  deny: {
    wrap:   { background: "#fff5f5", border: "1px solid #fecaca" },
    badge:  { background: "#fee2e2", color: "#991b1b" },
    label:  "NOT ALLOWED",
  },
  neutral: {
    wrap:   { background: "#f9fafb", border: "1px solid #e5e7eb" },
    badge:  { background: "#f3f4f6", color: "#6b7280" },
    label:  "RULE",
  },
  info: {
    wrap:   { background: "#eff6ff", border: "1px solid #bfdbfe" },
    badge:  { background: "#dbeafe", color: "#1d4ed8" },
    label:  "NOTE",
  },
  warn: {
    wrap:   { background: "#fffbeb", border: "1px solid #fde68a" },
    badge:  { background: "#fef3c7", color: "#92400e" },
    label:  "WARNING",
  },
};

/**
 * items = [{ type: "allow"|"deny"|"neutral"|"info"|"warn", label?: string, text: string }]
 */
export default function ClauseList({ items }) {
  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => {
        const s = STYLES[item.type] || STYLES.neutral;
        const badgeLabel = item.label || s.label;
        return (
          <li key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            padding: "12px 14px", borderRadius: 10,
            fontSize: 13.5, color: "#4b5563", lineHeight: 1.6,
            ...s.wrap,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: ".08em",
              padding: "3px 8px", borderRadius: 100,
              whiteSpace: "nowrap", flexShrink: 0, marginTop: 1,
              ...s.badge,
            }}>
              {badgeLabel}
            </span>
            <span>{item.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
