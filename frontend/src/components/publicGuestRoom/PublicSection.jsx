import React from "react";
import { motion } from "framer-motion";
import { isFilled } from "../../pages/publicGuestRoom/pageUtils";

export default function PublicSection({ eyebrow, title, text, children, className = "", enabled = true }) {
  if (enabled === false) return null;
  const cleanEyebrow = String(eyebrow || "").trim();
  const cleanTitle = String(title || "").trim();
  const cleanText = String(text || "").trim();
  if (!isFilled(cleanEyebrow) && !isFilled(cleanTitle) && !isFilled(cleanText) && !isFilled(children)) return null;
  return (
    <section className={`py-16 md:py-24 ${className}`}>
      <div className="guest-shell">
        {(cleanEyebrow || cleanTitle || cleanText) && (
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} className="mb-10 max-w-3xl">
            {cleanEyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-[var(--guest-red)]">{cleanEyebrow}</p>}
            {cleanTitle && <h2 className="guest-heading text-4xl font-semibold text-[var(--guest-blue)] md:text-5xl">{cleanTitle}</h2>}
            {cleanText && <p className="mt-4 text-base leading-8 text-[var(--guest-muted)]">{cleanText}</p>}
          </motion.div>
        )}
        {children}
      </div>
    </section>
  );
}
