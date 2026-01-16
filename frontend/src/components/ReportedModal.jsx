import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  AlertCircle,
  CreditCard,
  Calendar,
  LogIn,
  LogOut
} from "lucide-react";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL;

export default function ReportedModal({
  booking,
  open,
  onClose,
  onSuccess,
  onOpenPaymentModal
}) {
  const [loading, setLoading] = useState(false);
  const [idVerified, setIdVerified] = useState(false);
  const [actualCheckInDate, setActualCheckInDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
    });
  const [actualCheckInTime, setActualCheckInTime] = useState(
    new Date().toTimeString().slice(0, 5)
  );
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [showPaymentWarning, setShowPaymentWarning] = useState(false);
  const [checkingRoom, setCheckingRoom] = useState(false);
  const [roomOccupied, setRoomOccupied] = useState(false);
  const [currentOccupant, setCurrentOccupant] = useState(null);

  useEffect(() => {
    if (open && !isAlreadyReported && !isNotReported && !isNoShow && actualCheckInDate) {
      checkRoomAvailability();
    }
  }, [actualCheckInDate, open]);

  if (!open || !booking) return null;

  // Check if already reported
  const isAlreadyReported = booking.reportedStatus === "reported" || booking.status === "checked_in";
  const hasPendingPayment =
    booking.paymentType !== "Free" &&
    Number(booking.balanceAmount) > 0;
  const isNotReported = booking.reportedStatus === "not_reported";
  const isNoShow = booking.status === "no_show";

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return String(dateStr);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
    } catch {
      return timeStr;
    }
  };



  // Check if early check-in is possible
  const isEarlyCheckIn = () => {
    if (!actualCheckInDate || !booking.from) return false;
  
    const selectedDate = new Date(actualCheckInDate);
    const scheduledDate = new Date(booking.from);
  
    selectedDate.setHours(0, 0, 0, 0);
    scheduledDate.setHours(0, 0, 0, 0);
  
    return selectedDate < scheduledDate;
  };

  const earlyCheckIn = isEarlyCheckIn();

  const checkRoomAvailability = async () => {
    try {
      setCheckingRoom(true);
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(
        `${API}/api/bookings/check-room-occupancy`,
        {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({
            hostel: booking.hostel,
            roomNo: booking.roomNo,
            checkInDate: actualCheckInDate,
            excludeBookingId: booking._id // Exclude current booking from check
          }),
        }
      );

      const data = await response.json();

      if (data.occupied) {
        setRoomOccupied(true);
        setCurrentOccupant(data.occupant);
      } else {
        setRoomOccupied(false);
        setCurrentOccupant(null);
      }
    } catch (err) {
      console.error("❌ Room availability check error:", err);
      setError("Failed to check room availability. Please try again.");
    } finally {
      setCheckingRoom(false);
    }
  };

  const handleMarkReported = async () => {
    try {
      setLoading(true);
      setError("");

      // ✅ Check room availability first
      await checkRoomAvailability();
      
      if (roomOccupied && currentOccupant) {
        setError("❌ Cannot report guest. Room is currently occupied by another guest.");
        setLoading(false);
        return;
      }

      // ✅ Get today's date (local timezone)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const selectedDate = new Date(actualCheckInDate);
      selectedDate.setHours(0, 0, 0, 0);

      // ✅ Prevent future date reporting
      if (selectedDate > today) {
        setError("❌ Cannot report a guest for a future date. Please select today or an earlier date.");
        setLoading(false);
        return;
      }

      // Rest of existing code remains same...
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
      };
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API}/api/bookings/${booking._id}/reported`, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify({
          idVerified,
          actualCheckInDate,
          actualCheckInTime,
          remarks: remarks.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to mark guest as reported");
      }

      const result = await response.json();

      console.log("✅ Guest reported successfully:", {
        bookingId: result.booking._id,
        originalFrom: booking.from,
        updatedFrom: result.booking.from,
        actualCheckInDate: result.booking.actualCheckInDate
      });

      // ✅ CRITICAL: Pass the UPDATED booking back to parent
      if (onSuccess) {
        onSuccess(result.booking); // Backend returns updated booking with new 'from' date
      }

      // ✅ Show success message
      if (result.earlyCheckIn) {
        alert(`✅ Guest checked in early! Check-in date updated to ${formatDate(result.booking.from)}`);
      } else {
        alert("✅ Guest reported successfully!");
      }

      onClose();

    } catch (err) {
      console.error("❌ Report guest error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutCurrentOccupant = async () => {
    if (!currentOccupant || !currentOccupant._id) {
      setError("❌ No occupant information available");
      return;
    }

    if (!window.confirm(`Are you sure you want to check out ${currentOccupant.guest}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(
        `${API}/api/bookings/${currentOccupant._id}/checkout`,
        {
          method: "PUT",
          credentials: "include",
          headers,
          body: JSON.stringify({
            checkoutDate: new Date().toISOString().split("T")[0],
            checkoutTime: new Date().toTimeString().slice(0, 5),
            remarks: `Checked out to accommodate incoming guest: ${booking.guest}`,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to checkout current occupant");
      }

      // After successful checkout, recheck room availability
      await checkRoomAvailability();
      setError("");
      
    } catch (err) {
      console.error("❌ Checkout current occupant error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleMarkNotReported = async () => {
    if (!window.confirm("Are you sure this guest did NOT arrive?")) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
      };
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API}/api/bookings/${booking._id}/not-reported`, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify({
          remarks: remarks.trim() || "Guest did not arrive",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to mark guest as not reported");
      }

      const result = await response.json();
      
      if (onSuccess) {
        onSuccess(result.booking);
      }
      
      onClose();
    } catch (err) {
      console.error("❌ Mark not reported error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!window.confirm("Are you sure you want to check out this guest?")) {
      return;
    }

    if (hasPendingPayment) {
      setShowPaymentWarning(true);
      return;
    }

    await proceedCheckout();
  };

  const proceedCheckout = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(
        `${API}/api/bookings/${booking._id}/checkout`,
        {
          method: "PUT",
          credentials: "include",
          headers,
          body: JSON.stringify({
            checkoutDate: new Date().toISOString().split("T")[0],
            checkoutTime: new Date().toTimeString().slice(0, 5),
            remarks: remarks.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to checkout guest");
      }

      const result = await response.json();

      if (onSuccess) {
        onSuccess(result.booking);
      }

      onClose();
    } catch (err) {
      console.error("❌ Checkout error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/30 flex justify-center items-center z-50 p-4"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
          <motion.div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {/* Header */}
            <div className={`sticky top-0 p-6 rounded-t-2xl z-10 shadow-lg ${
              isAlreadyReported 
                ? "bg-gradient-to-r from-green-600 to-green-700" 
                : "bg-gradient-to-r from-blue-600 to-blue-700"
            } text-white`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="bg-white/20 p-2 rounded-lg"
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {isAlreadyReported ? <CheckCircle className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {isAlreadyReported ? "Guest Check-in Status" : "Report Guest Arrival"}
                    </h2>
                    <p className="text-blue-100 text-sm">
                      {isAlreadyReported 
                        ? "Guest has been checked in successfully" 
                        : "Physical verification & check-in confirmation"}
                    </p>
                  </div>
                </div>
                <motion.button 
                  onClick={onClose}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={24} />
                </motion.button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Guest Info Card */}
              <motion.div
                className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-500 p-2 rounded-lg">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-blue-900">Guest Information</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-600 font-medium mb-1">Guest Name</p>
                    <p className="text-gray-800 font-bold text-base">{booking.guest || "—"}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 font-medium mb-1">Contact</p>
                    <p className="text-gray-800 font-semibold">{booking.contact || "—"}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 font-medium mb-1">Scheduled Check-in</p>
                    <p className="text-gray-800 font-semibold">
                      {formatDate(booking.from)} ({formatTime(booking.checkInTime)})
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-600 font-medium mb-1">Room</p>
                    <p className="text-gray-800 font-bold text-base">
                      {booking.hostel} - {booking.roomNo}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Already Reported Banner */}
              {isAlreadyReported && (
                <motion.div
                  className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-start gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-semibold mb-1">✓ Guest Already Checked In</p>
                    <p className="text-xs">
                      This guest has been reported and is currently staying. 
                      {booking.actualCheckInDate && ` Checked in on ${formatDate(booking.actualCheckInDate)}`}
                      {booking.actualCheckInTime && ` at ${formatTime(booking.actualCheckInTime)}`}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Early Check-in Warning */}
              {!isAlreadyReported && !isNotReported && !isNoShow && earlyCheckIn && (
              <motion.div
                  className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg flex items-start gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
              >
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">⚡ Early Check-in</p>
                  <p className="text-xs">
                      Guest is checking in before scheduled date. The actual check-in date will be updated to {formatDate(actualCheckInDate)}.
                  </p>
                  </div>
              </motion.div>
              )}

              {/* Room Occupancy Warning - Show if room is occupied */}
              {!isAlreadyReported && !isNotReported && !isNoShow && roomOccupied && currentOccupant && (
                <motion.div
                  className="bg-red-50 border-2 border-red-300 rounded-2xl overflow-hidden shadow-lg"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {/* Alert Header */}
                  <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="bg-white/20 p-2 rounded-lg"
                        animate={{ 
                          rotate: [0, -10, 10, -10, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          duration: 0.6,
                          repeat: Infinity,
                          repeatDelay: 2
                        }}
                      >
                        <AlertCircle className="w-6 h-6" />
                      </motion.div>
                      <div>
                        <h3 className="font-bold text-lg">⚠️ Room Currently Occupied</h3>
                        <p className="text-red-100 text-sm">Cannot report guest - room is not vacant</p>
                      </div>
                    </div>
                  </div>

                  {/* Current Occupant Details */}
                  <div className="p-5 space-y-4">
                    <div className="bg-white rounded-xl p-4 border-2 border-red-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                          <User className="w-5 h-5 text-red-600" />
                          Current Guest Details
                        </h4>
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                          STAYING
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 mb-1">Guest Name</p>
                          <p className="font-bold text-gray-900">{currentOccupant.guest || "—"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Contact</p>
                          <p className="font-semibold text-gray-800">{currentOccupant.contact || "—"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Check-in Date</p>
                          <p className="font-semibold text-gray-800">
                            {currentOccupant.actualCheckInDate 
                              ? formatDate(currentOccupant.actualCheckInDate) 
                              : formatDate(currentOccupant.from)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Expected Checkout</p>
                          <p className="font-semibold text-gray-800">{formatDate(currentOccupant.to)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-500 mb-1">Room</p>
                          <p className="font-bold text-red-600 text-lg">
                            {currentOccupant.hostel} - Room {currentOccupant.roomNo}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Warning Message */}
                    <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-semibold mb-1">Action Required</p>
                        <p>
                          You must check out <strong>{currentOccupant.guest}</strong> before you can report the new guest 
                          <strong> {booking.guest}</strong> in this room.
                        </p>
                      </div>
                    </div>

                    {/* Checkout Button */}
                    <motion.button
                      onClick={handleCheckoutCurrentOccupant}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                      whileHover={{ scale: loading ? 1 : 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <LogOut className="w-5 h-5" />
                      {loading ? "Processing..." : `Check Out ${currentOccupant.guest}`}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Loading State for Room Check */}
              {checkingRoom && !isAlreadyReported && !isNotReported && !isNoShow && (
                <motion.div
                  className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-blue-800 font-medium">Checking room availability...</p>
                </motion.div>
              )}

              {/* Warning Banner - Only show if NOT reported */}
              {!isAlreadyReported && !isNotReported && !isNoShow && (
                <motion.div
                  className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg flex items-start gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">⚠️ Physical Verification Required</p>
                    <p className="text-xs">
                      This action confirms the guest has physically arrived at the hostel. 
                      Verify identity documents before proceeding.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ID Verification Toggle - Only show if NOT reported */}
              {!isAlreadyReported && !isNotReported && !isNoShow && (
                <motion.div
                  className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-all duration-300"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className={`p-2 rounded-lg transition-colors ${
                          idVerified ? "bg-green-500" : "bg-gray-300"
                        }`}
                        animate={{ 
                          scale: idVerified ? [1, 1.1, 1] : 1 
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <CreditCard className={`w-5 h-5 ${idVerified ? "text-white" : "text-gray-600"}`} />
                      </motion.div>
                      <div>
                        <p className="font-bold text-gray-800">ID Card Verification</p>
                        <p className="text-xs text-gray-500">
                          Confirm valid government-issued ID
                        </p>
                      </div>
                    </div>
                    
                    <motion.button
                      onClick={() => setIdVerified(!idVerified)}
                      className={`relative w-16 h-8 rounded-full transition-colors ${
                        idVerified ? "bg-green-500" : "bg-gray-300"
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md"
                        animate={{ x: idVerified ? 32 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Check-in Date & Time - Only show if NOT reported */}
              {!isAlreadyReported && !isNotReported && !isNoShow && (
                <motion.div
                  className="grid grid-cols-2 gap-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Actual Check-in Date
                    </label>
                    <motion.input
                      type="date"
                      value={actualCheckInDate}
                      onChange={(e) => setActualCheckInDate(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      whileFocus={{ scale: 1.01 }}
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Actual Check-in Time
                    </label>
                    <motion.input
                      type="time"
                      value={actualCheckInTime}
                      onChange={(e) => setActualCheckInTime(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      whileFocus={{ scale: 1.01 }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Remarks */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Remarks {isAlreadyReported && "(Optional)"}
                </label>
                <motion.textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={isAlreadyReported ? "Add checkout notes..." : "Add any observations or notes about the guest arrival..."}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  whileFocus={{ scale: 1.01 }}
                />
              </motion.div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <XCircle className="w-5 h-5 text-red-600" />
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                {/* Show Reported/Not Reported buttons only if NOT already reported */}
                {!isAlreadyReported && !isNotReported && !isNoShow && (
                  <>
                    <motion.button
                      onClick={handleMarkReported}
                      disabled={loading || roomOccupied || checkingRoom}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all ${
                        roomOccupied || checkingRoom
                          ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                          : "bg-gradient-to-r from-green-600 to-green-700 text-white"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      whileHover={{ scale: (loading || roomOccupied || checkingRoom) ? 1 : 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CheckCircle size={20} />
                      {loading ? "Processing..." : "✓ Guest Reported"}
                    </motion.button>

                    <motion.button
                      onClick={handleMarkNotReported}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      whileHover={{ scale: loading ? 1 : 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <XCircle size={20} />
                      {loading ? "Processing..." : "✗ Not Reported"}
                    </motion.button>
                  </>
                )}

                {showPaymentWarning && (
                  <motion.div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[60] p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowPaymentWarning(false)}
                  >
                    <motion.div
                      className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header with gradient */}
                      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
                        
                        <motion.div 
                          className="relative z-10 flex items-center gap-4"
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          <motion.div 
                            className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl"
                            animate={{ 
                              rotate: [0, -10, 10, -10, 0],
                              scale: [1, 1.1, 1]
                            }}
                            transition={{ 
                              duration: 0.6,
                              repeat: Infinity,
                              repeatDelay: 3
                            }}
                          >
                            <AlertCircle className="w-8 h-8" />
                          </motion.div>
                          <div>
                            <h3 className="text-2xl font-bold mb-1">Payment Pending</h3>
                            <p className="text-white/90 text-sm">Complete payment before checkout</p>
                          </div>
                        </motion.div>
                      </div>

                      {/* Content */}
                      <div className="p-6 space-y-6">
                        {/* Amount Display */}
                        <motion.div
                          className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-5 border-2 border-red-200"
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-600">Outstanding Balance</span>
                            <motion.div
                              className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold"
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              UNPAID
                            </motion.div>
                          </div>
                          
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-red-600">₹{booking.balanceAmount}</span>
                            <span className="text-gray-500 text-sm">pending</span>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-red-200">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600">Total Amount:</span>
                              <span className="font-semibold text-gray-800">₹{booking.totalAmount || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Already Paid:</span>
                              <span className="font-semibold text-green-600">₹{booking.paidAmount || 0}</span>
                            </div>
                          </div>
                        </motion.div>

                        {/* Warning Message */}
                        <motion.div
                          className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4"
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <div className="flex gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800">
                              <p className="font-semibold mb-1">⚠️ Payment Required</p>
                              <p>This guest has an outstanding balance. We recommend collecting payment before checkout to avoid accounting issues.</p>
                            </div>
                          </div>
                        </motion.div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                          <motion.button
                            onClick={() => {
                              setShowPaymentWarning(false);
                              onClose();
                              onOpenPaymentModal();
                            }}
                            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 group"
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                          >
                            <CreditCard className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span>Pay ₹{booking.balanceAmount} Now</span>
                          </motion.button>

                          <motion.button
                            onClick={() => {
                              setShowPaymentWarning(false);
                              proceedCheckout();
                            }}
                            className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold border-2 border-gray-300 hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.45 }}
                          >
                            <LogOut className="w-5 h-5" />
                            <span>Checkout Without Payment</span>
                          </motion.button>

                          <motion.button
                            onClick={() => setShowPaymentWarning(false)}
                            className="w-full text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-all"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                          >
                            Cancel
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {/* Show Checkout button only if already reported */}
                {isAlreadyReported && (
                  <motion.button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    whileHover={{ scale: loading ? 1 : 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <LogOut size={20} />
                    {loading ? "Processing..." : "Check Out Guest"}
                  </motion.button>
                )}

                <motion.button
                  onClick={onClose}
                  disabled={loading}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 disabled:opacity-50 transition-all"
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}