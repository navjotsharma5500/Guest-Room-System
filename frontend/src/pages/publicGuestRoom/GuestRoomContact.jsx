import React from "react";
import { Link } from "react-router-dom";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicContactBlock from "../../components/publicGuestRoom/PublicContactBlock";
import PublicMapEmbed from "../../components/publicGuestRoom/PublicMapEmbed";
import PublicContentList from "../../components/publicGuestRoom/PublicContentList";
import { sectionText, shouldRenderSection, useGuestContent } from "./pageUtils";

export default function GuestRoomContact() {
  const contact = useGuestContent().contact || {};
  const sections = contact.sections || {};
  const contactSection = sectionText(sections, "contact");
  const emergencySection = sectionText(sections, "emergency");

  return (
    <>
      <PublicHero hero={contact.hero} />
      <PublicSection enabled={shouldRenderSection(contactSection, [contact.emails, contact.hours, contact.phones, contact.assistanceText, contact.mapUrl])} eyebrow={contactSection.eyebrow} title={contactSection.heading} text={contactSection.description}>
        <PublicContactBlock contact={contact} />
        <div className="mt-8">
          <PublicMapEmbed url={contact.mapUrl} />
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={contact.feedbackLink || "/guest-feedback"} className="guest-button-primary rounded-full px-6 py-3 font-semibold">Submit Feedback</Link>
          <Link to="/guest-room/booking" className="guest-button-secondary rounded-full px-6 py-3 font-semibold">Request Booking</Link>
        </div>
      </PublicSection>
      {!!(contact.emergencyContacts || []).length && (
        <PublicSection enabled={shouldRenderSection(emergencySection, contact.emergencyContacts)} eyebrow={emergencySection.eyebrow} title={emergencySection.heading} text={emergencySection.description}>
          <PublicContentList items={contact.emergencyContacts || []} ordered={false} />
        </PublicSection>
      )}
    </>
  );
}
