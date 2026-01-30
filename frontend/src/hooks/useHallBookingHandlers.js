// src/hooks/useHallBookingHandlers.js
import { useCallback } from "react";
import { BACKEND_URL } from "../utils/apiConfig";
import { isDateTimeRangeOverlapping } from "../utils/dateUtils";

const API = BACKEND_URL;

export default function useHallBookingHandlers({
  hallData,
  setHallData,
  selectedRooms,
  showToast,
  setSelectedRooms,
  setHallBookingModal,
  setSelectionMode,
  setBookingCompleted,
  setBookingDetailsModal,
  setBookingListModal,
  setCancelModal,
  setExtensionModal,
}) {

  // Handle creating new hall booking
  const handleHallBooking = useCallback(
    async (formData) => {
      try {
        // Upload attachments to ImageKit first
        const uploadedAttachments = [];
        
        for (const file of formData.attachments) {
          const formDataToSend = new FormData();
          formDataToSend.append("file", file);
          
          const uploadResponse = await fetch(`${API}/upload`, {
            method: "POST",
            body: formDataToSend,
          });

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload attachment");
          }

          const uploadData = await uploadResponse.json();
          uploadedAttachments.push(uploadData.url);
        }

        // Create booking payload
        const bookingPayload = {
          rooms: selectedRooms,
          name: formData.name,
          societyName: formData.societyName,
          eventName: formData.eventName,
          contact: formData.contact,
          email: formData.email,
          checkInDate: formData.checkInDate,
          checkInTime: formData.checkInTime,
          checkOutDate: formData.checkOutDate,
          checkOutTime: formData.checkOutTime,
          purpose: formData.purpose || "",
          description: formData.description || "",
          attachments: uploadedAttachments,
          bookingType: "hall", 
          isHallBooking: true,
        };

        // Submit booking
        const response = await fetch(`${API}/hall-bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingPayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create hall booking");
        }

        const data = await response.json();

        // Update local state
        setHallData((prev) => {
          const newData = { ...prev };
          
          data.bookings.forEach((newBooking) => {
            const { hall, roomNo } = newBooking;
            
            if (newData[hall]) {
              newData[hall].rooms = newData[hall].rooms.map((r) => {
                if (r.roomNo === roomNo) {
                  return {
                    ...r,
                    bookings: [...(r.bookings || []), newBooking],
                  };
                }
                return r;
              });
            }
          });

          return newData;
        });

        showToast("✅ Hall booking created successfully!", "success");
        setHallBookingModal(false);
        setSelectionMode(false);
        setSelectedRooms([]);
        setBookingCompleted(true);

        // Emit event for calendar refresh
        window.dispatchEvent(new Event("hallBookingCompleted"));

        return data;
      } catch (error) {
        console.error("Error creating hall booking:", error);
        showToast(`❌ ${error.message}`, "error");
        throw error;
      }
    },
    [selectedRooms, setHallData, showToast, setHallBookingModal, setSelectionMode, setSelectedRooms, setBookingCompleted]
  );

  // Handle room click
  const onRoomClick = useCallback(
    (hallName, room, bookedAny) => {
      if (!bookedAny) {
        // Empty room - show info or allow direct booking
        showToast("ℹ️ This hall room is vacant", "info");
        return;
      }

      const activeBookings = (room.bookings || []).filter((b) => {
        const activeStatuses = ["booked", "checked_in"];
        return activeStatuses.includes(b.status);
      });

      if (activeBookings.length === 0) {
        showToast("ℹ️ This hall room is vacant", "info");
        return;
      }

      if (activeBookings.length === 1) {
        setBookingDetailsModal({
          hall: hallName,
          room,
          booking: activeBookings[0],
        });
      } else {
        setBookingListModal({
          hall: hallName,
          room,
          bookings: activeBookings,
        });
      }
    },
    [setBookingDetailsModal, setBookingListModal, showToast]
  );

  // Handle cancel booking
  const onCancelDone = useCallback(
    async (remarks, cancelModal) => {
      if (!cancelModal || !cancelModal.booking) {
        console.error("❌ Invalid cancel modal data");
        return;
      }

      try {
        const { hall, room, booking } = cancelModal;

        const response = await fetch(`${API}/hall-bookings/${booking._id}/cancel`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remarks }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to cancel booking");
        }

        // Update local state
        setHallData((prev) => {
          const newData = { ...prev };
          
          if (newData[hall]) {
            newData[hall].rooms = newData[hall].rooms.map((r) => {
              if (r.roomNo === room.roomNo) {
                return {
                  ...r,
                  bookings: r.bookings.map((b) => {
                    if (b._id === booking._id) {
                      return { ...b, status: "cancelled" };
                    }
                    return b;
                  }),
                };
              }
              return r;
            });
          }

          return newData;
        });

        showToast("✅ Hall booking cancelled successfully", "success");
        setCancelModal(null);
        setBookingDetailsModal(null);
        setBookingListModal(null);

      } catch (error) {
        console.error("Error cancelling hall booking:", error);
        showToast(`❌ ${error.message}`, "error");
      }
    },
    [setHallData, showToast, setCancelModal, setBookingDetailsModal, setBookingListModal]
  );

  // Handle extend booking
  const handleExtendBooking = useCallback(
    async (payload) => {
      try {
        const { hall, roomNo, booking, extendedDate, extendedTime, remarks } = payload;

        const response = await fetch(`${API}/hall-bookings/${booking._id}/extend`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extendedDate,
            extendedTime,
            remarks,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to extend booking");
        }

        const updatedBooking = await response.json();

        // Update local state
        setHallData((prev) => {
          const newData = { ...prev };
          
          if (newData[hall]) {
            newData[hall].rooms = newData[hall].rooms.map((r) => {
              if (r.roomNo === roomNo) {
                return {
                  ...r,
                  bookings: r.bookings.map((b) => {
                    if (b._id === booking._id) {
                      return { ...b, ...updatedBooking };
                    }
                    return b;
                  }),
                };
              }
              return r;
            });
          }

          return newData;
        });

        showToast("✅ Hall booking extended successfully", "success");
        setExtensionModal(null);
        setBookingDetailsModal(null);

      } catch (error) {
        console.error("Error extending hall booking:", error);
        showToast(`❌ ${error.message}`, "error");
      }
    },
    [setHallData, showToast, setExtensionModal, setBookingDetailsModal]
  );

  return {
    handleHallBooking,
    onRoomClick,
    onCancelDone,
    handleExtendBooking,
  };
}