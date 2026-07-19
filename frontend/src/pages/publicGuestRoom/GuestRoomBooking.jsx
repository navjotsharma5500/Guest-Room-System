import React from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicContentList from "../../components/publicGuestRoom/PublicContentList";
import ModernGuestRoomBookingForm from "../../components/publicGuestRoom/ModernGuestRoomBookingForm";
import { sectionText, shouldRenderSection, useGuestContent } from "./pageUtils";

export default function GuestRoomBooking() {
  const booking = useGuestContent().booking || {};
  const sections = booking.sections || {};
  const formSection = sectionText(sections, "form");
  const policiesSection = sectionText(sections, "policies");

  return (
    <>
      <PublicHero hero={booking.hero} />
      <PublicSection enabled={shouldRenderSection(formSection, booking)} eyebrow={formSection.eyebrow} title={formSection.heading} text={formSection.description}>
        <ModernGuestRoomBookingForm content={booking} />
      </PublicSection>
      <PublicSection enabled={shouldRenderSection(policiesSection, booking.policies)} eyebrow={policiesSection.eyebrow} title={policiesSection.heading} text={policiesSection.description}>
        <PublicContentList items={booking.policies || []} />
      </PublicSection>
    </>
  );
}
