import React from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicFacilityCard from "../../components/publicGuestRoom/PublicFacilityCard";
import { hasImage, imgOrFallback, sectionText, shouldRenderSection, useGuestContent } from "./pageUtils";

const legacyMissionHeading = "To provide safe, transparent and well-managed guest accommodation services within the campus.";
const legacyMissionDescription = "A digital-first guest hospitality experience for institutional visitors.";
const legacyMissionTimeline = ["Enquiry", "Review", "Approval", "Check-in", "Stay Support", "Feedback"];

export default function GuestRoomAbout() {
  const about = useGuestContent().about || {};
  const sections = about.sectionSettings || {};
  const aboutSection = sectionText(sections, "about");
  const whySection = sectionText(sections, "whyChooseUs");
  const missionSection = sectionText(sections, "mission");
  const missionEyebrow = missionSection.eyebrow;
  const missionHeading = missionSection.heading === legacyMissionHeading ? "" : missionSection.heading;
  const missionDescription = missionSection.description === legacyMissionDescription ? "" : missionSection.description;
  const timelineItems = (about.timeline || []).filter(Boolean);
  const missionTimeline = timelineItems.join("|") === legacyMissionTimeline.join("|") ? [] : timelineItems;
  const missionContent = [missionHeading, missionDescription, missionTimeline];

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
        {missionTimeline.length > 0 && (
          <div className="guest-card rounded-[2rem] p-6">
            <div className="flex flex-wrap gap-3">
              {missionTimeline.map((step, index) => <span key={step} className="guest-pill rounded-full px-4 py-2 text-sm font-semibold">{index + 1}. {step}</span>)}
            </div>
          </div>
        )}
      </PublicSection>
    </>
  );
}
