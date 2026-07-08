import React from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicTariffTable from "../../components/publicGuestRoom/PublicTariffTable";
import PublicPolicyCard from "../../components/publicGuestRoom/PublicPolicyCard";
import { useGuestContent } from "./pageUtils";

export default function GuestRoomTariff() {
  const tariff = useGuestContent().tariff || {};

  return (
    <>
      <PublicHero hero={tariff.hero} badge="Tariff" />
      <PublicSection eyebrow="Tariff" title="Payment information">
        <PublicTariffTable rows={tariff.rows || []} />
      </PublicSection>
      <PublicSection eyebrow="Terms" title="Important payment rules">
        <div className="grid gap-4 md:grid-cols-2">
          {[...(tariff.terms || []), tariff.noCashPolicy, tariff.refundPolicy, tariff.cancellationPolicy, tariff.paymentInstructions].filter(Boolean).map((term) => <PublicPolicyCard key={term} text={term} />)}
        </div>
      </PublicSection>
    </>
  );
}
