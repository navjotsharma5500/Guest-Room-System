import React, { useMemo, useState } from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicGalleryGrid from "../../components/publicGuestRoom/PublicGalleryGrid";
import { useGuestContent } from "./pageUtils";

export default function GuestRoomGallery() {
  const gallery = useGuestContent().gallery || {};
  const [category, setCategory] = useState("All");
  const categories = ["All", ...(gallery.categories || [])];
  const images = useMemo(() => {
    if (category === "All") return gallery.images || [];
    return (gallery.images || []).filter((img) => img.category === category);
  }, [gallery.images, category]);

  return (
    <>
      <PublicHero hero={gallery.hero} badge="Gallery" />
      <PublicSection eyebrow="Gallery" title="Campus guest room views">
        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-4 py-2 text-sm font-semibold ${item === category ? "guest-button-primary" : "guest-button-secondary"}`}>
              {item}
            </button>
          ))}
        </div>
        <PublicGalleryGrid images={images} />
      </PublicSection>
    </>
  );
}
