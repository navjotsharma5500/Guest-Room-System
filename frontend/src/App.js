// src/App.js - FINAL STABLE VERSION (NO SOCKET.IO)
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
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

  return (
    <Router>
      <Routes>

        {/* ---------- LOGIN PAGE ---------- */}
        <Route
          path="/"
          element={
            currentUser ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login />
            )
          }
        />

        {/* ---------- DASHBOARD ---------- */}
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
