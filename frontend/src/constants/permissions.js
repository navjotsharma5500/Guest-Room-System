// src/constants/permissions.js

export const PERMISSIONS = {
  // Core Dashboards
  DASHBOARD_GUEST: "dashboard.guestRoom",
  DASHBOARD_VENUE: "dashboard.venueBooking",
  DASHBOARD_NIGHT: "dashboard.nightPermissions",
  DASHBOARD_SELECTOR: "dashboard.selector",

  // Venue
  VENUE_VIEW: "venueBookings.view",
  VENUE_CREATE: "venueBookings.create",
  VENUE_EDIT: "venueBookings.edit",
  VENUE_DELETE: "venueBookings.delete",
  VENUE_DOWNLOAD: "venueBookings.download",

  // Guest Room
  SIDEBAR_ALL_HOSTELS: "sidebar.allHostels",
  SIDEBAR_HOSTELS: "sidebar.hostels",
  ENQUIRY_VIEW: "enquiry.view",
  ENQUIRY_DOWNLOAD: "enquiry.download",

  // Night
  NIGHT_SCAN: "night.scan",
  NIGHT_ROLE: "night.role",
  NIGHT_ADMIN: "night.admin",

  // Analytics
  ANALYTICS_VIEW: "analytics.view",
  
  // Settings
  SETTINGS_OPEN: "settings.open",
  SETTINGS_CACHE: "settings.clearCache",
  SETTINGS_APPROVED: "settings.clearLastApproved",
  
  // Export
  DOWNLOAD_VIEW: "download.view",
  
  // Search
  SEARCH_VIEW: "search.view",
  
  // Calendar
  CALENDAR_VIEW: "calendar.view",
  UPCOMING_VIEW: "upcoming.view",
  
  // Notifications
  NOTIFICATIONS_ENQUIRY: "notifications.enquiry",
  NOTIFICATIONS_VENUE: "notifications.venueBookings",
  
  // Filter
  FILTER_VIEW: "filter.view",
};
