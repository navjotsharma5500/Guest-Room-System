// src/App.js - FINAL VERSION WITH STRICT ROLE-BASED ROUTING
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
import HallBookingDashboard from "./pages/HallBookingDashboard";
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

  // ✅ Extract role safely
  const role = currentUser?.role || currentUser?.user?.role;

  return (
    <Router>
      <Routes>

        {/* ---------- LOGIN + AUTO REDIRECT ---------- */}
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
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* ---------- GUEST ROOM DASHBOARD ---------- */}
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

        {/* ---------- HALL BOOKING DASHBOARD ---------- */}
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

        {/* ---------- GUEST ENQUIRY (PUBLIC) ---------- */}
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
