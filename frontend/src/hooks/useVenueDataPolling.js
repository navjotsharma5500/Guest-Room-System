// src/hooks/useVenueDataPolling.js - Venue Bookings Real-time Data

import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../socket";
import { BACKEND_URL } from "../utils/apiConfig";
import { getEnabledVenueDataTemplate } from "../config/venueRoomsConfig";

const API = BACKEND_URL;
const VENUE_STRUCTURE = getEnabledVenueDataTemplate();

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const findHallName = (hallMap, hallName) => {
  if (hallMap[hallName]) return hallName;

  const target = normalizeText(hallName);
  return Object.keys(hallMap).find((name) => normalizeText(name) === target) || "";
};

const findRoom = (hall, roomNo) => {
  if (!hall?.rooms) return null;

  const exact = hall.rooms.find((room) => room.roomNo === roomNo);
  if (exact) return exact;

  const target = normalizeText(roomNo);
  return hall.rooms.find((room) => normalizeText(room.roomNo) === target) || null;
};

// ✅ CHANGED: Default export instead of named export
export default function useVenueDataPolling(initialData = {}) {
  const [hallData, setHallData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [connected, setConnected] = useState(false);

  const isFetchingRef = useRef(false);
  const mountedRef = useRef(false);

  /**
   * Core fetch function for venue bookings
   */
  const fetchVenueData = useCallback(async (silent = false) => {
    if (isFetchingRef.current) {
      console.log("⏳ Venue fetch already in progress, skipping...");
      return;
    }

    isFetchingRef.current = true;

    if (!silent && mountedRef.current) {
      setLoading(true);
    }

    try {
      console.log("🎯 Fetching venue bookings from:", `${API}/api/venue-bookings`);

      /* -------------------- 1️⃣ Fetch all venue bookings -------------------- */
      const response = await fetch(`${API}/api/venue-bookings`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Venue bookings API failed: ${response.status}`);
      }

      const bookings = await response.json();
      console.log("📦 Raw venue bookings:", bookings);

      /* -------------------- 2️⃣ Build venue structure -------------------- */
      const hallMap = {};

      // Initialize enabled venues/rooms from config
      Object.keys(VENUE_STRUCTURE).forEach((hallName) => {
        const config = VENUE_STRUCTURE[hallName];
        hallMap[hallName] = {
          name: hallName,
          rooms: config.rooms.map((roomNo) => ({
            roomNo,
            bookings: [],
          })),
        };
      });

      /* -------------------- 3️⃣ Map bookings to rooms -------------------- */
      if (Array.isArray(bookings)) {
        bookings.forEach((booking) => {
          const { hall, roomNo } = booking;

          if (!hall || !roomNo) {
            console.warn("⚠️ Invalid booking:", booking);
            return;
          }

          // Find venue category from enabled config (case-insensitive match)
          const hallName = findHallName(hallMap, hall);
          const targetHall = hallMap[hallName];
          if (!targetHall) {
            console.warn(`⚠️ Unknown venue category: ${hall}`);
            return;
          }

          // Find enabled room in that category (case-insensitive match)
          const targetRoom = findRoom(targetHall, roomNo);
          if (!targetRoom) {
            console.warn(`⚠️ Unknown room: ${hall} - ${roomNo}`);
            return;
          }

          // Add booking to room (ALL statuses for history)
          // const activeStatuses = ["booked", "checked_in"];
          // if (activeStatuses.includes(booking.status)) {
            targetRoom.bookings.push({
              ...booking,
              // Normalize fields for compatibility
              from: booking.checkInDate || booking.from,
              to: booking.checkOutDate || booking.to,
              guest: booking.name || booking.guest,
              hostel: hallName || hall,
            });
          // }
        });
      }

      /* -------------------- 4️⃣ Remove expired bookings (FROM VISUAL STATE ONLY) -------------------- */
      // ISSUE FIX: Previously we commented this out completely, which meant ALL past bookings
      // were being sent to the visual grid (VenueGrid), causing them to show up as "upcoming".
      //
      // SOLUTION: We need two sets of data:
      // 1. Full History (for CSV Download)
      // 2. Active Bookings (for Grid Display)
      //
      // However, this hook returns a SINGLE `venueData` object.
      // Since `VenueBookingsPortal.jsx` already has a `filterActiveBookingsFromVenueData` function,
      // it *should* be handling the filtering for the grid.
      //
      // If past bookings are showing up, it means `filterActiveBookingsFromVenueData` in the portal
      // is NOT filtering by date, only by status.
      //
      // BUT WAIT: The user said "previous date bookings are shown into the upcoming bookings".
      // This implies the Frontend Grid is receiving them.
      //
      // Let's restore the date filtering HERE for the main return, but we need a way to access history.
      //
      // ACTUALLY, the better fix is in `VenueBookingsPortal.jsx`. It splits `stableVenueData` (for grid)
      // and `rawVenueData` (for download).
      //
      // `stableVenueData` uses `filterActiveBookingsFromVenueData`.
      // Let's check `VenueBookingsPortal.jsx` again.
      //
      // `filterActiveBookingsFromVenueData` only checks `validStatuses = ["booked", "checked_in"]`.
      // It DOES NOT check dates.
      //
      // So if we send "completed" bookings from here (which are past), they will be filtered out by status
      // in the portal IF status is 'completed'.
      //
      // BUT if we send "booked" bookings that are in the past (before cron runs), they show up.
      //
      // The user said: "the previous date bookings are shown into the upcoming bookings".
      // This is because I commented out the date filter here, so even old 'booked' ones are sent.
      //
      // FIX: We should rely on the STATUS being updated to 'completed' by the backend Cron.
      // If the Cron hasn't run yet, they are technically still "booked" (overdue).
      //
      // However, to fix the visual issue immediately without waiting for Cron:
      // We will keep sending ALL data (so Download works), but we must ensure `VenueBookingsPortal`
      // filters properly for the Grid.
      //
      // Let's look at `VenueBookingsPortal.jsx` (I can't see it now but I remember it).
      //
      // For now, I will NOT revert the change here because we NEED the history for CSV.
      // I will instead ensure the Backend Cron updates them to 'completed'.
      //
      // AND I will add a client-side filter in this hook to mark them as 'completed' if they are overdue,
      // effectively simulating the cron job for the UI until the backend catches up.
      
      const now = new Date();
      Object.values(hallMap).forEach((hall) => {
        hall.rooms.forEach((room) => {
          room.bookings.forEach((b) => {
             // Client-side auto-completion simulation for display
             if (b.status === 'booked' || b.status === 'checked_in') {
                const checkoutDate = b.to || b.checkOutDate;
                const time = b.checkOutTime || "23:59";
                const checkout = new Date(`${checkoutDate}T${time}`);
                
                if (checkout < now) {
                   b.status = 'completed'; // Visually mark as completed
                }
             }
          });
        });
      });

      /* -------------------- 5️⃣ Commit state -------------------- */
      if (mountedRef.current) {
        setHallData(hallMap);
        setHasData(true);
        setLastUpdate(Date.now());
        setError(null);
        console.log("✅ Venue data refreshed successfully:", hallMap);
      }
    } catch (err) {
      console.error("🔥 Venue polling error:", err);
      if (mountedRef.current) {
        setError(err.message || "Failed to fetch venue data");
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
    fetchVenueData(false);

    // ✅ Socket.IO connection status
    const handleConnect = () => {
      console.log("✅ Socket.IO connected (Venue)");
      setConnected(true);
      fetchVenueData(true);
    };

    const handleDisconnect = () => {
      console.log("❌ Socket.IO disconnected (Venue)");
      setConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      setConnected(true);
    }

    // ✅ Venue booking event listeners
    const handleVenueBookingCreated = () => {
      console.log("🎪 Venue booking created - refreshing...");
      fetchVenueData(true);
    };

    const handleVenueBookingCancelled = () => {
      console.log("🎪 Venue booking cancelled - refreshing...");
      fetchVenueData(true);
    };

    const handleVenueBookingExtended = () => {
      console.log("🎪 Venue booking extended - refreshing...");
      fetchVenueData(true);
    };

    const handleVenueBookingCompletedBatch = () => {
      console.log("🎪 Venue bookings auto-completed - refreshing...");
      fetchVenueData(true);
    };

    socket.on("venueBookingCreated", handleVenueBookingCreated);
    socket.on("venueBookingCancelled", handleVenueBookingCancelled);
    socket.on("venueBookingExtended", handleVenueBookingExtended);
    socket.on("venueBookingCompletedBatch", handleVenueBookingCompletedBatch); // ✅ New Listener

    // Backward compatibility with older backend events
    socket.on("hallBookingCreated", handleVenueBookingCreated);
    socket.on("hallBookingCancelled", handleVenueBookingCancelled);
    socket.on("hallBookingExtended", handleVenueBookingExtended);

    // ✅ Fallback polling every 2 minutes
    const interval = setInterval(() => {
      console.log("⏰ Venue fallback polling...");
      fetchVenueData(true);
    }, 2 * 60 * 1000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("venueBookingCreated", handleVenueBookingCreated);
      socket.off("venueBookingCancelled", handleVenueBookingCancelled);
      socket.off("venueBookingExtended", handleVenueBookingExtended);
      socket.off("venueBookingCompletedBatch", handleVenueBookingCompletedBatch); // ✅ Cleanup
      socket.off("hallBookingCreated", handleVenueBookingCreated);
      socket.off("hallBookingCancelled", handleVenueBookingCancelled);
      socket.off("hallBookingExtended", handleVenueBookingExtended);
    };
  }, [fetchVenueData]);

  /* -------------------- Manual refresh -------------------- */
  const refresh = useCallback(() => {
    console.log("🔄 Manual venue refresh triggered");
    fetchVenueData(false);
  }, [fetchVenueData]);

  return {
    venueData: hallData,
    hallData,
    loading,
    hasData,
    error,
    lastUpdate,
    connected,
    refresh,
  };
}
