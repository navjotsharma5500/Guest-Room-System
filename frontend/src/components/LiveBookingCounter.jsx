// src/components/LiveBookingCounter.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp } from "lucide-react";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL;

export default function LiveBookingCounter({ theme, currentUser }) {
  // âœ… ALL STATE HOOKS FIRST
  const [bookingCount, setBookingCount] = useState(0);
  const [prevCount, setPrevCount] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get user role and assigned hostel from props
  const userRole = currentUser?.role || currentUser?.user?.role || 'caretaker';
  const isRestrictedRole = userRole === 'caretaker' || userRole === 'warden';
  const assignedHostel = currentUser?.assignedHostel || currentUser?.hostel || null;

  // âœ… ALL useCallback HOOKS BEFORE ANY CONDITIONAL RETURNS
  const fetchBookingCount = useCallback(async () => {
    try {
      const headers = { "Content-Type": "application/json" };

      const response = await fetch(`${API}/api/bookings/all`, {
        method: "GET",
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        console.error("Failed to fetch bookings");
        return;
      }

      const data = await response.json();
    
      let currentBookings = 0;
      const now = new Date();
    
      if (data.success && data.hostels) {
        const hostelsArray = Array.isArray(data.hostels)
          ? data.hostels 
          : Object.values(data.hostels);
      
        hostelsArray.forEach(hostel => {
          const hostelName = hostel.name || hostel.hostelName || '';

          if (hostel.rooms) {
            hostel.rooms.forEach(room => {
              if (room.bookings) {
                room.bookings.forEach(booking => {
                  // Only count checked_in guests (currently staying)
                  if (booking.status !== 'checked_in') {
                    return;
                  }

                  const checkinDate = booking.actualCheckInDate 
                    ? new Date(booking.actualCheckInDate)
                    : new Date(booking.from);
                    
                  const checkoutDate = new Date(booking.to);
                  const checkInTime = booking.actualCheckInTime || booking.checkInTime || '00:00';
                  const checkoutTime = booking.checkOutTime || '23:59';
                  
                  const [inHours, inMinutes] = checkInTime.split(':').map(Number);
                  const [outHours, outMinutes] = checkoutTime.split(':').map(Number);
                  
                  checkinDate.setHours(inHours, inMinutes, 0, 0);
                  checkoutDate.setHours(outHours, outMinutes, 0, 0);
                
                  if (now >= checkinDate && now <= checkoutDate) {
                    currentBookings++;
                    console.log(`âœ… Counted: ${booking.guest} in ${hostelName} Room ${room.roomNo}`);
                  }
                });
              }
            });
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

      console.log(`ðŸ“Š Live booking count:`, currentBookings);
      
    } catch (error) {
      console.error("Error fetching booking count:", error);
      setLoading(false);
    }
  }, [userRole, loading, bookingCount]);

  // âœ… ALL useEffect HOOKS BEFORE ANY CONDITIONAL RETURNS
  useEffect(() => {
    if (userRole && userRole !== 'caretaker') {
      fetchBookingCount();
    }
  }, [userRole, fetchBookingCount]);

  useEffect(() => {
    if (isRestrictedRole) return;

    const interval = setInterval(() => {
      fetchBookingCount();
    }, 5000);

    return () => clearInterval(interval);
  }, [userRole, fetchBookingCount]);

  useEffect(() => {
    if (isRestrictedRole) return;

    const handleBookingChange = () => {
      console.log("ðŸ”„ Booking changed, updating count...");
      fetchBookingCount();
    };

    window.addEventListener("hostelBookingChanged", handleBookingChange);
    window.addEventListener("hostelDataUpdated", handleBookingChange);
    window.addEventListener("reloadHostelData", handleBookingChange);

    return () => {
      window.removeEventListener("hostelBookingChanged", handleBookingChange);
      window.removeEventListener("hostelDataUpdated", handleBookingChange);
      window.removeEventListener("reloadHostelData", handleBookingChange);
    };
  }, [userRole, fetchBookingCount]);

  // âœ… NOW CONDITIONAL RETURNS AFTER ALL HOOKS
  if (isRestrictedRole) {
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
      className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl shadow-lg border-2 ${
        isUpdating
          ? "border-green-400 bg-gradient-to-r from-green-50 to-blue-50"
          : theme === "dark"
          ? "border-red-500 bg-gradient-to-r from-gray-800 to-gray-700"
          : "border-red-400 bg-gradient-to-r from-red-50 to-pink-50"
      }`}
    >
      <motion.div
        animate={isUpdating ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.5 }}
        className={`p-2 rounded-full ${
          theme === "dark" ? "bg-red-600" : "bg-red-500"
        }`}
      >
        <Users className="w-5 h-5 text-white" />
      </motion.div>

      <div className="flex flex-col">
        <span
          className={`text-xs font-medium uppercase tracking-wider ${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Active Bookings
        </span>
        
        <AnimatePresence mode="wait">
          <motion.span
            key={bookingCount}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`text-3xl font-bold ${
              theme === "dark" ? "text-red-400" : "text-red-600"
            }`}
          >
            {bookingCount}
          </motion.span>
        </AnimatePresence>
      </div>

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

      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="flex items-center gap-1.5"
      >
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span className={`text-xs font-medium ${
          theme === "dark" ? "text-gray-400" : "text-gray-600"
        }`}>
          Real-time
        </span>
      </motion.div>
    </motion.div>
  );
}