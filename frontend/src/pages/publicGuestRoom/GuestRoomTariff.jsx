import React from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicTariffTable from "../../components/publicGuestRoom/PublicTariffTable";
import PublicContentList from "../../components/publicGuestRoom/PublicContentList";
import PublicBankDetailsCard from "../../components/publicGuestRoom/PublicBankDetailsCard";
import { sectionText, shouldRenderSection, useGuestContent } from "./pageUtils";

export default function GuestRoomTariff() {
  const content = useGuestContent();
  const tariff = content.tariff || {};
  const bankDetails = content.bankdetails || {};
  const sections = tariff.sections || {};
  const tariffSection = sectionText(sections, "tariff");
  const rulesSection = sectionText(sections, "rules");
  const bankSection = sectionText(sections, "bankDetails");
  const policyItems = [
    ...(tariff.terms || []),
    ...(tariff.policies || []),
    tariff.noCashPolicy,
    tariff.refundPolicy,
    tariff.cancellationPolicy,
    tariff.paymentInstructions,
  ].filter(Boolean);

  return (
    <>
      <PublicHero hero={tariff.hero} />
      <PublicSection enabled={shouldRenderSection(tariffSection, tariff.rows)} eyebrow={tariffSection.eyebrow} title={tariffSection.heading} text={tariffSection.description}>
        <PublicTariffTable rows={tariff.rows || []} tariffLabel={tariff.tariffValueLabel} />
      </PublicSection>
      <PublicSection enabled={shouldRenderSection(rulesSection, policyItems)} eyebrow={rulesSection.eyebrow} title={rulesSection.heading} text={rulesSection.description}>
        <PublicContentList items={policyItems} />
      </PublicSection>
      <PublicSection enabled={shouldRenderSection(bankSection, bankDetails)} eyebrow={bankSection.eyebrow} title={bankSection.heading} text={bankSection.description}>
        <PublicBankDetailsCard bank={bankDetails} />
      </PublicSection>
    </>
  );
}
