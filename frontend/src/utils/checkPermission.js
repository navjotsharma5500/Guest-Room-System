// src/utils/checkPermission.js

export function hasPermission(user, key) {
  if (!user) return false;

  const role = user.role || user?.user?.role;

  // -------------------------
  // ADMIN – full access
  // -------------------------
  if (role === "admin") return true;

  // -------------------------
  // ASSISTANT – venue bookings only
  // -------------------------
  if (role === "assistant") {
    const perms = {
      // Sidebar - NO access to guest room hostels
      "sidebar.allHostels": false,
      "sidebar.hostels": false,

      // Venue Booking Access
      "venueBookings.view": true,
      "venueBookings.create": true,
      "venueBookings.edit": true,
      "venueBookings.delete": true,
      "venueBookings.download": true,

      // Enquiry - NO access
      "enquiry.view": false,
      "enquiry.download": false,

      // Search - only for venue bookings
      "search.view": true,

      // Analytics - only venue analytics
      "analytics.view": true,

      // Export - venue bookings only
      "download.view": true,

      // Notifications - venue bookings only
      "notifications.enquiry": false,
      "notifications.venueBookings": true,

      // Calendar - venue bookings only
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

      // Dashboard toggle - can only see Venue Dashboard
      "dashboard.toggleHall": false, // Cannot toggle, locked to Venue
      "dashboard.guestRoom": false,  // Cannot access Guest Room Dashboard
      "dashboard.venueBooking": true, // Can access Venue Booking Dashboard
    };

    return perms[key] === true;
  }

  // -------------------------
  // DD_ASSISTANT – venue bookings only (limited to 3 rooms)
  // -------------------------
  if (role === "dd_assistant") {
    const perms = {
      // Sidebar - NO access to guest room hostels
      "sidebar.allHostels": false,
      "sidebar.hostels": false,

      // Venue Booking Access - LIMITED to LT-201, LT-202, TAN Auditorium
      "venueBookings.view": true,
      "venueBookings.create": true,
      "venueBookings.edit": true,
      "venueBookings.delete": true,
      "venueBookings.download": true,

      // Enquiry - NO access
      "enquiry.view": false,
      "enquiry.download": false,

      // Search - only for venue bookings
      "search.view": true,

      // Analytics - only venue analytics
      "analytics.view": true,

      // Export - venue bookings only
      "download.view": true,

      // Notifications - venue bookings only
      "notifications.enquiry": false,
      "notifications.venueBookings": true,

      // Calendar - venue bookings only
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

      // Dashboard toggle - can only see Venue Dashboard
      "dashboard.toggleHall": false, // Cannot toggle, locked to Venue
      "dashboard.guestRoom": false,  // Cannot access Guest Room Dashboard
      "dashboard.venueBooking": true, // Can access Venue Booking Dashboard
    };

    return perms[key] === true;
  }

  // -------------------------
  // MANAGER & CO_WARDEN – allowed actions
  // -------------------------
  if (role === "manager" || role === "co_warden") {
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

  // -------------------------
  // ADOSA – venue bookings + night permissions (NO guest room)
  // -------------------------
  if (role === "adosa") {
    const perms = {
      "sidebar.allHostels": false,
      "sidebar.hostels": false,
      "venueBookings.view": true,
      "venueBookings.create": true,
      "venueBookings.edit": true,
      "venueBookings.delete": true,
      "venueBookings.download": true,
      "enquiry.view": false,
      "enquiry.download": false,
      "search.view": true,
      "analytics.view": true,
      "download.view": true,
      "notifications.enquiry": false,
      "notifications.venueBookings": true,
      "calendar.view": true,
      "upcoming.view": true,
      "filter.view": true,
      "settings.open": false,
      "settings.manageHostels": false,
      "settings.roleManagement": false,
      "settings.clearCache": false,
      "settings.clearLastApproved": false,
      "dashboard.toggleHall": false,
      "dashboard.guestRoom": false,
      "dashboard.venueBooking": true,
      "dashboard.nightPermissions": true,
    };
    return perms[key] === true;
  }

  // -------------------------
  // GUARD – night permissions scan only
  // -------------------------
  if (role === "guard") {
    const perms = {
      "sidebar.allHostels": false,
      "sidebar.hostels": false,
      "venueBookings.view": false,
      "venueBookings.create": false,
      "venueBookings.edit": false,
      "venueBookings.delete": false,
      "venueBookings.download": false,
      "enquiry.view": false,
      "enquiry.download": false,
      "search.view": false,
      "analytics.view": false,
      "download.view": false,
      "notifications.enquiry": false,
      "notifications.venueBookings": false,
      "calendar.view": false,
      "upcoming.view": false,
      "filter.view": false,
      "settings.open": false,
      "settings.manageHostels": false,
      "settings.roleManagement": false,
      "settings.clearCache": false,
      "settings.clearLastApproved": false,
      "dashboard.guestRoom": false,
      "dashboard.venueBooking": false,
      "dashboard.nightPermissions": true,
    };
    return perms[key] === true;
  }

  // -------------------------
  // GEN_SEC – night permissions (create & submit lists)
  // -------------------------
  if (role === "gen_sec") {
    const perms = {
      "sidebar.allHostels": false,
      "sidebar.hostels": false,
      "venueBookings.view": false,
      "venueBookings.create": false,
      "venueBookings.edit": false,
      "venueBookings.delete": false,
      "venueBookings.download": false,
      "enquiry.view": false,
      "enquiry.download": false,
      "search.view": false,
      "analytics.view": false,
      "download.view": false,
      "notifications.enquiry": false,
      "notifications.venueBookings": false,
      "calendar.view": false,
      "upcoming.view": false,
      "filter.view": false,
      "settings.open": false,
      "settings.manageHostels": false,
      "settings.roleManagement": false,
      "settings.clearCache": false,
      "settings.clearLastApproved": false,
      "dashboard.guestRoom": false,
      "dashboard.venueBooking": false,
      "dashboard.nightPermissions": true,
    };
    return perms[key] === true;
  }

  // -------------------------
  // PRESIDENT – night permissions (review & approve lists)
  // -------------------------
  if (role === "president") {
    const perms = {
      "sidebar.allHostels": false,
      "sidebar.hostels": false,
      "venueBookings.view": false,
      "venueBookings.create": false,
      "venueBookings.edit": false,
      "venueBookings.delete": false,
      "venueBookings.download": false,
      "enquiry.view": false,
      "enquiry.download": false,
      "search.view": false,
      "analytics.view": false,
      "download.view": false,
      "notifications.enquiry": false,
      "notifications.venueBookings": false,
      "calendar.view": false,
      "upcoming.view": false,
      "filter.view": false,
      "settings.open": false,
      "settings.manageHostels": false,
      "settings.roleManagement": false,
      "settings.clearCache": false,
      "settings.clearLastApproved": false,
      "dashboard.guestRoom": false,
      "dashboard.venueBooking": false,
      "dashboard.nightPermissions": true,
    };
    return perms[key] === true;
  }

  // -------------------------
  // STUDENT – night permissions only (view own status, calendar)
  // -------------------------
  if (role === "student") {
    const perms = {
      "sidebar.allHostels": false,
      "sidebar.hostels": false,
      "venueBookings.view": false,
      "venueBookings.create": false,
      "venueBookings.edit": false,
      "venueBookings.delete": false,
      "venueBookings.download": false,
      "enquiry.view": false,
      "enquiry.download": false,
      "search.view": false,
      "analytics.view": false,
      "download.view": false,
      "notifications.enquiry": false,
      "notifications.venueBookings": false,
      "calendar.view": true,
      "upcoming.view": true,
      "filter.view": false,
      "settings.open": false,
      "settings.manageHostels": false,
      "settings.roleManagement": false,
      "settings.clearCache": false,
      "settings.clearLastApproved": false,
      "dashboard.guestRoom": false,
      "dashboard.venueBooking": false,
      "dashboard.nightPermissions": true,
    };
    return perms[key] === true;
  }

  return false;
}