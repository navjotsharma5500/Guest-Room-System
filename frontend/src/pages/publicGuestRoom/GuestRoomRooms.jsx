import React from "react";
import PublicHero from "../../components/publicGuestRoom/PublicHero";
import PublicSection from "../../components/publicGuestRoom/PublicSection";
import PublicRoomCard from "../../components/publicGuestRoom/PublicRoomCard";
import PublicPolicyCard from "../../components/publicGuestRoom/PublicPolicyCard";
import { useGuestContent, visibleItems } from "./pageUtils";

export default function GuestRoomRooms() {
  const rooms = useGuestContent().rooms || {};

  return (
    <>
      <PublicHero hero={rooms.hero} badge="Rooms" />
      <PublicSection eyebrow="Room Categories" title="Comfortable rooms inside campus">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {visibleItems(rooms.cards || []).map((room) => <PublicRoomCard key={room.title} room={room} />)}
        </div>
      </PublicSection>
      <PublicSection eyebrow="Notes" title="Before requesting accommodation">
        <div className="grid gap-4 md:grid-cols-2">
          {(rooms.notes || []).map((note) => <PublicPolicyCard key={note} text={note} />)}
        </div>
      </PublicSection>
    </>
  );
}
