// src/utils/checkPermission.js

export function hasPermission(user, key) {
  if (!user) return false;

  const role = user.role;

  // -------------------------
  // ADMIN — full access
  // -------------------------
  if (role === "admin") return true;

  // -------------------------
  // MANAGER — allowed actions
  // -------------------------
  if (role === "manager") {
    const perms = {
      // Sidebar
      "sidebar.allHostels": true,
      "sidebar.hostels": true,

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
  // CARETAKER — restricted
  // -------------------------
  if (role === "caretaker") {
    const perms = {
      // Sidebar
      "sidebar.allHostels": false,
      "sidebar.hostels": true, // only their own

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

  return false;
}
