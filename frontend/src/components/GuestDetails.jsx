// src/components/GuestDetails.jsx
import React from "react";
import { motion } from "framer-motion";
import { User2, Info } from "lucide-react";
import AttachmentGrid from "./AttachmentGrid";

export default function GuestDetails({ activeRoomRef, onCancel, theme, setExtensionModal }) {
  if (!activeRoomRef)
    return (
      <div className="flex flex-col items-center justify-center mt-10 text-gray-500 italic">
        <Info className="w-6 h-6 mb-2 text-red-400" />
        <p>Select a room to view guest details.</p>
      </div>
    );

  const b = activeRoomRef.booking || {};
  const hasBooking = Object.keys(b).length > 0;

  // ✅ Corrected unified fields
  const detailList = [
    { label: "Booking ID", key: "id" },
    { label: "Name / Society Name", key: "guest" },
    { label: "Roll No / Employee ID", key: "rollNo" },   // FIXED
    { label: "Department", key: "department" },

    { label: "Number of Guests", key: "numGuests", altKey: "guests" },
    { label: "Number of Females", key: "females" },
    { label: "Number of Males", key: "males" },

    { label: "Contact", key: "contact" },
    { label: "Email", key: "email" },
    { label: "Gender", key: "gender" },

    { label: "State", key: "state" },
    { label: "City", key: "city" },

    { label: "Purpose of Stay", key: "purpose" },
    { label: "Reference", key: "reference" },

    { label: "Payment Type", key: "paymentType" },
    { label: "Amount", key: "amount" },

    { label: "From Date", key: "from" },
    { label: "To Date", key: "to" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`rounded-2xl shadow-md border p-6 ${
        theme === "dark"
          ? "bg-gray-800 border-gray-700 text-gray-100"
          : "bg-white border-red-100 text-gray-700"
      }`}
    >
      <h2
        className={`text-xl font-bold mb-4 flex items-center gap-2 ${
          theme === "dark" ? "text-red-400" : "text-red-700"
        }`}
      >
        <User2 /> Guest Details
      </h2>

      <div className="space-y-2 text-sm leading-relaxed">
        <p><strong>🏠 Hostel:</strong> {activeRoomRef.hostel || "—"}</p>
        <p><strong>🛏️ Room:</strong> {activeRoomRef.roomNo || "—"}</p>

        {/* 🔥 Auto-render all booking fields */}
        {hasBooking ? (
          detailList.map((item) => {
            const value = b[item.key];
            if (value === undefined || value === null || value === "") return null;
            return (
              <p key={item.key}>
                <strong>{item.label}:</strong> {String(value)}
              </p>
            );
          })
        ) : (
          <p className="text-gray-500 italic">No booking information available.</p>
        )}

        {/* 📎 Attachments */}
        {b?.files?.length > 0 && (
          <div className="mt-4">
            <AttachmentGrid files={b.files} theme={theme} />
          </div>
        )}
      </div>

      {/* ⭐ Action Buttons */}
      {b.id && (
        <div className="mt-6 flex justify-end gap-3">

          {/* Extend Booking */}
          {new Date(b.to) >= new Date() && (
            <button
              onClick={() =>
                setExtensionModal({
                  open: true,
                  hostel: activeRoomRef.hostel,
                  roomNo: activeRoomRef.roomNo,
                  booking: b,
                })
              }
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 shadow transition"
            >
              Extend Booking
            </button>
          )}

          {/* Cancel Booking */}
          <button
            onClick={() =>
              onCancel({
                hostel: activeRoomRef.hostel,
                room: { roomNo: activeRoomRef.roomNo },
                booking: b,
              })
            }
            className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 shadow transition"
          >
            Cancel Booking
          </button>
        </div>
      )}
    </motion.div>
  );
}
