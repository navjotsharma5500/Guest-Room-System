import React, { useState } from "react";
import PublicLightbox from "./PublicLightbox";
import { imgOrFallback } from "../../pages/publicGuestRoom/pageUtils";

export default function PublicGalleryGrid({ images = [], hideMeta = false }) {
  const [active, setActive] = useState(null);

  if (!images.length) {
    return <div className="guest-card rounded-[2rem] p-10 text-center text-[var(--guest-muted)]">Gallery images will be available soon.</div>;
  }

  return (
    <>
      <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
        {images.map((image, index) => (
          <button key={`${image.image}-${index}`} onClick={() => setActive(hideMeta ? { ...image, title: "", category: "", description: "" } : image)} className="mb-5 block w-full overflow-hidden rounded-[2rem] border border-[var(--guest-border)] bg-white text-left shadow-lg">
            <img src={imgOrFallback(image.image || image.src || image.url)} alt={image.title || "Gallery"} className="w-full object-cover" />
            {!hideMeta && (image.title || image.category || image.description) && (
              <div className="p-4">
                {(image.title || image.category) && <p className="font-semibold text-[var(--guest-blue)]">{image.title || image.category}</p>}
                {image.description && <p className="mt-1 text-sm text-[var(--guest-muted)]">{image.description}</p>}
              </div>
            )}
          </button>
        ))}
      </div>
      <PublicLightbox image={active} onClose={() => setActive(null)} />
    </>
  );
}
