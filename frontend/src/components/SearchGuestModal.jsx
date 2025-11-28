// src/components/SearchGuestModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, X, CalendarDays } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function SearchGuestModal({ hostelData, onSelectGuest, onClose }) {
  

  // ✅ Hooks must always be declared first
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const { currentUser } = useAuth();

  const allowedHostels = currentUser.role === "caretaker"
    ? [currentUser.hostel]
    : Object.keys(hostelData);

  // 👇 Auto-focus input when modal opens
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // 🔍 Search handler
  const handleSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setResults([]);
      return;
    }

    const matches = Object.entries(hostelData)
      .filter(([hostel]) => {
        // Caretaker → only their hostel
        if (currentUser?.role === "caretaker") {
          return allowedHostels.includes(hostel);
        }
        // Admin + Manager → full access
        return true; // admin + manager → full access
      })    
      .flatMap(([hostel, hData]) =>
        (hData.rooms || []).flatMap((room) =>
          (room.bookings || [])
            .filter(
              (b) =>
                (b.guest && b.guest.toLowerCase().includes(q)) ||
                (b.contact && b.contact.toLowerCase().includes(q)) ||
                (b.email && b.email.toLowerCase().includes(q))
            )
            .map((b) => ({
              hostel,
              roomNo: room.roomNo,
              booking: b,
            }))
        )
      );

    setResults(matches);
  };

  // 🧠 Determine booking status
  const getBookingStatus = (from, to) => {
    const now = new Date();
    const start = new Date(from);
    const end = new Date(to);

    if (end < now) return "past";
    if (start <= now && end >= now) return "current";
    return "upcoming";
  };

  // 🎨 Background color by status
  const getBgClass = (status) => {
    switch (status) {
      case "past":
        return "bg-gray-100 hover:bg-gray-200";
      case "current":
        return "bg-green-50 hover:bg-green-100";
      case "upcoming":
        return "bg-blue-50 hover:bg-blue-100";
      default:
        return "bg-white";
    }
  };

  // ✅ Toast-triggered selection handler
  const handleSelectGuest = (guestData) => {
    onSelectGuest(guestData);
    showToast(
      `✅ Guest "${guestData.booking.guest}" selected successfully!`,
      "success"
    );
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 w-[600px] max-w-[95%] shadow-xl"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-red-700 flex items-center gap-2">
            <Search className="w-5 h-5 text-red-700" /> Search Guest
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Field */}
        <div className="flex items-center gap-3 mb-5">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name, contact, or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border p-2 rounded-lg focus:ring-2 focus:ring-red-400 outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            <Search className="w-4 h-4" /> Search
          </button>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto space-y-2">
          {results.length === 0 ? (
            <p className="text-gray-500 italic text-sm text-center">
              No results found. Try searching by name, contact, or email.
            </p>
          ) : (
            <>
              {/* 🧾 Result Count */}
              <p className="text-sm text-gray-600 mb-2 text-right">
                Found <strong>{results.length}</strong>{" "}
                {results.length === 1 ? "result" : "results"}
              </p>

              {results.map((r, idx) => {
                const status = getBookingStatus(r.booking.from, r.booking.to);
                return (
                  <motion.div
                    key={idx}
                    onClick={() => handleSelectGuest(r)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-3 border rounded-lg cursor-pointer transition ${getBgClass(
                      status
                    )}`}
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-red-700 font-medium">
                        {r.booking.guest} — {r.booking.email || "No Email"}
                      </p>
                      <span
                        className={`text-xs font-semibold uppercase ${
                          status === "past"
                            ? "text-gray-500"
                            : status === "current"
                            ? "text-green-600"
                            : "text-blue-600"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600">
                      📞 {r.booking.contact || "No Contact"}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <CalendarDays className="w-4 h-4 text-gray-400" />
                      {r.hostel} / Room {r.roomNo} — {r.booking.from} →{" "}
                      {r.booking.to}
                    </p>
                  </motion.div>
                );
              })}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
