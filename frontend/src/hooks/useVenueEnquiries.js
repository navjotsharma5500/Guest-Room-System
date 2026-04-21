// src/hooks/useVenueEnquiries.js
// Fetches venue enquiries and tracks unread count for NotificationBell

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL;
const isPendingEnquiry = (enquiry) =>
  (enquiry?.status || "").toLowerCase() === "pending";

export default function useVenueEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch enquiries from API
   */
  const fetchEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      console.log("📋 Fetching venue enquiries...");

      const headers = { "Content-Type": "application/json" };
      const token = localStorage.getItem("token");

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await axios.get(`${API}/api/venue/enquiry/all`, {
        headers,
        withCredentials: true,
      });

      const data = res.data?.enquiries || res.data || [];
      console.log("✅ Enquiries fetched:", data.length);

      const enquiryList = Array.isArray(data) ? data : [];
      const pendingCount = enquiryList.filter(isPendingEnquiry).length;

      setEnquiries(enquiryList);
      setUnreadCount(pendingCount);
      setError(null);
    } catch (err) {
      console.error("❌ Error fetching enquiries:", err);
      setError(err.message);
      setEnquiries([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Setup socket listener for new enquiries
   */
  useEffect(() => {
    // Initial fetch
    fetchEnquiries();

    // Listen for new enquiries via socket
    const handleNewEnquiry = (data) => {
      console.log("🔔 New enquiry socket event:", data);
      
      if (data?.enquiry) {
        setEnquiries((prev) => {
          // Add new enquiry if not already in list
          const isDuplicate = prev.some((e) => e._id === data.enquiry._id);
          if (isDuplicate) return prev;

          const updated = [data.enquiry, ...prev];
          const newUnread = updated.filter(isPendingEnquiry).length;
          
          setUnreadCount(newUnread);
          
          console.log("📢 New enquiry added. Unread count:", newUnread);
          return updated.slice(0, 50); // Keep last 50
        });
      }
    };

    // Listen on window event (from VenueAssistantEnquiryPage)
    window.addEventListener("venue-enquiry-created", handleNewEnquiry);

    // Refresh enquiries every 30 seconds
    const interval = setInterval(() => {
      fetchEnquiries();
    }, 30000);

    return () => {
      window.removeEventListener("venue-enquiry-created", handleNewEnquiry);
      clearInterval(interval);
    };
  }, [fetchEnquiries]);

  const pendingEnquiries = enquiries.filter(isPendingEnquiry);

  return {
    enquiries,
    pendingEnquiries,
    unreadCount,
    loading,
    error,
    refresh: fetchEnquiries,
  };
}
