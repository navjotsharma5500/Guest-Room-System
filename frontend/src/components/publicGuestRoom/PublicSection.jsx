import React from "react";
import { motion } from "framer-motion";
import { isFilled } from "../../pages/publicGuestRoom/pageUtils";

export default function PublicSection({ eyebrow, title, text, children, className = "", enabled = true }) {
  if (enabled === false) return null;
  if (!isFilled(eyebrow) && !isFilled(title) && !isFilled(text) && !isFilled(children)) return null;
  return (
    <section className={`py-16 md:py-24 ${className}`}>
      <div className="guest-shell">
        {(eyebrow || title || text) && (
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} className="mb-10 max-w-3xl">
            {eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-[var(--guest-red)]">{eyebrow}</p>}
            {title && <h2 className="guest-heading text-4xl font-semibold text-[var(--guest-blue)] md:text-5xl">{title}</h2>}
            {text && <p className="mt-4 text-base leading-8 text-[var(--guest-muted)]">{text}</p>}
          </motion.div>
        )}
        {children}
      </div>
    </section>
  );
}
