// src/hooks/useBookingHandlers.js - COMPLETE FIXED VERSION
import { useCallback } from "react";
import { isDateTimeRangeOverlapping, combineDateAndTime } from "../utils/dateUtils";
import { persistHostelData, getGuestName } from "../utils/hostelUtils";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL;

export default function useBookingHandlers({
  hostelData,
  setHostelData,
  prefillGuest,
  selectedRooms,
  showToast,
  setSelectedRooms,
  setConsolidateModal,
  setSelectionMode,
  setBookingCompleted,
  setBookingDetailsModal,
  setBookingListModal,
  setCancelModal,
  setDirectBookingModal,
  extensionModal,  
  setExtensionModal,
}) {  
  const handleConsolidatedBooking = useCallback(
    async (dates, paymentTypeVal, amountVal, remarksVal = "", uploadedFiles = []) => {
      try {
        console.log("================================================================================");
        console.log("🔥 STARTING CONSOLIDATED BOOKING");
        console.log("📦 Input:", {
          datesProvided: !!dates,
          from: dates?.from,
          to: dates?.to,
          paymentType: paymentTypeVal,
          amount: amountVal,
          remarks: remarksVal,
          filesCount: uploadedFiles?.length,
          selectedRoomsCount: selectedRooms?.length,
          prefillGuest: prefillGuest ? "YES" : "NO"
        });
        console.log("================================================================================");

        // ✅ VALIDATION 1: Check setHostelData function
        if (typeof setHostelData !== "function") {
          console.error("❌ CRITICAL ERROR: setHostelData is not a function");
          showToast("❌ System error: Cannot update bookings. Please refresh the page.", "error");
          return false;
        }

        // ✅ VALIDATION 2: Check dates
        if (!dates?.from || !dates?.to) {
          showToast("⚠️ Please provide booking dates.", "warning");
          return false;
        }

        // ✅ VALIDATION 3: Check selected rooms
        if (!selectedRooms || selectedRooms.length === 0) {
          showToast("⚠️ Please select at least one room.", "warning");
          return false;
        }

        // ✅ VALIDATION 4: Check prefill guest data
        if (!prefillGuest || !prefillGuest.name) {
          showToast("⚠️ Guest information is missing.", "warning");
          return false;
        }

        console.log("✅ All validations passed");

        // ✅ CONFLICT DETECTION
        const conflicts = [];

        selectedRooms.forEach(({ hostel, roomNo }) => {
          const currentHostel = hostelData[hostel];
          if (!currentHostel) {
            conflicts.push(`${hostel} (hostel not found)`);
            return;
          }
          
          const room = currentHostel.rooms?.find((r) => r.roomNo === roomNo);
          if (!room) {
            conflicts.push(`${hostel} Room ${roomNo} (room not found)`);
            return;
          }

          // ✅ ADD THIS BLOCK CHECK HERE (BEFORE conflict detection):
          if (room.isBlocked && room.blockedTill) {
            const now = new Date();
            const blockedUntil = new Date(room.blockedTill);
            
            if (blockedUntil >= now) {
              conflicts.push(`${hostel} Room ${roomNo} (BLOCKED until ${blockedUntil.toLocaleDateString()})`);
              return;
            }
          }

          const hasConflict = (room.bookings || []).some((b) => {
            // Skip cancelled, checked_out, or no_show bookings
            if (["cancelled", "checked_out", "no_show"].includes(b.status)) {
              return false;
            }
            
            // Use actualCheckInDate if available
            const existingFrom = b.actualCheckInDate || b.from;
            
            try {
              const existingStart = combineDateAndTime(existingFrom, b.actualCheckInTime || b.checkInTime || "00:00");
              const existingEnd = combineDateAndTime(b.to, b.checkOutTime || "23:59");
              const newStart = combineDateAndTime(dates.from, dates.checkInTime || "00:00");
              const newEnd = combineDateAndTime(dates.to, dates.checkOutTime || "23:59");
              
              if (existingStart && existingEnd && newStart && newEnd) {
                const overlaps = newStart < existingEnd && newEnd > existingStart;
                
                if (overlaps) {
                  console.log("⚠️ CONFLICT DETECTED:", {
                    room: `${hostel} Room ${roomNo}`,
                    existing: `${existingFrom} ${b.checkInTime} → ${b.to} ${b.checkOutTime}`,
                    new: `${dates.from} ${dates.checkInTime} → ${dates.to} ${dates.checkOutTime}`,
                  });
                }
                
                return overlaps;
              }
            } catch (err) {
              console.warn("Datetime combination failed:", err);
            }
            
            return isDateTimeRangeOverlapping(
              existingFrom,
              b.to,
              b.actualCheckInTime || b.checkInTime || "00:00",
              b.checkOutTime || "23:59",
              dates.from,
              dates.to,
              dates.checkInTime || "00:00",
              dates.checkOutTime || "23:59"
            );
          });

          if (hasConflict) {
            conflicts.push(`${hostel} Room ${roomNo}`);
          }
        });

        if (conflicts.length > 0) {
          showToast(
            `⚠️ Time conflict in: ${conflicts.join(", ")}. Please select different rooms or adjust times.`,
            "error"
          );
          return false;
        }

        console.log("✅ No conflicts detected");

        // ✅ PREPARE BOOKING DATA
        const roomCount = selectedRooms.length;
        const totalAmount = paymentTypeVal === "Paid" ? Number(amountVal) || 0 : 0;
        const perRoomAmount = paymentTypeVal === "Paid" && roomCount > 0
          ? Math.floor(totalAmount / roomCount)
          : 0;

        const guestData = {
          name: prefillGuest.name || prefillGuest.guest,
          guest: prefillGuest.name || prefillGuest.guest,
          email: prefillGuest.email || "",
          contact: prefillGuest.contact || "",
          rollno: prefillGuest.rollno || "",
          department: prefillGuest.department || "",
          gender: prefillGuest.gender || "",
          reference: prefillGuest.reference || "",
          numGuests: Number(prefillGuest.numGuests || prefillGuest.guests || 1),
          females: Number(prefillGuest.females || 0),
          males: Number(prefillGuest.males || 0),
          city: prefillGuest.city || "",
          state: prefillGuest.state || "",
          purpose: prefillGuest.purpose || "",
          from: dates.from,
          to: dates.to,
          checkInTime: dates.checkInTime || "00:00",
          checkOutTime: dates.checkOutTime || "23:59",
          paymentType: paymentTypeVal,
          totalAmount: perRoomAmount,
          paidAmount: 0,
          balanceAmount: perRoomAmount,
          remarks: remarksVal || "",
          enquiryId: prefillGuest.enquiryId || null,
          enquiryAttachments: prefillGuest.enquiryAttachments || prefillGuest.files || [],
        };

        console.log("📋 Guest data prepared:", {
          name: guestData.name,
          email: guestData.email,
          contact: guestData.contact,
          from: guestData.from,
          to: guestData.to,
          paymentType: guestData.paymentType,
          enquiryId: guestData.enquiryId
        });

        // ✅ SAVE TO BACKEND (MongoDB) - THIS IS CRITICAL
        const normalizeFiles = (files = []) =>
          files.map(f => (typeof f === "string" ? f : f.url));

        const bookingPromises = selectedRooms.map(async ({ hostel, roomNo }) => {
          const bookingPayload = {
            hostel,
            roomNo,
            guest: guestData.name,
            email: guestData.email,
            contact: guestData.contact,
            rollno: guestData.rollno,
            department: guestData.department,
            reference: guestData.reference,
            gender: guestData.gender,
            from: guestData.from,
            to: guestData.to,
            checkInTime: guestData.checkInTime,
            checkOutTime: guestData.checkOutTime,
            numGuests: guestData.numGuests,
            females: guestData.females,
            males: guestData.males,
            purpose: guestData.purpose,
            state: guestData.state,
            city: guestData.city,
            paymentType: paymentTypeVal,
            totalAmount: perRoomAmount,
            paidAmount: 0,
            balanceAmount: perRoomAmount,
            remarks: remarksVal || "",
            enquiryAttachments: normalizeFiles(prefillGuest?.enquiryAttachments || prefillGuest?.files || []),
            approvalDocuments: normalizeFiles(uploadedFiles),
            paymentAttachments: [],
            enquiryId: guestData.enquiryId,
          };

          console.log("📤 Sending booking to backend:", {
            hostel,
            roomNo,
            guest: bookingPayload.guest,
            enquiryId: bookingPayload.enquiryId
          });

          const token = localStorage.getItem("token");
          const headers = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const response = await fetch(`${API}/api/bookings`, {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify(bookingPayload),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Backend booking failed:", errorText);
            throw new Error(`Failed to book ${hostel} Room ${roomNo}: ${errorText}`);
          }

          const result = await response.json();
          console.log("✅ Backend booking successful:", {
            hostel,
            roomNo,
            bookingId: result.booking?._id
          });

          return result;
        });

        console.log("⏳ Waiting for all bookings to complete...");
        const results = await Promise.all(bookingPromises);
        console.log("✅ All bookings saved to MongoDB:", results.length);

        // ✅ UPDATE LOCAL STATE AFTER BACKEND SUCCESS
        setHostelData((prev) => {
          const copy = structuredClone(prev);

          selectedRooms.forEach(({ hostel, roomNo }, index) => {
            const room = copy[hostel]?.rooms?.find((r) => r.roomNo === roomNo);
            if (!room) return;

            room.bookings = room.bookings || [];

            const mongoBooking = results[index]?.booking;
            
            if (mongoBooking) {
              const mongoId = mongoBooking._id?.toString();
              room.bookings = room.bookings.filter((existingBooking) => {
                const existingId =
                  existingBooking?._id?.toString?.() ||
                  existingBooking?.id?.toString?.();
                return !mongoId || existingId !== mongoId;
              });

              room.bookings.push({
                id: mongoBooking._id,
                _id: mongoBooking._id,
                ...guestData,
                status: mongoBooking.status || "booked",
                approvalStatus: mongoBooking.approvalStatus || "auto_approved",
                isRebookingWithin24hrs: mongoBooking.isRebookingWithin24hrs || false,
                reviewDeadline: mongoBooking.reviewDeadline || null,
                reportedStatus: mongoBooking.reportedStatus || "pending",
                checkedOutAt: mongoBooking.checkedOutAt || null,
              });
            }
          });

          persistHostelData(copy);
          return copy;
        });

        console.log("✅ Local state updated");

        // ✅ MARK ENQUIRY AS BOOKED
        if (prefillGuest?.enquiryId) {
          try {
            const token = localStorage.getItem("token");
            const response = await fetch(
              `${API}/api/enquiry/${prefillGuest.enquiryId}/booked`,
              {
                method: "PUT",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  ...(token && { Authorization: `Bearer ${token}` }),
                },
              }
            );

            if (response.ok) {
              console.log("✅ Enquiry marked as BOOKED:", prefillGuest.enquiryId);
            } else {
              console.error("❌ Failed to mark enquiry as booked");
            }
          } catch (err) {
            console.error("❌ Error marking enquiry as booked:", err);
          }
        }

        // ✅ CLEANUP
        showToast(
          `✅ ${selectedRooms.length} room(s) booked for ${guestData.name}`,
          "success"
        );

        setSelectedRooms([]);
        setConsolidateModal(false);
        setSelectionMode(false);
        setBookingCompleted(true);

        try {
          localStorage.removeItem("lastApprovedGuest");
          window.dispatchEvent(new Event("lastApprovedGuestCleared"));
        } catch {}

        // ✅ DISPATCH EVENTS
        if (prefillGuest?.enquiryId) {
          window.dispatchEvent(
            new CustomEvent("bookingCompleted", {
              detail: { enquiryId: prefillGuest.enquiryId }
            })
          );
        } else {
          window.dispatchEvent(new Event("bookingCompleted"));
        }

        window.dispatchEvent(new CustomEvent("hostelDataUpdated"));
        window.dispatchEvent(new Event("hostelBookingChanged"));

        setTimeout(() => {
          setSelectionMode(false);
          setSelectedRooms([]);
          setBookingCompleted(false);
        }, 500);

        console.log("================================================================================");
        console.log("✅ CONSOLIDATED BOOKING COMPLETED SUCCESSFULLY");
        console.log("================================================================================");

        return true;

      } catch (err) {
        console.error("================================================================================");
        console.error("❌ CONSOLIDATED BOOKING ERROR:", err);
        console.error("Message:", err.message);
        console.error("Stack:", err.stack);
        console.error("================================================================================");
        
        showToast("❌ Booking failed: " + err.message, "error");
        return false;
      }
    },
    [
      hostelData,
      setHostelData,
      prefillGuest,
      selectedRooms,
      showToast,
      setSelectedRooms,
      setConsolidateModal,
      setSelectionMode,
      setBookingCompleted,
    ]
  );

  // Booked Room Click Handler
  const handleBookedRoomClick = useCallback(
    (hostel, room) => {
      const bookings = room.bookings || [];
      if (bookings.length === 1) {
        setBookingDetailsModal({ hostel, room, booking: bookings[0] });
      } else if (bookings.length > 1) {
        setBookingListModal({ hostel, room, bookings });
      }
    },
    [setBookingDetailsModal, setBookingListModal]
  );

  // Direct Booking Submit
  const onDirectBookingSubmit = useCallback(
    async (modal, booking) => {
      if (!modal) return;

      setHostelData((prev) => {
        const copy = structuredClone(prev);
        const room = copy[modal.hostel]?.rooms?.find((r) => r.roomNo === modal.room.roomNo);
        if (!room) return prev;

        room.bookings = room.bookings || [];
        const bookingToStore = { ...booking };

        if (bookingToStore._id) {
          bookingToStore.id = bookingToStore._id.toString();
        } else if (!bookingToStore.id) {
          bookingToStore.id = `b_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        }

        if (!bookingToStore.guest) {
          bookingToStore.guest = bookingToStore.name || bookingToStore.fullName || "Guest";
        }

        const bookingId = bookingToStore._id?.toString?.() || bookingToStore.id?.toString?.();
        room.bookings = room.bookings.filter((b) => !b.id?.toString().startsWith("b_"));

        if (bookingId) {
          room.bookings = room.bookings.filter((existingBooking) => {
            const existingId =
              existingBooking?._id?.toString?.() ||
              existingBooking?.id?.toString?.();
            return existingId !== bookingId;
          });
        }

        room.bookings.push({ ...bookingToStore, id: bookingToStore._id || bookingToStore.id });

        persistHostelData(copy);
        return copy;
      });

      showToast("✅ Booking added successfully!", "success");
      setDirectBookingModal(null);
    },
    [setHostelData, showToast, setDirectBookingModal]
  );

  // Cancel Booking Handler  
  const onCancelDone = useCallback(
    async (remarks, cancelModalData, attachments = []) => {
      if (!cancelModalData || !cancelModalData.hostel || !cancelModalData.room || !cancelModalData.booking) {
        showToast("⚠️ No booking selected to cancel.", "warning");
        setCancelModal(null);
        setBookingDetailsModal(null);
        setBookingListModal(null);
        return;
      }

      const { hostel, room, booking } = cancelModalData;
      const bookingId = booking?._id || booking?.id;

      if (!bookingId || (typeof bookingId === "string" && bookingId.startsWith("b_"))) {
        showToast("❌ Cannot cancel: Booking not saved to database. Please refresh.", "error");
        return;
      }

      setCancelModal(null);
      setBookingDetailsModal(null);
      setBookingListModal(null);

      try {
        const token = localStorage.getItem("token");
        const headers = { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        };

        const response = await fetch(`${API}/api/bookings/${bookingId}/cancel`, {
          method: "POST",
          credentials: "include",
          headers: headers,
          body: JSON.stringify({ remarks, attachments }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to cancel booking");
        }

        // Update local state
        setHostelData((prev) => {
          const copy = structuredClone(prev);
          const roomToUpdate = copy[hostel]?.rooms?.find((r) => r.roomNo === room.roomNo);
          if (!roomToUpdate) return prev;
          
          const b = roomToUpdate.bookings?.find((bk) => bk.id === bookingId || bk._id === bookingId);
          if (b) {
            b.status = "cancelled";
            b.cancelRemarks = remarks;
            b.cancelAttachments = attachments;
            b.balanceAmount = 0;
          } else {
            roomToUpdate.bookings = (roomToUpdate.bookings || []).filter(
              (bk) => bk.id !== bookingId && bk._id !== bookingId
            );
          }
          persistHostelData(copy);
          return copy;
        });

        window.dispatchEvent(new Event("hostelBookingChanged"));
        window.dispatchEvent(new CustomEvent("hostelDataUpdated"));

        showToast("✅ Booking and associated bills cancelled", "success");
      } catch (error) {
        console.error("❌ Cancellation error:", error);
        showToast(`❌ Failed to cancel: ${error.message}`, "error");
      }
    },
    [showToast, setCancelModal, setBookingDetailsModal, setBookingListModal, setHostelData]
  );

  // EXTENDED BOOKING (REQUEST FLOW)
  const handleExtendBooking = useCallback(
    async (extensionData, newToDate, remarks, extensionFiles, paymentData = {}) => {
      console.log("================================================================================");
      console.log("🔥 FRONTEND: Requesting Extension Approval");
      console.log("📦 Parameters:", {
        extensionData: extensionData ? "present" : "null",
        newToDate,
        remarks,
        filesCount: extensionFiles?.length || 0,
        paymentData
      });
      console.log("================================================================================");
      
      if (typeof newToDate !== "string") {
        console.error("❌ newToDate corrupted:", newToDate);
        showToast("❌ Internal error: invalid extension date", "error");
        return false;
      }

      if (!extensionData) {
        console.error("❌ extensionData is null/undefined:", extensionData);
        showToast("⚠️ No extension data available", "warning");
        return false;
      }

      const { hostel, roomNo, booking } = extensionData;
      const mongoId = booking._id || booking.id;

      if (!mongoId || mongoId.toString().startsWith("b_")) {
        showToast("❌ Cannot extend: Booking not saved to database. Please refresh.", "error");
        setExtensionModal(null);
        return false;
      }

      // Validation (Overlap check)
      const currentHostel = hostelData[hostel];
      if (currentHostel) {
        const currentRoom = currentHostel.rooms?.find((r) => r.roomNo === roomNo);
        if (currentRoom) {
          const originalTo = booking._originalTo || booking.to;
          const extensionStart = combineDateAndTime(originalTo, booking.checkOutTime || "23:59");
          const extensionEnd = combineDateAndTime(newToDate, booking.checkOutTime || "23:59");

          const hasOverlap = (currentRoom.bookings || []).some((b) => {
            if (b.id === booking.id || b._id === booking._id) return false;
            if (["cancelled", "checked_out", "no_show"].includes(b.status)) return false;
            const otherFrom = combineDateAndTime(b.from, b.checkInTime || "00:00");
            const otherTo = combineDateAndTime(b.to, b.checkOutTime || "23:59");
            if (!otherFrom || !otherTo) return false;
            return extensionStart < otherTo && extensionEnd > otherFrom;
          });

          if (hasOverlap) {
            showToast("❌ Cannot request extension! Dates overlap another booking.", "error");
            return false;
          }
        }
      }

      try {
        const token = localStorage.getItem("token");
        const headers = { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        };

        const payload = {
          newTo: newToDate,
          remarks: remarks || "",
          attachments: extensionFiles || [],
          paymentType: paymentData.extensionPaymentType || "Paid",
          amount: paymentData.extensionAmount || 0,
          paymentRemarks: paymentData.extensionPaymentRemarks || "",
          paymentAttachments: paymentData.extensionPaymentAttachments || []
        };

        const response = await fetch(`${API}/api/bookings/${mongoId}/request-extension`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.message || "Failed to submit extension request");
        }

        showToast("✅ Extension request submitted for approval", "success");
        setExtensionModal(null);

        // ✅ Emit event for real-time notification on approval page
        window.dispatchEvent(new CustomEvent("extensionRequested", { 
          detail: { bookingId: mongoId, requestId: responseData.request?._id } 
        }));

        return true;

      } catch (error) {
        console.error("❌ Extension Request error:", error);
        showToast(`❌ Failed to submit request: ${error.message}`, "error");
        return false;
      }
    },
    [hostelData, showToast, setExtensionModal, API]
  );

  // ✅ FIXED: Return all handlers
  return {
    handleConsolidatedBooking,
    handleBookedRoomClick,
    onDirectBookingSubmit,
    onCancelDone,
    handleExtendBooking,
  };
}
