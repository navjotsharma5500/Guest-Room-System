// src/App.js - COMPLETE VERSION WITH HALL BOOKING INTEGRATION
// ============================================================================
// ROUTING STRUCTURE:
// - Login (/) â†’ Auto-redirects based on user role
// - Admin â†’ /admin/dashboard-selector â†’ Can choose between dashboards
// - Assistant â†’ /hall/dashboard â†’ Direct access to hall bookings only
// - Other Users â†’ /dashboard â†’ Guest room bookings only
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
import DashboardSelectorGlass from "./pages/admin/DashboardSelector";
import GuestRoomDashboard from "./GuestRoomDashboard";
import HallBookingDashboard from './HallBookingDashboard';
import GuestEnquiryPage from "./pages/GuestEnquiryPage";

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
  // Shows a centered loading spinner while authentication state is being determined
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
  // Safely extract user role from currentUser object
  // Handles both direct role property and nested user.role structure
  const role = currentUser?.role || currentUser?.user?.role;

  // ==========================================================================
  // ROUTER CONFIGURATION
  // ==========================================================================
  return (
    <Router>
      <Routes>

        {/* ====================================================================
            LOGIN ROUTE WITH AUTO-REDIRECT
            ==================================================================== 
            - Unauthenticated: Shows login page
            - Admin: Redirects to dashboard selector
            - Assistant: Redirects to hall booking dashboard
            - Other users: Redirects to guest room dashboard
        */}
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
            ==================================================================== 
            - Access: Admin only
            - Purpose: Choose between Guest Room or Hall Booking dashboard
            - Unauthorized: Redirects to login
        */}
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
            ==================================================================== 
            - Access: Admin and regular users (NOT assistants)
            - Purpose: Manage guest room bookings
            - Assistant access: Redirects to hall dashboard
            - Unauthenticated: Redirects to login
        */}
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
            ==================================================================== 
            - Access: Admin and Assistant only
            - Purpose: Manage hall event bookings
            - Features:
              * Calendar-based booking view
              * Create/Edit/Delete bookings
              * Payment tracking
              * Status management
              * Real-time Firebase integration
            - Other users: Redirects to guest room dashboard
            - Unauthenticated: Redirects to login
        */}
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
            GUEST ENQUIRY PAGE
            ==================================================================== 
            - Access: Public (no authentication required)
            - Purpose: Allow guests to submit enquiries
        */}
        <Route
          path="/guest-enquiry"
          element={<GuestEnquiryPage />}
        />

        {/* ====================================================================
            FALLBACK ROUTE
            ==================================================================== 
            - Catches all undefined routes
            - Redirects to home/login page
        */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </Router>
  );
}

// ============================================================================
// ACCESS CONTROL MATRIX
// ============================================================================
/*
  ROUTE                         | ADMIN | ASSISTANT | OTHER | UNAUTHENTICATED
  ------------------------------|-------|-----------|-------|----------------
  /                             |   âœ“   |     âœ“     |   âœ“   |       âœ“
  /admin/dashboard-selector     |   âœ“   |     âœ—     |   âœ—   |       âœ—
  /dashboard                    |   âœ“   |     âœ—     |   âœ“   |       âœ—
  /hall/dashboard               |   âœ“   |     âœ“     |   âœ—   |       âœ—
  /guest-enquiry                |   âœ“   |     âœ“     |   âœ“   |       âœ“
  
  AUTO-REDIRECTS ON LOGIN:
  - Admin      â†’ /admin/dashboard-selector
  - Assistant  â†’ /hall/dashboard
  - Others     â†’ /dashboard
*/

// ============================================================================
// FIREBASE REQUIREMENTS
// ============================================================================
/*
  For Hall Booking Dashboard to work, ensure:
  
  1. FIRESTORE COLLECTION: 'hallBookings'
     - Contains booking documents with proper structure
     - Security rules configured for role-based access
  
  2. AUTHENTICATION CUSTOM CLAIMS:
     - Admin users: { role: 'admin' }
     - Assistant users: { role: 'assistant' }
  
  3. SECURITY RULES:
     - Admin: Full CRUD access to hallBookings
     - Assistant: Read, Create, Update access (no delete)
     - Others: No access
*/

// ============================================================================
// DEPENDENCIES REQUIRED
// ============================================================================
/*
  Ensure these packages are installed:
  
  npm install react-router-dom
  npm install react-calendar
  npm install date-fns
  npm install lucide-react
  npm install firebase
*/