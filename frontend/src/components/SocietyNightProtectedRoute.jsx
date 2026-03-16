import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchSocietyNightMe } from "../utils/societyNightPassApi";
import {
  clearSocietyNightPassSession,
  getSocietyNightPassToken,
  getStoredSocietyNightStudent,
} from "../utils/societyNightPassAuth";

const STAFF_ROUTE_BY_ROLE = {
  admin: "/night-pass",
  adosa: "/night-pass",
  caretaker: "/night-pass/scan",
  guard: "/night-pass/scan",
  gen_sec: "/night-pass/review",
  president: "/night-pass/review",
};

const resolveStaffRedirect = (role) => STAFF_ROUTE_BY_ROLE[(role || "").toLowerCase()] || "/";

export default function SocietyNightProtectedRoute({ children }) {
  const location = useLocation();
  const { currentUser, loading } = useAuth();
  const [status, setStatus] = useState("checking");
  const token = getSocietyNightPassToken();
  const storedStudentId = getStoredSocietyNightStudent()?.id || "";
  const mainRole = (currentUser?.night?.role || currentUser?.role || "").toLowerCase();

  const redirectTo = useMemo(() => {
    if (mainRole && mainRole !== "student") {
      return resolveStaffRedirect(mainRole);
    }
    return "/society-night-pass";
  }, [mainRole]);

  useEffect(() => {
    let active = true;

    if (loading) return undefined;

    if (mainRole && mainRole !== "student") {
      setStatus("staff");
      return undefined;
    }

    if (!token || !storedStudentId) {
      clearSocietyNightPassSession();
      setStatus("unauthorized");
      return undefined;
    }

    setStatus("checking");

    fetchSocietyNightMe()
      .then(() => {
        if (active) setStatus("authorized");
      })
      .catch(() => {
        clearSocietyNightPassSession();
        if (active) setStatus("unauthorized");
      });

    return () => {
      active = false;
    };
  }, [loading, mainRole, storedStudentId, token]);

  if (loading || status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#fff7ed_0%,_#f8fafc_50%,_#eef2ff_100%)] px-4">
        <div className="rounded-3xl border border-white/80 bg-white/90 px-8 py-6 text-center shadow-[0_24px_64px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-700">Validating student session...</p>
        </div>
      </main>
    );
  }

  if (status === "staff") {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (status !== "authorized") {
    return <Navigate to="/society-night-pass" replace state={{ from: location }} />;
  }

  return children;
}
