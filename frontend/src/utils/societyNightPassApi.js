import { BACKEND_URL } from "./apiConfig";
import {
  clearSocietyNightPassSession,
  getSocietyNightPassToken,
  setSocietyNightPassSession,
} from "./societyNightPassAuth";

const jsonHeaders = (withAuth = false) => {
  const headers = { "Content-Type": "application/json" };
  if (withAuth) {
    const token = getSocietyNightPassToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const parseResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    const error = new Error(data?.message || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
};

export const societyNightGoogleLogin = async (payload) => {
  const res = await fetch(`${BACKEND_URL}/api/society-night-pass/google-login`, {
    method: "POST",
    headers: jsonHeaders(false),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(res);
  setSocietyNightPassSession({ token: data.token, student: data.student });
  return data;
};

export const fetchSocietyNightMe = async () => {
  const res = await fetch(`${BACKEND_URL}/api/society-night-pass/me`, {
    method: "GET",
    headers: jsonHeaders(true),
  });
  const data = await parseResponse(res);
  setSocietyNightPassSession({ token: getSocietyNightPassToken(), student: data.student });
  return data;
};

export const fetchSocietyNightRequests = async () => {
  const res = await fetch(`${BACKEND_URL}/api/society-night-pass/requests`, {
    method: "GET",
    headers: jsonHeaders(true),
  });
  return parseResponse(res);
};

export const fetchSocietyNightCurrentSession = async () => {
  const res = await fetch(`${BACKEND_URL}/api/society-night-pass/current-session`, {
    method: "GET",
    headers: jsonHeaders(true),
  });
  return parseResponse(res);
};

export const createSocietyNightRequest = async (payload) => {
  const res = await fetch(`${BACKEND_URL}/api/society-night-pass/requests`, {
    method: "POST",
    headers: jsonHeaders(true),
    body: JSON.stringify(payload),
  });
  return parseResponse(res);
};

export const fetchSocietyNameSuggestions = async (query = "", limit = 12) => {
  const res = await fetch(
    `${BACKEND_URL}/api/venue/enquiry/society-suggestions?query=${encodeURIComponent(query)}&limit=${limit}`,
    {
      method: "GET",
      headers: jsonHeaders(false),
    }
  );
  return parseResponse(res);
};

export const handleSocietyNightAuthError = (error) => {
  if (error?.status === 401) {
    clearSocietyNightPassSession();
  }
  throw error;
};
