// src/App.js - COMPLETE VERSION WITH EVENT CALENDAR
// ============================================================================
// ROUTING STRUCTURE:
// - Login (/) → Auto-redirects based on user role
// - Admin → /admin/dashboard-selector → Can choose between dashboards
// - Assistant → /hall/dashboard → Direct access to hall bookings only
// - Other Users → /dashboard → Guest room bookings only
// - PUBLIC ROUTES:
//   * /guest-enquiry → Public enquiry form
//   * /events → Public event calendar (NEW)
// ============================================================================

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { SpeedInsights } from '@vercel/speed-insights/react';

// ============================================================================
// PAGE IMPORTS
// ============================================================================
import Login from "./pages/Login";
import DashboardSelectorGlass from "./pages/admin/DashboardSelector";
import GuestRoomDashboard from "./GuestRoomDashboard";
import HallBookingDashboard from './HallBookingDashboard';
import GuestEnquiryPage from "./pages/GuestEnquiryPage";
import EventCalendarPage from "./pages/EventCalendarPage";
import PublicGuestFeedback from './pages/PublicGuestFeedback';
import GuestFeedbackQRCode from './components/GuestFeedbackQRCode';
import { GoogleOAuthProvider } from '@react-oauth/google';

// ============================================================================
// STYLES IMPORT
// ============================================================================
import './styles/hallBookingGlassmorphism.css';

// ============================================================================
// CONTEXT IMPORT
// ============================================================================
import { useAuth } from "./context/AuthContext";

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function App() {
  const { currentUser, loading } = useAuth();

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================
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

  // ==========================================================================
  // ROLE EXTRACTION
  // ==========================================================================
  const role = currentUser?.role || currentUser?.user?.role;

  // ==========================================================================
  // ROUTER CONFIGURATION
  // ==========================================================================
  return (
  <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
    <Router>
      <SpeedInsights />
      <Routes>

        {/* ====================================================================
            LOGIN ROUTE WITH AUTO-REDIRECT
            ==================================================================== */}
        <Route
          path="/"
          element={
            currentUser ? (
              role === "admin" ? (
                <Navigate to="/admin/dashboard-selector" replace />
              ) : role === "assistant" ? (
                <Navigate to="/hall/dashboard" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Login />
            )
          }
        />

        {/* ====================================================================
            ADMIN DASHBOARD SELECTOR
            ==================================================================== */}
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

        {/* ====================================================================
            GUEST ROOM DASHBOARD
            ==================================================================== */}
        <Route
          path="/dashboard"
          element={
            currentUser && role !== "assistant" ? (
              <GuestRoomDashboard />
            ) : currentUser && role === "assistant" ? (
              <Navigate to="/hall/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* ====================================================================
            HALL BOOKING DASHBOARD
            ==================================================================== */}
        <Route
          path="/hall/dashboard"
          element={
            currentUser && (role === "admin" || role === "assistant") ? (
              <HallBookingDashboard />
            ) : currentUser ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* ====================================================================
            PUBLIC ROUTES (NO AUTHENTICATION REQUIRED)
            ==================================================================== */}
        
        {/* Guest Enquiry Page */}
        <Route
          path="/guest-enquiry"
          element={<GuestEnquiryPage />}
        />

        {/* Event Calendar Page - PUBLIC ACCESS */}
        <Route
          path="/events"
          element={<EventCalendarPage />}
        />

        {/* Guest Feedback Page - PUBLIC ACCESS (NEW) */}
        <Route
          path="/guest-feedback"
          element={<PublicGuestFeedback />}
        />

        {/* QR Code Generator - ADMIN ONLY (NEW) */}
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

        {/* ====================================================================
            FALLBACK ROUTE
            ==================================================================== */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </Router>
  </GoogleOAuthProvider>
  );
}

// ============================================================================
// ACCESS CONTROL MATRIX
// ============================================================================
/*
  ROUTE                         | ADMIN | ASSISTANT | OTHER | UNAUTHENTICATED
  ------------------------------|-------|-----------|-------|----------------
  /                             |   ✓   |     ✓     |   ✓   |       ✓
  /admin/dashboard-selector     |   ✓   |     ✗     |   ✗   |       ✗
  /dashboard                    |   ✓   |     ✗     |   ✓   |       ✗
  /hall/dashboard               |   ✓   |     ✓     |   ✗   |       ✗
  /guest-enquiry                |   ✓   |     ✓     |   ✓   |       ✓ (PUBLIC)
  /events                       |   ✓   |     ✓     |   ✓   |       ✓ (PUBLIC)
  
  AUTO-REDIRECTS ON LOGIN:
  - Admin      → /admin/dashboard-selector
  - Assistant  → /hall/dashboard
  - Others     → /dashboard
*/