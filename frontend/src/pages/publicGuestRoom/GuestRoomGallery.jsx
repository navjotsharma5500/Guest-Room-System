import React, { useMemo, useState } from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicGalleryGrid from "../../components/publicGuestRoom/PublicGalleryGrid";
import { collectGuestRoomContentImages, sectionText, shouldRenderSection, useGuestContent, validImageItems } from "./pageUtils";

export default function GuestRoomGallery() {
  const content = useGuestContent();
  const gallery = content.gallery || {};
  const section = sectionText(gallery.sections, "gallery");
  const allCategoryLabel = gallery.allCategoryLabel || "";
  const allImages = useMemo(() => {
    const manualImages = validImageItems(gallery.images || []).map((item) => ({
      ...item,
      category: item.category || "Gallery",
    }));
    const contentImages = collectGuestRoomContentImages(content);
    const seen = new Set();

    return [...manualImages, ...contentImages].filter((item) => {
      const key = item.image;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [content, gallery.images]);
  const categories = useMemo(() => {
    const dynamicCategories = allImages.map((image) => image.category).filter(Boolean);
    return [allCategoryLabel, ...(gallery.categories || []), ...dynamicCategories]
      .filter(Boolean)
      .filter((item, index, list) => list.indexOf(item) === index);
  }, [allCategoryLabel, allImages, gallery.categories]);
  const [category, setCategory] = useState(allCategoryLabel);
  const images = useMemo(() => {
    if (!category || category === allCategoryLabel) return allImages;
    return allImages.filter((img) => img.category === category);
  }, [allImages, category, allCategoryLabel]);

  return (
    <>
      <PublicHero hero={gallery.hero} />
      <PublicSection enabled={shouldRenderSection(section, allImages)} eyebrow={section.eyebrow} title={section.heading} text={section.description}>
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
