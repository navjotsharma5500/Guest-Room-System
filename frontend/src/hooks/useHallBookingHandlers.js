// src/hooks/useHallBookingHandlers.js
import { useCallback } from "react";
import { BACKEND_URL } from "../utils/apiConfig";
import { isDateTimeRangeOverlapping } from "../utils/dateUtils";
import { IKUpload } from "imagekitio-react";

const API = BACKEND_URL;

export default function useHallBookingHandlers({
  hallData,
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
        // Upload attachments to ImageKit
        const uploadedAttachments = [];

        // Get ImageKit auth parameters
        const authResponse = await fetch(`${API}/api/imagekit/auth`, {
          method: "GET",
          credentials: "include",
        });

        if (!authResponse.ok) {
          throw new Error("Failed to get ImageKit authentication");
        }

        const authData = await authResponse.json();

        for (const file of formData.attachments) {
          const formDataToSend = new FormData();
          formDataToSend.append("file", file);
          formDataToSend.append("publicKey", authData.publicKey);
          formDataToSend.append("signature", authData.signature);
          formDataToSend.append("expire", authData.expire);
          formDataToSend.append("token", authData.token);
          formDataToSend.append("fileName", file.name);
          formDataToSend.append("folder", "/hall-bookings");

          const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
            method: "POST",
            body: formDataToSend,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error("❌ ImageKit upload error:", errorText);
            throw new Error("Failed to upload attachment to ImageKit");
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

        // ✅ Don't update local state - let polling hook handle it
        // The backend emits 'hallBookingCreated' socket event
        // which the polling hook will catch and refetch data

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
    [selectedRooms, showToast, setHallBookingModal, setSelectionMode, setSelectedRooms, setBookingCompleted]
  );

  // Handle room click
  const onRoomClick = useCallback(
    (hallName, room, bookedAny) => {
      if (!bookedAny) {
        // Empty room - open booking modal directly
        setSelectedRooms([{ hall: hallName, roomNo: room.roomNo }]);
        setSelectionMode(false);
        setHallBookingModal(true);
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

        // ✅ Don't update local state - let polling hook handle it
        // The backend emits 'hallBookingCancelled' socket event
        // which the polling hook will catch and refetch data

        showToast("✅ Hall booking cancelled successfully", "success");
        setCancelModal(null);
        setBookingDetailsModal(null);
        setBookingListModal(null);

      } catch (error) {
        console.error("Error cancelling hall booking:", error);
        showToast(`❌ ${error.message}`, "error");
      }
    },
    [showToast, setCancelModal, setBookingDetailsModal, setBookingListModal]
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

        // ✅ Don't update local state - let polling hook handle it
        // The backend emits 'hallBookingExtended' socket event
        // which the polling hook will catch and refetch data

        showToast("✅ Hall booking extended successfully", "success");
        setExtensionModal(null);
        setBookingDetailsModal(null);

      } catch (error) {
        console.error("Error extending hall booking:", error);
        showToast(`❌ ${error.message}`, "error");
      }
    },
    [showToast, setExtensionModal, setBookingDetailsModal]
  );

  return {
    handleHallBooking,
    onRoomClick,
    onCancelDone,
    handleExtendBooking,
  };
}