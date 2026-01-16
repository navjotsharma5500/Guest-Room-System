// src/utils/apiConfig.js

export const getBackendUrl = () => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }

  console.warn("⚠️ REACT_APP_BACKEND_URL not set, using localhost fallback");
  return "http://localhost:10000";
};

export const BACKEND_URL = getBackendUrl();

// ✅ ImageKit NAMED EXPORTS (THIS IS WHAT WAS MISSING)
export const IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/7khjnlfow";
export const IMAGEKIT_AUTH_ENDPOINT = `${BACKEND_URL}/api/imagekit/auth`;

// Legacy aliases
export const API_URL = BACKEND_URL;
export const getApiUrl = getBackendUrl;

// Debug
console.log("🌐 Backend URL configured as:", BACKEND_URL);

// Default export (optional but harmless)
export default {
  BACKEND_URL,
  API_URL: BACKEND_URL,
  IMAGEKIT_URL_ENDPOINT,
  IMAGEKIT_AUTH_ENDPOINT,
};
