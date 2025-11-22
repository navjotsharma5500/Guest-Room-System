// src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import GuestRoomDashboard from "./GuestRoomDashboard";
import GuestEnquiryPage from "./pages/GuestEnquiryPage";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  // Load user if already logged in
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("currentUser"));
    if (saved) setCurrentUser(saved);
  }, []);

  // When login success
  function handleLogin(user) {
    setCurrentUser(user);
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
              <Login onLogin={handleLogin} />
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

        {/* ---------- GUEST ENQUIRY PAGE (public) ---------- */}
        <Route path="/guest-enquiry" element={<GuestEnquiryPage />} />

        {/* ---------- CATCH-ALL ---------- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
