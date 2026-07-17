import React from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicFacilityCard from "../../components/publicGuestRoom/PublicFacilityCard";
import { hasImage, imgOrFallback, shouldRenderSection, useGuestContent } from "./pageUtils";

export default function GuestRoomAbout() {
  const about = useGuestContent().about || {};

  return (
    <>
      <PublicHero hero={about.hero} badge="About TIET Hospitality" />
      <PublicSection eyebrow="About" title="Institute-managed guest accommodation">
        <div className="grid gap-5 md:grid-cols-2">
          {(about.sections || []).map((section) => (
            <div key={section.title} className="guest-card overflow-hidden rounded-[2rem]">
              {hasImage(section.image) && (
                <img src={imgOrFallback(section.image)} alt={section.title || "About guest rooms"} className="h-56 w-full object-cover" />
              )}
              <div className="p-7">
              <h3 className="guest-heading text-3xl font-semibold text-[var(--guest-blue)]">{section.title}</h3>
              <p className="mt-4 leading-8 text-[var(--guest-muted)]">{section.text}</p>
              </div>
            </div>
          ))}
        </div>
      </PublicSection>
      <PublicSection eyebrow="Why Choose Us" title="A thoughtful campus hospitality experience">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(about.cards || []).map((item) => <PublicFacilityCard key={item} title={item} />)}
        </div>
      </PublicSection>
      <PublicSection enabled={shouldRenderSection({ enabled: true }, [about.missionEyebrow, about.mission, about.vision, about.timeline])} eyebrow={about.missionEyebrow} title={about.mission} text={about.vision}>
        <div className="guest-card rounded-[2rem] p-6">
          <div className="flex flex-wrap gap-3">
            {(about.timeline || []).map((step, index) => <span key={step} className="guest-pill rounded-full px-4 py-2 text-sm font-semibold">{index + 1}. {step}</span>)}
          </div>
        </div>
      </PublicSection>
    </>
  );
}
