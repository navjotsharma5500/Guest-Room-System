import React, { useEffect, useMemo, useState } from "react";
import { BedDouble, Users, X } from "lucide-react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicRoomCard from "../../components/publicGuestRoom/PublicRoomCard";
import PublicPolicyCard from "../../components/publicGuestRoom/PublicPolicyCard";
import PublicGalleryGrid from "../../components/publicGuestRoom/PublicGalleryGrid";
import { imgOrFallback, orderedItems, sectionText, shouldRenderSection, useGuestContent, validImageItems } from "./pageUtils";

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

  useEffect(() => {
    if (!activeCategory) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveCategoryId("");
        setActiveRoomId("");
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeCategory]);

  const closeRoomModal = () => {
    setActiveCategoryId("");
    setActiveRoomId("");
  };

  return (
    <>
      <PublicHero hero={rooms.hero} />
      <PublicSection enabled={shouldRenderSection(categorySection, categories.length ? categories : legacyCards)} eyebrow={categorySection.eyebrow} title={categorySection.heading} text={categorySection.description}>
        {categories.length > 0 ? (
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {categories.map((category) => (
                <button
                  key={category.id || category.title}
                  type="button"
                  onClick={() => {
                    setActiveCategoryId(category.id || category.title);
                    const firstRoom = orderedItems(category.rooms || [])[0];
                    setActiveRoomId(firstRoom?.id || firstRoom?.title || firstRoom?.name || "");
                  }}
                  className={`guest-card overflow-hidden rounded-[2rem] text-left transition hover:-translate-y-1 ${activeCategory === category ? "ring-2 ring-[var(--guest-red)]" : ""}`}
                >
                  <PublicRoomCard room={{ ...category, title: category.title || category.name, image: category.coverImage || category.image, buttonText: "" }} />
                </button>
              ))}
            </div>
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
      <RoomCategoryModal
        category={activeCategory}
        rooms={categoryRooms}
        activeRoom={activeRoom}
        activeRoomDetails={activeRoomDetails}
        onRoomSelect={(room) => setActiveRoomId(room.id || room.title || room.name)}
        onClose={closeRoomModal}
      />
    </>
  );
}

function RoomCategoryModal({ category, rooms = [], activeRoom, activeRoomDetails = [], onRoomSelect, onClose }) {
  if (!category) return null;

  const title = category.title || category.name;
  const roomTitle = activeRoom?.title || activeRoom?.name;
  const hostelGallery = validImageItems(category.images || category.gallery || []);
  const capacity = activeRoom?.capacity || activeRoomDetails.find((detail) => /capacity/i.test(detail.label || ""))?.value;
  const type = activeRoom?.roomType || activeRoom?.acType || activeRoomDetails.find((detail) => /type/i.test(detail.label || ""))?.value;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/70 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] bg-[#fffdf8] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-[var(--guest-border)] bg-[#fffaf2] px-5 py-4 sm:px-7">
          <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full border border-[var(--guest-border)] bg-white p-2 text-[var(--guest-red)] shadow-sm transition hover:bg-red-50">
            <X size={22} />
          </button>
          {category.subtitle && <p className="pr-12 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--guest-red)]">{category.subtitle}</p>}
          <h3 className="guest-heading pr-12 text-3xl font-semibold text-[var(--guest-blue)] sm:text-4xl">{title}</h3>
          {category.description && <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--guest-muted)] sm:text-base">{category.description}</p>}
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <section className="guest-card rounded-[2rem] p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--guest-muted)]">Guest Rooms</p>
            {rooms.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => {
                  const selected = activeRoom === room;
                  const name = room.title || room.name;
                  return (
                    <button
                      key={room.id || name}
                      type="button"
                      onClick={() => onRoomSelect(room)}
                      className={`overflow-hidden rounded-[1.75rem] border bg-white text-left shadow-sm transition hover:-translate-y-1 ${selected ? "border-[var(--guest-red)] bg-red-50 shadow-md" : "border-[var(--guest-border)] hover:border-red-200"}`}
                    >
                      <div className="h-48 overflow-hidden bg-[#efe4d5]">
                        <img
                          src={imgOrFallback(room.coverImage || room.thumbnail || room.image || category.coverImage || category.image)}
                          alt={name}
                          className="h-full w-full object-cover transition duration-500 hover:scale-105"
                        />
                      </div>
                      <div className="p-4">
                        <p className="font-semibold text-[var(--guest-blue)]">{name}</p>
                        {(room.subtitle || room.roomType) && <p className="mt-1 text-xs text-[var(--guest-muted)]">{room.subtitle || room.roomType}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--guest-border)] p-5 text-sm text-[var(--guest-muted)]">No guest rooms have been added for this hostel yet.</div>
            )}
          </section>

          <section>
            {activeRoom ? (
              <div className="guest-card rounded-[2rem] p-5 sm:p-6">
                <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
                <section>
                  <h4 className="guest-heading text-3xl font-semibold text-[var(--guest-blue)]">{roomTitle}</h4>
                  {activeRoom.description && <p className="mt-3 leading-7 text-[var(--guest-muted)]">{activeRoom.description}</p>}

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {capacity && (
                      <div className="rounded-2xl bg-[#fff8ef] p-4">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--guest-red)]"><Users size={16} /> Capacity</p>
                        <p className="mt-1 font-semibold text-[var(--guest-blue)]">{capacity}</p>
                      </div>
                    )}
                    {type && (
                      <div className="rounded-2xl bg-[#fff8ef] p-4">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--guest-red)]"><BedDouble size={16} /> Type</p>
                        <p className="mt-1 font-semibold text-[var(--guest-blue)]">{type}</p>
                      </div>
                    )}
                    {activeRoomDetails
                      .filter((detail) => detail.value && !/^(capacity|type)$/i.test(detail.label || ""))
                      .map((detail) => (
                        <div key={`${detail.label}-${detail.value}`} className="rounded-2xl bg-[#fff8ef] p-4">
                          {detail.label && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--guest-red)]">{detail.label}</p>}
                          <p className="mt-1 font-semibold text-[var(--guest-blue)]">{detail.value}</p>
                        </div>
                      ))}
                  </div>

                  {activeRoom.amenities?.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {activeRoom.amenities.map((item) => <span key={item} className="guest-pill rounded-full px-3 py-1 text-xs font-semibold">{item}</span>)}
                    </div>
                  )}

                  <a href={activeRoom.buttonUrl || "/guest-room/booking"} className="guest-button-primary mt-6 inline-flex rounded-full px-6 py-3 font-semibold">
                    {activeRoom.buttonText || "Book Now"}
                  </a>
                </section>

                <section className="mx-auto w-full max-w-xl">
                  <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--guest-muted)]">Gallery</p>
                  <div className="mx-auto">
                    <PublicGalleryGrid images={hostelGallery} hideMeta />
                  </div>
                </section>
                </div>
              </div>
            ) : (
              <div className="guest-card rounded-[2rem] p-10 text-center text-[var(--guest-muted)]">Select a guest room to view gallery, type, capacity and booking option.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
