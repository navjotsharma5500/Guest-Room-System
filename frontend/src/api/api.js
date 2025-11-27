import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

// ------------------------------
// Create axios instance
// ------------------------------
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ------------------------------
// AUTH (Login, Get User etc.)
// ------------------------------
export const loginUser = (data) => api.post("/auth/login", data);
export const getCurrentUser = () => api.get("/auth/me");

// ------------------------------
// ENQUIRIES
// ------------------------------
export const getEnquiries = () => api.get("/enquiry");
export const submitEnquiry = (data) => api.post("/enquiry", data);
export const updateEnquiryStatus = (id, status) =>
  api.put(`/enquiry/${id}`, { status });

// ------------------------------
// HOSTELS
// ------------------------------
export const getHostels = () => api.get("/hostels");
export const addHostel = (data) => api.post("/hostels", data);

// ------------------------------
// BOOKINGS
// ------------------------------
export const createBooking = (hostel, roomNo, data) =>
  api.post(`/booking/${hostel}/${roomNo}`, data);

export const cancelBookingAPI = (hostel, roomNo, bookingId, remarks) =>
  api.post(`/booking/${hostel}/${roomNo}/cancel`, { bookingId, remarks });

export const extendBooking = (hostel, roomNo, bookingId, newToDate) =>
  api.post(`/booking/${hostel}/${roomNo}/extend`, {
    bookingId,
    newToDate,
  });

// ------------------------------
// EXPORT THE CLIENT
// ------------------------------
export default api;
