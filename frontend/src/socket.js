// frontend/src/socket.js
import { io } from "socket.io-client";
import { BACKEND_URL } from "./utils/apiConfig";

//console.log("🔌 Initializing Socket.IO with URL:", BACKEND_URL);

export const socket = io("/", {
  autoConnect: true,
  withCredentials: true,
  reconnection: true,
  reconnectionDelay: 500, // ✅ CHANGED: 1000ms → 500ms (faster reconnection)
  reconnectionDelayMax: 3000, // ✅ CHANGED: 5000ms → 3000ms (faster max delay)
  reconnectionAttempts: Infinity,
  timeout: 3000, // ✅ NEW: 3-second timeout for faster detection
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("✅ Socket.IO connected:", socket.id);
  socket.emit("join-dashboard");
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket.IO disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error("🔴 Socket.IO connection error:", error.message);
});

socket.on("connection-confirmed", (data) => {
  console.log("✅ Dashboard connection confirmed:", data);
});

// Booking events
socket.on("booking-created", (data) => {
  window.dispatchEvent(new CustomEvent("bookingCreated", { detail: data }));
});

socket.on("booking-cancelled", (data) => {
  window.dispatchEvent(new CustomEvent("bookingCancelled", { detail: data }));
});

socket.on("booking-extended", (data) => {
  window.dispatchEvent(new CustomEvent("bookingExtended", { detail: data }));
});

socket.on("payment-updated", (data) => {
  window.dispatchEvent(new CustomEvent("paymentUpdated", { detail: data }));
});

socket.on("payment-processed", (data) => {
  window.dispatchEvent(new CustomEvent("paymentProcessed", { detail: data }));
});

socket.on("guest-reported", (data) => {
  window.dispatchEvent(new CustomEvent("guestReported", { detail: data }));
});

socket.on("guest-checked-out", (data) => {
  window.dispatchEvent(new CustomEvent("guestCheckedOut", { detail: data }));
});

// Enquiry events
socket.on("enquiry-created", (data) => {
  window.dispatchEvent(new CustomEvent("enquiryCreated", { detail: data }));
  window.dispatchEvent(
    new CustomEvent("guestEnquiryCreated", { detail: data })
  );
});

socket.on("enquiry-approved", (data) => {
  window.dispatchEvent(new CustomEvent("enquiryApproved", { detail: data }));
});

socket.on("enquiry-rejected", (data) => {
  window.dispatchEvent(new CustomEvent("enquiryRejected", { detail: data }));
});

socket.on("enquiry-booked", (data) => {
  window.dispatchEvent(new CustomEvent("enquiryBooked", { detail: data }));
});

// Venue enquiry events
socket.on("venue-enquiry-created", (data) => {
  window.dispatchEvent(new CustomEvent("venueEnquiryCreated", { detail: data }));
});

socket.on("venue-enquiry-updated", (data) => {
  window.dispatchEvent(new CustomEvent("venueEnquiryUpdated", { detail: data }));
});

// Broadcast events
socket.on("broadcast_sent", (data) => {
  window.dispatchEvent(new CustomEvent("broadcastSent", { detail: data }));
});

socket.on("guest_support_request", (data) => {
  window.dispatchEvent(new CustomEvent("guestSupportRequest", { detail: data }));
});

socket.on("new_medical_request", (data) => {
  window.dispatchEvent(new CustomEvent("newMedicalRequest", { detail: data }));
});

socket.on("new_cleaning_request", (data) => {
  window.dispatchEvent(new CustomEvent("newCleaningRequest", { detail: data }));
});

socket.on("new_maintenance_request", (data) => {
  window.dispatchEvent(new CustomEvent("newMaintenanceRequest", { detail: data }));
});

socket.on("new_sos_alert", (data) => {
  window.dispatchEvent(new CustomEvent("newSosAlert", { detail: data }));
});

socket.on("support_request_updated", (data) => {
  window.dispatchEvent(new CustomEvent("supportRequestUpdated", { detail: data }));
});

socket.on("guest_flagged", (data) => {
  window.dispatchEvent(new CustomEvent("guestFlagged", { detail: data }));
});

socket.on("guest_blocked", (data) => {
  window.dispatchEvent(new CustomEvent("guestBlocked", { detail: data }));
});

// ✅ ADD THIS BLOCK:
// Cron job events
socket.on("bookingDataUpdated", (data) => {
  try {
    console.log("🔄 Booking data updated (cron):", data);
    window.dispatchEvent(new CustomEvent("bookingDataUpdated", { detail: data }));
  } catch (error) {
    console.error("⚠️ Booking data updated event handler failed:", error.message);
  }
});

// ✅ ADD THIS BLOCK:
// Cron job events
socket.on("bookingDataUpdated", (data) => {
  try {
    console.log("🔄 Booking data updated (cron):", data);
    window.dispatchEvent(new CustomEvent("bookingDataUpdated", { detail: data }));
  } catch (error) {
    console.error("⚠️ Booking data updated event handler failed:", error.message);
  }
});

export default socket;
