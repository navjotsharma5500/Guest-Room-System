import React from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicFacilityCard from "../../components/publicGuestRoom/PublicFacilityCard";
import { hasImage, imgOrFallback, sectionText, shouldRenderSection, useGuestContent } from "./pageUtils";

export default function GuestRoomAbout() {
  const about = useGuestContent().about || {};
  const sections = about.sectionSettings || {};
  const aboutSection = sectionText(sections, "about");
  const whySection = sectionText(sections, "whyChooseUs");
  const missionSection = sectionText(sections, "mission");
  const hasMissionSectionSettings = Object.prototype.hasOwnProperty.call(sections, "mission");
  const missionEyebrow = hasMissionSectionSettings ? missionSection.eyebrow : about.missionEyebrow;
  const missionHeading = hasMissionSectionSettings ? missionSection.heading : about.mission;
  const missionDescription = hasMissionSectionSettings ? missionSection.description : about.vision;
  const missionContent = hasMissionSectionSettings
    ? [missionEyebrow, missionHeading, missionDescription]
    : [missionEyebrow, missionHeading, missionDescription, about.timeline];

  return (
    <>
      <PublicHero hero={about.hero} />
      <PublicSection enabled={shouldRenderSection(aboutSection, about.sections)} eyebrow={aboutSection.eyebrow} title={aboutSection.heading} text={aboutSection.description}>
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
      <PublicSection enabled={shouldRenderSection(whySection, about.cards)} eyebrow={whySection.eyebrow} title={whySection.heading} text={whySection.description}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(about.cards || []).map((item) => <PublicFacilityCard key={item} title={item} />)}
        </div>
      </PublicSection>
      <PublicSection enabled={shouldRenderSection(missionSection, missionContent)} eyebrow={missionEyebrow} title={missionHeading} text={missionDescription}>
        <div className="guest-card rounded-[2rem] p-6">
          <div className="flex flex-wrap gap-3">
            {(about.timeline || []).map((step, index) => <span key={step} className="guest-pill rounded-full px-4 py-2 text-sm font-semibold">{index + 1}. {step}</span>)}
          </div>
        </div>
      </PublicSection>
    </>
  );
}
