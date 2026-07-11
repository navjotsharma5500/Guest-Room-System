import React from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicTariffTable from "../../components/publicGuestRoom/PublicTariffTable";
import PublicPolicyCard from "../../components/publicGuestRoom/PublicPolicyCard";
import PublicBankDetailsCard from "../../components/publicGuestRoom/PublicBankDetailsCard";
import { useGuestContent } from "./pageUtils";

export default function GuestRoomTariff() {
  const content = useGuestContent();
  const tariff = content.tariff || {};
  const bankDetails = content.bankdetails || {};
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
      <PublicHero hero={tariff.hero} badge="Tariff" />
      <PublicSection eyebrow="Tariff" title="Payment information">
        <PublicTariffTable rows={tariff.rows || []} />
        <PublicBankDetailsCard bank={bankDetails} />
      </PublicSection>
      <PublicSection eyebrow="Terms" title="Important payment rules">
        <div className="grid gap-4 md:grid-cols-2">
          {policyItems.map((term) => <PublicPolicyCard key={term} text={term} />)}
        </div>
      </PublicSection>
    </>
  );
}
