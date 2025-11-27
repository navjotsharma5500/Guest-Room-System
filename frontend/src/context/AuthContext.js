// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = process.env.REACT_APP_API_URL || "https://guestroom-backend.onrender.com";

  // Load session from backend
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch(`${API}/api/auth/me`, {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch (e) {
        console.error("Auth load failed", e);
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  // LOGIN → Ask backend, store cookie
  const login = async (email, password) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      setCurrentUser(data.user);
    }

    return data;
  };

  // LOGOUT → Clear backend cookie
  const logout = async () => {
    await fetch(`${API}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
