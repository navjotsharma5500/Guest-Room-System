import React, { useMemo, useState } from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicRoomCard from "../../components/publicGuestRoom/PublicRoomCard";
import PublicPolicyCard from "../../components/publicGuestRoom/PublicPolicyCard";
import PublicGalleryGrid from "../../components/publicGuestRoom/PublicGalleryGrid";
import { orderedItems, sectionText, shouldRenderSection, useGuestContent } from "./pageUtils";

export default function GuestRoomRooms() {
  const rooms = useGuestContent().rooms || {};
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [activeRoomId, setActiveRoomId] = useState("");
  const sections = rooms.sections || {};
  const categorySection = sectionText(sections, "categories");
  const notesSection = sectionText(sections, "notes");
  const categories = orderedItems(rooms.categories || []);
  const activeCategory = useMemo(
    () => categories.find((category) => String(category.id || category.title) === String(activeCategoryId)) || null,
    [categories, activeCategoryId]
  );
  const categoryRooms = orderedItems(activeCategory?.rooms || []);
  const activeRoom = useMemo(
    () => categoryRooms.find((room) => String(room.id || room.title || room.name) === String(activeRoomId)) || null,
    [categoryRooms, activeRoomId]
  );
  const activeRoomDetails = orderedItems(activeRoom?.details || []);
  const legacyCards = orderedItems(rooms.cards || []);

  return (
    <>
      <PublicHero hero={rooms.hero} />
      <PublicSection enabled={shouldRenderSection(categorySection, categories.length ? categories : legacyCards)} eyebrow={categorySection.eyebrow} title={categorySection.heading} text={categorySection.description}>
        {categories.length > 0 ? (
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {categories.map((category) => (
                <button
                  key={category.id || category.title}
                  type="button"
                  onClick={() => {
                    setActiveCategoryId(category.id || category.title);
                    setActiveRoomId("");
                  }}
                  className={`guest-card overflow-hidden rounded-[2rem] text-left transition hover:-translate-y-1 ${activeCategory === category ? "ring-2 ring-[var(--guest-red)]" : ""}`}
                >
                  <PublicRoomCard room={{ ...category, title: category.title || category.name, image: category.coverImage || category.image, buttonText: "" }} />
                </button>
              ))}
            </div>

            {activeCategory && (
              <div className="guest-card rounded-[2rem] p-6">
                <div className="mb-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--guest-red)]">{activeCategory.subtitle}</p>
                  <h3 className="guest-heading text-3xl font-semibold text-[var(--guest-blue)]">{activeCategory.title || activeCategory.name}</h3>
                  {activeCategory.description && <p className="mt-2 text-[var(--guest-muted)]">{activeCategory.description}</p>}
                </div>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {categoryRooms.map((room) => (
                    <button
                      key={room.id || room.title || room.name}
                      type="button"
                      onClick={() => setActiveRoomId(room.id || room.title || room.name)}
                      className={`rounded-[2rem] text-left transition ${activeRoom === room ? "ring-2 ring-[var(--guest-red)]" : ""}`}
                    >
                      <PublicRoomCard room={{ ...room, image: room.coverImage || room.thumbnail || room.image, buttonText: "" }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeRoom && (
              <div className="guest-card rounded-[2rem] p-6">
                <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
                  <div>
                    <h3 className="guest-heading text-3xl font-semibold text-[var(--guest-blue)]">{activeRoom.title || activeRoom.name}</h3>
                    {activeRoom.description && <p className="mt-3 leading-7 text-[var(--guest-muted)]">{activeRoom.description}</p>}
                    {activeRoomDetails.length > 0 && (
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {activeRoomDetails.map((detail) => (
                          <div key={`${detail.label}-${detail.value}`} className="rounded-2xl bg-[#fff8ef] p-4">
                            {detail.label && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--guest-red)]">{detail.label}</p>}
                            {detail.value && <p className="mt-1 font-semibold text-[var(--guest-blue)]">{detail.value}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    {activeRoom.amenities?.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {activeRoom.amenities.map((item) => <span key={item} className="guest-pill rounded-full px-3 py-1 text-xs font-semibold">{item}</span>)}
                      </div>
                    )}
                    {activeRoom.buttonText && (
                      <a href={activeRoom.buttonUrl || "/guest-room/booking"} className="guest-button-primary mt-6 inline-flex rounded-full px-6 py-3 font-semibold">
                        {activeRoom.buttonText}
                      </a>
                    )}
                  </div>
                  <PublicGalleryGrid images={activeRoom.images || activeRoom.gallery || []} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {legacyCards.map((room) => <PublicRoomCard key={room.title} room={room} />)}
          </div>
        )}
      </PublicSection>
      <PublicSection enabled={shouldRenderSection(notesSection, rooms.notes)} eyebrow={notesSection.eyebrow} title={notesSection.heading} text={notesSection.description}>
        <div className="grid gap-4 md:grid-cols-2">
          {(rooms.notes || []).map((note) => <PublicPolicyCard key={note} text={note} />)}
        </div>
      </PublicSection>
    </>
  );
}
