// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
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

//console.log("🔧 Axios Base URL:", axios.defaults.baseURL);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = BACKEND_URL;

  if (!API) {
    console.error("❌ CRITICAL: BACKEND_URL not set!");
  }

  //console.log("🔧 Auth API URL:", API);

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
          //console.log("🟢 Session found:", data.user);
          setCurrentUser(data.user);
        } else {
          //console.log("🔴 No active session");
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
      //console.log("🔵 Sending login request ...");

      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 404) {
        console.error("❌ Login endpoint not found:", `${API}/api/auth/login`);
        return {
          success: false,
          message: "Login is not available: backend route /api/auth/login returned 404.",
        };
      }

      const data = await res.json().catch(() => null);
      //console.log("🔵 Login response:", data);
      //console.log("🔵 Token in response?", data.token ? "YES ✅" : "NO ❌");

      // ✅ FIXED: use `data` not `res.data` (this is fetch, not axios)
      if (!data?.success) {
        return {
          success: false,
          code: data?.code,
          message: data?.message || "Login failed",
        };
      }

      // Login succeeded — store user and token
      setCurrentUser(data.user);
      if (data.token) {
        localStorage.setItem("token", data.token);
        //console.log("✅ Token stored in localStorage (length:", data.token.length, ")");
      } else {
        //console.warn("⚠️ No token in response, checking cookies only");
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
      const candidateUrls = [
        `${API}/api/auth/google`,
        `${API}/api/auth/google-login`,
      ];

      for (const url of candidateUrls) {
        const res = await fetch(url, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (res.status === 404) {
          console.warn("⚠️ Google login endpoint not found:", url);
          continue;
        }

        if (res.status === 401 || res.status === 403) {
          const errData = await res.json().catch(() => null);
          return {
            success: false,
            code: errData?.code,
            message:
              errData?.message ||
              "Unauthorized. Please verify backend session/cors and try again.",
          };
        }

        const data = await res.json().catch(() => null);

        if (!data?.success) {
          return {
            success: false,
            code: data?.code,
            message: data?.message || "Google Login Failed",
          };
        }

        setCurrentUser(data.user);
        if (data.token) localStorage.setItem("token", data.token);

        return data;
      }

      console.error("❌ Google login endpoint not found on any known auth route:", candidateUrls);
      return {
        success: false,
        message:
          "Google login is not available: backend routes /api/auth/google and /api/auth/google-login returned 404.",
      };

    } catch (err) {
      console.error("❌ Google login error:", err);
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
  // Memoized to prevent unstable context value
  // =======================================================
  const getNightRole = useCallback(() => (currentUser?.night?.role || "").toLowerCase(), [currentUser]);

  const isAdosa     = useCallback(() => ["adosa", "admin"].includes(getNightRole()), [getNightRole]);
  const isPresident = useCallback(() => ["president", "adosa", "admin"].includes(getNightRole()), [getNightRole]);
  const isGenSec    = useCallback(() => ["gen_sec", "president", "adosa", "admin"].includes(getNightRole()), [getNightRole]);
  const canScan     = useCallback(() => ["caretaker", "guard", "adosa", "admin"].includes(getNightRole()), [getNightRole]);

  // `user` alias
  const user = currentUser;

  const value = useMemo(() => ({
    currentUser,
    user,
    loading,
    login,
    googleLogin,
    logout,
    isAdosa,
    isPresident,
    isGenSec,
    canScan,
  }), [currentUser, user, loading, login, googleLogin, logout, isAdosa, isPresident, isGenSec, canScan]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
