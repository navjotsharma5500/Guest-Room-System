// src/components/RoomCard.jsx - FIXED & OPTIMIZED
import React, { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarPlus, User2, CalendarDays, Clock, CheckCircle2, Calendar, X } from "lucide-react";
import { combineDateAndTime, isDateTimeRangeOverlapping } from "../utils/dateUtils";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL;

const RoomCard = memo(function RoomCard({
  hostel,
  hostelName,
  room,
  theme,
  // AllHostelsPortal props
  isSelected,
  selectionMode,
  consolidateModal,
  bookingCompleted,
  prefillGuest,
  onToggleSelect,
  onClick,
  // MainContent props
  onSelect,
  onCancel,
  onDirectBooking,
  onBlockedClick,
  showToast,
}) {
  const [showBookings, setShowBookings] = useState(false);
  const { user } = useAuth();
  const userEmail = user?.email || "";

  // Use hostelName if provided (AllHostelsPortal), otherwise use hostel (MainContent)
  const currentHostel = hostelName || hostel;

  // ✅ Check if this is AllHostelsPortal view
  const isAllHostelsView = selectionMode !== undefined || consolidateModal !== undefined;

  /**
   * Keep all non-terminal bookings in the UI flow.
   * under_review bookings still occupy the room, but they are rendered specially.
   */
  const activeBookings = useMemo(() => {
    return (room.bookings || []).filter(
      (b) => 
        !["cancelled", "no_show", "checked_out"].includes(b.status)
    );
  }, [room.bookings]);

  // ✅ NEW: Bookings for conflict detection (includes under_review)
  // Under-review bookings SHOULD block new bookings in the same slot
  const bookingsForConflictCheck = useMemo(() => {
    return (room.bookings || []).filter(
      (b) => !["cancelled", "no_show", "checked_out"].includes(b.status)
      // Note: Includes under_review bookings so they block date conflicts
    );
  }, [room.bookings]);

  // ✅ NEW: Separate detection for under-review bookings
  const underReviewBooking = useMemo(() => {
    return (room.bookings || []).find(
      (b) => b.approvalStatus === "under_review"
    );
  }, [room.bookings]);

  // ✅ UPDATED: Get approval status - priority is under_review first
  const primaryBooking = useMemo(() => {
    // Priority 1: If there's an under_review booking, use it for display
    if (underReviewBooking) return underReviewBooking;
    // Priority 2: Otherwise use first active booking
    return activeBookings[0] || (room.bookings || [])[0] || null;
  }, [underReviewBooking, activeBookings, room.bookings]);

  const approvalStatus = primaryBooking?.approvalStatus || "auto_approved";
  const canReviewUnderReviewBooking =
    userEmail === "admin_dev@thapar.edu";

  const isBooked = activeBookings.length > 0;
  
  // ✅ NEW: For AllHostelsPortal - include under_review in occupied count
  const isOccupiedForDisplay = isBooked || !!underReviewBooking;

  if (process.env.NODE_ENV !== "production") {
    console.log("Room bookings:", room.bookings || []);
    console.log("Primary booking:", primaryBooking);
  }
  
  const now = useMemo(() => new Date(), []);

  /* =========================
     TIME HELPERS
  ========================== */

  const getBookingTime = (b) => {
    const from = combineDateAndTime(b.from, b.checkInTime || "00:00");
    const to = combineDateAndTime(b.to, b.checkOutTime || "23:59");
    return { from, to };
  };

  const isPastBooking = (b) => {
    const { to } = getBookingTime(b);
    return to && to < now;
  };

  const isUpcomingBooking = (b) => {
    const { from } = getBookingTime(b);
    return from && from > now;
  };

  const isActiveBooking = (b) => {
    // ✅ FIXED: Check if guest is reported (checked_in status OR reportedStatus = "reported")
    return b.status === "checked_in" || b.reportedStatus === "reported";
  };

  /* =========================
     BOOKING STATUS
  ========================== */

  const hasActive = useMemo(() => activeBookings.some(isActiveBooking), [activeBookings]);
  const hasUpcoming = useMemo(() => activeBookings.some(isUpcomingBooking), [activeBookings]);
  const hasPastOnly = useMemo(() => 
    activeBookings.length > 0 && activeBookings.every(isPastBooking),
    [activeBookings]
  );

  // ✅ FIXED: For AllHostelsPortal - ONLY show active if guest is checked in/reported
  const currentActive = useMemo(() => {
    if (isAllHostelsView) {
      // For AllHostelsPortal: ONLY red if guest is ACTUALLY checked in/reported
      return activeBookings.some((b) => 
        b.status === "checked_in" || b.reportedStatus === "reported"
      );
    }
    
    // For MainContent (sidebar): Keep original logic (date range check)
    return activeBookings.some((b) => {
      if (b.status === "checked_in" || b.reportedStatus === "reported") {
        return true;
      }
      const start = combineDateAndTime(b.from, b.checkInTime || "00:00");
      const end = combineDateAndTime(b.to, b.checkOutTime || "23:59");
      if (!start || !end) return false;
      return now >= start && now <= end;
    });
  }, [activeBookings, now, isAllHostelsView]);

  // ✅ FIXED: firstBooking should find the checked_in/reported booking first
  const firstBooking = useMemo(() => {
    // First, try to find a checked_in/reported booking
    const reportedBooking = activeBookings.find((b) => 
      b.status === "checked_in" || b.reportedStatus === "reported"
    );
    if (reportedBooking) return reportedBooking;
    
    // Otherwise, find booking within date range
    if (!currentActive) return null;
    return activeBookings.find((b) => {
      const start = combineDateAndTime(b.from, b.checkInTime || "00:00");
      const end = combineDateAndTime(b.to, b.checkOutTime || "23:59");
      if (!start || !end) return false;
      return now >= start && now <= end;
    });
  }, [currentActive, activeBookings, now]);

  /* =========================
     CONFLICT DETECTION
  ========================== */

  const hasConflict = useMemo(() => {
    if (!prefillGuest?.from || !prefillGuest?.to) return false;
    
    // ✅ Use bookingsForConflictCheck to include under_review bookings
    // This prevents new bookings from overlapping with under_review slots
    return bookingsForConflictCheck.some((b) => {
      try {
        const existingStart = combineDateAndTime(b.from, b.checkInTime || "00:00");
        const existingEnd = combineDateAndTime(b.to, b.checkOutTime || "23:59");
        const newStart = combineDateAndTime(prefillGuest.from, prefillGuest.checkInTime || "00:00");
        const newEnd = combineDateAndTime(prefillGuest.to, prefillGuest.checkOutTime || "23:59");

        if (existingStart && existingEnd && newStart && newEnd) {
          return newStart < existingEnd && newEnd > existingStart;
        }
      } catch {}

      return isDateTimeRangeOverlapping(
        b.from,
        b.to,
        b.checkInTime || "00:00",
        b.checkOutTime || "23:59",
        prefillGuest.from,
        prefillGuest.to,
        prefillGuest.checkInTime || "00:00",
        prefillGuest.checkOutTime || "23:59"
      );
    });
  }, [prefillGuest, bookingsForConflictCheck]);

  const availableForNewDates = prefillGuest && prefillGuest.from && prefillGuest.to
    ? !hasConflict
    : !isBooked;

  /* =========================
     DATE FORMATTERS
  ========================== */

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "—";

    try {
      let dateObj;
      
      if (dateString.includes('T')) {
        dateObj = new Date(dateString);
      } else {
        const [y, m, d] = dateString.split("-").map(Number);
        if (!y || !m || !d) return dateString;
        dateObj = new Date(y, m - 1, d);
      }

      if (isNaN(dateObj)) return dateString;

      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const day = dateObj.getDate();
      const month = months[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      const formattedDate = `${String(day).padStart(2, "0")}-${month}-${year}`;

      if (!timeString) return formattedDate;

      const timeParts = timeString.split(":");
      const hh = parseInt(timeParts[0], 10);
      const mm = parseInt(timeParts[1], 10);

      if (isNaN(hh) || isNaN(mm)) return formattedDate;

      const period = hh >= 12 ? "PM" : "AM";
      const hours = hh % 12 || 12;

      return `${formattedDate} (${String(hours).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${period})`;
    } catch {
      return dateString;
    }
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch {
      return dateString;
    }
  };

  /* =========================
     CLICK HANDLERS
  ========================== */

  const handleCardClick = () => {
    if (bookingCompleted) return;

    // ✅ BLOCKED ROOM - Show info modal (PRIORITY CHECK)
    if (room.isBlocked) {
      console.log("🔒 Blocked room clicked in RoomCard:", { 
        hostel: currentHostel, 
        roomNo: room.roomNo,
        hasOnBlockedClick: !!onBlockedClick,
        isAllHostelsView 
      });
      
      if (onBlockedClick) {
        onBlockedClick(currentHostel, room.roomNo, {
          blockedTill: room.blockedTill,
          blockRemarks: room.blockRemarks,
          blockAttachments: room.blockAttachments,
          blockedAt: room.blockedAt,
          blockedBy: room.blockedBy
        });
      } else {
        console.warn("⚠️ onBlockedClick prop not provided for blocked room");
      }
      return; // Always return early for blocked rooms
    }

    // âœ… AllHostelsPortal selection mode
    if (prefillGuest && prefillGuest.from && prefillGuest.to && selectionMode) {
      if (hasConflict && showToast) {
        showToast("âš ï¸ This room is unavailable - booking times conflict with existing reservation.", "warning");
        return;
      }
      if (onToggleSelect) {
        onToggleSelect();
      }
      return;
    }

    // âœ… FIXED: For AllHostelsPortal, NEVER use internal modal
    // Always delegate to parent via onClick
    if (isAllHostelsView) {
      if (onClick) {
        onClick(isBooked);
      }
      return;
    }

    // âœ… MainContent: Handle multiple bookings with internal modal
    if (activeBookings.length > 1) {
      setShowBookings(true);
      return;
    }

    // âœ… MainContent: Handle single booking
    if (activeBookings.length === 1) {
      const bookingId = activeBookings[0]._id || activeBookings[0].id;
      
      if (onSelect) {
        onSelect(currentHostel, room.roomNo, bookingId);
      }
      return;
    }

    // âœ… MainContent: No bookings - open direct booking
    if (onDirectBooking) {
      onDirectBooking(currentHostel, room);
    }
  };

  const handleDirectBooking = (e) => {
    e.stopPropagation();
    if (bookingCompleted) return;
    if (onDirectBooking) {
      onDirectBooking(currentHostel, room);
    }
  };

  const handleBookingSelect = (bookingId) => {
    // For MainContent
    if (onSelect) {
      onSelect(currentHostel, room.roomNo, bookingId);
    }
    // For AllHostelsPortal - trigger onClick to open BookingDetailsModal
    else if (onClick) {
      onClick(isBooked);
    }
    setShowBookings(false);
  };

  // ✅ NEW: Approve rebooking handler
  const handleApprove = async (bookingId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/api/bookings/${bookingId}/approve`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to approve booking");
      }

      console.log("✅ Booking approved successfully");
      if (showToast) {
        showToast("Booking approved successfully", "success");
      }
      
      // Refresh the data
      if (window.fetchLatestHostelData) {
        window.fetchLatestHostelData();
      }
      window.dispatchEvent(new CustomEvent("hostelDataUpdated"));
    } catch (err) {
      console.error("❌ Approve failed", err);
      if (showToast) {
        showToast(err.message || "Failed to approve booking", "error");
      }
    }
  };

  // ✅ NEW: Reject rebooking handler
  const handleReject = async (bookingId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/api/bookings/${bookingId}/reject`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to reject booking");
      }

      console.log("✅ Booking rejected successfully");
      if (showToast) {
        showToast("Booking rejected successfully", "success");
      }
      
      // Refresh the data
      if (window.fetchLatestHostelData) {
        window.fetchLatestHostelData();
      }
      window.dispatchEvent(new CustomEvent("hostelDataUpdated"));
    } catch (err) {
      console.error("❌ Reject failed", err);
      if (showToast) {
        showToast(err.message || "Failed to reject booking", "error");
      }
    }
  };

  /* =========================
     STYLING
  ========================== */

  const getCardStyle = () => {
    // ✅ BLOCKED ROOMS - Always grey regardless of view
    if (room.isBlocked) {
      return theme === "dark"
        ? "bg-gray-800 border-gray-600 opacity-60 cursor-not-allowed"
        : "bg-gray-300 border-gray-400 opacity-60 cursor-not-allowed";
    }

    if (primaryBooking?.approvalStatus === "under_review") {
      return theme === "dark"
        ? "bg-orange-900 border-orange-500"
        : "bg-orange-100 border-orange-500";
    }

    if (isAllHostelsView) {
      // ✅ ONLY show red if guest is ACTUALLY checked in/reported
      if (currentActive) {
        return "border-red-300 bg-gradient-to-br from-red-50 to-white";
      }
      if (isSelected) {
        return "border-blue-400 bg-gradient-to-br from-blue-50 to-white ring-2 ring-blue-400";
      }
      // ✅ UPDATED: Use isOccupiedForDisplay to include under_review bookings
      if (isOccupiedForDisplay) {
        return "border-green-300 bg-gradient-to-br from-green-50 to-white";
      }
      return "border-gray-200 bg-gradient-to-br from-white to-gray-50";
    }


    if (hasActive) {
      return theme === "dark"
        ? "bg-red-700 border-red-500"
        : "bg-red-100 border-red-500";
    }
    if (hasPastOnly) {
      return theme === "dark"
        ? "bg-gray-800 border-gray-600 opacity-70"
        : "bg-gray-200 border-gray-400 opacity-70";
    }
    return theme === "dark"
      ? "bg-gray-700 border-green-500 hover:bg-gray-600"
      : "bg-green-50 border-green-300 hover:bg-green-100";
  };

  /* =========================
     RENDER - AllHostelsPortal COMPACT VIEW
  ========================== */

  if (isAllHostelsView) {
    return (
      <>
        <div
          className={`relative rounded-xl p-4 text-center cursor-pointer transition-all shadow-md border-2 hover:shadow-lg ${getCardStyle()}`}
          onClick={handleCardClick}
          aria-label={`Room ${room.roomNo} at ${currentHostel}`}
        >
          {/* ✅ REMOVED BOOK BUTTON - Click on card to book available rooms */}

          <div className="flex items-center justify-center gap-2">
            <p className="font-semibold text-base">Room {room.roomNo}</p>
            <span className="text-xs text-gray-500">
              ({room.roomType || "Guest Room"})
            </span>
          </div>

          {currentActive ? (
            <div className="mt-2">
              <p className="text-xs text-red-700 font-medium flex items-center justify-center gap-1">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Booking Active
              </p>

              {firstBooking && (
                <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                  <p className="font-medium truncate flex items-center justify-center gap-1">
                    <User2 className="w-3 h-3" />
                    {firstBooking.guest || "Guest"}
                  </p>
                  <div className="flex items-center justify-center gap-1 text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatShortDate(firstBooking.from)}</span>
                  </div>
                  <p className="text-gray-500">
                    → {formatShortDate(firstBooking.to)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle2
                  className={`w-3 h-3 ${approvalStatus === "under_review" ? "text-orange-700" : "text-green-700"}`}
                />
                <p
                  className={`text-xs font-medium ${approvalStatus === "under_review" ? "text-orange-700" : "text-green-700"}`}
                >
                  {approvalStatus === "under_review" ? (
                    "Under Review"
                  ) : isBooked ? (
                    activeBookings.length > 1 
                      ? `${activeBookings.length} Bookings` 
                      : "Upcoming booking"
                  ) : "Available - Click to book"}
                </p>
              </div>
              
              {/* Show multiple bookings indicator */}
              {activeBookings.length > 1 && (
                <p className="text-xs text-gray-500 italic">
                  Click to view all bookings
                </p>
              )}

              {approvalStatus === "under_review" && canReviewUnderReviewBooking && primaryBooking && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApprove(primaryBooking._id || primaryBooking.id);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-1 rounded"
                  >
                    ✔ Approve
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReject(primaryBooking._id || primaryBooking.id);
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1 rounded"
                  >
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Selection checkbox */}
          {selectionMode &&
            !bookingCompleted &&
            !consolidateModal &&
            availableForNewDates &&
            prefillGuest?.from &&
            prefillGuest?.to &&
            !hasConflict && (
              <div className="absolute top-2 right-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (onToggleSelect) onToggleSelect();
                  }}
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
              </div>
            )}

          {/* Conflict overlay */}
          {hasConflict && selectionMode && (
            <div className="absolute inset-0 rounded-xl pointer-events-none">
              <div className="absolute inset-0 bg-red-500/15 rounded-xl" />
              <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold shadow">
                ⚠️ CONFLICT
              </div>
            </div>
          )}
        </div>

        {/* ✅ BOOKINGS MODAL - Works for AllHostelsPortal */}
        <AnimatePresence>
          {showBookings && (
            <motion.div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBookings(false)}
            >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
              >
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <CalendarDays className="w-5 h-5" />
                        Room {room.roomNo}
                      </h3>
                      <p className="text-sm text-red-100 mt-0.5">
                        {activeBookings.filter(b => !isPastBooking(b)).length} bookings found
                      </p>
                    </div>
                    <button
                      onClick={() => setShowBookings(false)}
                      className="hover:bg-white/20 p-1.5 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-2.5 max-h-96 overflow-y-auto">
                  {activeBookings
                    .filter((b) => !isPastBooking(b))
                    .map((b, idx) => {
                      const bookingId = b._id || b.id;
                      const isActive = isActiveBooking(b);

                      return (
                        <motion.div
                          key={bookingId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => handleBookingSelect(bookingId)}
                          className={`relative rounded-xl p-3 cursor-pointer transition-all border-2 ${
                            isActive
                              ? "bg-red-50 border-red-300 hover:bg-red-100"
                              : "bg-green-50 border-green-300 hover:bg-green-100"
                          }`}
                        >
                          <div
                            className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                              isActive ? "bg-red-500 text-white" : "bg-green-500 text-white"
                            }`}
                          >
                            {isActive ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                ACTIVE
                              </>
                            ) : (
                              <>
                                <Calendar className="w-3 h-3" />
                                UPCOMING
                              </>
                            )}
                          </div>

                          <div className="pr-20">
                            <p className={`text-sm font-bold flex items-center gap-1.5 mb-2 ${
                              isActive ? "text-red-700" : "text-green-700"
                            }`}>
                              <User2 className="w-4 h-4" />
                              {b.guest}
                            </p>

                            <div className="space-y-1 text-xs text-gray-600">
                              <div className="flex items-start gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                                <div>
                                  <span className="font-medium">Check-in: </span>
                                  <span>{formatDateTime(b.from, b.checkInTime)}</span>
                                </div>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                                <div>
                                  <span className="font-medium">Check-out: </span>
                                  <span>{formatDateTime(b.to, b.checkOutTime)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>

                <div className="p-3 border-t border-gray-200">
                  <button
                    onClick={() => setShowBookings(false)}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold transition-colors text-sm"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  /* =========================
     RENDER - MainContent DETAILED VIEW
  ========================== */

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02 }}
        animate={
          hasActive
            ? { boxShadow: "0 0 0 3px rgba(220,38,38,0.15)" }
            : { boxShadow: "0 0 10px rgba(16,185,129,0.25)" }
        }
        onClick={handleCardClick}
        className={`relative border rounded-lg p-4 mb-3 cursor-pointer transition-all ${getCardStyle()}`}
      >
        {hasPastOnly && (
          <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded bg-gray-500 text-white">
            PAST
          </span>
        )}

        {/* ✅ NEW: UNDER REVIEW Badge */}
        {approvalStatus === "under_review" && !isAllHostelsView && (
          <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded bg-orange-500 text-white font-semibold">
            UNDER REVIEW
          </span>
        )}

        <div className="flex justify-between items-center">
          <h3
            className={`text-lg font-semibold flex items-center gap-1 ${
              theme === "dark" ? "text-red-400" : "text-red-700"
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Room {room.roomNo}
          </h3>

          <button
            onClick={handleDirectBooking}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-lg"
          >
            <CalendarPlus className="w-4 h-4" /> Direct Booking
          </button>
        </div>

        <p className="text-sm mt-1">
          Status:{" "}
          {approvalStatus === "under_review" ? (
            <span className="font-semibold text-orange-600">Under Review</span>
          ) : hasActive ? (
            <span className="font-semibold text-red-600">Active (Checked-in)</span>
          ) : hasPastOnly ? (
            <span className="font-semibold text-gray-600">Past</span>
          ) : hasUpcoming ? (
            <span className="font-semibold text-green-600">Upcoming</span>
          ) : (
            <span className="font-semibold text-green-600">Available</span>
          )}
        </p>

        {isBooked && !hasActive && !hasPastOnly && (
          <div className={`text-xs mt-2 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
            {activeBookings.length === 1 ? (
              <>
                <p>Booked by <span className="font-medium">{primaryBooking?.guest || activeBookings[0].guest}</span></p>
                <p className="mt-1">{formatDateTime((primaryBooking || activeBookings[0]).from, (primaryBooking || activeBookings[0]).checkInTime)}</p>
                <p>→ {formatDateTime((primaryBooking || activeBookings[0]).to, (primaryBooking || activeBookings[0]).checkOutTime)}</p>
              </>
            ) : (
              <p className="italic">{activeBookings.length} upcoming bookings — click to view list</p>
            )}
          </div>
        )}

        {/* ✅ NEW: Approve/Reject Buttons for UNDER REVIEW */}
        {approvalStatus === "under_review" && !isAllHostelsView && canReviewUnderReviewBooking && primaryBooking && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleApprove(primaryBooking._id || primaryBooking.id);
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-1 rounded"
            >
              ✔ Approve
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReject(primaryBooking._id || primaryBooking.id);
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1 rounded"
            >
              ❌ Reject
            </button>
          </div>
        )}
      </motion.div>

      {/* MainContent Modal */}
      <AnimatePresence>
        {showBookings && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowBookings(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <CalendarDays className="w-5 h-5" />
                      Room {room.roomNo}
                    </h3>
                    <p className="text-sm text-red-100 mt-0.5">
                      {activeBookings.filter(b => !isPastBooking(b)).length} bookings found
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBookings(false)}
                    className="hover:bg-white/20 p-1.5 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-2.5 max-h-96 overflow-y-auto">
                {activeBookings
                  .filter((b) => !isPastBooking(b))
                  .map((b) => {
                    const bookingId = b._id || b.id;
                    const isActive = isActiveBooking(b);

                    return (
                      <div
                        key={bookingId}
                        onClick={() => handleBookingSelect(bookingId)}
                        className={`relative rounded-xl p-3 cursor-pointer transition-all border-2 ${
                          isActive
                            ? "bg-red-50 border-red-300 hover:bg-red-100"
                            : "bg-green-50 border-green-300 hover:bg-green-100"
                        }`}
                      >
                        <div
                          className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                            isActive ? "bg-red-500 text-white" : "bg-green-500 text-white"
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              ACTIVE
                            </>
                          ) : (
                            <>
                              <Calendar className="w-3 h-3" />
                              UPCOMING
                            </>
                          )}
                        </div>

                        <div className="pr-20">
                          <p className={`text-sm font-bold flex items-center gap-1.5 mb-2 ${
                            isActive ? "text-red-700" : "text-green-700"
                          }`}>
                            <User2 className="w-4 h-4" />
                            {b.guest}
                          </p>

                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex items-start gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                              <div>
                                <span className="font-medium">Check-in: </span>
                                <span>{formatDateTime(b.from, b.checkInTime)}</span>
                              </div>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                              <div>
                                <span className="font-medium">Check-out: </span>
                                <span>{formatDateTime(b.to, b.checkOutTime)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={() => setShowBookings(false)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default RoomCard;

