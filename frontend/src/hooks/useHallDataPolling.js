// src/hooks/useHallDataPolling.js - Hall Bookings Real-time Data

import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../socket";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL;

// Hall structure definition
const HALL_STRUCTURE = {
  "Hall": {
    rooms: ["MAIN AUDITORIUM", "TAN AUDITORIUM", "C-Hall"]
  },
  "Rooms": {
    rooms: ["T105", "T106"]
  },
  "Creativity Rooms": {
    rooms: ["CR-1", "CR-2", "CR-5 (Sur Room)", "CR-6", "CR-7", "CR-8"]
  },
  "Green Rooms": {
    rooms: ["GR-1", "GR-2"]
  },
  "Open Area": {
    rooms: ["SBI Lawns", "FETE Area", "OAT (Open Air Theater)"]
  },
  "Desk Area": {
    rooms: ["Street Cafe", "Jaggi", "Street Cafe & Jaggi Area"]
  },
  "Common Rooms": {
    rooms: ["G-Block", "Tan Rooms", "E-Block", "F-Block", "Activity Room", "Activity Space", "LP Rooms"]
  }
};

// ✅ CHANGED: Default export instead of named export
export default function useHallDataPolling(initialData = {}) {
  const [hallData, setHallData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [connected, setConnected] = useState(false);

  const isFetchingRef = useRef(false);
  const mountedRef = useRef(false);

  /**
   * Core fetch function for hall bookings
   */
  const fetchHallData = useCallback(async (silent = false) => {
    if (isFetchingRef.current) {
      console.log("⏳ Hall fetch already in progress, skipping...");
      return;
    }

    isFetchingRef.current = true;

    if (!silent && mountedRef.current) {
      setLoading(true);
    }

    try {
      console.log("🎯 Fetching hall bookings from:", `${API}/api/hall-bookings`);

      /* -------------------- 1️⃣ Fetch all hall bookings -------------------- */
      const response = await fetch(`${API}/api/hall-bookings`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Hall bookings API failed: ${response.status}`);
      }

      const bookings = await response.json();
      console.log("📦 Raw hall bookings:", bookings);

      /* -------------------- 2️⃣ Build hall structure -------------------- */
      const hallMap = {};

      // Initialize all halls with their rooms
      Object.keys(HALL_STRUCTURE).forEach((hallName) => {
        const config = HALL_STRUCTURE[hallName];
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

          // Find the hall
          const targetHall = hallMap[hall];
          if (!targetHall) {
            console.warn(`⚠️ Unknown hall: ${hall}`);
            return;
          }

          // Find the room
          const targetRoom = targetHall.rooms.find((r) => r.roomNo === roomNo);
          if (!targetRoom) {
            console.warn(`⚠️ Unknown room: ${hall} - ${roomNo}`);
            return;
          }

          // Add booking to room (only active bookings)
          const activeStatuses = ["booked", "checked_in"];
          if (activeStatuses.includes(booking.status)) {
            targetRoom.bookings.push({
              ...booking,
              // Normalize fields for compatibility
              from: booking.checkInDate || booking.from,
              to: booking.checkOutDate || booking.to,
              guest: booking.name || booking.guest,
              hostel: hall,
            });
          }
        });
      }

      /* -------------------- 4️⃣ Remove expired bookings -------------------- */
      const now = new Date();

      Object.values(hallMap).forEach((hall) => {
        hall.rooms.forEach((room) => {
          room.bookings = (room.bookings || []).filter((b) => {
            if (!b.to && !b.checkOutDate) return true;

            const checkoutDate = b.to || b.checkOutDate;
            const checkout = new Date(checkoutDate);
            const time = b.checkOutTime || "23:59";
            const [h, m] = time.split(":").map(Number);
            checkout.setHours(h, m, 0, 0);

            return checkout >= now;
          });
        });
      });

      /* -------------------- 5️⃣ Commit state -------------------- */
      if (mountedRef.current) {
        setHallData(hallMap);
        setHasData(true);
        setLastUpdate(Date.now());
        setError(null);
        console.log("✅ Hall data refreshed successfully:", hallMap);
      }
    } catch (err) {
      console.error("🔥 Hall polling error:", err);
      if (mountedRef.current) {
        setError(err.message || "Failed to fetch hall data");
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
    fetchHallData(false);

    // ✅ Socket.IO connection status
    const handleConnect = () => {
      console.log("✅ Socket.IO connected (Hall)");
      setConnected(true);
      fetchHallData(true);
    };

    const handleDisconnect = () => {
      console.log("❌ Socket.IO disconnected (Hall)");
      setConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      setConnected(true);
    }

    // ✅ Hall booking event listeners
    const handleHallBookingCreated = () => {
      console.log("🎪 Hall booking created - refreshing...");
      fetchHallData(true);
    };

    const handleHallBookingCancelled = () => {
      console.log("🎪 Hall booking cancelled - refreshing...");
      fetchHallData(true);
    };

    const handleHallBookingExtended = () => {
      console.log("🎪 Hall booking extended - refreshing...");
      fetchHallData(true);
    };

    socket.on("hallBookingCreated", handleHallBookingCreated);
    socket.on("hallBookingCancelled", handleHallBookingCancelled);
    socket.on("hallBookingExtended", handleHallBookingExtended);

    // ✅ Fallback polling every 2 minutes
    const interval = setInterval(() => {
      console.log("⏰ Hall fallback polling...");
      fetchHallData(true);
    }, 2 * 60 * 1000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("hallBookingCreated", handleHallBookingCreated);
      socket.off("hallBookingCancelled", handleHallBookingCancelled);
      socket.off("hallBookingExtended", handleHallBookingExtended);
    };
  }, [fetchHallData]);

  /* -------------------- Manual refresh -------------------- */
  const refresh = useCallback(() => {
    console.log("🔄 Manual hall refresh triggered");
    fetchHallData(false);
  }, [fetchHallData]);

  return {
    hallData,
    loading,
    hasData,
    error,
    lastUpdate,
    connected,
    refresh,
  };
}