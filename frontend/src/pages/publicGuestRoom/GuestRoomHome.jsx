import React from "react";
import { Link } from "react-router-dom";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicStats from "../../components/publicGuestRoom/PublicStats";
import PublicRoomCard from "../../components/publicGuestRoom/PublicRoomCard";
import PublicFacilityCard from "../../components/publicGuestRoom/PublicFacilityCard";
import PublicStayJourney3D from "../../components/publicGuestRoom/PublicStayJourney3D";
import PublicCameraRoll from "../../components/publicGuestRoom/PublicCameraRoll";
import { hasImage, imgOrFallback, useGuestContent, validImageItems, visibleItems } from "./pageUtils";

export default function GuestRoomHome() {
  const content = useGuestContent();
  const home = content.home || {};
  const cameraRollImages = validImageItems(home.cameraRoll?.images || []);

  return (
    <>
      <PublicHero hero={home.hero} />

      <PublicSection eyebrow="Welcome" title={home.intro?.title} text={home.intro?.text}>
        <div className={`grid gap-8 ${hasImage(home.intro?.image) ? "lg:grid-cols-[1fr_0.8fr] lg:items-center" : ""}`}>
          <PublicStats stats={home.stats || []} />
          {hasImage(home.intro?.image) && (
            <div className="overflow-hidden rounded-[2rem] border border-[var(--guest-border)] bg-white shadow-xl">
              <img src={imgOrFallback(home.intro.image)} alt={home.intro?.title || "Guest room welcome"} className="h-72 w-full object-cover" />
            </div>
          )}
        </div>
      </PublicSection>

      <PublicSection eyebrow="Featured Rooms" title="Calm campus stays for approved guests">
        <div className="grid gap-6 md:grid-cols-3">
          {visibleItems(home.roomCards || []).slice(0, 3).map((room) => <PublicRoomCard key={room.title} room={room} />)}
        </div>
      </PublicSection>

      <PublicSection eyebrow="Journey" title="Your Stay Journey" text="A transparent guest-room workflow from enquiry to checkout.">
        <PublicStayJourney3D steps={home.journey || []} />
      </PublicSection>

      <PublicSection eyebrow="Facilities" title="Supported by campus hospitality services">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(home.facilities || []).map((item) => <PublicFacilityCard key={item} title={item} />)}
        </div>
      </PublicSection>

      {home.cameraRoll?.enabled !== false && cameraRollImages.length > 0 && (
        <PublicSection eyebrow="Camera Roll" title="A glimpse of Thapar hospitality">
          <PublicCameraRoll config={{ ...home.cameraRoll, images: cameraRollImages }} />
        </PublicSection>
      )}

      {home.cta?.enabled !== false && (
        <PublicSection className="pt-4">
          <div className="guest-card rounded-[2.5rem] bg-[#fffaf2] p-8 md:p-12">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="guest-heading text-4xl font-semibold text-[var(--guest-blue)]">{home.cta?.heading}</h2>
                <p className="mt-3 max-w-2xl leading-7 text-[var(--guest-muted)]">{home.cta?.text || home.notice}</p>
              </div>
              <Link to={home.cta?.buttonLink || "/guest-room/booking"} className="guest-button-primary rounded-full px-7 py-3 text-center font-semibold">
                {home.cta?.buttonLabel || "Book Now"}
              </Link>
            </div>
          </div>
        </PublicSection>
      )}
    </>
  );
}
