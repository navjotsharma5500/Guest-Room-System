// src/utils/apiConfig.js

export const getBackendUrl = () => {
  return ""; // always same domain
};

export const BACKEND_URL = getBackendUrl();

// ============================================================================
// FRONTEND / PUBLIC URL CONFIG (for QR, public pages, emails)
// ============================================================================

export const getFrontendUrl = () => {
  if (process.env.REACT_APP_FRONTEND_URL) {
    return process.env.REACT_APP_FRONTEND_URL;
  }

  return window.location.origin;
};

export const FRONTEND_URL = getFrontendUrl();

// Public guest feedback route
export const GUEST_FEEDBACK_PATH = "/guest-feedback";

// Full public feedback URL (used for QR codes, emails, etc.)
export const GUEST_FEEDBACK_URL = `${FRONTEND_URL}${GUEST_FEEDBACK_PATH}`;

// ImageKit's public key and URL endpoint are safe to expose in a browser bundle.
// Keep deployment environment overrides, with production defaults so uploads do
// not break when a hosting platform builds the frontend without CRA env values.
export const IMAGEKIT_PUBLIC_KEY = 
  process.env.REACT_APP_IMAGEKIT_PUBLIC_KEY || "public_D/IvtqR075bhEwQyEOFWMa15N28=";

export const IMAGEKIT_URL_ENDPOINT = 
  process.env.REACT_APP_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/7khjnlfow";

export const IMAGEKIT_AUTH_ENDPOINT = `${BACKEND_URL}/api/imagekit/auth`;

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
