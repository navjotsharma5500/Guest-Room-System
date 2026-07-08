import React from "react";
import { X } from "lucide-react";
import { imgOrFallback } from "../../pages/publicGuestRoom/pageUtils";

export default function PublicLightbox({ image, onClose }) {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-stone-950/75 p-4" onClick={onClose}>
      <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[2rem] bg-[#fffdf8] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-stone-900 shadow">
          <X />
        </button>
        <img src={imgOrFallback(image.image || image.src || image.url)} alt={image.title || "Gallery"} className="max-h-[70vh] w-full object-cover" />
        <div className="p-5">
          <h3 className="guest-heading text-2xl font-semibold text-[var(--guest-blue)]">{image.title || image.category}</h3>
          {image.description && <p className="mt-2 text-[var(--guest-muted)]">{image.description}</p>}
        </div>
      </div>
    </div>
  );
}
