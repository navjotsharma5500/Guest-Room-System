// ============================================================================
//  API CONFIG + DEBUG
// ============================================================================

//  USE CENTRALIZED API CONFIG
import { BACKEND_URL } from './apiConfig';

//console.log("%c[API CONFIG DEBUG]", "color:#e91e63;font-weight:bold;");
//console.log("BACKEND_URL from apiConfig =", BACKEND_URL);

// Export both names for backward compatibility
export const API = BACKEND_URL;
export { BACKEND_URL };

//console.log("Final API Used =", API);

// ============================================================================
// AUTH
// ============================================================================
export const apiLogin = async (email, password) => {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
};

export const apiGetMe = async () => {
  const res = await fetch(`${API}/api/auth/me`, { credentials: "include" });
  return res.json();
};

export const apiLogout = async () => {
  return fetch(`${API}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
};

// ============================================================================
// HOSTELS + BOOKINGS  (BACKEND-DRIVEN DATA)
// ============================================================================
export const apiFetchHostels = async () => {
  try {
    console.log(`ðŸ“¡ Fetching hostels from: ${API}/api/hostels/all`);
    
    const res = await fetch(`${API}/api/hostels/all`, {
      credentials: "include",
    });

    if (!res.ok) {
      console.error("âŒ Failed to fetch hostels:", res.statusText);
      return { success: false, hostels: [] };
    }

    const data = await res.json();
    console.log("ðŸ¨ Hostels API Response:", data);
    return data; // { success, hostels }
  } catch (err) {
    console.error("ðŸ”¥ Hostels fetch error:", err);
    return { success: false, hostels: [] };
  }
};

/* ----------------------------------------------------------------------------
   BOOKINGS â€“ FIXED + NORMALIZED (IMPORTANT)
---------------------------------------------------------------------------- */
export const apiFetchBookings = async () => {
  try {
    console.log(`ðŸš€ Calling ${API}/api/bookings/all`);

    const res = await fetch(`${API}/api/bookings/all`, {
      credentials: "include",
    });

    console.log("ðŸ” Response status:", res.status);

    let data;
    try {
      data = await res.json();
    } catch (err) {
      console.error("âŒ JSON parse error:", err);
      return { success: false, hostels: [] };
    }

    console.log("ðŸ“˜ REAL backend bookings response:", data);

    // If backend returned object â†’ convert to array
    let bookingHostels = data.hostels;
    if (bookingHostels && !Array.isArray(bookingHostels)) {
      bookingHostels = Object.values(bookingHostels);
    }

    console.log("ðŸ“˜ FINAL RETURN from apiFetchBookings():", {
      success: data.success,
      hostels: bookingHostels,
    });

    return {
      success: data.success,
      hostels: bookingHostels,
    };

  } catch (err) {
    console.error("ðŸ”¥ Error fetching bookings:", err);
    return { success: false, hostels: [] };
  }
};

// Fetch ALL bookings for download (including cancelled)
export const apiFetchAllBookingsForDownload = async () => {
  try {
    console.log(`ðŸš€ Calling ${API}/api/bookings/all-for-download`);

    const token = localStorage.getItem("token");
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API}/api/bookings/all-for-download`, {
      credentials: "include",
      headers,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch bookings: ${res.status}`);
    }

    const data = await res.json();

    // If backend returned object â†’ convert to array
    let bookingHostels = data.hostels;
    if (bookingHostels && !Array.isArray(bookingHostels)) {
      bookingHostels = Object.values(bookingHostels);
    }

    return {
      success: data.success,
      hostels: bookingHostels,
    };

  } catch (err) {
    console.error("ðŸ”¥ Error fetching all bookings for download:", err);
    return { success: false, hostels: [] };
  }
};

// ============================================================================
// BOOKINGS (Create / Extend / Cancel)
// ============================================================================
export const apiCreateBooking = async (data) => {
  const res = await fetch(`${API}/api/bookings`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const apiCancelBooking = async (bookingId, remarks) => {
  const res = await fetch(`${API}/api/bookings/${bookingId}/cancel`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ remarks }),
  });
  return res.json();
};

export const apiExtendBooking = async (bookingId, newTo) => {
  const res = await fetch(`${API}/api/bookings/${bookingId}/extend`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newTo }),
  });
  return res.json();
};

// ============================================================================
// ENQUIRIES
// ============================================================================
export const apiCreateEnquiry = async (data) => {
  const res = await fetch(`${API}/api/enquiry/create`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const apiGetEnquiries = async () => {
  const res = await fetch(`${API}/api/enquiry`, { credentials: "include" });
  return res.json();
};

export const apiApproveEnquiry = async (id) => {
  const res = await fetch(`${API}/api/enquiry/${id}/approved`, {
    method: "PUT",
    credentials: "include",
  });
  return res.json();
};

export const apiRejectEnquiry = async (id) => {
  const res = await fetch(`${API}/api/enquiry/${id}/rejected`, {
    method: "PUT",
    credentials: "include",
  });
  return res.json();
};

// ============================================================================
// IMAGEKIT React SDK USES IKUpload, NOT JS SDK
// ============================================================================
export const IMAGEKIT_PUBLIC_KEY =
  process.env.REACT_APP_IMAGEKIT_PUBLIC_KEY || "";

export const IMAGEKIT_URL_ENDPOINT =
  process.env.REACT_APP_IMAGEKIT_URL_ENDPOINT || "";

export const IMAGEKIT_AUTH_ENDPOINT = `${API}/api/imagekit/auth`;

//console.log("%c[IMAGEKIT CONFIG]", "color:#4caf50;font-weight:bold;");
//console.log("publicKey =", IMAGEKIT_PUBLIC_KEY);
//console.log("urlEndpoint =", IMAGEKIT_URL_ENDPOINT);
//console.log("Auth Endpoint =", IMAGEKIT_AUTH_ENDPOINT);

// ============================================================================
//  Fetch enquiries (used in MainContent.jsx)
// ============================================================================
export const fetchEnquiries = async () => {
  try {
    console.log(`ðŸ“„ Fetching enquiries from: ${API}/api/enquiry`);

    const headers = { "Content-Type": "application/json" };
    const token = localStorage.getItem("token");

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API}/api/enquiry`, {
      method: "GET",
      credentials: "include",
      headers,
    });

    if (!res.ok) {
      console.error("âŒ Failed to fetch enquiries:", res.status);
      return [];
    }

    const data = await res.json();
    console.log("âœ… Raw API Response:", data);

    return data.enquiries || [];

  } catch (err) {
    console.error("âŒ Fetch enquiries error:", err);
    return [];
  }
};

// ============================================================================
// Direct Booking 
// ============================================================================
export const apiCreateDirectBooking = async (data) => {
  const res = await fetch(`${API}/api/bookings`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Failed to create booking");
  }

  return res.json();
};

// ============================================================================
// END OF FILE
// ============================================================================