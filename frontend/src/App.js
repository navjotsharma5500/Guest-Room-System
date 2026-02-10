// src/App.js
// ============================================================================
// ROUTING STRUCTURE:
// - Login (/) → Auto-redirects based on user role
// - Admin → /admin/dashboard-selector
// - All authenticated users → /dashboard (Guest Room)
// - PUBLIC ROUTES:
//   * /guest-enquiry → Public enquiry form
//   * /guest-feedback → Public feedback form
// ============================================================================

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";

// ============================================================================
// PAGE IMPORTS
// ============================================================================
import Login from "./pages/Login";
import DashboardSelectorGlass from "./pages/admin/DashboardSelector";
import GuestRoomDashboard from "./GuestRoomDashboard";
import GuestEnquiryPage from "./pages/GuestEnquiryPage";
import PublicGuestFeedback from "./pages/PublicGuestFeedback";
import GuestFeedbackQRCode from "./components/GuestFeedbackQRCode";
import { GoogleOAuthProvider } from "@react-oauth/google";

// ============================================================================
// CONTEXT IMPORT
// ============================================================================
import { useAuth } from "./context/AuthContext";

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function App() {
  const { currentUser, loading } = useAuth();

  // ========================================================================
  // LOADING STATE
  // ========================================================================
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

  // ========================================================================
  // ROLE EXTRACTION
  // ========================================================================
  const role = currentUser?.role || currentUser?.user?.role;

  // ========================================================================
  // ROUTER CONFIGURATION
  // ========================================================================
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <Router>
        <SpeedInsights />
        <Routes>

          {/* ================================================================
              LOGIN ROUTE WITH AUTO-REDIRECT
              ================================================================ */}
          <Route
            path="/"
            element={
              currentUser ? (
                role === "admin" ? (
                  <Navigate to="/admin/dashboard-selector" replace />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              ) : (
                <Login />
              )
            }
          />

          {/* ================================================================
              ADMIN DASHBOARD SELECTOR
              ================================================================ */}
          <Route
            path="/admin/dashboard-selector"
            element={
              currentUser && role === "admin" ? (
                <DashboardSelectorGlass />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* ================================================================
              GUEST ROOM DASHBOARD
              ================================================================ */}
          <Route
            path="/dashboard"
            element={
              currentUser ? (
                <GuestRoomDashboard />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* ================================================================
              PUBLIC ROUTES (NO AUTH REQUIRED)
              ================================================================ */}
          <Route path="/guest-enquiry" element={<GuestEnquiryPage />} />
          <Route path="/guest-feedback" element={<PublicGuestFeedback />} />

          {/* ================================================================
              QR CODE GENERATOR (ADMIN ONLY)
              ================================================================ */}
          <Route
            path="/admin/qr-code"
            element={
              currentUser && role === "admin" ? (
                <GuestFeedbackQRCode />
              ) : (
                <Navigate to="/" replace />
              )
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
