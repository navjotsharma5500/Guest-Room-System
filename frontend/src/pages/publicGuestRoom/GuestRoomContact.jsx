import React from "react";
import { Link } from "react-router-dom";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicContactBlock from "../../components/publicGuestRoom/PublicContactBlock";
import PublicMapEmbed from "../../components/publicGuestRoom/PublicMapEmbed";
import PublicPolicyCard from "../../components/publicGuestRoom/PublicPolicyCard";
import { useGuestContent } from "./pageUtils";

export default function GuestRoomContact() {
  const contact = useGuestContent().contact || {};

  return (
    <>
      <PublicHero hero={contact.hero} badge="Contact" />
      <PublicSection eyebrow="Contact" title={contact.office || "DoSA Office"}>
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
        <PublicSection eyebrow="Emergency" title="Support contacts">
          <div className="grid gap-4 md:grid-cols-2">
            {contact.emergencyContacts.map((item) => <PublicPolicyCard key={item} text={item} />)}
          </div>
        </PublicSection>
      )}
    </>
  );
}
