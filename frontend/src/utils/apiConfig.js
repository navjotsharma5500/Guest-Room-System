// src/utils/apiConfig.js

/**
 * Get the backend API URL from environment variables
 * Uses REACT_APP_BACKEND_URL
 */
export const getBackendUrl = () => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }

  // 🚨 Do NOT silently fall back in production
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "❌ REACT_APP_BACKEND_URL is NOT set in production environment"
    );
  }

  // ✅ Development-only fallback
  console.warn("⚠️ Using localhost backend (development only)");
  return "http://localhost:10000";
};

// ✅ MAIN EXPORT
export const BACKEND_URL = getBackendUrl();

// ✅ LEGACY ALIASES
export const API_URL = BACKEND_URL;
export const getApiUrl = getBackendUrl;

// Debug log (safe)
console.log("🌐 Backend URL configured as:", BACKEND_URL);

// ✅ DEFAULT EXPORT (unchanged)
export default {
  BACKEND_URL,
  API_URL: BACKEND_URL,
  IMAGEKIT_URL_ENDPOINT: "https://ik.imagekit.io/7khjnlfow",
  IMAGEKIT_AUTH_ENDPOINT: `${BACKEND_URL}/api/imagekit/auth`,
};
