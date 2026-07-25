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

import React, { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
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
import VenueGuestEnquiryPage from "./pages/VenueGuestEnquiryPage";
import PublicEventCalendar from "./pages/PublicEventCalendar";
import PublicAllEventsPage from "./pages/PublicAllEventsPage";
import EventCalendarAdminPage from "./pages/EventCalendarAdminPage";
import GuestRoomPublicLayout from "./pages/publicGuestRoom/GuestRoomPublicLayout";
import GuestRoomHome from "./pages/publicGuestRoom/GuestRoomHome";
import GuestRoomAbout from "./pages/publicGuestRoom/GuestRoomAbout";
import GuestRoomRooms from "./pages/publicGuestRoom/GuestRoomRooms";
import GuestRoomTariff from "./pages/publicGuestRoom/GuestRoomTariff";
import GuestRoomDining from "./pages/publicGuestRoom/GuestRoomDining";
import GuestRoomFacilities from "./pages/publicGuestRoom/GuestRoomFacilities";
import GuestRoomGallery from "./pages/publicGuestRoom/GuestRoomGallery";
import GuestRoomBooking from "./pages/publicGuestRoom/GuestRoomBooking";
import GuestRoomContact from "./pages/publicGuestRoom/GuestRoomContact";
import PublicGuestFeedback from "./pages/PublicGuestFeedback";
import GuestSupportPortal from "./pages/GuestSupportPortal";
import GuestFeedbackQRCode from "./components/GuestFeedbackQRCode";
import AllHostelsPortal from "./pages/AllHostelsPortal";
import ApprovalPage from "./pages/ApprovalPage";
import SettingsPage from "./pages/SettingsPage";
import PoliciesPage from "./pages/PoliciesPage";
import TermsPage    from "./pages/TermsPage";
import LicensePage  from "./pages/LicensePage";
import { GoogleOAuthProvider } from "@react-oauth/google";

import AdvancedAnalyticsPage from "./pages/admin/AdvancedAnalyticsPage";
import EchoKnowledgePage from "./pages/admin/EchoKnowledgePage";
import PublicUiCustomizerPage from "./pages/admin/PublicUiCustomizerPage";
import CommunityFeedbackPage from "./pages/CommunityFeedbackPage";
import PublicVenueCalendar from "./pages/PublicVenueCalendar";

// ============================================================================
// STYLES
// ============================================================================
import "./styles/uiTheme.css";
import "./styles/VenueBookingGlassmorphism.css";

// ============================================================================
// CONTEXT
// ============================================================================
import { useAuth } from "./context/AuthContext";
import useSystemSettings from "./hooks/useSystemSettings";
import {
  getDashboardPath,
  resolveDashboardAccess,
} from "./utils/dashboardAccess";

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL SWITCH: Set to false to hide Dashboard Selector from all non-admin roles
// Admin always sees it regardless. Change here to toggle globally.
// ══════════════════════════════════════════════════════════════════════════════
const DASHBOARD_SELECTOR_ENABLED = true;

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
  const { currentUser, loading } = useAuth();
  const { settings } = useSystemSettings();

  useEffect(() => {
    let registrationListener;
    let registrationErrorListener;
    let notificationReceivedListener;
    let notificationActionListener;

    const initialisePushNotifications = async () => {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      try {
        let permissionStatus = await PushNotifications.checkPermissions();

        if (permissionStatus.receive === "prompt") {
          permissionStatus = await PushNotifications.requestPermissions();
        }

        if (permissionStatus.receive !== "granted") {
          console.log("Push notification permission was not granted.");
          return;
        }

        registrationListener = await PushNotifications.addListener(
          "registration",
          (token) => {
            console.log(`FCM_TOKEN=${token.value}`);
          }
        );

        registrationErrorListener = await PushNotifications.addListener(
          "registrationError",
          (error) => {
            console.error("Push notification registration error:", error);
          }
        );

        notificationReceivedListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("Push notification received:", notification);
          }
        );

        notificationActionListener = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            console.log("Push notification opened:", action.notification);
          }
        );

        await PushNotifications.register();
      } catch (error) {
        console.error("Failed to initialise push notifications:", error);
      }
    };

    initialisePushNotifications();

    return () => {
      registrationListener?.remove();
      registrationErrorListener?.remove();
      notificationReceivedListener?.remove();
      notificationActionListener?.remove();
    };
  }, []);

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
  const dashboardAccess = currentUser
    ? resolveDashboardAccess(currentUser, settings)
    : { dashboards: [], defaultDashboard: null, skipSelectorWhenSingle: true };
  const canAccessGuestRoom = dashboardAccess.dashboards.includes("guestRoom");
  const canAccessVenue = dashboardAccess.dashboards.includes("venue");
  const canAccessNight = dashboardAccess.dashboards.includes("night") || role === "guard";
  const canAccessBroadcast =
    settings?.operations?.enableBroadcastCenter !== false &&
    ["admin", "manager", "adosa"].includes(role);
  const canAccessSupportRequests =
    settings?.operations?.enableGuestSupportPortal !== false &&
    canAccessGuestRoom &&
    ["admin", "manager", "adosa", "assistant", "caretaker", "warden", "co_warden"].includes(role);
  const canSeeSelector =
    role === "admin" ||
    (DASHBOARD_SELECTOR_ENABLED &&
      dashboardAccess.dashboards.length > 1 &&
      !(
        dashboardAccess.dashboards.length === 1 &&
        dashboardAccess.skipSelectorWhenSingle
      ));

  // Determine where to send user after login
  const getLoginRedirect = () => {
    if (!role) return "/";
    if (currentUser?.redirectTo) {
      return currentUser.redirectTo;
    }
    if (role === "student") return "/";
    if (["gen_sec", "president"].includes(role)) return "/night-pass";
    if (role === "guard") return canAccessNight ? (getDashboardPath(settings, "night") || "/night-pass/scan") : "/night-pass/scan";

    if (dashboardAccess.dashboards.length === 1 && dashboardAccess.skipSelectorWhenSingle) {
      return getDashboardPath(settings, dashboardAccess.dashboards[0]);
    }

    if (canSeeSelector) {
      return "/admin/dashboard-selector";
    }

    if (dashboardAccess.defaultDashboard) {
      return getDashboardPath(settings, dashboardAccess.defaultDashboard);
    }

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
              currentUser && canSeeSelector
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
                : <Navigate to={currentUser ? "/admin/dashboard-selector" : "/login"} replace />
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
              currentUser && canAccessGuestRoom
                ? <GuestRoomDashboard />
                : <Navigate to="/" replace />
            }
          />

          <Route
            path="/approvals"
            element={
              currentUser && canAccessGuestRoom
                ? <ApprovalPage />
                : <Navigate to="/" replace />
            }
          />

          <Route
            path="/broadcast-center"
            element={
              currentUser && canAccessBroadcast
                ? <GuestRoomDashboard />
                : <Navigate to="/" replace />
            }
          />

          <Route
            path="/support-requests"
            element={
              currentUser && canAccessSupportRequests
                ? <GuestRoomDashboard />
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
              currentUser && canAccessVenue
                ? <VenueBookingDashboard />
                : <Navigate to="/" replace />
            }
          />

          <Route
            path="/venue-all-bookings"
            element={
              currentUser && canAccessVenue
                ? <VenueBookingDashboard />
                : <Navigate to="/" replace />
            }
          />

          {/* ================================================================
              PUBLIC ROUTES (no auth required)
              ================================================================ */}
          <Route path="/guest-room" element={<GuestRoomPublicLayout />}>
            <Route index element={<GuestRoomHome />} />
            <Route path="about" element={<GuestRoomAbout />} />
            <Route path="rooms" element={<GuestRoomRooms />} />
            <Route path="tariff" element={<GuestRoomTariff />} />
            <Route path="dining" element={<GuestRoomDining />} />
            <Route path="facilities" element={<GuestRoomFacilities />} />
            <Route path="gallery" element={<GuestRoomGallery />} />
            <Route path="booking" element={<GuestRoomBooking />} />
            <Route path="contact" element={<GuestRoomContact />} />
          </Route>
          <Route path="/guest-enquiry" element={<Navigate to="/guest-room/booking" replace />} />
          <Route path="/venue-enquiry"        element={<VenueGuestEnquiryPage />} />
          <Route path="/event-calendar"       element={<PublicEventCalendar />} />
          <Route path="/ic"                   element={<PublicEventCalendar />} />
          <Route path="/tc"                   element={<PublicEventCalendar />} />
          <Route path="/event-calendar/all-events" element={<PublicAllEventsPage />} />
          <Route path="/event-calendar/admin" element={<EventCalendarAdminPage />} />
          <Route path="/event-calendar/admin/login" element={<EventCalendarAdminPage />} />
          <Route path="/admin"                element={<Navigate to="/event-calendar/admin" replace />} />
          <Route path="/Admin"                element={<Navigate to="/event-calendar/admin" replace />} />
          <Route path="/guest-feedback"       element={<PublicGuestFeedback />} />
          <Route path="/guest-support/:hostelId/:roomId" element={<GuestSupportPortal />} />
          <Route path="/install-app"          element={<InstallApp />} />
          <Route path="/about-us"             element={<AboutUsPage />} />
          <Route path="/community-feedback"   element={<CommunityFeedbackPage />} />
          <Route path="/venue-calendar"       element={<PublicVenueCalendar />} />
          <Route path="/license"              element={<LicensePage />}  />
          <Route path="/policies"             element={<PoliciesPage />} />
          <Route path="/terms"                element={<TermsPage />} />

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
