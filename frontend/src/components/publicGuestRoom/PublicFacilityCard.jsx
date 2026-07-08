import React from "react";
import { CheckCircle2 } from "lucide-react";

export default function PublicFacilityCard({ title }) {
  return (
    <div className="guest-card rounded-3xl p-5">
      <CheckCircle2 className="mb-4 text-[var(--guest-red)]" />
      <p className="font-semibold text-[var(--guest-blue)]">{title}</p>
    </div>
  );
}
