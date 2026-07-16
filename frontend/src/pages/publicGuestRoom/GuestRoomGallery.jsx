import React, { useMemo, useState } from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicGalleryGrid from "../../components/publicGuestRoom/PublicGalleryGrid";
import { sectionText, shouldRenderSection, useGuestContent } from "./pageUtils";

export default function GuestRoomGallery() {
  const gallery = useGuestContent().gallery || {};
  const section = sectionText(gallery.sections, "gallery");
  const allCategoryLabel = gallery.allCategoryLabel || "";
  const categories = [allCategoryLabel, ...(gallery.categories || []).filter(Boolean)].filter(Boolean);
  const [category, setCategory] = useState(allCategoryLabel);
  const images = useMemo(() => {
    if (!category || category === allCategoryLabel) return gallery.images || [];
    return (gallery.images || []).filter((img) => img.category === category);
  }, [gallery.images, category, allCategoryLabel]);

  return (
    <>
      <PublicHero hero={gallery.hero} />
      <PublicSection enabled={shouldRenderSection(section, gallery.images)} eyebrow={section.eyebrow} title={section.heading} text={section.description}>
        {categories.length > 1 && <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-4 py-2 text-sm font-semibold ${item === category ? "guest-button-primary" : "guest-button-secondary"}`}>
              {item}
            </button>
          ))}
        </div>}
        <PublicGalleryGrid images={images} />
      </PublicSection>
    </>
  );
}
