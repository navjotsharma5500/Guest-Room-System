import React from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicFacilityCard from "../../components/publicGuestRoom/PublicFacilityCard";
import { orderedItems, sectionText, shouldRenderSection, useGuestContent } from "./pageUtils";

export default function GuestRoomFacilities() {
  const facilities = useGuestContent().facilities || {};
  const sections = facilities.sections || {};
  const mainSection = sectionText(sections, "facilities");
  const digitalSection = sectionText(sections, "digitalServices");
  const safetySection = sectionText(sections, "safety");
  const mainHeading = mainSection.heading === "Guest room facilities" ? "" : mainSection.heading;
  const digitalDescription =
    digitalSection.description ||
    "A QR code is available in every guest room. Scan it to raise a service request if you require any assistance.";
  const mainItems = orderedItems((facilities.facilities || []).map((item, index) => typeof item === "string" ? { title: item, order: index + 1, enabled: true } : item));
  const digitalItems = orderedItems((facilities.digitalServices || []).map((item, index) => typeof item === "string" ? { title: item, order: index + 1, enabled: true } : item));
  const safetyItems = orderedItems((facilities.safetyCards || []).map((item, index) => typeof item === "string" ? { title: item, order: index + 1, enabled: true } : item));

  return (
    <>
      <PublicHero hero={facilities.hero} />
      <PublicSection enabled={shouldRenderSection(mainSection, mainItems)} eyebrow={mainSection.eyebrow} title={mainHeading} text={mainSection.description}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mainItems.map((item) => <PublicFacilityCard key={item.title} facility={item} />)}
        </div>
      </PublicSection>
      <PublicSection enabled={shouldRenderSection(digitalSection, digitalItems)} eyebrow={digitalSection.eyebrow} title={digitalSection.heading} text={digitalDescription}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {digitalItems.map((item) => <PublicFacilityCard key={item.title} facility={item} />)}
        </div>
      </PublicSection>
      <PublicSection enabled={shouldRenderSection(safetySection, safetyItems)} eyebrow={safetySection.eyebrow} title={safetySection.heading} text={safetySection.description}>
        <div className="grid gap-4 md:grid-cols-4">
          {safetyItems.map((item) => <PublicFacilityCard key={item.title} facility={item} />)}
        </div>
      </PublicSection>
    </>
  );
}
