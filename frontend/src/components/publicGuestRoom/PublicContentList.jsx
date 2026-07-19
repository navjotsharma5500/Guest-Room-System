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

  const ListTag = ordered ? "ol" : "ul";

  return (
    <div className="guest-card rounded-[2rem] bg-white/90 p-6 md:p-8">
      <ListTag className={`space-y-4 ${ordered ? "list-decimal" : "list-disc"} pl-5 text-[var(--guest-muted)]`}>
        {normalized.map((item, index) => (
          <li key={`${item.text}-${index}`} className="pl-2 leading-7">
            <span className="font-medium text-stone-800">{item.text}</span>
          </li>
        ))}
      </ListTag>
    </div>
  );
}
