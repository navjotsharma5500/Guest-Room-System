import React from "react";
import { imgOrFallback } from "../../pages/publicGuestRoom/pageUtils";

export default function PublicCameraRoll({ config = {} }) {
  const images = config.images || [];
  if (!config.enabled || images.length === 0) return null;
  const doubled = [...images, ...images];

  return (
    <div className="guest-camera-roll overflow-hidden py-4" style={{ "--roll-speed": `${config.speed || 32}s` }}>
      <div className="guest-camera-track flex w-max gap-5">
        {doubled.map((item, index) => (
          <figure key={`${item.image}-${index}`} className="w-72 shrink-0 overflow-hidden rounded-[2rem] border border-[var(--guest-border)] bg-white shadow-lg md:w-96">
            <img src={imgOrFallback(item.image)} alt={item.caption || "Campus"} className="h-52 w-full object-cover md:h-64" />
            {item.caption && <figcaption className="px-5 py-3 text-sm font-semibold text-[var(--guest-blue)]">{item.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </div>
  );
}
