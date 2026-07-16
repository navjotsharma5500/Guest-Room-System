import React from "react";
import { BedDouble, Users } from "lucide-react";
import { imgOrFallback } from "../../pages/publicGuestRoom/pageUtils";

export default function PublicRoomCard({ room = {} }) {
  if (room.enabled === false || (!room.title && !room.name)) return null;
  const title = room.title || room.name;
  const detailsLink = room.buttonUrl || room.url || "";
  return (
    <article className="guest-card group overflow-hidden rounded-[2rem]">
      <div className="relative h-64 overflow-hidden bg-[#efe4d5]">
        <img src={imgOrFallback(room.coverImage || room.thumbnail || room.image)} alt={title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        {(room.hostel || room.category) && <div className="absolute left-4 top-4 rounded-full bg-white/88 px-3 py-1 text-xs font-semibold text-[var(--guest-blue)] backdrop-blur">{room.hostel || room.category}</div>}
      </div>
      <div className="p-6">
        <h3 className="guest-heading text-2xl font-semibold text-[var(--guest-blue)]">{title}</h3>
        {room.description && <p className="mt-2 text-sm leading-6 text-[var(--guest-muted)]">{room.description}</p>}
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-stone-700">
          {room.capacity && <span className="inline-flex items-center gap-2"><Users size={16} className="text-[var(--guest-red)]" /> {room.capacity}</span>}
          {(room.roomType || room.acType) && <span className="inline-flex items-center gap-2"><BedDouble size={16} className="text-[var(--guest-red)]" /> {room.roomType || room.acType}</span>}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {(room.amenities || []).map((item) => (
            <span key={item} className="guest-pill rounded-full px-3 py-1 text-xs font-semibold">{item}</span>
          ))}
        </div>
        {room.buttonText && (
          <a href={detailsLink || "#"} className="guest-button-secondary mt-5 inline-flex rounded-full px-4 py-2 text-sm font-semibold">
            {room.buttonText}
          </a>
        )}
      </div>
    </article>
  );
}
