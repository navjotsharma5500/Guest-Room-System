// src/components/HallBookings/HallLiveBookingCounter.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp } from "lucide-react";
import { BACKEND_URL } from "../../utils/apiConfig";

const API = BACKEND_URL;

export default function HallLiveBookingCounter({ theme, currentUser, hallData }) {
  const [bookingCount, setBookingCount] = useState(0);
  const [prevCount, setPrevCount] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  const userRole = currentUser?.role || 'guest';

  const fetchBookingCount = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API}/api/hall-bookings`, {
        method: "GET",
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        console.error("Failed to fetch hall bookings");
        return;
      }

      const data = await response.json();
      
      let currentBookings = 0;
      const now = new Date();
      
      if (Array.isArray(data)) {
        data.forEach(booking => {
          // Only count checked_in bookings (currently active)
          if (booking.status !== 'checked_in') {
            return;
          }

          const checkinDate = new Date(booking.checkInDate);
          const checkoutDate = new Date(booking.checkOutDate);
          const checkInTime = booking.checkInTime || '00:00';
          const checkoutTime = booking.checkOutTime || '23:59';
          
          const [inHours, inMinutes] = checkInTime.split(':').map(Number);
          const [outHours, outMinutes] = checkoutTime.split(':').map(Number);
          
          checkinDate.setHours(inHours, inMinutes, 0, 0);
          checkoutDate.setHours(outHours, outMinutes, 0, 0);
        
          if (now >= checkinDate && now <= checkoutDate) {
            currentBookings++;
            console.log(`✅ Counted: ${booking.name} in ${booking.hall} Room ${booking.roomNo}`);
          }
        });
      }

      setPrevCount(prev => {
        if (currentBookings !== prev && !loading) {
          setIsUpdating(true);
          setTimeout(() => setIsUpdating(false), 1000);
        }
        return bookingCount;
      });
      
      setBookingCount(currentBookings);
      setLoading(false);

      console.log(`📊 Hall live booking count:`, currentBookings);
      
    } catch (error) {
      console.error("Error fetching hall booking count:", error);
      setLoading(false);
    }
  }, [userRole, loading, bookingCount]);

  useEffect(() => {
    if (userRole && ['admin', 'assistant'].includes(userRole)) {
      fetchBookingCount();
    }
  }, [userRole, fetchBookingCount]);

  useEffect(() => {
    if (!['admin', 'assistant'].includes(userRole)) return;

    const interval = setInterval(() => {
      fetchBookingCount();
    }, 5000);

    return () => clearInterval(interval);
  }, [userRole, fetchBookingCount]);

  useEffect(() => {
    if (!['admin', 'assistant'].includes(userRole)) return;

    const handleBookingChange = () => {
      console.log("🔄 Hall booking changed, updating count...");
      fetchBookingCount();
    };

    window.addEventListener("hallBookingChanged", handleBookingChange);
    window.addEventListener("hallDataUpdated", handleBookingChange);

    return () => {
      window.removeEventListener("hallBookingChanged", handleBookingChange);
      window.removeEventListener("hallDataUpdated", handleBookingChange);
    };
  }, [userRole, fetchBookingCount]);

  if (!['admin', 'assistant'].includes(userRole)) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`p-6 rounded-2xl backdrop-blur-xl border shadow-xl ${
        isUpdating
          ? "border-green-400 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20"
          : theme === "dark"
          ? "border-gray-700 bg-gray-800/60"
          : "border-gray-200 bg-white/60"
      }`}
    >
      <div className="flex items-center gap-4">
        <motion.div
          animate={isUpdating ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.5 }}
          className={`p-4 rounded-xl ${
            theme === "dark" ? "bg-red-600" : "bg-red-500"
          }`}
        >
          <Users className="w-8 h-8 text-white" />
        </motion.div>

        <div className="flex-1">
          <span
            className={`text-sm font-medium uppercase tracking-wider ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Active Hall Bookings
          </span>
          
          <div className="flex items-center gap-3 mt-1">
            <AnimatePresence mode="wait">
              <motion.span
                key={bookingCount}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`text-4xl font-bold ${
                  theme === "dark" ? "text-red-400" : "text-red-600"
                }`}
              >
                {bookingCount}
              </motion.span>
            </AnimatePresence>

            {bookingCount > prevCount && !loading && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500 text-white text-xs font-bold"
              >
                <TrendingUp className="w-3 h-3" />
                <span>+{bookingCount - prevCount}</span>
              </motion.div>
            )}
          </div>
        </div>

        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-2"
        >
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className={`text-xs font-medium ${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}>
            Real-time
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}