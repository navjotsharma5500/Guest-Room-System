import React from "react";

export default function PublicMapEmbed({ url }) {
  if (!url) return null;
  return <iframe title="Map" src={url} className="h-[420px] w-full rounded-[2rem] border border-[var(--guest-border)] shadow-xl" loading="lazy" />;
}
