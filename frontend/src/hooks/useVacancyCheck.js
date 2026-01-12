// src/hooks/useVacancyCheck.js - FIXED VERSION
import { useCallback } from "react";
import { isDateTimeRangeOverlapping } from "../utils/dateUtils";

export default function useVacancyCheck({
  hostelData,
  checkIn,
  checkOut,
  selectedRooms,
  setSelectedRooms,
  setVacantRooms,
  setFilterModal,
  showToast,
}) {
  const handleFilterSubmit = useCallback(() => {
    if (!checkIn || !checkOut) {
      showToast("⚠️ Please select both Check-in and Check-out dates.", "warning");
      return;
    }

    const vacant = [];

    Object.entries(hostelData || {}).forEach(([hostel, data]) => {
      (data.rooms || []).forEach((room) => {
        // ✅ CRITICAL FIX: Only check ACTIVE bookings for conflicts
        const hasOverlap = (room.bookings || []).some((b) => {
          // Skip inactive bookings - these rooms should be considered vacant
          const inactiveStatuses = ["cancelled", "checked_out", "no_show", "not_reported"];
          if (inactiveStatuses.includes(b.status)) {
            console.log(`⏭️ Skipping inactive booking (${b.status}):`, b.guest);
            return false;
          }

          // Only consider "booked", "reported", or "checked_in" status as active
          const activeStatuses = ["booked", "reported", "checked_in"];
          if (!activeStatuses.includes(b.status)) {
            console.log(`⚠️ Unknown booking status:`, b.status, b.guest);
            return false;
          }

          return isDateTimeRangeOverlapping(
            checkIn,
            checkOut,
            null,
            null,
            b.from || b.checkInDate,
            b.to || b.checkOutDate,
            b.checkInTime || null,
            b.checkOutTime || null
          );
        });

        if (!hasOverlap) {
          vacant.push({ hostel, room });
        }
      });
    });

    setVacantRooms(vacant);
    setFilterModal(false);
    showToast(`✅ ${vacant.length} vacant room(s) found.`, "success");
  }, [
    hostelData,
    checkIn,
    checkOut,
    setVacantRooms,
    setFilterModal,
    showToast,
  ]);

  const toggleRoomSelect = useCallback(
    (hostel, roomNo) => {
      const key = `${hostel}_${roomNo}`;
      setSelectedRooms((prev) =>
        prev.some((r) => `${r.hostel}_${r.roomNo}` === key)
          ? prev.filter((r) => `${r.hostel}_${r.roomNo}` !== key)
          : [...prev, { hostel, roomNo }]
      );
    },
    [setSelectedRooms]
  );

  return {
    handleFilterSubmit,
    toggleRoomSelect,
  };
}