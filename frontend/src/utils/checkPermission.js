// src/utils/checkPermission.js

export function hasPermission(user, key) {
  if (!user) return false;

  const role = user.role || user?.user?.role;

  // -------------------------
  // ADMIN – full access
  // -------------------------
  if (role === "admin") return true;

  // -------------------------
  // ASSISTANT – hall bookings only
  // -------------------------
  if (role === "assistant") {
    const perms = {
      // Sidebar - NO access to guest room hostels
      "sidebar.allHostels": false,
      "sidebar.hostels": false,

      // Hall Booking Access
      "hallBookings.view": true,
      "hallBookings.create": true,
      "hallBookings.edit": true,
      "hallBookings.delete": true,
      "hallBookings.download": true,

      // Enquiry - NO access
      "enquiry.view": false,
      "enquiry.download": false,

      // Search - only for hall bookings
      "search.view": true,

      // Analytics - only hall analytics
      "analytics.view": true,

      // Export - hall bookings only
      "download.view": true,

      // Notifications - hall bookings only
      "notifications.enquiry": false,
      "notifications.hallBookings": true,

      // Calendar - hall bookings only
      "calendar.view": true,
      "upcoming.view": true,

      // Filter modal
      "filter.view": true,

      // Settings - limited
      "settings.open": false,
      "settings.manageHostels": false,
      "settings.roleManagement": false,
      "settings.clearCache": false,
      "settings.clearLastApproved": false,

      // Dashboard toggle - can only see Hall Dashboard
      "dashboard.toggleHall": false, // Cannot toggle, locked to Hall
      "dashboard.guestRoom": false,  // Cannot access Guest Room Dashboard
      "dashboard.hallBooking": true, // Can access Hall Booking Dashboard
    };

    return perms[key] === true;
  }

  // -------------------------
  // MANAGER – allowed actions
  // -------------------------
  if (role === "manager") {
    const perms = {
      // Sidebar
      "sidebar.allHostels": true,
      "sidebar.hostels": true,

      // Hall Booking Access - NO
      "hallBookings.view": false,
      "hallBookings.create": false,
      "hallBookings.edit": false,
      "hallBookings.delete": false,
      "hallBookings.download": false,

      // Enquiry
      "enquiry.view": true,
      "enquiry.download": true,

      // Search
      "search.view": true,

      // Analytics
      "analytics.view": true,

      // Export
      "download.view": true,

      // Notification bell
      "notifications.enquiry": true,
      "notifications.hallBookings": false,

      // Calendar
      "calendar.view": true,
      "upcoming.view": true,

      // Filter modal
      "filter.view": true,

      // Settings
      "settings.open": true,
      "settings.manageHostels": false,
      "settings.roleManagement": false,
      "settings.clearCache": true,
      "settings.clearLastApproved": true,

      // Dashboard toggle
      "dashboard.toggleHall": false, // Cannot see Hall Dashboard
      "dashboard.guestRoom": true,
      "dashboard.hallBooking": false,
    };

    return perms[key] === true;
  }

  // -------------------------
  // CARETAKER – restricted
  // -------------------------
  if (role === "caretaker") {
    const perms = {
      // Sidebar
      "sidebar.allHostels": false,
      "sidebar.hostels": true, // only their own

      // Hall Booking Access - NO
      "hallBookings.view": false,
      "hallBookings.create": false,
      "hallBookings.edit": false,
      "hallBookings.delete": false,
      "hallBookings.download": false,

      // Enquiry
      "enquiry.view": false,
      "enquiry.download": false,

      // Search
      "search.view": true,

      // Analytics
      "analytics.view": false,

      // Export
      "download.view": true,

      // Notifications
      "notifications.enquiry": false,
      "notifications.hallBookings": false,

      // Calendar
      "calendar.view": true,
      "upcoming.view": true,

      // Filter modal
      "filter.view": true,

      // Settings
      "settings.open": false,
      "settings.manageHostels": false,
      "settings.roleManagement": false,
      "settings.clearCache": false, // caretakers use floating button
      "settings.clearLastApproved": false,

      // Dashboard toggle
      "dashboard.toggleHall": false, // Cannot see Hall Dashboard
      "dashboard.guestRoom": true,
      "dashboard.hallBooking": false,
    };

    return perms[key] === true;
  }

  // -------------------------
  // WARDEN – same as caretaker
  // -------------------------
  if (role === "warden") {
    const perms = {
      // Sidebar
      "sidebar.allHostels": false,
      "sidebar.hostels": true, // only their own

      // Hall Booking Access - NO
      "hallBookings.view": false,
      "hallBookings.create": false,
      "hallBookings.edit": false,
      "hallBookings.delete": false,
      "hallBookings.download": false,

      // Enquiry
      "enquiry.view": false,
      "enquiry.download": false,

      // Search
      "search.view": true,

      // Analytics
      "analytics.view": false,

      // Export
      "download.view": true,

      // Notifications
      "notifications.enquiry": false,
      "notifications.hallBookings": false,

      // Calendar
      "calendar.view": true,
      "upcoming.view": true,

      // Filter modal
      "filter.view": true,

      // Settings
      "settings.open": false,
      "settings.manageHostels": false,
      "settings.roleManagement": false,
      "settings.clearCache": false,
      "settings.clearLastApproved": false,

      // Dashboard toggle
      "dashboard.toggleHall": false,
      "dashboard.guestRoom": true,
      "dashboard.hallBooking": false,
    };

    return perms[key] === true;
  }

  return false;
}