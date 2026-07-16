import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { buttonVisible, getImageUrl, imgOrFallback, isFilled } from "../../pages/publicGuestRoom/pageUtils";

export default function PublicHero({ hero = {}, badge }) {
  if (hero?.enabled === false || !isFilled(hero)) return null;
  const slide = getImageUrl(hero.image) ? hero : (hero.slides || []).find((item) => getImageUrl(item?.image)) || hero;
  const overlay = Number(hero.overlayOpacity ?? 0.46);
  const heroBadge = hero.badge || badge || "";
  const primaryButton = hero.primaryButtonConfig || {
    text: hero.primaryButton,
    href: hero.primaryButtonLink || "/guest-room/booking",
    visible: hero.primaryButtonVisible,
  };
  const secondaryButton = hero.secondaryButtonConfig || {
    text: hero.secondaryButton,
    href: hero.secondaryButtonLink || "/guest-room/rooms",
    visible: hero.secondaryButtonVisible,
  };

  return (
    <section className="guest-hero relative overflow-hidden">
      <img src={imgOrFallback(slide.image || hero.image)} alt={hero.title || ""} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, rgba(47,42,37,${overlay + 0.18}), rgba(47,42,37,${overlay * 0.7}), rgba(47,42,37,0.12))` }} />
      <div className="guest-shell relative z-10 flex min-h-[70vh] items-center py-20">
        <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-3xl text-white">
          {heroBadge && (
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} /> {heroBadge}
            </div>
          )}
          {hero.title && <h1 className="guest-heading text-5xl font-semibold leading-[1.04] md:text-7xl">{hero.title}</h1>}
          {hero.subtitle && <p className="mt-5 max-w-2xl text-lg leading-8 text-white/88">{hero.subtitle}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            {buttonVisible(primaryButton) && (
              <Link to={primaryButton.href || "#"} className="guest-button-primary inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition">
                {primaryButton.text || primaryButton.label} <ArrowRight size={18} />
              </Link>
            )}
            {buttonVisible(secondaryButton) && (
              <Link to={secondaryButton.href || "#"} className="guest-button-secondary inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition">
                {secondaryButton.text || secondaryButton.label}
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
