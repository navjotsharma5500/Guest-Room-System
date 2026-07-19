import React from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicDiningCard from "../../components/publicGuestRoom/PublicDiningCard";
import PublicContentList from "../../components/publicGuestRoom/PublicContentList";
import { orderedItems, sectionText, shouldRenderSection, useGuestContent } from "./pageUtils";

export default function GuestRoomDining() {
  const dining = useGuestContent().dining || {};
  const sections = dining.sections || {};
  const diningSection = sectionText(sections, "dining");
  const rulesSection = sectionText(sections, "rules");
  const cards = orderedItems(dining.cards || []);
  const ruleItems = [
    ...(dining.rules || []),
    ...(dining.options || []).map((item) => `Campus option: ${item}`),
  ];

  return (
    <>
      <PublicHero hero={dining.hero} />
      <PublicSection enabled={shouldRenderSection(diningSection, cards)} eyebrow={diningSection.eyebrow} title={diningSection.heading} text={diningSection.description || dining.text}>
        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((item) => <PublicDiningCard key={item.title} item={item} />)}
        </div>
      </PublicSection>
      <PublicSection enabled={shouldRenderSection(rulesSection, ruleItems)} eyebrow={rulesSection.eyebrow} title={rulesSection.heading} text={rulesSection.description}>
        <PublicContentList items={ruleItems} />
      </PublicSection>
    </>
  );
}
