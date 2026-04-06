// src/hooks/useVenueBookingHandlers.js
import { useCallback } from "react";
import { BACKEND_URL } from "../utils/apiConfig";
import { isDateTimeRangeOverlapping } from "../utils/dateUtils";

const API = BACKEND_URL;

export default function useVenueBookingHandlers({
  hallData,
  selectedRooms,
  showToast,
  setSelectedRooms,
  setHallBookingModal,
  setVenueBookingModal,
  setSelectionMode,
  setBookingCompleted,
  setBookingDetailsModal,
  setVenueBookingDetailsModal,
  setBookingListModal,
  setVenueBookingListModal,
  setCancelModal,
  setExtensionModal,
  approvedEnquiry,
  onApprovedEnquiryConsumed,
}) {
  const setBookingModal = setVenueBookingModal || setHallBookingModal;
  const setDetailsModal = setVenueBookingDetailsModal || setBookingDetailsModal;
  const setListModal = setVenueBookingListModal || setBookingListModal;

  // Handle creating new venue booking
  const handleVenueBooking = useCallback(
    async (formData) => {
      try {
        console.log("📤 Starting venue booking submission...");
        console.log("📎 Attachments received:", formData.attachments);

        // ✅ Process attachments: handle both URLs (already uploaded) and File objects
        const uploadedAttachments = [];

        for (const attachment of formData.attachments) {
          // Check if it's already a URL (string)
          if (typeof attachment === 'string') {
            console.log("✅ Using already uploaded URL:", attachment);
            uploadedAttachments.push(attachment);
          } 
          // Otherwise, it's a File object that needs to be uploaded
          else if (attachment instanceof File) {
            console.log("📤 Uploading file:", attachment.name);

            // Get ImageKit auth parameters
            const authResponse = await fetch(`${API}/api/imagekit/auth`, {
              method: "GET",
              credentials: "include",
            });

            if (!authResponse.ok) {
              throw new Error("Failed to get ImageKit authentication");
            }

            const authData = await authResponse.json();

            // Create FormData for upload
            const formDataToSend = new FormData();
            formDataToSend.append("file", attachment);
            formDataToSend.append("publicKey", authData.publicKey);
            formDataToSend.append("signature", authData.signature);
            formDataToSend.append("expire", authData.expire);
            formDataToSend.append("token", authData.token);
            formDataToSend.append("fileName", attachment.name);
            formDataToSend.append("folder", "/venue-bookings");

            const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
              method: "POST",
              body: formDataToSend,
            });

            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              console.error("❌ ImageKit upload error:", errorText);
              throw new Error(`Failed to upload ${attachment.name} to ImageKit`);
            }

            const uploadData = await uploadResponse.json();
            console.log("✅ File uploaded successfully:", uploadData.url);
            uploadedAttachments.push(uploadData.url);
          } else {
            console.warn("⚠️ Unknown attachment type, skipping:", attachment);
          }
        }

        console.log("✅ All attachments processed:", uploadedAttachments);

        // Create booking payload
        const bookingPayload = {
          rooms: selectedRooms,
          name: formData.name || approvedEnquiry?.name || "",
          societyName: formData.societyName || approvedEnquiry?.societyName || "",
          eventName: formData.eventName || approvedEnquiry?.eventName || "",
          department: formData.department || approvedEnquiry?.department || "",
          contact: formData.contact || approvedEnquiry?.contact || "",
          email: formData.email || approvedEnquiry?.email || "",
          checkInDate: formData.checkInDate || approvedEnquiry?.checkInDate || "",
          checkInTime: formData.checkInTime || approvedEnquiry?.checkInTime || "",
          checkOutDate: formData.checkOutDate || approvedEnquiry?.checkOutDate || "",
          checkOutTime: formData.checkOutTime || approvedEnquiry?.checkOutTime || "",
          purpose: formData.purpose || approvedEnquiry?.purpose || "",
          description: formData.description || approvedEnquiry?.description || "",
          attachments: uploadedAttachments,
          enquiryId: approvedEnquiry?.enquiryId || null,
          bookingType: "venue", 
          isVenueBooking: true,
          isHallBooking: false,
        };

        console.log("📤 Submitting booking payload:", bookingPayload);

        // Submit booking
        const response = await fetch(`${API}/api/venue-bookings`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}` 
          },
          credentials: "include",
          body: JSON.stringify(bookingPayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create venue booking");
        }

        const data = await response.json();
        console.log("✅ Venue booking created successfully:", data);

        // ✅ Don't update local state - let polling hook handle it
        // The backend emits 'venueBookingCreated' socket event
        // which the polling hook will catch and refetch data

        showToast("✅ Venue booking created successfully!", "success");
        setBookingModal(false);
        setSelectionMode(false);
        setSelectedRooms([]);
        setBookingCompleted(true);
        if (approvedEnquiry?.enquiryId && typeof onApprovedEnquiryConsumed === "function") {
          onApprovedEnquiryConsumed();
        }

        // Emit event for calendar refresh
        window.dispatchEvent(new Event("venueBookingCompleted"));

        return data;
      } catch (error) {
        console.error("❌ Error creating venue booking:", error);
        showToast(`❌ ${error.message}`, "error");
        // Don't re-throw - error is already shown to user via toast
      }
    },
    [selectedRooms, showToast, setBookingModal, setSelectionMode, setSelectedRooms, setBookingCompleted, approvedEnquiry, onApprovedEnquiryConsumed]
  );

  // Handle room click
  const onRoomClick = useCallback(
    (hallName, room, bookedAny) => {
      if (!bookedAny) {
        // Empty room - open booking modal directly
        setSelectedRooms([{ hall: hallName, roomNo: room.roomNo }]);
        setSelectionMode(false);
        setBookingModal(true);
        return;
      }

      const activeBookings = (room.bookings || []).filter((b) => {
        const activeStatuses = ["booked", "checked_in"];
        return activeStatuses.includes(b.status);
      });

      if (activeBookings.length === 0) {
        showToast("ℹ️ This venue room is vacant", "info");
        return;
      }

      if (activeBookings.length === 1) {
        setDetailsModal({
          hall: hallName,
          room,
          booking: activeBookings[0],
        });
      } else {
        setListModal({
          hall: hallName,
          room,
          bookings: activeBookings,
        });
      }
    },
    [setDetailsModal, setListModal, setBookingModal, setSelectedRooms, setSelectionMode, showToast]
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

        console.log("🚫 Cancelling booking:", booking._id);

        const response = await fetch(`${API}/api/venue-bookings/${booking._id}/cancel`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}` // ✅ ADD THIS
          },
          credentials: "include",
          body: JSON.stringify({ remarks }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to cancel booking");
        }

        console.log("✅ Booking cancelled successfully");

        // ✅ Don't update local state - let polling hook handle it
        // The backend emits 'venueBookingCancelled' socket event
        // which the polling hook will catch and refetch data

        showToast("✅ Venue booking cancelled successfully", "success");
        setCancelModal(null);
        setDetailsModal(null);
        setListModal(null);

      } catch (error) {
        console.error("❌ Error cancelling venue booking:", error);
        showToast(`❌ ${error.message}`, "error");
      }
    },
    [showToast, setCancelModal, setDetailsModal, setListModal]
  );

  // Handle extend booking
  const handleExtendBooking = useCallback(
    async (payload) => {
      try {
        const { booking, extendedDate, extendedTime, remarks } = payload;

        console.log("⏰ Extending booking:", booking._id);

        const response = await fetch(`${API}/api/venue-bookings/${booking._id}/extend`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}` // ✅ ADD THIS
          },
          credentials: "include",
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
        console.log("✅ Booking extended successfully:", updatedBooking);

        // ✅ Don't update local state - let polling hook handle it
        // The backend emits 'venueBookingExtended' socket event
        // which the polling hook will catch and refetch data

        showToast("✅ Venue booking extended successfully", "success");
        setExtensionModal(null);
        setDetailsModal(null);

      } catch (error) {
        console.error("❌ Error extending venue booking:", error);
        showToast(`❌ ${error.message}`, "error");
      }
    },
    [showToast, setExtensionModal, setDetailsModal]
  );

  return {
    handleVenueBooking,
    handleHallBooking: handleVenueBooking,
    onRoomClick,
    onCancelDone,
    handleExtendBooking,
  };
}
