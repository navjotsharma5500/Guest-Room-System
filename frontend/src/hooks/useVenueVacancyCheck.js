// src/hooks/useVenueVacancyCheck.js
// UPDATED: Daily Time Slot Model
import { useCallback } from "react";
import { isDailySlotOverlapping } from "../utils/dateUtils";

export default function useVenueVacancyCheck({
  hallData,
  venueData,
  checkIn,
  checkOut,
  dailyStart = "",
  dailyEnd = "",
  selectedRooms,
  setSelectedRooms,
  setVacantRooms,
  setFilterModal,
  showToast,
}) {
  const handleFilterSubmit = useCallback(() => {
    if (!checkIn || !checkOut) {
      showToast("⚠️ Please select Check-in and Check-out dates.", "warning");
      return;
    }

    // If one time field is filled but not the other, show error
    if ((dailyStart && !dailyEnd) || (!dailyStart && dailyEnd)) {
      showToast("⚠️ Please select both start and end time, or leave both blank for all-day search.", "warning");
      return;
    }

    // Use provided times or default to all-day search (00:00 - 23:59)
    const searchDailyStart = dailyStart || "00:00";
    const searchDailyEnd = dailyEnd || "23:59";

    const vacant = [];
    const sourceData = venueData || hallData || {};

    Object.entries(sourceData).forEach(([hall, data]) => {
      (data.rooms || []).forEach((room) => {
        const hasOverlap = (room.bookings || []).some((b) => {
          const inactiveStatuses = ["cancelled", "checked_out", "no_show"];
          if (inactiveStatuses.includes(b.status)) {
            console.log(`⭐️ Skipping inactive booking (${b.status}):`, b.name);
            return false;
          }

          const activeStatuses = ["booked", "checked_in"];
          if (!activeStatuses.includes(b.status)) {
            console.log(`⚠️ Unknown booking status:`, b.status, b.name);
            return false;
          }

          // Use new daily slot overlap logic
          return isDailySlotOverlapping(
            checkIn,
            checkOut,
            searchDailyStart,
            searchDailyEnd,
            b.checkInDate || b.from,
            b.checkOutDate || b.to,
            b.checkInTime || "00:00",
            b.checkOutTime || "23:59"
          );
        });

        if (!hasOverlap) {
          vacant.push({ hall, room });
        }
      });
    });

    setVacantRooms(vacant);
    setFilterModal(false);
    showToast(`✅ ${vacant.length} vacant venue room(s) found.`, "success");
  }, [
    hallData,
    venueData,
    checkIn,
    checkOut,
    dailyStart,
    dailyEnd,
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
