import React from "react";
import { Clock } from "lucide-react";
import { imgOrFallback } from "../../pages/publicGuestRoom/pageUtils";

export default function PublicDiningCard({ item = {} }) {
  return (
    <div className="guest-card overflow-hidden rounded-[2rem]">
      <img src={imgOrFallback(item.image)} alt={item.title} className="h-48 w-full object-cover" />
      <div className="p-6">
        <h3 className="guest-heading text-2xl font-semibold text-[var(--guest-blue)]">{item.title}</h3>
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--guest-red)]"><Clock size={16} /> {item.timing}</p>
        <p className="mt-1 text-sm text-stone-700">{item.price}</p>
        <p className="mt-3 text-sm leading-6 text-[var(--guest-muted)]">{item.description}</p>
      </div>
    </div>
  );
}
