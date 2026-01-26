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
              room.bookings.push({
                id: mongoBooking._id,
                _id: mongoBooking._id,
                ...guestData,
                status: "booked",
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

        room.bookings = room.bookings.filter((b) => !b.id?.toString().startsWith("b_"));
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
    async (remarks, cancelModalData) => {
      if (!cancelModalData || !cancelModalData.hostel || !cancelModalData.room || !cancelModalData.booking) {
        showToast("⚠️ No booking selected to cancel.", "warning");
        setCancelModal(null);
        setBookingDetailsModal(null);
        setBookingListModal(null);
        return;
      }

      const { hostel, room, booking } = cancelModalData;

      setCancelModal(null);
      setBookingDetailsModal(null);
      setBookingListModal(null);

      // Get MongoDB _id
      const mongoId =
        (booking._id && !booking._id.toString().startsWith("b_") ? booking._id : null) ||
        (booking.id && !booking.id.toString().startsWith("b_") ? booking.id : null);

      if (!mongoId) {
        console.error("❌ Missing MongoDB _id for booking:", booking);
        showToast("❌ Cannot cancel: Booking not saved to database. Please refresh.", "error");
        return;
      }

      // Call backend to cancel in MongoDB
      try {
        const token = localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${API}/api/bookings/${mongoId}/cancel`, {
          method: "PUT",
          credentials: "include",
          headers: headers,
          body: JSON.stringify({ remarks: remarks || "Cancelled" }),
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
          roomToUpdate.bookings = (roomToUpdate.bookings || []).filter(
            (b) => b.id !== booking.id && b._id !== booking._id
          );
          persistHostelData(copy);
          return copy;
        });

        window.dispatchEvent(new Event("hostelBookingChanged"));
        window.dispatchEvent(new CustomEvent("hostelDataUpdated"));

        showToast("✅ Booking cancelled successfully", "success");
      } catch (error) {
        console.error("❌ Cancellation error:", error);
        showToast(`❌ Failed to cancel booking: ${error.message}`, "error");
      }
    },
    [showToast, setCancelModal, setBookingDetailsModal, setBookingListModal, setHostelData]
  );

  // EXTENDED BOOKING
  const handleExtendBooking = useCallback(
    async (extensionData, newToDate, remarks, extensionFiles) => {
      console.log("================================================================================");
      console.log("🔥 FRONTEND: handleExtendBooking called");
      console.log("📦 Parameters:", {
        extensionData: extensionData ? "present" : "null",
        newToDate,
        remarks,
        filesCount: extensionFiles?.length || 0,
        files: extensionFiles
      });
      console.log("================================================================================");
      
      if (typeof newToDate !== "string") {
        console.error("❌ newToDate corrupted:", newToDate);
        showToast("❌ Internal error: invalid extension date", "error");
        return;
      }
      // ✅ Use the passed extensionData instead of extensionModal state
      if (!extensionData) {
        console.error("❌ extensionData is null/undefined:", extensionData);
        showToast("⚠️ No extension data available", "warning");
        return;
      }

      const { hostel, roomNo, booking } = extensionData;

      console.log("✅ Extension data:", { 
        hostel, 
        roomNo, 
        bookingId: booking?._id,
        bookingGuest: booking?.guest 
      });

      // Validation
      const currentHostel = hostelData[hostel];
      if (!currentHostel) {
        showToast("❌ Hostel not found", "error");
        setExtensionModal(null);
        return;
      }

      const currentRoom = currentHostel.rooms?.find((r) => r.roomNo === roomNo);
      if (!currentRoom) {
        showToast("❌ Room not found", "error");
        setExtensionModal(null);
        return;
      }

      // ✅ SAFE: always validate against original checkout date
      const originalTo = booking._originalTo || booking.to;

      if (new Date(newToDate) <= new Date(originalTo)) {
        showToast("❌ New checkout date must be after current checkout date.", "error");
        return;
      }

      // ✅ SAFE: prevent mutated booking.to from breaking validation
      const extensionStart = combineDateAndTime(
        originalTo,
        booking.checkOutTime || "23:59"
      );

      const extensionEnd = combineDateAndTime(
        newToDate,
        booking.checkOutTime || "23:59"
      );

      if (!extensionStart || !extensionEnd) {
        showToast("❌ Invalid extension dates.", "error");
        return;
      }    
      
      console.log("📅 Extension period check:", {
        extensionStart: extensionStart.toISOString().split('T')[0],
        extensionEnd: extensionEnd.toISOString().split('T')[0]
      });
      
      const hasOverlap = (currentRoom.bookings || []).some((b) => {
        // Skip the current booking being extended
        if (b.id === booking.id || b._id === booking._id) return false;

        // ✅ CRITICAL FIX: Skip cancelled, checked_out, and no_show bookings
        if (["cancelled", "checked_out", "no_show"].includes(b.status)) {
          console.log("⏭️ Skipping inactive booking:", b.guest, "- Status:", b.status);
          return false;
        }

        const otherFrom = combineDateAndTime(
          b.from,
          b.checkInTime || "00:00"
        );

        const otherTo = combineDateAndTime(
          b.to,
          b.checkOutTime || "23:59"
        );

        if (!otherFrom || !otherTo) return false;

        // ✅ FIXED: Check if EXTENSION PERIOD overlaps with other booking
        // Overlaps if: extensionStart < otherTo AND extensionEnd > otherFrom
        const overlaps = extensionStart < otherTo && extensionEnd > otherFrom;
        
        console.log("🔍 Checking overlap with booking:", {
          guest: b.guest,
          bookingPeriod: `${otherFrom.toISOString().split('T')[0]} → ${otherTo.toISOString().split('T')[0]}`,
          extensionPeriod: `${extensionStart.toISOString().split('T')[0]} → ${extensionEnd.toISOString().split('T')[0]}`,
          overlaps: overlaps
        });

        return overlaps;
      });

      if (hasOverlap) {
        showToast("❌ Cannot extend! Dates overlap another booking.", "error");
        return;
      }

      const mongoId = booking._id || booking.id;

      if (!mongoId || mongoId.toString().startsWith("b_")) {
        showToast("❌ Cannot extend: Booking not saved to database. Please refresh.", "error");
        setExtensionModal(null);
        return;
      }

      // ✅ Normalize files to URL strings
      const normalizedFiles = Array.isArray(extensionFiles)
        ? extensionFiles.map(f => {
            if (typeof f === "string") return f;
            if (f && f.url) return f.url;
            return String(f);
          }).filter(Boolean)
        : [];

      console.log("📎 Normalized extension files:", {
        original: extensionFiles?.length || 0,
        normalized: normalizedFiles.length,
        files: normalizedFiles
      });

      // ✅ Include extension attachments in payload
      try {
        const token = localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const payload = {
          newTo: newToDate,
          hostel: hostel,
          roomNo: roomNo,
          remarks: remarks || "",
          extensionAttachments: normalizedFiles, // ✅ This is critical
        };

        console.log("================================================================================");
        console.log("📤 FRONTEND: Sending extension payload to backend");
        console.log("📦 Payload:", JSON.stringify(payload, null, 2));
        console.log("================================================================================");

        const response = await fetch(`${API}/api/bookings/${mongoId}/extend`, {
          method: "PUT",
          credentials: "include",
          headers: headers,
          body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.message || "Failed to extend booking");
        }

        console.log("================================================================================");
        console.log("✅ FRONTEND: Extension API Response received");
        console.log("📦 Response:", {
          success: responseData.success,
          bookingId: responseData.booking?._id,
          extensionAttachments: responseData.booking?.extensionAttachments?.length || 0,
          files: responseData.booking?.extensionAttachments
        });
        console.log("================================================================================");

        // Update local storage
        setHostelData((prev) => {
          const copy = structuredClone(prev);
          const hostelObj = copy[hostel];
          if (!hostelObj) return prev;

          const roomObj = hostelObj.rooms?.find((r) => r.roomNo === roomNo);
          if (!roomObj) return prev;

          const bookingObj = roomObj.bookings?.find(
            (b) => b.id === booking.id || b._id === booking._id
          );
          if (!bookingObj) return prev;

          bookingObj.to = newToDate;
          bookingObj.extensionDate = newToDate;
          bookingObj.extendRemarks = remarks || bookingObj.extendRemarks || "";
          
          // ✅ Update extension attachments from backend response
          if (responseData.booking?.extensionAttachments) {
            bookingObj.extensionAttachments = responseData.booking.extensionAttachments;
            
            console.log("✅ FRONTEND: Updated local extensionAttachments:", {
              count: bookingObj.extensionAttachments.length,
              files: bookingObj.extensionAttachments
            });
          }

          persistHostelData(copy);
          return copy;
        });

        showToast("✅ Booking extended successfully!", "success");
        setExtensionModal(null);

        // Trigger UI refresh
        window.dispatchEvent(new Event("hostelBookingChanged"));
        window.dispatchEvent(new CustomEvent("hostelDataUpdated"));
        
        console.log("✅ FRONTEND: Extension complete - UI refresh triggered");

      } catch (error) {
        console.error("================================================================================");
        console.error("❌ FRONTEND: Extension error:", error);
        console.error("Stack:", error.stack);
        console.error("================================================================================");
        showToast(`❌ Failed to extend booking: ${error.message}`, "error");
        setExtensionModal(null);
      }
    },
    [
      hostelData,
      showToast,
      setExtensionModal,
      setHostelData,
    ]
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