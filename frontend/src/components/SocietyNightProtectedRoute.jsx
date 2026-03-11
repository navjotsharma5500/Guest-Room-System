import React from "react";
import { Navigate } from "react-router-dom";
import { getSocietyNightPassToken } from "../utils/societyNightPassAuth";

export default function SocietyNightProtectedRoute({ children }) {
  const token = getSocietyNightPassToken();
  return token ? children : <Navigate to="/society-night-pass" replace />;
}
