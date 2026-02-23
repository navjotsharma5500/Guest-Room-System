// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_URL } from "../utils/apiConfig";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// =============================
// AXIOS GLOBAL SETTINGS
// =============================
axios.defaults.withCredentials = true;
axios.defaults.baseURL = BACKEND_URL;

if (!axios.defaults.baseURL) {
  console.error("❌ CRITICAL: BACKEND_URL not set in environment variables!");
}

console.log("🔧 Axios Base URL:", axios.defaults.baseURL);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = BACKEND_URL;

  if (!API) {
    console.error("❌ CRITICAL: BACKEND_URL not set!");
  }

  console.log("🔧 Auth API URL:", API);

  // =======================================================
  // 🔥 LOAD LOGGED-IN USER FROM BACKEND (/me)
  // =======================================================
  useEffect(() => {
    async function loadUser() {
      try {
        console.log("🔍 Checking session with /me...");

        const res = await fetch(`${API}/api/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (res.status === 200) {
          const data = await res.json();
          console.log("🟢 Session found:", data.user);
          setCurrentUser(data.user);
        } else {
          console.log("🔴 No active session");
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("❌ Auth Load Error:", err);
        setCurrentUser(null);
      }

      setLoading(false);
    }

    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =======================================================
  // 🔥 LOGIN
  // =======================================================
  const login = async (email, password) => {
    try {
      console.log("🔵 Sending login request ...");

      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log("🔵 Login response:", data);
      console.log("🔵 Token in response?", data.token ? "YES ✅" : "NO ❌");

      if (res.ok) {
        setCurrentUser(data.user);
        if (data.token) {
          localStorage.setItem("token", data.token);
          console.log("✅ Token stored in localStorage (length:", data.token.length, ")");
          console.log("🔐 Verification - can retrieve token?", localStorage.getItem("token") ? "YES ✅" : "NO ❌");
        } else {
          console.warn("⚠️ No token in response, checking cookies only");
        }
      }

      return data;
    } catch (err) {
      console.error("❌ Login error:", err);
      return { success: false, message: "Server error" };
    }
  };

  // =======================================================
  // 🔥 GOOGLE LOGIN
  // =======================================================
  const googleLogin = async (token) => {
    try {
      const res = await fetch(`${API}/api/auth/google`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        if (data.token) localStorage.setItem("token", data.token);
      }
      return data;
    } catch (err) {
      return { success: false, message: "Server error" };
    }
  };

  // =======================================================
  // 🔥 LOGOUT
  // =======================================================
  const logout = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.warn("Logout error:", err);
    }

    setCurrentUser(null);
    localStorage.removeItem("token");
  };

  // =======================================================
  // 🌙 NIGHT PERMISSIONS — Role Helper Functions
  // Used by night permissions pages via useAuth()
  // =======================================================
  const getRole = () => (currentUser?.role || "").toLowerCase();

  const isAdosa     = () => ["adosa", "admin"].includes(getRole());
  const isPresident = () => ["president", "adosa", "admin"].includes(getRole());
  const isGenSec    = () => ["gen_sec", "president", "adosa", "admin"].includes(getRole());
  const canScan     = () => ["caretaker", "guard", "adosa", "admin"].includes(getRole());

  // `user` alias — night perms pages destructure `user`, not `currentUser`
  const user = currentUser;

  return (
    <AuthContext.Provider
      value={{
        // ── Core auth ──────────────────────────────────────
        currentUser,
        user,
        loading,
        login,
        googleLogin,
        logout,
        // ── 🌙 Night permissions role helpers ──────────────
        isAdosa,
        isPresident,
        isGenSec,
        canScan,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};