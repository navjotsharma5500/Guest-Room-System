import React from "react";
import RoomCleaningStatusBadge from "./RoomCleaningStatusBadge";

export default function CleaningDashboard({ hostelData = {} }) {
  const rooms = Object.entries(hostelData).flatMap(([hostel, data]) =>
    (data.rooms || []).map((room) => ({ hostel, ...room }))
  );
  const pending = rooms.filter((room) => room.roomState === "cleaning_pending");

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-900 mb-4">Cleaning Dashboard</h2>
      {pending.length === 0 ? (
        <p className="text-slate-500">No rooms pending cleaning.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pending.map((room) => (
            <div key={`${room.hostel}-${room.roomNo}`} className="rounded-xl border p-4">
              <div className="font-bold">{room.hostel}</div>
              <div className="text-sm text-slate-500">{room.roomNo}</div>
              <RoomCleaningStatusBadge state={room.roomState} className="mt-3" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
