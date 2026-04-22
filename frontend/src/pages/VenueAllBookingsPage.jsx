import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  Eye,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../utils/apiConfig";
import { useToast } from "../context/ToastContext";
import useVenueBookingHandlers from "../hooks/useVenueBookingHandlers";
import VenueBookingDetailsModal from "../components/VenueBookings/VenueBookingDetailsModal";
import VenueBookingModal from "../components/VenueBookings/VenueBookingModal";

const API = BACKEND_URL;

const getStatusBadge = (status = "booked") => {
  const map = {
    booked: "bg-yellow-100 text-yellow-800",
    checked_in: "bg-red-100 text-red-800",
    checked_out: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-700",
    no_show: "bg-orange-100 text-orange-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        map[status] || map.booked
      }`}
    >
      {String(status || "booked").replace("_", " ").toUpperCase()}
    </span>
  );
};

const buildRebookPrefill = (booking = {}) => ({
  name: booking.name || "",
  societyName: booking.societyName || "",
  eventName: booking.eventName || "",
  department: booking.department || "",
  contact: booking.contact || "",
  email: booking.email || "",
  purpose: booking.purpose || "",
  description: booking.description || "",
});

export default function VenueAllBookingsPage({ theme, venueData = {}, setExtensionModal }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [selectedRooms, setSelectedRooms] = useState([]);
  const [bookingDetailsModal, setBookingDetailsModal] = useState(null);
  const [rebookModalOpen, setRebookModalOpen] = useState(false);
  const [rebookSourceBooking, setRebookSourceBooking] = useState(null);

  const refreshBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/venue-bookings`, {
        method: "GET",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch venue bookings");
      }

      const data = await response.json();
      setBookings(Array.isArray(data) ? data : []);
      setError("");
    } catch (fetchError) {
      console.error("Failed to load venue bookings:", fetchError);
      setError(fetchError.message || "Failed to load venue bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBookings();
  }, [refreshBookings]);

  const bookingHandlers = useVenueBookingHandlers({
    hallData: venueData,
    selectedRooms,
    showToast,
    setSelectedRooms,
    setHallBookingModal: setRebookModalOpen,
    setSelectionMode: () => {},
    setBookingCompleted: () => {},
    setBookingDetailsModal,
    setCancelModal: () => {},
    setExtensionModal,
  });

  const sortedBookings = useMemo(
    () =>
      [...bookings].sort(
        (left, right) =>
          new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
      ),
    [bookings]
  );

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedBookings;

    return sortedBookings.filter((booking) => {
      return (
        booking.name?.toLowerCase().includes(q) ||
        booking.eventName?.toLowerCase().includes(q) ||
        booking.email?.toLowerCase().includes(q) ||
        booking.contact?.includes(q) ||
        booking.societyName?.toLowerCase().includes(q) ||
        booking.hall?.toLowerCase().includes(q) ||
        booking.roomNo?.toLowerCase().includes(q)
      );
    });
  }, [search, sortedBookings]);

  const openDetails = useCallback((booking) => {
    setBookingDetailsModal({
      hall: booking.hall,
      room: { roomNo: booking.roomNo },
      booking,
    });
  }, []);

  const handleRebook = useCallback((booking) => {
    setRebookSourceBooking(booking);
    setSelectedRooms([]);
    setRebookModalOpen(true);
  }, []);

  const closeRebookModal = useCallback(() => {
    setRebookModalOpen(false);
    setRebookSourceBooking(null);
    setSelectedRooms([]);
  }, []);

  return (
    <div className="w-full py-4">
      <div
        className={`mb-4 rounded-xl border px-5 py-4 ${
          theme === "dark"
            ? "border-[#3c4043] bg-[#292a2d]"
            : "border-[#dadce0] bg-white"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              className={`text-2xl font-semibold ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}
            >
              All Bookings
            </h2>
            <p
              className={`text-sm ${
                theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
              }`}
            >
              Complete venue booking history with isolated rebooking workflow.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/venue-booking")}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              onClick={refreshBookings}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div
        className={`mb-4 rounded-xl border px-5 py-4 ${
          theme === "dark"
            ? "border-[#3c4043] bg-[#292a2d]"
            : "border-[#dadce0] bg-white"
        }`}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search name, email, contact, venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full rounded-lg border py-2 pl-10 pr-4 text-sm outline-none ${
              theme === "dark"
                ? "border-[#3c4043] bg-[#202124] text-[#e8eaed]"
                : "border-[#dadce0] bg-white text-[#202124]"
            }`}
          />
        </div>
      </div>

      {loading ? (
        <div
          className={`rounded-xl border p-12 text-center ${
            theme === "dark"
              ? "border-[#3c4043] bg-[#292a2d]"
              : "border-[#dadce0] bg-white"
          }`}
        >
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" />
          <p className={theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}>
            Loading venue bookings...
          </p>
        </div>
      ) : error ? (
        <div
          className={`rounded-xl border p-12 text-center ${
            theme === "dark"
              ? "border-[#3c4043] bg-[#292a2d]"
              : "border-[#dadce0] bg-white"
          }`}
        >
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-600" />
          <p className={theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}>
            {error}
          </p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div
          className={`rounded-xl border p-12 text-center ${
            theme === "dark"
              ? "border-[#3c4043] bg-[#292a2d]"
              : "border-[#dadce0] bg-white"
          }`}
        >
          <Calendar className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <p className={theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}>
            No venue bookings found.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking, index) => (
            <motion.div
              key={booking._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`rounded-xl border p-5 shadow-sm ${
                theme === "dark"
                  ? "border-[#3c4043] bg-[#292a2d]"
                  : "border-[#dadce0] bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3
                      className={`text-lg font-semibold ${
                        theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                      }`}
                    >
                      {booking.eventName || "Untitled Event"}
                    </h3>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-blue-600" />
                      <span className={theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}>
                        {booking.hall} • {booking.roomNo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-blue-600" />
                      <span className={theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}>
                        {booking.checkInDate} {booking.checkInTime} to {booking.checkOutDate}{" "}
                        {booking.checkOutTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-blue-600" />
                      <span className={theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}>
                        {booking.email || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-blue-600" />
                      <span className={theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}>
                        {booking.contact || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Clock size={16} className="text-blue-600" />
                      <span className={theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}>
                        Society: {booking.societyName || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openDetails(booking)}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                  >
                    <Eye size={14} />
                    View
                  </button>
                  <button
                    onClick={() => handleRebook(booking)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <RotateCcw size={14} />
                    Rebook
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {bookingDetailsModal && (
          <VenueBookingDetailsModal
            theme={theme}
            modal={bookingDetailsModal}
            onClose={() => setBookingDetailsModal(null)}
            onCancel={() => setBookingDetailsModal(null)}
            onExtend={() => {
              setExtensionModal?.(bookingDetailsModal);
              setBookingDetailsModal(null);
            }}
            onRebook={() => {
              const booking = bookingDetailsModal.booking;
              setBookingDetailsModal(null);
              handleRebook(booking);
            }}
          />
        )}

        {rebookModalOpen && (
          <VenueBookingModal
            theme={theme}
            mode="rebook"
            selectedRooms={selectedRooms}
            prefill={buildRebookPrefill(rebookSourceBooking)}
            onSelectedRoomsChange={setSelectedRooms}
            onClose={closeRebookModal}
            onSubmit={async (payload) => {
              const result = await bookingHandlers.handleVenueBooking(payload);
              if (result) {
                closeRebookModal();
                refreshBookings();
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
