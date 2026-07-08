import React from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicPolicyCard from "../../components/publicGuestRoom/PublicPolicyCard";
import ModernGuestRoomBookingForm from "../../components/publicGuestRoom/ModernGuestRoomBookingForm";
import { useGuestContent } from "./pageUtils";

export default function GuestRoomBooking() {
  const booking = useGuestContent().booking || {};

  return (
    <>
      <PublicHero hero={booking.hero} badge="Booking Request" />
      <PublicSection eyebrow="Request Accommodation" title="Submit a guest room enquiry">
        <ModernGuestRoomBookingForm content={booking} />
      </PublicSection>
      <PublicSection eyebrow="Policies" title="Before submitting">
        <div className="grid gap-4 md:grid-cols-2">
          {(booking.policies || []).map((policy) => <PublicPolicyCard key={policy} text={policy} />)}
        </div>
      </PublicSection>
    </>
  );
}
