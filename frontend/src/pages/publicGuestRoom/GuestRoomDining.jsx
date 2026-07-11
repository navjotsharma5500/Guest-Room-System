import React from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicDiningCard from "../../components/publicGuestRoom/PublicDiningCard";
import PublicPolicyCard from "../../components/publicGuestRoom/PublicPolicyCard";
import { useGuestContent } from "./pageUtils";

export default function GuestRoomDining() {
  const dining = useGuestContent().dining || {};

  return (
    <>
      <PublicHero hero={dining.hero} badge="Dining" />
      <PublicSection eyebrow="Dining" title="Campus food facilities" text={dining.text}>
        <div className="grid gap-6 md:grid-cols-3">
          {(dining.cards || []).map((item) => <PublicDiningCard key={item.title} item={item} />)}
        </div>
      </PublicSection>
      <PublicSection eyebrow="Rules & Options" title="Dining guidance">
        <div className="grid gap-4 md:grid-cols-2">
          {(dining.rules || []).map((item) => <PublicPolicyCard key={`rule-${item}`} text={item} />)}
          {(dining.options || []).map((item) => <PublicPolicyCard key={`option-${item}`} text={`Campus option: ${item}`} />)}
        </div>
      </PublicSection>
    </>
  );
}
