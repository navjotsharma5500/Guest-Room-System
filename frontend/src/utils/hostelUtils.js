// src/utils/hostelUtils.js

/**
 * Format date to short format (DD-MMM-YYYY)
 */
export const formatShortDate = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return String(d);
    return dt
      .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      .replace(/\s+/g, "-");
  } catch (err) {
    return String(d);
  }
};

/**
 * Format time to 12-hour format with AM/PM
 */
export const formatTimeWithAMPM = (timeStr) => {
  if (!timeStr) return "";
  try {
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const period = h >= 12 ? "PM" : "AM";
    const displayHours = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${String(displayHours).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
  } catch {
    return timeStr;
  }
};

/**
 * Format datetime with date and time
 */
export const formatDateTime = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return String(d);
    const day = String(dt.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mon = months[dt.getMonth()];
    const year = dt.getFullYear();
    let hrs = dt.getHours();
    const mins = String(dt.getMinutes()).padStart(2, "0");
    const ampm = hrs >= 12 ? "PM" : "AM";
    hrs = hrs % 12;
    if (hrs === 0) hrs = 12;
    const hourStr = String(hrs).padStart(2, "0");
    return `${day}-${mon}-${year} (${hourStr}:${mins} ${ampm})`;
  } catch (err) {
    return String(d);
  }
};

/**
 * Format date for display
 */
export const formatDate = (dateString) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

/**
 * Format createdAt timestamp
 */
export const formatCreatedAt = (timestamp) => {
  if (!timestamp) return "Created: —";
  try {
    const date = new Date(timestamp);
    if (isNaN(date)) return "Created: —";
    return `Created: ${date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} at ${date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return "Created: —";
  }
};

/**
 * Persist hostel data to localStorage
 */
export const persistHostelData = (data) => {
  try {
    localStorage.setItem("hostelData", JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("hostelDataUpdated"));
  } catch (err) {
    console.error("Failed to persist hostelData", err);
  }
};

/**
 * Get guest name from booking object
 */
export const getGuestName = (booking) => {
  if (!booking) return "Guest";
  return (
    booking.guest ||
    booking.name ||
    booking.fullName ||
    booking.contactName ||
    booking.guestName ||
    "Guest"
  );
};

/**
 * Safe trim utility
 */
export const safeTrim = (v) => {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v.trim() : String(v).trim();
};

/**
 * Check if room is currently active
 */
export const isRoomCurrentlyActive = (bookings) => {
  if (!bookings || bookings.length === 0) return false;
  const now = new Date();
  return bookings.some((b) => {
    if (b.status === "cancelled") return false;
    const start = new Date(b.from);
    const end = new Date(b.to);
    return now >= start && now <= end;
  });
};

/**
 * Get room status
 */
export const getRoomStatus = (room) => {
  const bookings = room.bookings || [];
  if (bookings.length === 0) return "available";
  
  const now = new Date();
  const hasActiveBooking = bookings.some((b) => {
    if (b.status === "cancelled") return false;
    const start = new Date(b.from);
    const end = new Date(b.to);
    return now >= start && now <= end;
  });

  if (hasActiveBooking) return "active";
  return "upcoming";
};

/**
 * Calculate total rooms statistics
 */
export const calculateHostelStats = (hostelData) => {
  let totalRooms = 0;
  let occupiedRooms = 0;
  let availableRooms = 0;

  Object.values(hostelData || {}).forEach((hostel) => {
    const rooms = hostel.rooms || [];
    totalRooms += rooms.length;
    rooms.forEach((room) => {
      if ((room.bookings || []).length > 0) {
        occupiedRooms++;
      } else {
        availableRooms++;
      }
    });
  });

  return { totalRooms, occupiedRooms, availableRooms };
};