// src/hooks/useHostelDataPolling.js - FIXED WITH SOCKET.IO

import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../socket"; // ✅ FIXED: Remove curly braces, socket is default export
import {
  apiFetchHostels,
  apiFetchBookings,
  apiFetchAllBookingsForDownload,
} from "../utils/api";

export function useHostelDataPolling(initialData = {}) {
  const [hostelData, setHostelData] = useState(initialData);
  const [completeHostelData, setCompleteHostelData] = useState({});
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [connected, setConnected] = useState(false);

  const isFetchingRef = useRef(false);
  const mountedRef = useRef(false);

  /**
   * Core fetch function (polling-safe, no flicker)
   */
  const fetchData = useCallback(async (silent = false) => {
    if (isFetchingRef.current) {
      console.log("⏳ Fetch already in progress, skipping...");
      return;
    }

    isFetchingRef.current = true;

    if (!silent && mountedRef.current) {
      setLoading(true);
    }

    try {
      /* -------------------- 1️⃣ Fetch hostels -------------------- */
      const hostelsRes = await apiFetchHostels();

      if (!hostelsRes?.success || !Array.isArray(hostelsRes.hostels)) {
        throw new Error("Invalid hostel API response");
      }

      const hostelMap = {};
      hostelsRes.hostels.forEach((h) => {
        hostelMap[h.name] = {
          ...h,
          rooms: (h.rooms || []).map((r) => ({
            ...r,
            bookings: [],
            // ✅ CRITICAL FIX: Preserve blocked status from backend
            isBlocked: r.isBlocked || false,
            blockedTill: r.blockedTill || null,
            blockRemarks: r.blockRemarks || "",
            blockAttachments: r.blockAttachments || [],
            blockedAt: r.blockedAt || null,
            blockedBy: r.blockedBy || null,
          })),
        };
      });

      /* -------------------- 2️⃣ Fetch bookings -------------------- */
      const bookingsRes = await apiFetchBookings();
      let bookingHostels = bookingsRes?.hostels;

      if (bookingHostels && !Array.isArray(bookingHostels)) {
        bookingHostels = Object.values(bookingHostels);
      }

      if (bookingsRes?.success && Array.isArray(bookingHostels)) {
        bookingHostels.forEach((h) => {
          (h.rooms || []).forEach((room) => {
            const targetHostel = hostelMap[h.name];
            if (!targetHostel) return;

            const targetRoom = targetHostel.rooms.find(
              (r) => r.roomNo === room.roomNo
            );

            if (targetRoom) {
              // ✅ CRITICAL FIX: Only update bookings, preserve blocked status
              targetRoom.bookings = room.bookings || [];
              
              // ✅ Update blocked status if present in booking response
              if (room.isBlocked !== undefined) {
                targetRoom.isBlocked = room.isBlocked;
                targetRoom.blockedTill = room.blockedTill;
                targetRoom.blockRemarks = room.blockRemarks;
                targetRoom.blockAttachments = room.blockAttachments;
                targetRoom.blockedAt = room.blockedAt;
                targetRoom.blockedBy = room.blockedBy;
              }
            }
          });
        });
      }

      /* -------------------- 3️⃣ Remove expired bookings -------------------- */
      const now = new Date();

      Object.values(hostelMap).forEach((hostel) => {
        hostel.rooms.forEach((room) => {
          room.bookings = (room.bookings || []).filter((b) => {
            if (!b.to) return true;

            const checkout = new Date(b.to);
            const time = b.checkOutTime || "23:59";
            const [h, m] = time.split(":").map(Number);
            checkout.setHours(h, m, 0, 0);

            return checkout >= now;
          });
        });
      });

      /* -------------------- 4️⃣ Fetch complete booking data -------------------- */
      let completeMap = {};
      try {
        const completeRes = await apiFetchAllBookingsForDownload();
        if (completeRes?.success && Array.isArray(completeRes.hostels)) {
          completeRes.hostels.forEach((h) => {
            completeMap[h.name] = h;
          });
        }
      } catch {
        completeMap = hostelMap;
      }

      /* -------------------- 5ï¸âƒ£ Commit state -------------------- */
      if (mountedRef.current) {
        setHostelData(hostelMap);
        setCompleteHostelData(completeMap);
        setHasData(true);
        setLastUpdate(Date.now());
        setError(null);
        console.log("✅ Data refreshed successfully");
      }
    } catch (err) {
      console.error("🔓 Hostel polling error:", err);
      if (mountedRef.current) {
        setError(err.message || "Failed to fetch hostel data");
      }
    } finally {
      isFetchingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /* -------------------- Socket.IO listeners -------------------- */
  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch
    fetchData(false);

    // ✅ Socket.IO connection status
    const handleConnect = () => {
      console.log("✅ Socket.IO connected");
      setConnected(true);
      fetchData(true); // Refresh on reconnect
    };

    const handleDisconnect = () => {
      console.log("❌ Socket.IO disconnected");
      setConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // ✅ Initial connection check
    if (socket.connected) {
      setConnected(true);
    }

    // ✅ Real-time event listeners
    const handleBookingCreated = () => {
      console.log("📋 Booking created - refreshing...");
      fetchData(true);
    };

    const handleBookingCancelled = () => {
      console.log("📋 Booking cancelled - refreshing...");
      fetchData(true);
    };

    const handleBookingExtended = () => {
      console.log("📋 Booking extended - refreshing...");
      fetchData(true);
    };

    const handlePaymentUpdated = () => {
      console.log("📋 Payment updated - refreshing...");
      fetchData(true);
    };

    const handleGuestReported = () => {
      console.log("📋 Guest reported - refreshing...");
      fetchData(true);
    };

    const handleEnquiryCreated = () => {
      console.log("📋 Enquiry created - refreshing...");
      fetchData(true);
    };

    const handleEnquiryUpdated = () => {
      console.log("📋 Enquiry updated - refreshing...");
      fetchData(true);
    };

    const handleGuestCheckedOut = () => {
      console.log("📋 Guest checked out - refreshing...");
      fetchData(true);
    };

    const handleBookingApproved = () => {
      console.log("📋 Booking approved - refreshing...");
      fetchData(true);
    };

    const handleBookingRejected = () => {
      console.log("📋 Booking rejected - refreshing...");
      fetchData(true);
    };

    const handleRoomAutoUnblocked = () => {
      console.log("📡 Rooms auto-unblocked - refreshing...");
      fetchData(true);
    };

    // ✅ NEW: Listen for room blocking events
    const handleRoomBlocked = () => {
      console.log("🔒 Room blocked - refreshing...");
      fetchData(true);
    };

    const handleRoomUnblocked = () => {
      console.log("🔓 Room unblocked - refreshing...");
      fetchData(true);
    };

    socket.on("room-blocked", handleRoomBlocked);
    socket.on("room-unblocked", handleRoomUnblocked);
    socket.on("booking-created", handleBookingCreated);
    socket.on("booking-cancelled", handleBookingCancelled);
    socket.on("booking-extended", handleBookingExtended);
    socket.on("payment-updated", handlePaymentUpdated);
    socket.on("guest-reported", handleGuestReported);
    socket.on("enquiry-created", handleEnquiryCreated);
    socket.on("enquiry-updated", handleEnquiryUpdated);
    socket.on("guest-checked-out", handleGuestCheckedOut);
    socket.on("booking-approved", handleBookingApproved);
    socket.on("booking-rejected", handleBookingRejected);
    socket.on("room-auto-unblocked", handleRoomAutoUnblocked);

    // ✅ Fallback polling every 2 minutes (in case Socket.IO fails)
    const interval = setInterval(() => {
      console.log("â° Fallback polling...");
      fetchData(true);
    }, 2 * 60 * 1000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("booking-created", handleBookingCreated);
      socket.off("booking-cancelled", handleBookingCancelled);
      socket.off("booking-extended", handleBookingExtended);
      socket.off("payment-updated", handlePaymentUpdated);
      socket.off("guest-reported", handleGuestReported);
      socket.off("enquiry-created", handleEnquiryCreated);
      socket.off("enquiry-updated", handleEnquiryUpdated);
      socket.off("guest-checked-out", handleGuestCheckedOut);
      socket.off("booking-approved", handleBookingApproved);
      socket.off("booking-rejected", handleBookingRejected);
      socket.off("room-auto-unblocked", handleRoomAutoUnblocked);
      socket.off("room-blocked", handleRoomBlocked);
      socket.off("room-unblocked", handleRoomUnblocked);
    };
  }, [fetchData]);

  /* -------------------- Manual refresh -------------------- */
  const refresh = useCallback(() => {
    console.log("🔓 Manual refresh triggered");
    fetchData(false);
  }, [fetchData]);

  return {
    hostelData,
    completeHostelData,
    loading,
    hasData,
    error,
    lastUpdate,
    connected,
    refresh,
  };
}
