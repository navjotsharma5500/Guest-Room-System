import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { getImageUrl, imgOrFallback } from "../../pages/publicGuestRoom/pageUtils";

export default function PublicHero({ hero = {}, badge = "Institute Hospitality" }) {
  const slide = getImageUrl(hero.image) ? hero : (hero.slides || []).find((item) => getImageUrl(item?.image)) || hero;
  const overlay = Number(hero.overlayOpacity ?? 0.46);

  return (
    <section className="guest-hero relative overflow-hidden">
      <img src={imgOrFallback(slide.image || hero.image)} alt={hero.title || "Guest rooms"} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, rgba(47,42,37,${overlay + 0.18}), rgba(47,42,37,${overlay * 0.7}), rgba(47,42,37,0.12))` }} />
      <div className="guest-shell relative z-10 flex min-h-[70vh] items-center py-20">
        <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-3xl text-white">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
            <Sparkles size={16} /> {badge}
          </div>
          <h1 className="guest-heading text-5xl font-semibold leading-[1.04] md:text-7xl">{hero.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/88">{hero.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {hero.primaryButtonVisible !== false && (
              <Link to={hero.primaryButtonLink || "/guest-room/booking"} className="guest-button-primary inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition">
                {hero.primaryButton || "Book Your Stay"} <ArrowRight size={18} />
              </Link>
            )}
            {hero.secondaryButtonVisible !== false && (
              <Link to={hero.secondaryButtonLink || "/guest-room/rooms"} className="guest-button-secondary inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition">
                {hero.secondaryButton || "Explore Rooms"}
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
