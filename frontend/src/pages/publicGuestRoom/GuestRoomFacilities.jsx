import React from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicFacilityCard from "../../components/publicGuestRoom/PublicFacilityCard";
import { useGuestContent } from "./pageUtils";

export default function GuestRoomFacilities() {
  const facilities = useGuestContent().facilities || {};

  return (
    <>
      <PublicHero hero={facilities.hero} badge="Facilities" />
      <PublicSection eyebrow="Facilities" title="Guest room facilities">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(facilities.facilities || []).map((item) => <PublicFacilityCard key={item} title={item} />)}
        </div>
      </PublicSection>
      <PublicSection eyebrow="Digital Services" title="Support from your mobile phone">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(facilities.digitalServices || []).map((item) => <PublicFacilityCard key={item} title={item} />)}
        </div>
      </PublicSection>
      <PublicSection eyebrow="Safety" title="Supervised campus support">
        <div className="grid gap-4 md:grid-cols-4">
          {(facilities.safetyCards || []).map((item) => <PublicFacilityCard key={item} title={item} />)}
        </div>
      </PublicSection>
    </>
  );
}
