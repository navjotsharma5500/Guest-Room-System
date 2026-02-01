// src/App.js - FINAL VERSION WITH ROLE-BASED ROUTING
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import DashboardSelectorGlass from "./pages/admin/DashboardSelector";
import GuestRoomDashboard from "./GuestRoomDashboard";
import GuestEnquiryPage from "./pages/GuestEnquiryPage";

import { useAuth } from "./context/AuthContext";

export default function App() {
  const { currentUser, loading } = useAuth();

  // Loading state
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

  // ✅ STEP 1.3: Extract user role for routing logic
  const role = currentUser?.role || currentUser?.user?.role;

  return (
    <Router>
      <Routes>

        {/* ---------- LOGIN PAGE WITH ROLE-BASED REDIRECT ---------- */}
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

        {/* ---------- ADMIN DASHBOARD SELECTOR ---------- */}
        <Route
          path="/admin/dashboard-selector"
          element={
            currentUser && role === "admin" ? (
              <DashboardSelectorGlass />
            ) : currentUser ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* ---------- GUEST ROOM DASHBOARD ---------- */}
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

        {/* ---------- HALL BOOKING DASHBOARD (PLACEHOLDER) ---------- */}
        <Route
          path="/hall/dashboard"
          element={
            currentUser && role === "assistant" ? (
              <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
                <div className="text-center p-12 bg-white rounded-3xl shadow-2xl border-2 border-red-200">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl flex items-center justify-center">
                    <span className="text-4xl">🎭</span>
                  </div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Hall Booking Dashboard
                  </h1>
                  <p className="text-xl text-gray-600 mb-2">Coming Soon</p>
                  <p className="text-sm text-gray-500">
                    This feature is currently under development
                  </p>
                </div>
              </div>
            ) : currentUser ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* ---------- GUEST ENQUIRY PAGE (PUBLIC) ---------- */}
        <Route
          path="/guest-enquiry"
          element={<GuestEnquiryPage />}
        />

        {/* ---------- FALLBACK ---------- */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </Router>
  );
}