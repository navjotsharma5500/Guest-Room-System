import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { imgOrFallback, hasImage } from "../../pages/publicGuestRoom/pageUtils";

export default function PublicStayJourney3D({ steps = [] }) {
  return (
    <div className="guest-step-perspective grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, index) => (
        <motion.article
          key={`${step.title}-${index}`}
          initial={{ opacity: 0, rotateX: 10, y: 28 }}
          whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ delay: index * 0.04, duration: 0.5 }}
          whileHover={{ y: -8, rotateX: 3, rotateY: index % 2 ? -4 : 4 }}
          className="guest-step-card guest-card rounded-[2rem] p-6"
          style={{
            background: step.backgroundColor || undefined,
            width: step.cardWidth || undefined,
            minHeight: step.cardHeight || undefined,
          }}
        >
          {hasImage(step.image) && (
            <img src={imgOrFallback(step.image)} alt={step.title || ""} className="mb-5 h-36 w-full rounded-2xl object-cover" />
          )}
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5e5d8] text-[var(--guest-red)]">
            <CheckCircle2 />
          </div>
          {step.kicker && <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--guest-red)]">{step.kicker}</p>}
          {step.title && <h3 className="guest-heading mt-2 text-2xl font-semibold text-[var(--guest-blue)]">{step.title}</h3>}
          {step.description && <p className="mt-3 text-sm leading-6 text-[var(--guest-muted)]">{step.description}</p>}
          {step.buttonText && (
            <a href={step.buttonUrl || "#"} className="guest-button-secondary mt-5 inline-flex rounded-full px-4 py-2 text-sm font-semibold">
              {step.buttonText}
            </a>
          )}
        </motion.article>
      ))}
    </div>
  );
}
