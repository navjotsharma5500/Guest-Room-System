// src/pages/AllHostelsPortal.jsx
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Home,
  Filter,
  CheckSquare,
  X,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import DirectBookingModal from "../components/DirectBookingModal";
import CancelModal from "../components/CancelModal";
import AttachmentGrid from "../components/AttachmentGrid";
import { isDateRangeOverlapping } from "../utils/dateUtils";
import ExtensionModal from "../components/ExtensionModal";

/**
 * AllHostelsPortal.jsx
 * Phase 3 - All Hostels Portal (with booking extension support)
 */

export default function AllHostelsPortal({
  hostelData = {},
  setHostelData,
  prefillGuest,
  theme,
  onBackHome,
  handleStartDirectBooking, // still accepted for compatibility
}) {
  const { showToast } = useToast();

  const [filterModal, setFilterModal] = useState(false);
  const [vacantRooms, setVacantRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [directBookingModal, setDirectBookingModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [extensionModal, setExtensionModal] = useState(null); // ⭐ local state for extend popup
  const [consolidateModal, setConsolidateModal] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  
  const API = "https://guestroom-backend.onrender.com";

  async function addBookingToBackend(hostel, roomNo, booking) {
    return await fetch(`${API}/api/bookings/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostel, roomNo, booking }),
    }).then(r => r.json());
  }
  
  async function removeBookingFromBackend(hostel, roomNo, bookingId) {
    return await fetch(`${API}/api/bookings/remove`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostel, roomNo, bookingId }),
    }).then(r => r.json());
  }
  
  async function extendBookingInBackend(hostel, roomNo, bookingId, newToDate) {
    return await fetch(`${API}/api/bookings/extend`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostel, roomNo, bookingId, newToDate }),
    }).then(r => r.json());
  }    

  // booking list modal (when room has >1 booking)
  const [bookingListModal, setBookingListModal] = useState(null);
  // booking details modal (single booking)
  const [bookingDetailsModal, setBookingDetailsModal] = useState(null);

  // suppress toast at immediate open when prefillGuest arrives
  const suppressToastRef = useRef(false);

  useEffect(() => {
    async function loadFromBackend() {
      const res = await fetch(`${API}/api/bookings/all`);
      const data = await res.json();
      setHostelData(data);
    }
    loadFromBackend();
  }, []);    

  useEffect(() => {
    if (prefillGuest) {
      setSelectionMode(true);
      // prefill dates if provided in enquiry
      if (prefillGuest.from) setCheckIn(prefillGuest.from);
      if (prefillGuest.to) setCheckOut(prefillGuest.to);

      suppressToastRef.current = true;
      setTimeout(() => (suppressToastRef.current = false), 1200);
    }
  }, [prefillGuest]);

  const detailFields = [
  { label: "Booking ID", key: "id" },
  { label: "Name / Society Name", key: "guest" },
  { label: "Roll No / Employee ID", key: "rollno" },
  { label: "Department", key: "department" },

  { label: "Total Guests", key: "numGuests" },
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

  { label: "From", key: "from" },
  { label: "To", key: "to" },
];

  // ---------- Helpers ----------


  // Robust guest name extractor (fallback to many possible keys)
  const getGuestName = (booking) => {
    if (!booking) return "Guest";
    return (
      booking.guest ||
      booking.name ||
      booking.fullName ||
      booking.contactName ||
      booking.guestName ||
      "Guest"
    );
  };

  // safe trim to avoid trim() on undefined
  const safeTrim = (v) => {
    if (v === null || v === undefined) return "";
    return typeof v === "string" ? v.trim() : String(v).trim();
  };

  // ---------- Vacancy search ----------
  const handleFilterSubmit = () => {
    if (!checkIn || !checkOut) {
      showToast("⚠️ Please select both Check-in and Check-out dates.", "warning");
      return;
    }

    const vacant = [];

    Object.entries(hostelData || {}).forEach(([hostel, data]) => {
      (data.rooms || []).forEach((room) => {
        const overlapping = (room.bookings || []).some((b) =>
          isDateRangeOverlapping(b.from, b.to, checkIn, checkOut)
        );
        if (!overlapping) vacant.push({ hostel, room });
      });
    });

    setVacantRooms(vacant);
    setFilterModal(false);
    showToast(`${vacant.length} vacant room(s) found.`, "success");
  };

  // ---------- Selection & consolidated booking ----------
  const toggleRoomSelect = (hostel, roomNo) => {
    const key = `${hostel}_${roomNo}`;
    setSelectedRooms((prev) =>
      prev.some((r) => `${r.hostel}_${r.roomNo}` === key)
        ? prev.filter((r) => `${r.hostel}_${r.roomNo}` !== key)
        : [...prev, { hostel, roomNo }]
    );
  };

  const handleConsolidatedBooking = async (dates, paymentType, amount) => {
    if (!dates?.from || !dates?.to) {
      showToast("⚠️ Please provide booking dates.", "warning");
      return;
    }
    if (!selectedRooms || selectedRooms.length === 0) {
      showToast("⚠️ No rooms selected.", "warning");
      return;
    }

    const guestData = {
      ...(prefillGuest || {}),
      from: dates.from,
      to: dates.to,
      paymentType: paymentType || "Free",
      amount: amount || 0,
    };

    // Loop through selected rooms and add booking to backend
    for (const { hostel, roomNo } of selectedRooms) {
      const id = `b_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

      const bookingObj = {
        id,
        guest: guestData.name || guestData.guest || guestData.fullName || "Guest",
        ...guestData,
      };
      
      // Send to backend
      const res = await addBookingToBackend(hostel, roomNo, bookingObj);
      if (!res.success) {
        showToast(`❌ Failed to book ${hostel} Room ${roomNo}`, "error");
        continue;
      }
      
      // Update UI instantly
      setHostelData(prev => {
        const copy = structuredClone(prev);
        const room = copy[hostel]?.rooms?.find(r => r.roomNo === roomNo);
        if (room) {
          room.bookings = room.bookings || [];
          room.bookings.push(bookingObj);
        }
        return copy;  
      });  
    }
    
    showToast(
      `✅ ${selectedRooms.length} room(s) booked for ${
        guestData.name || guestData.guest || "Guest"
      }`,
      "success"  
    );
    
    setSelectedRooms([]);
    setConsolidateModal(false);
    setSelectionMode(false);
  };  

  // ---------- Booked room click handling ----------
  const handleBookedRoomClick = (hostel, room) => {
    const bookings = room.bookings || [];
    if (bookings.length === 1) {
      setBookingDetailsModal({ hostel, room, booking: bookings[0] });
    } else if (bookings.length > 1) {
      setBookingListModal({ hostel, room, bookings });
    }
  };

  // ---------- Direct booking submit ----------
  const onDirectBookingSubmit = async (modal, booking) => {
    if (!modal) return;

    const response = await addBookingToBackend(
      modal.hostel,
      modal.room.roomNo,
      booking
    );
    
    if (!response.success) {
      showToast("❌ Failed to save booking", "error");
      return;
    }
    
    // update UI instantly
    setHostelData(prev => {
      const copy = structuredClone(prev);
      const room = copy[modal.hostel].rooms.find(r => r.roomNo === modal.room.roomNo);
      room.bookings.push(booking);
      return copy;
    });
    
    showToast("✅ Booking added successfully!", "success");
    setDirectBookingModal(null);
  };  

  // ---------- Cancel booking done ----------
  const onCancelDone = async () => {
    if (!cancelModal) return;

    const { hostel, room, booking } = cancelModal;

    const res = await removeBookingFromBackend(hostel, room.roomNo, booking.id);

    if (!res.success) {
      showToast("❌ Failed to cancel booking", "error");
      return;
    }
    
    setHostelData(prev => {
      const copy = structuredClone(prev);
      const r = copy[hostel].rooms.find(r => r.roomNo === room.roomNo);
      r.bookings = r.bookings.filter(b => b.id !== booking.id);
      return copy;
    });
    
    showToast("❌ Booking cancelled", "error");
    setCancelModal(null);
    setBookingDetailsModal(null);
    setBookingListModal(null);
  };  

  const openDirectBookingForVacant = ({ hostel, room, prefill = null }) => {
    setDirectBookingModal({ open: true, hostel, room, prefill });
  };

  const onDoneSelection = () => {
    if (!selectedRooms || selectedRooms.length === 0) {
      showToast("⚠️ Select at least one room.", "warning");
      return;
    }
    setConsolidateModal(true);
  };

  // ---------- EXTEND BOOKING HANDLER ----------
  const handleExtendBooking = async (newToDate) => {
    if (!extensionModal) return;

    const { hostel, roomNo, booking } = extensionModal;

    const res = await extendBookingInBackend(hostel, roomNo, booking.id, newToDate);

    if (!res.success) {
      showToast("❌ Failed to extend booking", "error");
      return;
    }
    
    setHostelData(prev => {
      const copy = structuredClone(prev);
      const r = copy[hostel].rooms.find(r => r.roomNo === roomNo);
      const b = r.bookings.find(b => b.id === booking.id);
      b.to = newToDate;
      return copy;
    });
    
    showToast("✔️ Booking extended successfully!", "success");
    setExtensionModal(null);
  };  

  // ---------- Render ----------
  return (
    <div
      className={`min-h-screen overflow-x-hidden ${
        theme === "dark"
          ? "bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100"
          : "bg-gradient-to-b from-red-50 to-white text-gray-900"
      }`}
    >
      {/* Header */}
      <div
        className={`flex justify-between items-center px-6 py-4 border-b shadow-sm sticky top-0 z-20 ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilterModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
            aria-label="Filter vacant rooms"
            title="Check vacancy by date range"
          >
            <Filter size={18} /> Filter
          </button>

          {selectionMode && (
            <span className="text-red-600 font-semibold">
              Selection Mode Active ({selectedRooms.length} Selected)
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold text-red-700 flex items-center gap-2">
          <Building2 /> All Hostels Portal
        </h1>

        <button
          onClick={() => {
            // Exit selection mode and clear prefillGuest memory
            setSelectionMode(false);
            setSelectedRooms([]);
            onBackHome && onBackHome();
          }}
          className={`flex items-center gap-2 border px-4 py-2 rounded-full shadow transition ${
            theme === "dark"
              ? "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
              : "bg-white border-red-400 text-red-700 hover:bg-red-50"
          }`}
        >
          <Home size={18} /> Home
        </button>
      </div>

      {/* Extension Modal */}
      <AnimatePresence>
        {extensionModal && (
          <ExtensionModal
            modal={extensionModal}
            onClose={() => setExtensionModal(null)}
            onExtend={handleExtendBooking}
          />
        )}
      </AnimatePresence>

      {/* Main grid */}
      <div className="p-6 grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(hostelData || {}).map(([hostelName, hostel]) => (
          <motion.div
            key={hostelName}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
            className={`rounded-2xl shadow-lg border-l-8 border-red-600 p-5 ${
              theme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
          >
            <h2 className="text-xl font-semibold text-red-700 mb-3">
              🏢 {hostelName}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(hostel.rooms || []).map((room, idx) => {
                const booked = (room.bookings || []).length > 0;
                const isSelected = selectedRooms.some(
                  (r) => r.hostel === hostelName && r.roomNo === room.roomNo
                );
                const firstBooking = booked ? room.bookings[0] : null;

                // For enquiry prefill or manual selection, detect date conflict
                const guestFrom = prefillGuest?.from
                  ? new Date(prefillGuest.from)
                  : null;
                const guestTo = prefillGuest?.to
                  ? new Date(prefillGuest.to)
                  : null;

                const hasConflict = (room.bookings || []).some((b) =>
                  isDateRangeOverlapping(
                    b.from,
                    b.to,
                    prefillGuest?.from,
                    prefillGuest?.to
                  )
                );

                const availableForNewDates =
                  prefillGuest && guestFrom && guestTo ? !hasConflict : !booked;

                return (
                  <motion.div
                    key={`${hostelName}_${room.roomNo}_${idx}`}
                    whileHover={{ scale: 1.03 }}
                    className={`relative border rounded-xl p-4 text-center cursor-pointer transition-all shadow-sm ${
                      booked
                        ? hasConflict
                          ? "bg-red-50 border-red-300"
                          : "bg-green-50 border-green-300"
                        : isSelected
                        ? "bg-blue-50 border-blue-400"
                        : "bg-green-50 border-green-300"
                    }`}
                    onClick={() => {
                      // Case 1: Selection Mode (for Enquiry Prefill)
                      if (selectionMode) {
                        const guestFromDate = prefillGuest?.from
                          ? new Date(prefillGuest.from)
                          : null;
                        const guestToDate = prefillGuest?.to
                          ? new Date(prefillGuest.to)
                          : null;

                        const isOverlapping =
                          guestFromDate &&
                          guestToDate &&
                          (room.bookings || []).some((b) => {
                            const bFrom = new Date(b.from);
                            const bTo = new Date(b.to);
                            return (
                              guestFromDate <= bTo && guestToDate >= bFrom
                            );
                          });

                        if (booked && isOverlapping) {
                          showToast(
                            "⚠️ This room is already booked for the selected dates.",
                            "warning"
                          );
                          return;
                        }

                        toggleRoomSelect(hostelName, room.roomNo);
                        return;
                      }

                      // Case 2: Normal Mode — Booked room → show booking details
                      if (booked) {
                        handleBookedRoomClick(hostelName, room);
                        return;
                      }

                      // Case 3: Normal Mode — Empty room → Direct booking
                      openDirectBookingForVacant({
                        hostel: hostelName,
                        room,
                        prefill: null,
                      });
                    }}
                    aria-label={`Room ${room.roomNo} at ${hostelName}`}
                  >
                    <p className="font-semibold">
                      Room {room.roomNo}{" "}
                      <span className="text-xs text-gray-500">
                        ({room.roomType || "Guest Room"})
                      </span>
                    </p>

                    {booked ? (
                      <div className="mt-2">
                        <p className="text-xs text-red-700">
                          {room.bookings.length} Booking
                          {room.bookings.length > 1 ? "s" : ""} Active
                        </p>
                        {firstBooking && (
                          <p className="text-xs text-gray-600 truncate">
                            {firstBooking.guest || "Guest"} (
                            {firstBooking.from} → {firstBooking.to})
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-green-700 mt-2">
                        Available for booking
                      </p>
                    )}

                    {selectionMode && availableForNewDates && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleRoomSelect(hostelName, room.roomNo);
                        }}
                        className="absolute top-2 right-2 w-4 h-4 accent-blue-600"
                        aria-label={`Select room ${room.roomNo}`}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Done (selection) */}
      {selectionMode && selectedRooms.length > 0 && (
        <motion.button
          onClick={() => onDoneSelection()}
          whileHover={{ scale: 1.05 }}
          className="fixed bottom-6 right-6 bg-red-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 z-40"
        >
          <CheckSquare size={18} /> Done ({selectedRooms.length})
        </motion.button>
      )}

      {/* Filter modal */}
      <AnimatePresence>
        {filterModal && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`rounded-2xl p-6 w-[420px] shadow-xl ${
                theme === "dark"
                  ? "bg-gray-800 text-gray-100"
                  : "bg-white text-gray-900"
              }`}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3
                  className={`text-xl font-semibold flex items-center gap-2 ${
                    theme === "dark" ? "text-red-400" : "text-red-700"
                  }`}
                >
                  <Filter /> Check room availability
                </h3>
                <button
                  className={
                    theme === "dark"
                      ? "text-gray-400 hover:text-red-400"
                      : "text-gray-500 hover:text-red-700"
                  }
                  onClick={() => setFilterModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <label className="block text-sm font-medium mb-1">
                Check-In
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className={`border p-2 rounded w-full mb-3 ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-gray-100"
                    : "bg-white border-gray-300"
                }`}
              />
              <label className="block text-sm font-medium mb-1">
                Check-Out
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className={`border p-2 rounded w-full mb-4 ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-gray-100"
                    : "bg-white border-gray-300"
                }`}
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setFilterModal(false)}
                  className={`px-4 py-2 rounded ${
                    theme === "dark"
                      ? "bg-gray-700 hover:bg-gray-600"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleFilterSubmit}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Search
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vacant rooms results */}
      <AnimatePresence>
        {vacantRooms && vacantRooms.length > 0 && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`rounded-2xl p-6 max-w-xl w-full shadow-xl overflow-y-auto max-h-[80vh] ${
                theme === "dark"
                  ? "bg-gray-800 text-gray-100"
                  : "bg-white text-gray-900"
              }`}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              <div className="flex justify-between items-center mb-3">
                <h2
                  className={`text-xl font-semibold flex items-center gap-2 ${
                    theme === "dark" ? "text-red-400" : "text-red-700"
                  }`}
                >
                  🏠 Vacant Rooms
                </h2>
                <button
                  onClick={() => setVacantRooms([])}
                  className={
                    theme === "dark"
                      ? "text-gray-400 hover:text-red-400"
                      : "text-gray-500 hover:text-red-600"
                  }
                >
                  <X size={20} />
                </button>
              </div>
              <div>
                {vacantRooms.map((v, i) => (
                  <div
                    key={`${v.hostel}_${v.room.roomNo}_${i}`}
                    className={`p-3 border rounded-lg mb-2 flex justify-between items-center ${
                      theme === "dark"
                        ? "border-gray-700 bg-gray-700"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    <div>
                      <p
                        className={`font-medium ${
                          theme === "dark"
                            ? "text-gray-100"
                            : "text-gray-800"
                        }`}
                      >
                        {v.hostel} — Room {v.room.roomNo}
                      </p>
                      <p
                        className={`text-xs ${
                          theme === "dark"
                            ? "text-gray-400"
                            : "text-gray-500"
                        }`}
                      >
                        {v.room.roomType || "Guest Room"}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        openDirectBookingForVacant({
                          hostel: v.hostel,
                          room: v.room,
                        })
                      }
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      Book Now
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consolidated booking */}
      <AnimatePresence>
        {consolidateModal && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-[520px] shadow-xl"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              <h2 className="text-xl font-semibold text-red-700 mb-3">
                Consolidated Booking Form
              </h2>
              <p className="text-sm mb-4 text-gray-600">
                Prefilled details from enquiry (you can modify dates here
                before confirming).
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    From
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="border p-2 rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    To
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="border p-2 rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Payment Type
                  </label>
                  <select
                    id="consolidatedPaymentType"
                    defaultValue="Free"
                    onChange={(e) => {
                      const amountField =
                        document.getElementById("consolidatedAmountField");
                      if (amountField) {
                        amountField.style.display =
                          e.target.value === "Paid" ? "block" : "none";
                      }
                    }}
                    className="border p-2 rounded w-full"
                  >
                    <option>Free</option>
                    <option>Paid</option>
                  </select>
                </div>
                <div id="consolidatedAmountField" style={{ display: "none" }}>
                  <label className="block text-sm font-medium mb-1">
                    Amount (if Paid)
                  </label>
                  <input
                    id="consolidatedAmount"
                    type="number"
                    defaultValue={0}
                    className="border p-2 rounded w-full"
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={() => setConsolidateModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const paymentType =
                      document.getElementById("consolidatedPaymentType")
                        ?.value || "Free";
                    const amount = Number(
                      document.getElementById("consolidatedAmount")?.value || 0
                    );
                    handleConsolidatedBooking(
                      { from: checkIn, to: checkOut },
                      paymentType,
                      amount
                    );
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Confirm Booking
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking list modal (when room has >1 booking) */}
      <AnimatePresence>
        {bookingListModal && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-[420px] shadow-xl"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-red-700">
                  Select booking to view
                </h3>
                <button
                  className="text-gray-500 hover:text-red-700"
                  onClick={() => setBookingListModal(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <div>
                {bookingListModal.bookings.map((b, i) => (
                  <div
                    key={b.id || i}
                    className="p-3 border rounded-lg mb-2 hover:bg-red-50 cursor-pointer"
                    onClick={() => {
                      setBookingDetailsModal({
                        hostel: bookingListModal.hostel,
                        room: bookingListModal.room,
                        booking: b,
                      });
                      setBookingListModal(null);
                    }}
                  >
                    <p className="font-semibold text-red-700">
                      {getGuestName(b)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {b.from} → {b.to}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4 gap-3">
                <button
                  onClick={() => setBookingListModal(null)}
                  className="px-3 py-1 bg-gray-200 rounded"
                >
                  Close
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => {
                    // Open direct booking modal for this room
                    openDirectBookingForVacant({
                      hostel: bookingListModal.hostel,
                      room: bookingListModal.room,
                      prefill: null,
                    });
                    setBookingListModal(null);
                  }}
                >
                  Add New Booking
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking details modal */}
      <AnimatePresence>
        {bookingDetailsModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl p-6 w-[520px] max-h-[85vh] overflow-y-auto"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-2xl font-semibold text-red-700">
                  Booking Details
                </h2>

                <div className="flex items-center gap-2">
                  {/* ⭐ SMALL EXTEND BUTTON (top-right corner) */}
                  {new Date(bookingDetailsModal.booking.to) >= new Date() && (
                    <button
                      title="Extend Booking"
                      onClick={() => {
                        // close details first so extension popup is on top
                        const snapshot = { ...bookingDetailsModal };
                        setBookingDetailsModal(null);
                        setExtensionModal({
                          hostel: snapshot.hostel,
                          roomNo: snapshot.room.roomNo,
                          booking: snapshot.booking,
                        });
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Extend
                    </button>
                  )}
                  <button
                    className="text-gray-500 hover:text-red-700"
                    onClick={() => setBookingDetailsModal(null)}
                  >
                    <X size={22} />
                  </button>
                </div>
              </div>
  
              <div className="space-y-2 text-gray-700">
                {detailFields.map((item) => (
                  <p key={item.key}>
                    <strong>{item.label}:</strong> {bookingDetailsModal.booking[item.key] || "—"}
                  </p> 
                ))}
              </div>    

              {/* Attachments Section (photo cards) */}
              {bookingDetailsModal.booking?.files?.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold text-red-700 mb-2">
                    Attachments:
                  </p>
                  <AttachmentGrid files={bookingDetailsModal.booking.files} />
                </div>
              )}

              <div className="flex justify-end mt-5 gap-3">
                <button
                  onClick={() => setBookingDetailsModal(null)}
                  className="px-3 py-1 bg-gray-200 rounded"
                >
                  Close
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => {
                    // Open direct booking modal for this room (allow multiple bookings)
                    openDirectBookingForVacant({
                      hostel: bookingDetailsModal.hostel,
                      room: bookingDetailsModal.room,
                      prefill: null,
                    });
                    setBookingDetailsModal(null);
                  }}
                >
                  Add New Booking
                </button>
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  onClick={() => {
                    // open cancel modal prefilled with booking + room info
                    setCancelModal({
                      hostel: bookingDetailsModal.hostel,
                      room: bookingDetailsModal.room,
                      booking: bookingDetailsModal.booking,
                      remarksText: "",
                    });
                  }}
                >
                  Cancel Booking
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DirectBookingModal (existing) */}
      {directBookingModal && directBookingModal.open && (
        <DirectBookingModal
          modal={directBookingModal}
          onClose={() => setDirectBookingModal(null)}
          onSubmit={(b) => onDirectBookingSubmit(directBookingModal, b)}
        />
      )}

      {/* CancelModal (existing) */}
      {cancelModal && (
        <CancelModal
          modal={cancelModal}
          remarksText={safeTrim(cancelModal.remarksText || "")}
          setRemarksText={(val) =>
            setCancelModal((prev) => ({ ...(prev || {}), remarksText: val }))
          }
          onClose={() => {
            setCancelModal(null);
            setBookingDetailsModal(null);
          }}
          onDone={() => {
            onCancelDone();
          }}
        />
      )}
    </div>
  );
}
