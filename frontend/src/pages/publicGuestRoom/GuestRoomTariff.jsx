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
  const additionalTables = Array.isArray(tariff.tables) ? tariff.tables : [];
  const tariffTableContent = [...(tariff.rows || []), ...additionalTables];
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
      <PublicSection enabled={shouldRenderSection(tariffSection, tariffTableContent)} eyebrow={tariffSection.eyebrow} title={tariffSection.heading} text={tariffSection.description}>
        <div className="space-y-8">
          {!!(tariff.rows || []).length && (
            <PublicTariffTable rows={tariff.rows || []} column1Header={tariff.categoryLabel} column2Header={tariff.tariffValueLabel} />
          )}
          {additionalTables.map((table, index) => (
            <div key={`${table?.title || "tariff-table"}-${index}`} className="space-y-3">
              {!!String(table?.title || "").trim() && <h3 className="text-xl font-bold text-[var(--guest-blue)] sm:text-2xl">{table.title}</h3>}
              <PublicTariffTable rows={table?.rows || []} column1Header={table?.column1Header} column2Header={table?.column2Header} />
            </div>
          ))}
        </div>
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
