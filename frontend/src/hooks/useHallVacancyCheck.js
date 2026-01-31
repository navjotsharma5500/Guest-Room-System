// src/hooks/useHallVacancyCheck.js
import { useCallback } from "react";
import { isDateTimeRangeOverlapping } from "../utils/dateUtils";

export default function useHallVacancyCheck({
  hallData,
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

    Object.entries(hallData || {}).forEach(([hall, data]) => {
      (data.rooms || []).forEach((room) => {
        // Only check ACTIVE bookings for conflicts
        const hasOverlap = (room.bookings || []).some((b) => {
          // Skip inactive bookings
          const inactiveStatuses = ["cancelled", "checked_out", "no_show"];
          if (inactiveStatuses.includes(b.status)) {
            console.log(`⭐️ Skipping inactive booking (${b.status}):`, b.name);
            return false;
          }

          // Only consider "booked" or "checked_in" status as active
          const activeStatuses = ["booked", "checked_in"];
          if (!activeStatuses.includes(b.status)) {
            console.log(`⚠️ Unknown booking status:`, b.status, b.name);
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
          vacant.push({ hall, room });
        }
      });
    });

    setVacantRooms(vacant);
    setFilterModal(false);
    showToast(`✅ ${vacant.length} vacant hall room(s) found.`, "success");
  }, [
    hallData,
    checkIn,
    checkOut,
    setVacantRooms,
    setFilterModal,
    showToast,
  ]);

  const toggleRoomSelect = useCallback(
    (hall, roomNo) => {
      const key = `${hall}_${roomNo}`;
      setSelectedRooms((prev) =>
        prev.some((r) => `${r.hall}_${r.roomNo}` === key)
          ? prev.filter((r) => `${r.hall}_${r.roomNo}` !== key)
          : [...prev, { hall, roomNo }]
      );
    },
    [setSelectedRooms]
  );

  return {
    handleFilterSubmit,
    toggleRoomSelect,
  };
}