import React from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { normalizeMapUrl } from "./mapUtils";

export default function PublicMapEmbed({ url }) {
  const { embedUrl, linkUrl } = normalizeMapUrl(url);
  if (!embedUrl && !linkUrl) return null;
  if (embedUrl) {
    return <iframe title="Map" src={embedUrl} className="h-[420px] w-full rounded-[2rem] border border-[var(--guest-border)] shadow-xl" loading="lazy" />;
  }

  return (
    <a
      href={linkUrl}
      target="_blank"
      rel="noreferrer"
      className="flex h-[220px] w-full flex-col items-center justify-center rounded-[2rem] border border-[var(--guest-border)] bg-[#fffaf2] text-center shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
    >
      <MapPin className="mb-3 text-[var(--guest-red)]" size={34} />
      <span className="guest-heading text-2xl font-semibold text-[var(--guest-blue)]">Open Location Map</span>
      <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--guest-red)]">
        View on Google Maps <ExternalLink size={15} />
      </span>
    </a>
  );
}
