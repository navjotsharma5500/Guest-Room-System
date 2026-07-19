import React from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicDiningCard from "../../components/publicGuestRoom/PublicDiningCard";
import { isFilled, orderedItems, sectionText, shouldRenderSection, useGuestContent } from "./pageUtils";

const cardGroup = (item = {}) => String(item.group || item.type || item.category || "").toLowerCase();

const isHostelCard = (item = {}) => {
  const group = cardGroup(item);
  return group === "hostel" || /hostel/i.test(item.title || "");
};

const isCampusCard = (item = {}) => {
  const group = cardGroup(item);
  return group === "campus" || !isHostelCard(item);
};

const previousHostelDescription = "Hostel food facilities are available subject to hostel mess rules and approval.";
const previousCampusDescription = "Guests may avail campus food facilities as per applicable rules and availability.";
const updatedHostelDescription =
  "Guests may avail hostel mess/dining facilities as per applicable hostel rules and availability. Guest may directly pay the food charges at the hostel Food Counter.";

export default function GuestRoomDining() {
  const dining = useGuestContent().dining || {};
  const sections = dining.sections || {};
  const hostelSection = sectionText(sections, "hostelFood");
  const campusSection = sectionText(sections, "campusFood");
  const rulesSection = sectionText(sections, "rules");
  const cards = orderedItems(dining.cards || []);
  const hostelCards = cards.filter(isHostelCard);
  const campusCards = cards.filter(isCampusCard);
  const ruleItems = [
    ...(dining.rules || []),
    ...(dining.options || []),
  ];
  const hostelEyebrow = hostelSection.heading || hostelSection.eyebrow;
  const campusEyebrow = campusSection.heading || campusSection.eyebrow;
  const hostelDescription = hostelSection.description === previousHostelDescription ? updatedHostelDescription : hostelSection.description;
  const campusDescription = campusSection.description === previousCampusDescription ? "" : campusSection.description;

  return (
    <>
      <PublicHero hero={dining.hero} />
      <PublicSection enabled={shouldRenderSection(hostelSection, hostelCards)} eyebrow={hostelEyebrow} title="" text={hostelDescription}>
        <div className="grid gap-6 md:grid-cols-3">
          {hostelCards.map((item) => <PublicDiningCard key={item.title} item={item} />)}
        </div>
      </PublicSection>
      <PublicSection enabled={shouldRenderSection(campusSection, campusCards)} eyebrow={campusEyebrow} title="" text={campusDescription}>
        <div className="grid gap-6 md:grid-cols-3">
          {campusCards.map((item) => <PublicDiningCard key={item.title} item={item} />)}
        </div>
      </PublicSection>
      <PublicSection enabled={shouldRenderSection(rulesSection, ruleItems)} eyebrow={rulesSection.eyebrow} title={rulesSection.heading} text={rulesSection.description}>
        <DiningGuidanceTable items={ruleItems} />
      </PublicSection>
    </>
  );
}

function DiningGuidanceTable({ items = [] }) {
  const rows = items.filter(isFilled);
  if (!rows.length) return null;

  return (
    <div className="guest-card overflow-hidden rounded-[2rem] bg-white/90">
      <div className="divide-y divide-[var(--guest-border)]">
        {rows.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="group flex gap-4 px-5 py-4 transition hover:bg-[#fff8ef] sm:px-6"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-xs font-semibold text-[var(--guest-red)] transition group-hover:border-[var(--guest-red)] group-hover:bg-white">
              {index + 1}
            </span>
            <span className="text-sm leading-7 text-stone-700 sm:text-base">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
