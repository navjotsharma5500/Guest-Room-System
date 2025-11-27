// ================== NEW BACKEND LOGIN (FULL FILE) =====================
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext.js";

// Images
import logo from "../assets/thapar_logo.png";
import bg1 from "../assets/Login2 (1).png";
import bg2 from "../assets/Login2 (2).png";
import bg3 from "../assets/Login2 (3).png";
import bg4 from "../assets/Login2 (4).png";

const API = "https://guestroom-backend.onrender.com";

export default function Login() {
  const { login } = useAuth();

  // STATES
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password UI (kept for design, but non-functional)
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  // SLIDESHOW
  const backgrounds = [bg1, bg2, bg3, bg4];
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % backgrounds.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // FIELD VALIDATION
  const validate = () => {
    if (!email.trim() || !password.trim()) {
      setError("Enter email and password.");
      return false;
    }
    return true;
  };

  // ============================
  // 🎯 BACKEND LOGIN HANDLER
  // ============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid login credentials");
        return;
      }

      // 🔥 FIXED: backend does NOT send data.user anymore.
      const user = {
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        assignedHostel: data.assignedHostel,
        token: data.token,
      };
      
      // Save session
      if (rememberMe) {
        localStorage.setItem("currentUser", JSON.stringify(user));
      } else {
        sessionStorage.setItem("currentUser", JSON.stringify(user));
      }

      login(user);

      // 🔥 redirect
      window.location.href = "/dashboard";

    } catch (err) {
      console.error(err);
      setError("Server error. Try again later.");
    }
  };

  // ============================
  // ❗ FORGOT PASSWORD PLACEHOLDER
  // ============================
  const handleForgotPassword = () => {
    setForgotError("This feature will be available soon.");
    setForgotSuccess("");
  };

  // ============================
  // UI BELOW (UNCHANGED)
  // ============================
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* BACKGROUND SLIDESHOW */}
      <AnimatePresence mode="wait">
        <motion.img
          key={bgIndex}
          src={backgrounds[bgIndex]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4 }}
          className="absolute inset-0 w-full h-full object-cover bg-zoom"
        />
      </AnimatePresence>

      {/* SOFT FLOATING ORBS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-72 h-72 bg-red-500/20 rounded-full blur-3xl"
          style={{ top: "20%", left: "10%", animation: "floatOrb 12s ease-in-out infinite" }} />
        <div className="absolute w-64 h-64 bg-orange-400/20 rounded-full blur-3xl"
          style={{ bottom: "18%", right: "12%", animation: "floatOrb 14s ease-in-out infinite" }} />
        <div className="absolute w-96 h-96 bg-yellow-300/10 rounded-full blur-3xl"
          style={{ top: "40%", right: "30%", animation: "floatOrb 20s linear infinite" }} />
      </div>

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/20"></div>

      {/* LOGIN CARD */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="glass-card relative z-10 bg-white/15 backdrop-blur-3xl border border-white/20 shadow-2xl w-full max-w-md rounded-3xl p-8"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="p-4 rounded-full bg-white/10 backdrop-blur-xl">
            <img src={logo} alt="Logo" className="w-40" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-2">Hostel Guest Room App</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* EMAIL */}
          <div className="text-white">
            <label className="text-sm font-semibold">Email</label>
            <input
              type="email"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* PASSWORD */}
          <div className="text-white">
            <label className="text-sm font-semibold">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-4 text-gray-200"
              >
                👁
              </button>
            </div>
          </div>

          {/* REMEMBER ME */}
          <label className="flex items-center gap-2 text-white text-sm">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
            />
            Always Login
          </label>

          {/* ERROR */}
          {error && (
            <div className="p-3 bg-red-600/30 text-white rounded-lg border border-red-400/40">
              {error}
            </div>
          )}

          {/* LOGIN BUTTON */}
          <button className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-red-600 to-red-500">
            Login
          </button>

          <div className="flex justify-between text-sm text-white/90">
            <button type="button" onClick={() => setForgotOpen(true)} className="hover:underline">
              Forgot Password?
            </button>
            <button type="button" className="hover:underline">
              Support
            </button>
          </div>
        </form>
      </motion.div>

      {/* FORGOT PASSWORD MODAL */}
      <AnimatePresence>
        {forgotOpen && (
          <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
            <motion.div className="bg-white/20 backdrop-blur-xl border border-white/30 w-full max-w-md p-6 rounded-2xl shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Reset Password</h2>

              <label className="text-white text-sm">Registered Email</label>
              <input
                className="w-full px-4 py-2 bg-white/20 border border-white/30 text-white rounded-lg"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />

              {forgotError && <div className="p-2 bg-red-500/30 border border-red-300 text-white rounded mb-2">{forgotError}</div>}
              {forgotSuccess && <div className="p-2 bg-green-500/30 border border-green-300 text-white rounded mb-2">{forgotSuccess}</div>}

              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setForgotOpen(false)} className="px-4 py-2 bg-gray-200/30 text-white rounded-lg">
                  Close
                </button>
                <button onClick={handleForgotPassword} className="px-4 py-2 bg-red-600 text-white rounded-lg shadow">
                  Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
