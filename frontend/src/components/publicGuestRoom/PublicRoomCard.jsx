import React from "react";
import { BedDouble, Users } from "lucide-react";
import { imgOrFallback } from "../../pages/publicGuestRoom/pageUtils";

export default function PublicRoomCard({ room = {} }) {
  return (
    <article className="guest-card group overflow-hidden rounded-[2rem]">
      <div className="relative h-64 overflow-hidden bg-[#efe4d5]">
        <img src={imgOrFallback(room.image)} alt={room.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute left-4 top-4 rounded-full bg-white/88 px-3 py-1 text-xs font-semibold text-[var(--guest-blue)] backdrop-blur">
          {room.hostel || room.category || "Guest Room"}
        </div>
      </div>
      <div className="p-6">
        <h3 className="guest-heading text-2xl font-semibold text-[var(--guest-blue)]">{room.title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--guest-muted)]">{room.description}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-stone-700">
          <span className="inline-flex items-center gap-2"><Users size={16} className="text-[var(--guest-red)]" /> {room.capacity}</span>
          <span className="inline-flex items-center gap-2"><BedDouble size={16} className="text-[var(--guest-red)]" /> Managed Stay</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {(room.amenities || []).map((item) => (
            <span key={item} className="guest-pill rounded-full px-3 py-1 text-xs font-semibold">{item}</span>
          ))}
        </div>
      </div>
    </article>
  );
}
