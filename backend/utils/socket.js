// src/socket.js - CREATE THIS FILE
import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_API_URL || "http://localhost:10000";

console.log("🔌 Initializing Socket.IO with URL:", SOCKET_URL);

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  withCredentials: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
  transports: ['websocket', 'polling'],
});

socket.on("connect", () => {
  console.log("✅ Socket.IO connected:", socket.id);
  // Join dashboard room for real-time updates
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
  console.log("📡 Booking created:", data);
  window.dispatchEvent(new CustomEvent("bookingCreated", { detail: data }));
});

socket.on("booking-cancelled", (data) => {
  console.log("📡 Booking cancelled:", data);
  window.dispatchEvent(new CustomEvent("bookingCancelled", { detail: data }));
});

socket.on("booking-extended", (data) => {
  console.log("📡 Booking extended:", data);
  window.dispatchEvent(new CustomEvent("bookingExtended", { detail: data }));
});

socket.on("payment-updated", (data) => {
  console.log("📡 Payment updated:", data);
  window.dispatchEvent(new CustomEvent("paymentUpdated", { detail: data }));
});

socket.on("payment-processed", (data) => {
  console.log("📡 Payment processed:", data);
  window.dispatchEvent(new CustomEvent("paymentProcessed", { detail: data }));
});

socket.on("guest-reported", (data) => {
  console.log("📡 Guest reported:", data);
  window.dispatchEvent(new CustomEvent("guestReported", { detail: data }));
});

socket.on("guest-checked-out", (data) => {
  console.log("📡 Guest checked out:", data);
  window.dispatchEvent(new CustomEvent("guestCheckedOut", { detail: data }));
});

// Enquiry events
socket.on("enquiry-created", (data) => {
  console.log("📡 Enquiry created:", data);
  window.dispatchEvent(new CustomEvent("enquiryCreated", { detail: data }));
  window.dispatchEvent(new CustomEvent("guestEnquiryCreated", { detail: data }));
});

socket.on("enquiry-approved", (data) => {
  console.log("📡 Enquiry approved:", data);
  window.dispatchEvent(new CustomEvent("enquiryApproved", { detail: data }));
});

socket.on("enquiry-rejected", (data) => {
  console.log("📡 Enquiry rejected:", data);
  window.dispatchEvent(new CustomEvent("enquiryRejected", { detail: data }));
});

socket.on("enquiry-booked", (data) => {
  console.log("📡 Enquiry booked:", data);
  window.dispatchEvent(new CustomEvent("enquiryBooked", { detail: data }));
});

export default socket;