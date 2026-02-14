import React, { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Plus, Calendar, Users, CheckCircle, AlertCircle, Building2 } from "lucide-react";
import { useToast } from "../context/ToastContext";

import VenueBookingDetailsModal from "../components/VenueBookings/VenueBookingDetailsModal";
import VenueBookingListModal from "../components/VenueBookings/VenueBookingListModal";
import VenueBookingModal from "../components/VenueBookings/VenueBookingModal";
import VenueCancelModal from "../components/VenueBookings/VenueCancelModal";
import useVenueBookingHandlers from "../hooks/useVenueBookingHandlers";

export default function VenueCategoryPortal({
  venueData = {},
  theme,
  categoryName,
  setExtensionModal,
  onBackHome,
}) {
  const { showToast } = useToast();

  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingListModal, setBookingListModal] = useState(null);
  const [bookingDetailsModal, setBookingDetailsModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [remarksText, setRemarksText] = useState("");

  const categoryRooms = useMemo(() => {
    if (!categoryName || !venueData[categoryName]) return [];
    return venueData[categoryName].rooms || [];
  }, [venueData, categoryName]);

  const bookingHandlers = useVenueBookingHandlers({
    hallData: venueData,
    selectedRooms,
    showToast,
    setSelectedRooms,
    setHallBookingModal: setBookingModal,
    setSelectionMode,
    setBookingCompleted: () => {},
    setBookingDetailsModal,
    setBookingListModal,
    setCancelModal,
    setExtensionModal,
  });

  const hasActiveBookings = useCallback(
    (room) => (room.bookings || []).some((b) => ["booked", "checked_in"].includes(b.status)),
    []
  );

  const getActiveBookingsCount = useCallback(
    (room) => (room.bookings || []).filter((b) => ["booked", "checked_in"].includes(b.status)).length,
    []
  );

  const handleRoomClick = useCallback(
    (room) => {
      if (selectionMode) return;
      const hasActive = hasActiveBookings(room);
      if (!hasActive) {
        showToast("This room is vacant", "info");
        return;
      }
      bookingHandlers.onRoomClick(categoryName, room, true);
    },
    [selectionMode, hasActiveBookings, showToast, bookingHandlers, categoryName]
  );

  const handleDirectBooking = useCallback(
    (e, room) => {
      e.stopPropagation();
      setSelectedRooms([{ hall: categoryName, roomNo: room.roomNo }]);
      setSelectionMode(false);
      setBookingModal(true);
    },
    [categoryName]
  );

  const toggleRoomSelect = useCallback(
    (e, room) => {
      e.stopPropagation();
      setSelectedRooms((prev) => {
        const exists = prev.find((r) => r.hall === categoryName && r.roomNo === room.roomNo);
        if (exists) return prev.filter((r) => !(r.hall === categoryName && r.roomNo === room.roomNo));
        return [...prev, { hall: categoryName, roomNo: room.roomNo }];
      });
    },
    [categoryName]
  );

  const isRoomSelected = useCallback(
    (room) => selectedRooms.some((r) => r.hall === categoryName && r.roomNo === room.roomNo),
    [selectedRooms, categoryName]
  );

  const handleDoneSelection = useCallback(() => {
    if (selectedRooms.length === 0) {
      showToast("Please select at least one room", "warning");
      return;
    }
    setBookingModal(true);
  }, [selectedRooms, showToast]);

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-[#202124]" : "bg-[#f8f9fa]"}`}>
      <header className={`${theme === "dark" ? "bg-[#292a2d] border-[#3c4043]" : "bg-white border-[#dadce0]"} border-b sticky top-0 z-50`}>
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className={`${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"} text-xl font-normal`}>{categoryName}</h1>
            <p className={`${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"} text-sm`}>
              {categoryRooms.length} room{categoryRooms.length !== 1 ? "s" : ""} available
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectionMode ? (
              <>
                <button onClick={() => { setSelectionMode(false); setSelectedRooms([]); }} className={`${theme === "dark" ? "bg-[#3c4043] text-[#e8eaed]" : "bg-[#f1f3f4] text-[#202124]"} px-4 py-2 rounded-lg text-sm font-medium`}>Cancel</button>
                <button onClick={handleDoneSelection} className={`${theme === "dark" ? "bg-[#8ab4f8] text-[#202124]" : "bg-[#1a73e8] text-white"} px-4 py-2 rounded-lg text-sm font-medium`}>Done ({selectedRooms.length})</button>
              </>
            ) : (
              <>
                <button onClick={() => { setSelectionMode(true); setSelectedRooms([]); }} className={`${theme === "dark" ? "bg-[#8ab4f8] text-[#202124]" : "bg-[#1a73e8] text-white"} px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2`}>
                  <Calendar size={16} />
                  Add Booking
                </button>
                <button onClick={onBackHome} className={`${theme === "dark" ? "bg-[#3c4043] text-[#e8eaed]" : "bg-[#f1f3f4] text-[#202124]"} px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2`}>
                  <Home size={16} />
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {categoryRooms.length === 0 ? (
          <div className={`${theme === "dark" ? "bg-[#292a2d] border-[#3c4043]" : "bg-white border-[#dadce0]"} rounded-lg p-12 text-center border`}>
            <AlertCircle className={`${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"} w-16 h-16 mx-auto mb-4`} />
            <h3 className={`${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"} text-lg font-medium mb-2`}>No Rooms Available</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categoryRooms.map((room, index) => {
              const isActive = hasActiveBookings(room);
              const isSelected = isRoomSelected(room);
              const bookingsCount = getActiveBookingsCount(room);
              return (
                <motion.div key={room.roomNo || index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} onClick={() => handleRoomClick(room)} className={`${theme === "dark" ? "bg-[#3c4043] border-[#3c4043]" : "bg-white border-[#dadce0]"} ${isSelected ? "ring-2 ring-[#1a73e8]" : ""} relative rounded-lg p-4 border cursor-pointer`}>
                  {selectionMode && (
                    <div onClick={(e) => toggleRoomSelect(e, room)} className="absolute top-3 right-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? "bg-[#1a73e8] border-[#1a73e8]" : "border-[#5f6368]"}`}>
                        {isSelected && <CheckCircle size={14} className="text-white" />}
                      </div>
                    </div>
                  )}
                  <div className="mb-3 flex items-center gap-2">
                    <Building2 size={18} className={theme === "dark" ? "text-[#8ab4f8]" : "text-[#1a73e8]"} />
                    <h3 className={`${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"} font-medium`}>Room {room.roomNo}</h3>
                  </div>
                  {isActive ? (
                    <div className={`${theme === "dark" ? "bg-[#1e4620] text-[#81c995]" : "bg-[#e6f4ea] text-[#137333]"} text-sm px-2 py-1 rounded`}>
                      {bookingsCount} active booking{bookingsCount !== 1 ? "s" : ""}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <span className={theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}>Vacant</span>
                      {!selectionMode && (
                        <button onClick={(e) => handleDirectBooking(e, room)} className={theme === "dark" ? "text-[#8ab4f8]" : "text-[#1a73e8]"}>
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <AnimatePresence>
        {bookingModal && (
          <VenueBookingModal
            theme={theme}
            selectedRooms={selectedRooms}
            onClose={() => {
              setBookingModal(false);
              setSelectionMode(false);
              setSelectedRooms([]);
            }}
            onSubmit={bookingHandlers.handleVenueBooking}
          />
        )}

        {bookingListModal && (
          <VenueBookingListModal
            theme={theme}
            modal={bookingListModal}
            onClose={() => setBookingListModal(null)}
            onSelectBooking={(booking) => {
              setBookingListModal(null);
              setBookingDetailsModal({
                hall: bookingListModal.hall,
                room: bookingListModal.room,
                booking,
              });
            }}
          />
        )}

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
              setExtensionModal(bookingDetailsModal);
              setBookingDetailsModal(null);
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
            onDone={(remarks) => bookingHandlers.onCancelDone(remarks, cancelModal)}
          />
        )}

      </AnimatePresence>
    </div>
  );
}
