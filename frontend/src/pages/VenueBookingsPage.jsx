import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Eye,
  RefreshCw,
  XCircle,
  RotateCcw,
  Loader2,
  AlertCircle,
  Building2,
  Clock,
  Mail,
  Phone,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { fetchVenueBookings } from "../utils/VenueBookingApi";
import useVenueBookingHandlers from "../hooks/useVenueBookingHandlers";
import VenueBookingModal from "../components/VenueBookings/VenueBookingModal";
import VenueBookingDetailsModal from "../components/VenueBookings/VenueBookingDetailsModal";
import VenueCancelModal from "../components/VenueBookings/VenueCancelModal";

const getStatusBadge = (status = "booked") => {
  const map = {
    booked: "bg-yellow-100 text-yellow-800",
    checked_in: "bg-red-100 text-red-800",
    checked_out: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-700",
    no_show: "bg-orange-100 text-orange-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${map[status] || map.booked}`}>
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
  societyEmail: booking.societyEmail || "",
  presidentEmail: booking.presidentEmail || "",
});

export default function VenueBookingsPage({
  theme,
  venueData = {},
  currentUser,
  setExtensionModal,
  onBackHome,
}) {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [bookingDetailsModal, setBookingDetailsModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [rebookModalOpen, setRebookModalOpen] = useState(false);
  const [rebookSourceBooking, setRebookSourceBooking] = useState(null);
  const [remarksText, setRemarksText] = useState("");

  const refreshBookings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchVenueBookings();
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

  useEffect(() => {
    const refreshEvents = [
      "venueBookingCompleted",
      "venueBookingCreated",
      "venueBookingCancelled",
      "venueBookingExtended",
    ];

    const handleRefresh = () => {
      refreshBookings();
    };

    refreshEvents.forEach((eventName) =>
      window.addEventListener(eventName, handleRefresh)
    );

    return () => {
      refreshEvents.forEach((eventName) =>
        window.removeEventListener(eventName, handleRefresh)
      );
    };
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
    setCancelModal,
    setExtensionModal,
  });

  const sortedBookings = useMemo(() => {
    return [...bookings].sort(
      (left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
    );
  }, [bookings]);

  const openBookingDetails = useCallback((booking) => {
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
    <div className="w-full">
      <div
        className={`mb-4 rounded-xl border px-5 py-4 ${
          theme === "dark" ? "border-[#3c4043] bg-[#292a2d]" : "border-[#dadce0] bg-white"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              className={`text-2xl font-semibold ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}
            >
              Venue Bookings
            </h2>
            <p
              className={`text-sm ${
                theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
              }`}
            >
              View, cancel, and rebook venue reservations without duplicating the
              booking flow.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onBackHome && (
              <button
                onClick={onBackHome}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  theme === "dark"
                    ? "bg-[#3c4043] text-[#e8eaed]"
                    : "bg-[#f1f3f4] text-[#202124]"
                }`}
              >
                Home
              </button>
            )}
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

      {loading ? (
        <div
          className={`rounded-xl border p-12 text-center ${
            theme === "dark" ? "border-[#3c4043] bg-[#292a2d]" : "border-[#dadce0] bg-white"
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
            theme === "dark" ? "border-[#3c4043] bg-[#292a2d]" : "border-[#dadce0] bg-white"
          }`}
        >
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-600" />
          <p className={theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}>
            {error}
          </p>
        </div>
      ) : sortedBookings.length === 0 ? (
        <div
          className={`rounded-xl border p-12 text-center ${
            theme === "dark" ? "border-[#3c4043] bg-[#292a2d]" : "border-[#dadce0] bg-white"
          }`}
        >
          <Calendar className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <p className={theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}>
            No venue bookings found.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedBookings.map((booking, index) => (
            <motion.div
              key={booking._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className={`rounded-xl border p-5 shadow-sm ${
                theme === "dark" ? "border-[#3c4043] bg-[#292a2d]" : "border-[#dadce0] bg-white"
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
                      {booking.eventName || booking.name || "Venue Booking"}
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
                      <Clock size={16} className="text-blue-600" />
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
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openBookingDetails(booking)}
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

                  {(booking.status === "booked" || booking.status === "checked_in") && (
                    <button
                      onClick={() =>
                        setCancelModal({
                          hall: booking.hall,
                          room: { roomNo: booking.roomNo },
                          booking,
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      <XCircle size={14} />
                      Cancel
                    </button>
                  )}
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
            onCancel={() => {
              setCancelModal(bookingDetailsModal);
              setBookingDetailsModal(null);
            }}
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

        {cancelModal && (
          <VenueCancelModal
            theme={theme}
            modal={cancelModal}
            remarksText={remarksText}
            setRemarksText={setRemarksText}
            onClose={() => setCancelModal(null)}
            onDone={async (remarks) => {
              await bookingHandlers.onCancelDone(remarks, cancelModal);
              refreshBookings();
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
