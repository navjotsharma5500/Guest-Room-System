// src/utils/apiConfig.js

/**
 * Get the backend API URL from environment variables
 * Uses REACT_APP_BACKEND_URL
 */
export const getBackendUrl = () => {
  // Check for REACT_APP_BACKEND_URL
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }

  // Fallback for development
  console.warn("⚠️ REACT_APP_BACKEND_URL not set, using localhost fallback");
  return 'http://localhost:10000';
};

// ✅ MAIN EXPORT - This is what everything should use
export const BACKEND_URL = getBackendUrl();

// ✅ LEGACY ALIASES - For backward compatibility
export const API_URL = BACKEND_URL;
export const getApiUrl = getBackendUrl;

// Log for debugging
console.log('🌐 Backend URL configured as:', BACKEND_URL);

// ✅ DEFAULT EXPORT
export default {
  BACKEND_URL,
  API_URL: BACKEND_URL,
  IMAGEKIT_URL_ENDPOINT: "https://ik.imagekit.io/7khjnlfow",
  IMAGEKIT_AUTH_ENDPOINT: `${BACKEND_URL}/api/imagekit/auth`,
};