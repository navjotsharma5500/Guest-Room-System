// src/utils/apiConfig.js

export const getBackendUrl = () => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }

  console.warn("⚠️ REACT_APP_BACKEND_URL not set, using localhost fallback");
  return "http://localhost:10000";
};

export const BACKEND_URL = getBackendUrl();

// ============================================================================
// FRONTEND / PUBLIC URL CONFIG (for QR, public pages, emails)
// ============================================================================

export const getFrontendUrl = () => {
  if (process.env.REACT_APP_FRONTEND_URL) {
    return process.env.REACT_APP_FRONTEND_URL;
  }

  console.warn("⚠️ REACT_APP_FRONTEND_URL not set, using window.location.origin");
  return window.location.origin;
};

export const FRONTEND_URL = getFrontendUrl();

// Public guest feedback route
export const GUEST_FEEDBACK_PATH = "/guest-feedback";

// Full public feedback URL (used for QR codes, emails, etc.)
export const GUEST_FEEDBACK_URL = `${FRONTEND_URL}${GUEST_FEEDBACK_PATH}`;

// ✅ ImageKit Configuration - ALL from environment variables
export const IMAGEKIT_PUBLIC_KEY = 
  process.env.REACT_APP_IMAGEKIT_PUBLIC_KEY || "";

export const IMAGEKIT_URL_ENDPOINT = 
  process.env.REACT_APP_IMAGEKIT_URL_ENDPOINT || "";

export const IMAGEKIT_AUTH_ENDPOINT = `${BACKEND_URL}/api/imagekit/auth`;

// Validation
if (!IMAGEKIT_PUBLIC_KEY) {
  console.error("❌ REACT_APP_IMAGEKIT_PUBLIC_KEY is not set in .env file!");
}

if (!IMAGEKIT_URL_ENDPOINT) {
  console.error("❌ REACT_APP_IMAGEKIT_URL_ENDPOINT is not set in .env file!");
}

// Legacy aliases
export const API_URL = BACKEND_URL;
export const getApiUrl = getBackendUrl;

// Debug
//console.log("🌐 Backend URL configured as:", BACKEND_URL);
//console.log("🌍 Frontend URL configured as:", FRONTEND_URL);
//console.log("📢 Guest Feedback URL:", GUEST_FEEDBACK_URL);

export default {
  BACKEND_URL,
  API_URL: BACKEND_URL,
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
  IMAGEKIT_AUTH_ENDPOINT,
  FRONTEND_URL,
  GUEST_FEEDBACK_URL,
};