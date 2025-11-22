// src/components/FilterModal.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Filter, X } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function FilterModal({ hostelData, onSelectBooking, onClose }) {
  const { currentUser } = useAuth();


  // ✅ Hooks must be first
  const { showToast } = useToast();

  const [filters, setFilters] = useState({
    hostel: "",
    roomNo: "",
    guest: "",
    paymentType: "",
    status: "",
    from: "",
    to: "",
  });
  const [results, setResults] = useState([]);

  const allHostels = Object.keys(hostelData);

  // 🔍 Filter handler
  const handleFilter = () => {
    const now = new Date();
    const matches = Object.entries(hostelData)
      .filter(([hostel]) => {
        // Caretaker → ONLY see/filter their own hostel
        if (currentUser?.role === "caretaker") {
          return currentUser.hostel === hostel; // only his own hostel
        }
        return true; // admin + manager → full access
      })    
      .flatMap(([hostel, hData]) =>
        (hData.rooms || []).flatMap((room) =>
          (room.bookings || [])
            .filter((b) => {
              const start = new Date(b.from);
              const end = new Date(b.to);

              // 🧮 Date Range
              if (filters.from && new Date(filters.from) > end) return false;
              if (filters.to && new Date(filters.to) < start) return false;

              // 🏢 Hostel
              if (filters.hostel && hostel !== filters.hostel) return false;

              // 🚪 Room
              if (filters.roomNo && room.roomNo.toString() !== filters.roomNo)
                return false;

              // 👤 Guest
              const guestMatch =
                filters.guest &&
                !(
                  b.guest?.toLowerCase().includes(filters.guest.toLowerCase()) ||
                  b.contact?.includes(filters.guest) ||
                  b.email?.toLowerCase().includes(filters.guest.toLowerCase())
                );
              if (guestMatch) return false;

              // 💳 Payment Type
              if (filters.paymentType && b.paymentType !== filters.paymentType)
                return false;

              // 📍 Status
              const isPast = end < now;
              const isCurrent = start <= now && end >= now;
              const isUpcoming = start > now;

              if (filters.status === "Past" && !isPast) return false;
              if (filters.status === "Current" && !isCurrent) return false;
              if (filters.status === "Upcoming" && !isUpcoming) return false;

              return true;
            })
            .map((b) => ({
              hostel,
              roomNo: room.roomNo,
              booking: b,
            }))
        )
      );

    setResults(matches);

    if (matches.length > 0) {
      showToast(`✅ Found ${matches.length} matching booking(s).`, "success");
    } else {
      showToast("⚠️ No bookings match your filters.", "warning");
    }
  };

  const handleSelectBooking = (r) => {
    onSelectBooking(r);
    showToast(
      `🎯 Selected booking for ${r.booking.guest} — Room ${r.roomNo}`,
      "info"
    );
    onClose();
  };

  const getStatusColor = (from, to) => {
    const now = new Date();
    const start = new Date(from);
    const end = new Date(to);
    if (end < now) return "text-gray-500";
    if (start <= now && end >= now) return "text-green-600";
    return "text-blue-600";
  };

  const resetFilters = () => {
    setFilters({
      hostel: "",
      roomNo: "",
      guest: "",
      paymentType: "",
      status: "",
      from: "",
      to: "",
    });
    setResults([]);
    showToast("🔄 Filters cleared.", "info");
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
        className="bg-white rounded-2xl p-6 w-[700px] max-w-[95%] shadow-xl"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-red-700 flex items-center gap-2">
            <Filter className="w-5 h-5 text-red-700" /> Filter Bookings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Fields */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Date Range */}
          <div>
            <label className="text-sm block mb-1">From Date</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label className="text-sm block mb-1">To Date</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="border p-2 rounded w-full"
            />
          </div>

          {/* Hostel */}
          <div>
            <label className="text-sm block mb-1">Hostel</label>
            <select
              value={filters.hostel}
              onChange={(e) =>
                setFilters({ ...filters, hostel: e.target.value })
              }
              className="border p-2 rounded w-full"
            >
              <option value="">All</option>
              {allHostels.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Room */}
          <div>
            <label className="text-sm block mb-1">Room No</label>
            <input
              type="text"
              value={filters.roomNo}
              onChange={(e) =>
                setFilters({ ...filters, roomNo: e.target.value })
              }
              className="border p-2 rounded w-full"
              placeholder="Enter room number"
            />
          </div>

          {/* Guest */}
          <div>
            <label className="text-sm block mb-1">Guest / Contact / Email</label>
            <input
              type="text"
              value={filters.guest}
              onChange={(e) =>
                setFilters({ ...filters, guest: e.target.value })
              }
              className="border p-2 rounded w-full"
              placeholder="Search guest"
            />
          </div>

          {/* Payment Type */}
          <div>
            <label className="text-sm block mb-1">Payment Type</label>
            <select
              value={filters.paymentType}
              onChange={(e) =>
                setFilters({ ...filters, paymentType: e.target.value })
              }
              className="border p-2 rounded w-full"
            >
              <option value="">All</option>
              <option value="Free">Free</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          {/* Booking Status */}
          <div>
            <label className="text-sm block mb-1">Booking Status</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="border p-2 rounded w-full"
            >
              <option value="">All</option>
              <option value="Past">Past</option>
              <option value="Current">Current</option>
              <option value="Upcoming">Upcoming</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mb-4">
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
          >
            Reset
          </button>
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Apply Filters
          </button>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto space-y-2">
          {results.length === 0 ? (
            <p className="text-gray-500 italic text-sm text-center">
              No bookings match your filters.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-2 text-right">
                Found <strong>{results.length}</strong>{" "}
                {results.length === 1 ? "booking" : "bookings"}
              </p>

              {results.map((r, idx) => (
                <motion.div
                  key={idx}
                  onClick={() => handleSelectBooking(r)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-3 border rounded-lg hover:bg-red-50 cursor-pointer transition"
                >
                  <p className="text-red-700 font-medium">
                    {r.booking.guest} ({r.hostel} / Room {r.roomNo})
                  </p>
                  <p className={`text-sm ${getStatusColor(r.booking.from, r.booking.to)}`}>
                    {r.booking.from} → {r.booking.to}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.booking.email || "No Email"} | 📞 {r.booking.contact || "No Contact"}
                  </p>
                </motion.div>
              ))}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
