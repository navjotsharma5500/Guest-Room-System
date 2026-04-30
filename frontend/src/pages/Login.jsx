// src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext.js";
import { User, Lock, LogIn, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

// Images
import logo from "../assets/thapar_logo.png";
import bg1 from "../assets/Login2 (1).png";
import bg2 from "../assets/Login2 (2).png";
import bg3 from "../assets/Login2 (3).png";
import bg4 from "../assets/Login2 (4).png";

export default function Login() {
  const { login, googleLogin } = useAuth();
  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  // STATES
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loadingBtn, setLoadingBtn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  // IMPORTANT: This must stay in sync with getLoginRedirect() in App.js
  const resolveRedirectPath = (userData) => {
    const userRole = (userData?.role || "").toLowerCase();
    const userEmail = (userData?.email || "").toLowerCase();
    const permissions = userData?.permissions || {};

    // 1️⃣ Keep existing adosa2 behavior unchanged
    if (userEmail === "adosa2@thapar.edu") return "/dashboard";

    // 2️⃣ adosa3 override
    if (userEmail === "adosa3@thapar.edu") return "/venue-booking";

    // 3️⃣ Caretaker override
    if (userRole === "caretaker") return "/dashboard";

    // 4️⃣ Guard → Scan page
    if (userRole === "guard") return "/night-pass/scan";

    // 5️⃣ GuestRoom-only permission
    if (permissions.guestRoom && !permissions.venue && !permissions.night) return "/dashboard";

    // 6️⃣ GuestRoom direct roles
    if (["manager", "warden", "co_warden"].includes(userRole)) return "/dashboard";

    // 7️⃣ Student → Society Night Pass portal
    if (userRole === "student") return "/society-night-pass";

    // 8️⃣ Night-only roles (Gen Sec / President) → Night Pass dashboard
    if (["gen_sec", "president"].includes(userRole)) return "/night-pass";

    // 9️⃣ DD Assistant → Venue Booking
    if (userRole === "dd_assistant") return "/venue-booking";

    // 🔟 Admin / ADOSA / assistant → Dashboard selector
    if (["admin", "adosa", "assistant"].includes(userRole)) return "/admin/dashboard-selector";

    // 1️⃣1️⃣ Backend-provided redirect hint, if any
    if (userData?.redirectTo) return userData.redirectTo;

    // 1️⃣2️⃣ Fallback to login/public selector
    return "/";
  };

  // SLIDESHOW
  const backgrounds = [bg1, bg2, bg3, bg4];
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % backgrounds.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // VALIDATION
  const validate = () => {
    if (!email.trim() || !password.trim()) {
      setError("Enter email and password.");
      return false;
    }
    return true;
  };

  // =================================================
  // 🔥 LOGIN HANDLER
  // =================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setLoadingBtn(true);

    const res = await login(email.trim(), password);

    if (!res.success) {
      // ✅ NEW: redirect to /access-required for system-access errors
      if (res.code === "NO_SYSTEM_ACCESS" || res.code === "STUDENT_DEFAULTER") {
        navigate("/access-required", {
          state: { code: res.code, message: res.message },
        });
        return; // don't reset loadingBtn — we're navigating away
      }

      // All other errors (wrong password, user not found, etc.) show inline
      setError(res.message || "Invalid credentials");
      setLoadingBtn(false);
      return;
    }

    window.location.href = resolveRedirectPath(res.user);
  };

  // =================================================
  // 🌐 GOOGLE LOGIN HANDLER
  // =================================================
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoadingBtn(true);
    const res = await googleLogin(credentialResponse.credential);

    if (!res.success) {
      // ✅ NEW: same access-required redirect for Google login
      if (res.code === "NO_SYSTEM_ACCESS" || res.code === "STUDENT_DEFAULTER") {
        navigate("/access-required", {
          state: { code: res.code, message: res.message },
        });
        return;
      }

      setError(res.message || "Google Login Failed");
      setLoadingBtn(false);
      return;
    }

    window.location.href = resolveRedirectPath(res.user);
  };

  const handleGoogleError = () => {
    setError("Google Login Failed. Please try again.");
    setLoadingBtn(false);
  };

  // =================================================
  // TEMP FORGOT PASSWORD UI (NO BACKEND)
  // =================================================
  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      setForgotError("Enter your registered email");
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setForgotSuccess(`A reset link has been sent to your email (${forgotEmail}).`);
        setForgotError("");
      } else {
        setForgotError(data.message || "Failed to send reset link.");
      }
    } catch (error) {
      setForgotError("Something went wrong. Please try again.");
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
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

      {/* DARK AESTHETIC */}
      <div className="absolute inset-0 bg-black/20"></div>

      {/* LOGIN CARD */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="
          glass-card
          relative z-10 
          bg-white/15 backdrop-blur-3xl
          border border-white/20 
          shadow-2xl
          w-full max-w-md rounded-3xl p-8
        "
      >
        {/* LOGO */}
        <div className="flex flex-col items-center mb-6">
          <div className="p-4 rounded-full bg-white/10 backdrop-blur-xl">
            <img src={logo} alt="Thapar Logo" className="w-40" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-2 drop-shadow-lg tracking-wide">
            TIET Apps Dashboard
          </h1>
        </div>

        {/* FORM START */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* EMAIL */}
          <div className="text-white">
            <label className="text-sm font-semibold drop-shadow">Email</label>
            <input
              type="email"
              className="
                w-full px-4 py-3 mt-1
                bg-white/10 border border-white/20
                rounded-xl text-black placeholder-gray-500
                backdrop-blur-md
                focus:outline-none focus:ring-2 focus:ring-red-400/60
              "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* PASSWORD */}
          <div className="text-white">
            <label className="text-sm font-semibold drop-shadow">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="
                  w-full px-4 py-3 mt-1
                  bg-white/10 border border-white/20
                  rounded-xl text-black placeholder-gray-500
                  backdrop-blur-md
                  pr-10
                "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-4 text-gray-200 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* ALWAYS LOGIN */}
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
            <div className="p-3 bg-red-600/30 text-white rounded-lg text-sm border border-red-400/40">
              {error}
            </div>
          )}

          {/* LOGIN BUTTON */}
          <button
            className="
              w-full py-3 rounded-xl
              text-white font-semibold text-lg
              bg-gradient-to-r from-red-600 to-red-500
              shadow-xl hover:shadow-2xl transition
            "
            disabled={loadingBtn}
          >
            {loadingBtn ? "Logging in..." : "Login"}
          </button>

          {/* DIVIDER */}
          <div className="flex items-center gap-2">
            <div className="h-px bg-white/20 flex-1"></div>
            <span className="text-white/60 text-sm">OR</span>
            <div className="h-px bg-white/20 flex-1"></div>
          </div>

          {/* GOOGLE LOGIN */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_blue"
              shape="pill"
              text="signin_with"
              size="large"
              width="300" 
            />
          </div>

          {/* FORGOT PASSWORD / CHANGE PASSWORD */}
          <div className="text-center mt-2">
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-white/70 hover:text-white text-sm underline transition"
            >
              Forgot / Change Password?
            </button>
          </div>

          {/* QUICK LINKS REMOVED */}
        </form>

        {/* FOOTER CREDIT */}
        <div className="mt-8 text-center">
            <p className="text-white/60 text-xs font-light">
                Created and Maintained by <span className="font-medium text-white/80">DoSA Office</span>
            </p>
            <div className="mt-1 text-white/40 text-[10px]">
                Crafted by DoSA Office
            </div>
        </div>
      </motion.div>

      {/* FORGOT PASSWORD MODAL */}
      <AnimatePresence>
        {forgotOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.7 }}
              className="bg-white/20 backdrop-blur-xl border border-white/30 w-full max-w-md p-6 rounded-2xl shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white mb-4">Reset Password</h2>

              <label className="text-white text-sm">Registered Email</label>
              <input
                className="
                  w-full px-4 py-2 mt-1 mb-3
                  bg-white/20 border border-white/30
                  text-white rounded-lg backdrop-blur-lg
                "
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />

              {forgotError && (
                <div className="p-2 bg-red-500/30 border border-red-300 text-white rounded mb-2 text-sm">
                  {forgotError}
                </div>
              )}

              {forgotSuccess && (
                <div className="p-2 bg-green-500/30 border border-green-300 text-white rounded mb-2 text-sm">
                  {forgotSuccess}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setForgotOpen(false)}
                  className="px-4 py-2 bg-gray-200/30 text-white rounded-lg"
                >
                  Close
                </button>
                <button
                  onClick={handleForgotPassword}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
    </GoogleOAuthProvider>
  );
}
