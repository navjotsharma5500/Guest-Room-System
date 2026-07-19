import React from "react";
import { isFilled, orderedItems } from "../../pages/publicGuestRoom/pageUtils";

export default function PublicContentList({ items = [], ordered = true }) {
  const normalized = orderedItems(
    items.map((item, index) =>
      typeof item === "string"
        ? { text: item, enabled: true, order: index + 1 }
        : { ...item, text: item?.text || item?.title || item?.label || item?.value || "", order: item?.order ?? index + 1 }
    )
  ).filter((item) => isFilled(item.text));

  if (!normalized.length) return null;

  return (
    <div className="guest-card overflow-hidden rounded-[2rem] bg-white/90">
      <div className="divide-y divide-[var(--guest-border)]">
        {normalized.map((item, index) => (
          <div
            key={`${item.text}-${index}`}
            className="group flex gap-4 px-5 py-4 text-[var(--guest-muted)] transition hover:bg-[#fff8ef] sm:px-6"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-xs font-semibold text-[var(--guest-red)] transition group-hover:border-[var(--guest-red)] group-hover:bg-white">
              {ordered ? index + 1 : "•"}
            </span>
            <span className="text-sm leading-7 text-stone-700 sm:text-base">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
