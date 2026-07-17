import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { imgOrFallback, hasImage } from "../../pages/publicGuestRoom/pageUtils";

export default function PublicStayJourney3D({ steps = [] }) {
  return (
    <div className="guest-step-perspective -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 md:-mx-6 md:px-6 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-0 lg:pb-0 xl:gap-3">
      {steps.map((step, index) => (
        <motion.article
          key={`${step.title}-${index}`}
          initial={{ opacity: 0, rotateX: 10, y: 28 }}
          whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ delay: index * 0.04, duration: 0.5 }}
          whileHover={{ y: -8, rotateX: 3, rotateY: index % 2 ? -4 : 4 }}
          className="guest-step-card guest-card min-w-0 flex-[0_0_78%] snap-start rounded-[1.6rem] p-4 sm:flex-[0_0_18rem] md:flex-[0_0_16rem] lg:flex-none xl:p-3"
          style={{
            background: step.backgroundColor || undefined,
            width: step.cardWidth || undefined,
            minHeight: step.cardHeight || undefined,
          }}
        >
          {hasImage(step.image) && (
            <img src={imgOrFallback(step.image)} alt={step.title || ""} className="mb-4 h-28 w-full rounded-2xl object-cover lg:h-24" />
          )}
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5e5d8] text-[var(--guest-red)]">
            <CheckCircle2 size={20} />
          </div>
          {step.kicker && <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--guest-red)]">{step.kicker}</p>}
          {step.title && <h3 className="guest-heading mt-2 text-lg font-semibold leading-snug text-[var(--guest-blue)] xl:text-base">{step.title}</h3>}
          {step.description && <p className="mt-2 text-xs leading-5 text-[var(--guest-muted)] xl:text-[0.78rem]">{step.description}</p>}
          {step.buttonText && (
            <a href={step.buttonUrl || "#"} className="guest-button-secondary mt-4 inline-flex rounded-full px-4 py-2 text-xs font-semibold">
              {step.buttonText}
            </a>
          )}
        </motion.article>
      ))}
    </div>
  );
}
