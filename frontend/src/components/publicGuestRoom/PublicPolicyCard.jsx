import React from "react";
import { ShieldCheck } from "lucide-react";

export default function PublicPolicyCard({ text }) {
  return (
    <div className="guest-card flex gap-3 rounded-3xl p-5">
      <ShieldCheck className="mt-1 shrink-0 text-[var(--guest-red)]" size={20} />
      <p className="text-sm leading-6 text-stone-700">{text}</p>
    </div>
  );
}
