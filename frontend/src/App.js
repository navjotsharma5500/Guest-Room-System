// src/App.js
// ============================================================================
// ROUTING STRUCTURE:
// - Login (/) → Auto-redirects based on user role:
//     admin, adosa, assistant → /admin/dashboard-selector
//     guard, gen_sec, president → /night-pass
//     student → /society-night-pass
//     manager, caretaker, warden → /dashboard (Guest Room)
//     dd_assistant → /venue-booking
// - /admin/dashboard-selector → DashboardSelector (admin, adosa, assistant)
// - /dashboard → Guest Room (admin, manager, caretaker, warden only)
// - /venue-booking → Venue Booking (admin, adosa, assistant, dd_assistant)
// - /night/* → Night Permissions (all night-perm roles)
// - /access-required → Shown when login OK but user not in system data
// ============================================================================

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// ============================================================================
// PAGE IMPORTS
// ============================================================================
import Login from "./pages/Login";
import PublicDashboardSelector from "./pages/PublicDashboardSelector";
import InstallApp from "./pages/InstallApp";
import AboutUsPage from "./pages/AboutUsPage";
import DashboardSelectorGlass from "./pages/admin/DashboardSelector";
import GuestRoomDashboard from "./GuestRoomDashboard";
import VenueBookingDashboard from "./VenueBookingDashboard";
import GuestEnquiryPage from "./pages/GuestEnquiryPage";
import VenueGuestEnquiryPage from "./pages/VenueGuestEnquiryPage";
import PublicEventCalendar from "./pages/PublicEventCalendar";
import PublicGuestFeedback from "./pages/PublicGuestFeedback";
import GuestFeedbackQRCode from "./components/GuestFeedbackQRCode";
import AllHostelsPortal from "./pages/AllHostelsPortal";
import ApprovalPage from "./pages/ApprovalPage";
import SettingsPage from "./pages/SettingsPage";
import { GoogleOAuthProvider } from "@react-oauth/google";

import AdvancedAnalyticsPage from "./pages/admin/AdvancedAnalyticsPage";
import EchoKnowledgePage from "./pages/admin/EchoKnowledgePage";
import PublicUiCustomizerPage from "./pages/admin/PublicUiCustomizerPage";
import CommunityFeedbackPage from "./pages/CommunityFeedbackPage";

// ============================================================================
// STYLES
// ============================================================================
import "./styles/uiTheme.css";
import "./styles/VenueBookingGlassmorphism.css";

// ============================================================================
// CONTEXT
// ============================================================================
import { useAuth } from "./context/AuthContext";
import { isDDAssistantRole } from "./utils/venueAccessPolicy";
import { ROLE_ACCESS, hasAccess } from "./utils/roleAccess";

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL SWITCH: Set to false to hide Dashboard Selector from all non-admin roles
// Admin always sees it regardless. Change here to toggle globally.
// ══════════════════════════════════════════════════════════════════════════════
const DASHBOARD_SELECTOR_ENABLED = true;

// ============================================================================
// ROLE SETS
// ============================================================================

// Roles allowed to access Guest Room dashboard
const GUEST_ROOM_ROLES = Object.keys(ROLE_ACCESS).filter(r => hasAccess(r, "guestroom"));

// Roles allowed to access Venue Booking dashboard
const VENUE_BOOKING_ROLES = Object.keys(ROLE_ACCESS).filter(r => hasAccess(r, "venue") || hasAccess(r, "venue_limited"));

