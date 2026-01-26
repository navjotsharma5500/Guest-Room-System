// src/hooks/useHostelDataPolling.js - FIXED WITH SOCKET.IO

import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../socket"; // âœ… FIXED: Remove curly braces, socket is default export
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
      console.log("â­ï¸ Fetch already in progress, skipping...");
      return;
    }

    isFetchingRef.current = true;

    if (!silent && mountedRef.current) {
      setLoading(true);
    }

    try {
      /* -------------------- 1ï¸âƒ£ Fetch hostels -------------------- */
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
          })),
        };
      });

      /* -------------------- 2ï¸âƒ£ Fetch bookings -------------------- */
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
              targetRoom.bookings = room.bookings || [];
            }
          });
        });
      }

      /* -------------------- 3ï¸âƒ£ Remove expired bookings -------------------- */
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

      /* -------------------- 4ï¸âƒ£ Fetch complete booking data -------------------- */
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
        console.log("âœ… Data refreshed successfully");
      }
    } catch (err) {
      console.error("ðŸ”¥ Hostel polling error:", err);
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

    // âœ… Socket.IO connection status
    const handleConnect = () => {
      console.log("âœ… Socket.IO connected");
      setConnected(true);
      fetchData(true); // Refresh on reconnect
    };

    const handleDisconnect = () => {
      console.log("âŒ Socket.IO disconnected");
      setConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // âœ… Initial connection check
    if (socket.connected) {
      setConnected(true);
    }

    // âœ… Real-time event listeners
    const handleBookingCreated = () => {
      console.log("ðŸ“¡ Booking created - refreshing...");
      fetchData(true);
    };

    const handleBookingCancelled = () => {
      console.log("ðŸ“¡ Booking cancelled - refreshing...");
      fetchData(true);
    };

    const handleBookingExtended = () => {
      console.log("ðŸ“¡ Booking extended - refreshing...");
      fetchData(true);
    };

    const handlePaymentUpdated = () => {
      console.log("ðŸ“¡ Payment updated - refreshing...");
      fetchData(true);
    };

    const handleGuestReported = () => {
      console.log("ðŸ“¡ Guest reported - refreshing...");
      fetchData(true);
    };

    const handleEnquiryCreated = () => {
      console.log("ðŸ“¡ Enquiry created - refreshing...");
      fetchData(true);
    };

    const handleEnquiryUpdated = () => {
      console.log("ðŸ“¡ Enquiry updated - refreshing...");
      fetchData(true);
    };

    const handleGuestCheckedOut = () => {
      console.log("ðŸ“¡ Guest checked out - refreshing...");
      fetchData(true);
    };

    const handleRoomAutoUnblocked = () => {
      console.log("📡 Rooms auto-unblocked - refreshing...");
      fetchData(true);
    };

    socket.on("booking-created", handleBookingCreated);
    socket.on("booking-cancelled", handleBookingCancelled);
    socket.on("booking-extended", handleBookingExtended);
    socket.on("payment-updated", handlePaymentUpdated);
    socket.on("guest-reported", handleGuestReported);
    socket.on("enquiry-created", handleEnquiryCreated);
    socket.on("enquiry-updated", handleEnquiryUpdated);
    socket.on("guest-checked-out", handleGuestCheckedOut);
    socket.on("room-auto-unblocked", handleRoomAutoUnblocked);

    // âœ… Fallback polling every 2 minutes (in case Socket.IO fails)
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
      socket.off("room-auto-unblocked", handleRoomAutoUnblocked);
    };
  }, [fetchData]);

  /* -------------------- Manual refresh -------------------- */
  const refresh = useCallback(() => {
    console.log("ðŸ”„ Manual refresh triggered");
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