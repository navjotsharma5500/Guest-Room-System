import React from "react";
import { Link } from "react-router-dom";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicStats from "../../components/publicGuestRoom/PublicStats";
import PublicRoomCard from "../../components/publicGuestRoom/PublicRoomCard";
import PublicFacilityCard from "../../components/publicGuestRoom/PublicFacilityCard";
import PublicStayJourney3D from "../../components/publicGuestRoom/PublicStayJourney3D";
import PublicCameraRoll from "../../components/publicGuestRoom/PublicCameraRoll";
import { hasImage, imgOrFallback, orderedItems, sectionText, shouldRenderSection, useGuestContent, validImageItems } from "./pageUtils";

export default function GuestRoomHome() {
  const content = useGuestContent();
  const home = content.home || {};
  const sections = home.sections || {};
  const cameraRollImages = validImageItems(home.cameraRoll?.images || []);
  const introSection = sectionText(sections, "intro");
  const featuredSection = sectionText(sections, "featuredRooms");
  const journeySection = sectionText(sections, "journey");
  const facilitiesSection = sectionText(sections, "facilities");
  const gallerySection = sectionText(sections, "gallery");
  const ctaSection = sectionText(sections, "cta");
  const roomCards = orderedItems(home.roomCards || []).slice(0, 3);
  const journeySteps = orderedItems(home.journey || []);
  const facilities = orderedItems((home.facilities || []).map((item, index) => typeof item === "string" ? { title: item, order: index + 1, enabled: true } : item));

  return (
    <>
      <PublicHero hero={home.hero} />

      <PublicSection enabled={shouldRenderSection(introSection, [home.intro?.title, home.intro?.text, home.stats, home.intro?.image])} className="py-14 md:py-20">
        <div className={`guest-card grid gap-8 rounded-[2.5rem] p-6 md:p-8 lg:items-center xl:p-10 ${hasImage(home.intro?.image) ? "md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:grid-cols-2" : ""}`}>
          <div className="flex min-w-0 flex-col justify-center">
            {introSection.eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-[var(--guest-red)]">{introSection.eyebrow}</p>}
            {(introSection.heading || home.intro?.title) && <h2 className="guest-heading text-4xl font-semibold leading-tight text-[var(--guest-blue)] md:text-5xl">{introSection.heading || home.intro?.title}</h2>}
            {(introSection.description || home.intro?.text) && <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--guest-muted)]">{introSection.description || home.intro?.text}</p>}
            <div className="mt-7">
              <PublicStats stats={home.stats || []} />
            </div>
          </div>
          {hasImage(home.intro?.image) && (
            <div className="flex min-w-0 items-center">
              <div className="w-full overflow-hidden rounded-[2rem] border border-[var(--guest-border)] bg-white shadow-xl">
                <img src={imgOrFallback(home.intro.image)} alt={home.intro?.title || ""} className="h-72 w-full object-cover sm:h-80 lg:h-[26rem]" />
              </div>
            </div>
          )}
        </div>
      </PublicSection>

      <PublicSection enabled={shouldRenderSection(featuredSection, roomCards)} eyebrow={featuredSection.eyebrow} title={featuredSection.heading} text={featuredSection.description}>
        <div className="grid gap-6 md:grid-cols-3">
          {roomCards.map((room) => <PublicRoomCard key={room.title} room={room} />)}
        </div>
      </PublicSection>

      <PublicSection enabled={shouldRenderSection(journeySection, journeySteps)} eyebrow={journeySection.eyebrow} title={journeySection.heading} text={journeySection.description}>
        <PublicStayJourney3D steps={journeySteps} />
      </PublicSection>

      <PublicSection enabled={shouldRenderSection(facilitiesSection, facilities)} eyebrow={facilitiesSection.eyebrow} title={facilitiesSection.heading} text={facilitiesSection.description}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {facilities.map((item) => <PublicFacilityCard key={item.title} title={item.title} facility={item} />)}
        </div>
      </PublicSection>

      {home.cameraRoll?.enabled !== false && cameraRollImages.length > 0 && shouldRenderSection(gallerySection, cameraRollImages) && (
        <PublicSection eyebrow={gallerySection.eyebrow} title={gallerySection.heading} text={gallerySection.description}>
          <PublicCameraRoll config={{ ...home.cameraRoll, images: cameraRollImages }} />
        </PublicSection>
      )}

      {home.cta?.enabled !== false && shouldRenderSection(ctaSection, home.cta) && (
        <PublicSection enabled={ctaSection.enabled} className="pt-4">
          <div className="guest-card rounded-[2.5rem] bg-[#fffaf2] p-8 md:p-12">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                {home.cta?.heading && <h2 className="guest-heading text-4xl font-semibold text-[var(--guest-blue)]">{home.cta.heading}</h2>}
                {(home.cta?.text || home.notice) && <p className="mt-3 max-w-2xl leading-7 text-[var(--guest-muted)]">{home.cta?.text || home.notice}</p>}
              </div>
              {home.cta?.buttonLabel && <Link to={home.cta?.buttonLink || "#"} className="guest-button-primary rounded-full px-7 py-3 text-center font-semibold">{home.cta.buttonLabel}</Link>}
            </div>
          </div>
        </PublicSection>
      )}
    </>
  );
}