// Roles allowed to access Dashboard Selector page
const canSeeSelector = (role, isDDAssistant, userEmail = "") => {
  // Admin always sees the selector
  if (role === "admin") return true;
  // Force adosa3 and assistant directly to venue booking
  if (userEmail === "adosa3@thapar.edu") return false;
  if (role === "assistant") return false;
  // If disabled globally, no one else sees it
  if (!DASHBOARD_SELECTOR_ENABLED) return false;
  return hasAccess(role, "selector") || isDDAssistant;
};

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex items-center justify-center h-screen text-gray-500">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
          <p className="text-lg font-medium">Loading Application...</p>
        </div>
      </main>
    );
  }

  const rawRole = currentUser?.role || currentUser?.user?.role;
  const role = rawRole ? rawRole.toLowerCase() : null;
  const isDDAssistant = isDDAssistantRole(role);

  // Determine where to send user after login
  const getLoginRedirect = () => {
    if (!role) return "/";
    const userEmail = (currentUser?.email || currentUser?.user?.email || "").toLowerCase();
    const permissions = currentUser?.permissions || currentUser?.user?.permissions || {};

    // ⚡ HARDCODED OVERRIDE FOR adosa2@thapar.edu
    if (userEmail === "adosa2@thapar.edu") {
      return "/dashboard";
    }
    // ⚡ HARDCODED OVERRIDE FOR adosa3@thapar.edu (Venue Booking only)
    if (userEmail === "adosa3@thapar.edu") {
      return "/venue-booking";
    }

    // Assistant role should land on Venue Booking dashboard
    if (role === "assistant") {
      return "/venue-booking";
    }

    // 1️⃣ If user has ONLY GuestRoom permission → go to GuestRoom directly
    if (
      permissions.guestRoom &&
      !permissions.venue &&
      !permissions.night
    ) {
      return "/dashboard";
    }

    // 2️⃣ Direct GuestRoom roles
    if (["manager", "warden", "co_warden"].includes(role)) {
      return "/dashboard";
    }

    // 3️⃣ Selector roles (admin, adosa, assistant etc.)
    if (canSeeSelector(role, isDDAssistant, userEmail)) {
      return "/admin/dashboard-selector";
    }

    // 4️⃣ Fallback permission checks
    if (VENUE_BOOKING_ROLES.includes(role)) return "/venue-booking";

    return "/"; // Stay on login if no access
  };

  const redirectPath = currentUser ? getLoginRedirect() : null;

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <Router>
        <Routes>

          {/* ================================================================
              PUBLIC DASHBOARD (Landing Page)
              ================================================================ */}
          <Route path="/" element={<PublicDashboardSelector />} />

          {/* ================================================================
              LOGIN WITH AUTO-REDIRECT
              ================================================================ */}
          <Route
            path="/login"
            element={
              currentUser && redirectPath && redirectPath !== "/"
                ? <Navigate to={redirectPath} replace />
                : <Login />
            }
          />

          {/* ================================================================
              DASHBOARD SELECTOR
              admin, adosa, assistant, dd_assistant only
              ================================================================ */}
          <Route
            path="/admin/dashboard-selector"
            element={
              currentUser && canSeeSelector(role, isDDAssistant, (currentUser?.email || currentUser?.user?.email || "").toLowerCase())
                ? <DashboardSelectorGlass />
                : <Navigate to="/" replace />
            }
          />

          {/* ================================================================
              Dashboard-Advanced Analytics
              ================================================================ */}
          <Route
            path="/admin/advanced-analytics"
            element={<AdvancedAnalyticsPage />}
          />
          <Route
            path="/admin/echo-knowledge"
            element={
              currentUser && role === "admin"
                ? <EchoKnowledgePage />
                : <Navigate to="/" replace />
            }
          />

          <Route
            path="/admin/public-ui-customizer"
            element={
              currentUser && role === "admin"
                ? <PublicUiCustomizerPage />
                : <Navigate to="/" replace />
            }
          />

          {/* ================================================================
              GUEST ROOM DASHBOARD
              admin, manager, caretaker, warden ONLY
              adosa / guard / gen_sec / president CANNOT access
              ================================================================ */}
          <Route
            path="/dashboard"
            element={
              currentUser && GUEST_ROOM_ROLES.includes(role)
                ? <GuestRoomDashboard />
                : <Navigate to="/" replace />
            }
          />

          <Route
            path="/approvals"
            element={
              currentUser && GUEST_ROOM_ROLES.includes(role)
                ? <ApprovalPage />
                : <Navigate to="/" replace />
            }
          />

          <Route
            path="/all-hostels"
            element={
              currentUser && role === "admin"
                ? <AllHostelsPortal />
                : <Navigate to="/" replace />
            }
          />

          <Route
            path="/settings"
            element={
              currentUser && role === "admin"
                ? <SettingsPage />
                : <Navigate to="/" replace />
            }
          />

          {/* ================================================================
              VENUE BOOKING DASHBOARD
              admin, adosa, assistant, dd_assistant
              ================================================================ */}
          <Route
            path="/venue-booking"
            element={
              currentUser && (VENUE_BOOKING_ROLES.includes(role) || isDDAssistant)
                ? <VenueBookingDashboard />
                : <Navigate to="/" replace />
            }
          />

          {/* ================================================================
              PUBLIC ROUTES (no auth required)
              ================================================================ */}
          <Route path="/guest-enquiry"        element={<GuestEnquiryPage />} />
          <Route path="/venue-enquiry"        element={<VenueGuestEnquiryPage />} />
          <Route path="/event-calendar"       element={<PublicEventCalendar />} />
          <Route path="/guest-feedback"       element={<PublicGuestFeedback />} />
          <Route path="/install-app"          element={<InstallApp />} />
          <Route path="/about-us"             element={<AboutUsPage />} />
          <Route path="/community-feedback"   element={<CommunityFeedbackPage />} />

          {/* ================================================================
              QR CODE GENERATOR (admin only)
              ================================================================ */}
          <Route
            path="/admin/qr-code"
            element={
              currentUser && role === "admin"
                ? <GuestFeedbackQRCode />
                : <Navigate to="/" replace />
            }
          />

          {/* ================================================================
              FALLBACK
              ================================================================ */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}


