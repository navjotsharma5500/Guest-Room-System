// src/utils/checkPermission.js

export function hasPermission(user, key) {
  if (!user) return false;

  const role = user.role || user?.user?.role;

  // -------------------------
  // ADMIN – full access
  // -------------------------
  if (role === "admin") return true;

  // -------------------------
  // MANAGER – allowed actions
  // -------------------------
  if (role === "manager") {
    const perms = {
      // Sidebar
      "sidebar.allHostels": true,
      "sidebar.hostels": true,
      "sidebar.hallBookings": false, // managers don't see hall bookings

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
      "sidebar.hallBookings": false,

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
    };

    return perms[key] === true;
  }

  // -------------------------
  // ASSISTANT – hall bookings only
  // -------------------------
  if (role === "assistant") {
    const perms = {
      // Sidebar
      "sidebar.allHostels": false,
      "sidebar.hostels": false,
      "sidebar.hallBookings": true, // only hall bookings portal

      // Enquiry
      "enquiry.view": false,
      "enquiry.download": false,

      // Search
      "search.view": true, // can search hall bookings

      // Analytics
      "analytics.view": false,

      // Export
      "download.view": true, // can download hall booking data

      // Notifications
      "notifications.enquiry": false,

      // Calendar
      "calendar.view": true, // can view calendar for hall bookings
      "upcoming.view": true, // can see upcoming hall bookings

      // Filter modal
      "filter.view": true, // can filter hall bookings

      // Settings
      "settings.open": false,
      "settings.manageHostels": false,
      "settings.roleManagement": false,
      "settings.clearCache": false,
      "settings.clearLastApproved": false,
    };

    return perms[key] === true;
  }

  return false;
}