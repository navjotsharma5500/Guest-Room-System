import React from "react";
import { Building2, DoorOpen } from "lucide-react";

export default function QRRoomInfoCard({ room }) {
  if (!room) return null;

  return (
    <section className="rounded-3xl bg-white border shadow-sm p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-black">Scanned Room</p>
      <div className="mt-3 grid grid-cols-1 gap-3">
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-3">
          <Building2 className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-xs text-slate-500">Hostel</p>
            <p className="font-black text-slate-900">{room.hostelName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-blue-50 p-3">
          <DoorOpen className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-xs text-slate-500">Room</p>
            <p className="font-black text-slate-900">{room.roomNo}</p>
            {room.roomType && <p className="text-xs text-slate-500">{room.roomType}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
