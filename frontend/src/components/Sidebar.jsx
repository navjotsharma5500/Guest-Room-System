// src/components/Sidebar.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import { AlertCircle, Star, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { hasPermission } from "../utils/checkPermission.js";
import Creator from "./Creator";
import HostelMenuButton from "./HostelMenuButton";
import { BlockRoomModal, UnblockRoomModal } from "./RoomBlockingModals";

export default function Sidebar({
  activeHostel,
  setActiveHostel,
  setActiveRoomRef,
  hostelData,
  activeTab,
  setActiveTab,
  theme,
}) {
  const { currentUser, loading } = useAuth();
  const [blockRoomModal, setBlockRoomModal] = useState(null);
  const [unblockRoomModal, setUnblockRoomModal] = useState(null);

  const logoPublicPath = "/Logo.jpg";
  const isEnquiry = activeTab === "Enquiry";

  // ----------------------------------------
  // Permission checks
  // ----------------------------------------
  const canSeeAllHostels = hasPermission(currentUser, "sidebar.allHostels");
  const canSeeHostels = hasPermission(currentUser, "sidebar.hostels");
  const canSeeHallBookings = hasPermission(currentUser, "sidebar.hallBookings");

  const assignedHostel =
    currentUser?.assignedHostel ||
    currentUser?.hostel ||
    null;

  const handleBlockRoom = (hostelName, roomNo) => {
    setBlockRoomModal({ hostelName, roomNo });
  };

  const handleUnblockRoom = (hostelName, roomNo, blockInfo) => {
    setUnblockRoomModal({ hostelName, roomNo, blockInfo });
  };  

  // Helper function to extract initial/letter from parentheses (e.g., "Agita Hall (A)" -> "A")
  const extractInitial = (hostelName) => {
    const match = hostelName.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return match[1].trim().toUpperCase();
    }
    // If no parentheses found, use first letter of hostel name as fallback
    return hostelName.charAt(0).toUpperCase();
  };

  // Convert hostel object → array and sort alphabetically by initial in parentheses
  const hostelNames = useMemo(() => {
    return Object.keys(hostelData || {}).sort((a, b) => {
      const initialA = extractInitial(a);
      const initialB = extractInitial(b);
      return initialA.localeCompare(initialB, undefined, { sensitivity: 'base', numeric: true });
    });
  }, [hostelData]);

  // Memoize visibleHostels to prevent unnecessary re-renders
  const visibleHostels = useMemo(() => {
    if (!hostelData || typeof hostelData !== 'object') {
      console.warn('⚠️ hostelData is invalid:', hostelData);
      return [];
    }

    if (canSeeAllHostels) {
      return hostelNames; // admin + manager (already sorted by initial)
    } else if (canSeeHostels && assignedHostel) {
      // Check if assigned hostel exists in data
      if (hostelData[assignedHostel]) {
        return [assignedHostel]; // caretaker only
      } else {
        console.warn(`⚠️ Caretaker's assigned hostel "${assignedHostel}" not found in hostelData`);
        return [];
      }
    }
    return [];
  }, [canSeeAllHostels, canSeeHostels, assignedHostel, hostelData, hostelNames]);

  // Debug logging (after visibleHostels is defined)
  console.log("🔍 Sidebar Debug:", {
    role: currentUser?.role,
    canSeeAllHostels,
    canSeeHostels,
    canSeeHallBookings,
    assignedHostel,
    hostelDataKeys: Object.keys(hostelData || {}),
    visibleHostelsCount: visibleHostels.length
  });

  // Warn if caretaker has no hostel
  if (assignedHostel === "" || assignedHostel === undefined) {
    console.warn("Caretaker has no assigned hostel");
  }

  // Auto-select hostel ONLY once after login
  const didAutoSelect = useRef(false);

  useEffect(() => {
    if (loading) return;

    // 🚫 Never auto-select outside Home
    if (activeTab !== "Home") return;

    // Only auto-select for caretakers with single hostel
    if (
      !didAutoSelect.current &&
      visibleHostels.length === 1 &&
      !canSeeAllHostels &&
      canSeeHostels
    ) {
      didAutoSelect.current = true;
      setActiveHostel(visibleHostels[0]);
    }
  }, [
    loading,
    visibleHostels,
    canSeeAllHostels,
    canSeeHostels,
    activeTab,
    setActiveHostel
  ]);

  return (
    <motion.aside
      initial={{ x: -250, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="
        fixed top-0 left-0 h-full w-64 flex flex-col z-20
        bg-white/70 backdrop-blur-xl
        border-r-4 border-red-500
        shadow-[0_18px_45px_rgba(15,23,42,0.18)]
        rounded-r-3xl text-slate-800
      "
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-1 py-6 border-b border-slate-200">
        <img
          src={logoPublicPath}
          alt="Logo"
          className="w-40 h-20 object-contain rounded-xl shadow-sm mb-2"
        />
        <p className="text-[11px] text-slate-500">Guest Room Booking System</p>
      </div>

      {/* NAVIGATION */}
      <nav
        className={`flex-1 overflow-y-auto px-3 pt-3 pb-4 space-y-2 ${
          isEnquiry ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {/* ⭐ ALL HOSTELS BUTTON (Admin + Manager only) */}
        {canSeeAllHostels && (
          <motion.button
            whileHover={!isEnquiry ? { scale: 1.01 } : {}}
            whileTap={!isEnquiry ? { scale: 0.98 } : {}}
            onClick={() => {
              if (setActiveHostel) setActiveHostel(null);
              if (setActiveRoomRef) setActiveRoomRef(null);
              if (setActiveTab) setActiveTab("AllHostelsPortal");
            }}
            className={`
              relative group w-full text-left px-3 py-2 rounded-xl
              border bg-white/40 backdrop-blur-xl flex items-center gap-3
              ${
                activeTab === "AllHostelsPortal"
                  ? "border-red-500 shadow-md"
                  : "border-transparent hover:bg-white/80"
              }
            `}
          >
            <Building2 className="w-4 h-4 text-slate-600" />
            <span className="text-sm">All Hostels</span>
          </motion.button>
        )}

        {/* ⭐ HALL BOOKINGS BUTTON (Assistant only) */}
        {canSeeHallBookings && (
          <motion.button
            whileHover={!isEnquiry ? { scale: 1.01 } : {}}
            whileTap={!isEnquiry ? { scale: 0.98 } : {}}
            onClick={() => {
              if (setActiveHostel) setActiveHostel(null);
              if (setActiveRoomRef) setActiveRoomRef(null);
              if (setActiveTab) setActiveTab("HallBookings");
            }}
            className={`
              relative group w-full text-left px-3 py-2 rounded-xl
              border bg-white/40 backdrop-blur-xl flex items-center gap-3
              ${
                activeTab === "HallBookings"
                  ? "border-red-500 shadow-md"
                  : "border-transparent hover:bg-white/80"
              }
            `}
          >
            <Users className="w-4 h-4 text-slate-600" />
            <span className="text-sm">Hall Bookings</span>
          </motion.button>
        )}

        {/* ⭐ HOSTEL LIST (Admin sees all, manager too, caretaker one hostel) */}
        {visibleHostels.map((hostelName) => {
          const isActive = activeHostel === hostelName;

          return (
            <motion.button
              key={hostelName}
              whileHover={!isEnquiry ? { scale: 1.01 } : {}}
              whileTap={!isEnquiry ? { scale: 0.98 } : {}}
              onClick={() => {
                if (setActiveHostel) setActiveHostel(hostelName);
                if (setActiveRoomRef) setActiveRoomRef(null);
                if (setActiveTab) {
                  setActiveTab((prev) =>
                    ["Defaulters", "Feedback"].includes(prev) ? prev : "Home"
                  );
                }
              }}
              className={`
                relative group w-full text-left px-3 py-2 rounded-xl border
                bg-white/30 backdrop-blur-xl flex items-center gap-3
                ${
                  isActive
                    ? "border-red-500 shadow-md"
                    : "border-transparent hover:bg-white/80"
                }
              `}
            >
              <Building2 className="w-4 h-4 text-slate-600" />
              <span className={`text-sm ${isActive ? "font-semibold" : ""}`}>
                {hostelName}
              </span>
            </motion.button>
          );
        })}

        {/* ✅ DEFAULTERS BUTTON (Not for Assistant) */}
        {!canSeeHallBookings && (
          <motion.button
            whileHover={!isEnquiry ? { scale: 1.01 } : {}}
            whileTap={!isEnquiry ? { scale: 0.98 } : {}}
            onClick={() => {
              console.log("🔴 Defaulters clicked");
              if (setActiveTab) setActiveTab("Defaulters");
              if (setActiveHostel) setActiveHostel(null);
              if (setActiveRoomRef) setActiveRoomRef(null);
            }}
            className={`
              relative group w-full text-left px-3 py-2 rounded-xl border
              bg-white/30 backdrop-blur-xl flex items-center gap-3
              ${
                activeTab === "Defaulters"
                  ? "border-red-500 shadow-md"
                  : "border-transparent hover:bg-white/80"
              }
            `}
          >
            <AlertCircle className="w-4 h-4 text-slate-600" />
            <span className={`text-sm ${activeTab === "Defaulters" ? "font-semibold" : ""}`}>
              Defaulters
            </span>
          </motion.button>
        )}

        {/* ✅ FEEDBACK BUTTON (Not for Assistant) */}
        {!canSeeHallBookings && (
          <motion.button
            whileHover={!isEnquiry ? { scale: 1.01 } : {}}
            whileTap={!isEnquiry ? { scale: 0.98 } : {}}
            onClick={(e) => {
              e.stopPropagation();
              console.log("⭐ Feedback clicked - setting activeTab to Feedback");
              if (setActiveTab) setActiveTab("Feedback");
              if (setActiveHostel) setActiveHostel(null);
              if (setActiveRoomRef) setActiveRoomRef(null);
            }}
            className={`
              relative group w-full text-left px-3 py-2 rounded-xl border
              bg-white/30 backdrop-blur-xl flex items-center gap-3
              ${
                activeTab === "Feedback"
                  ? "border-red-500 shadow-md"
                  : "border-transparent hover:bg-white/80"
              }
            `}
          >
            <Star className="w-4 h-4 text-slate-600" />
            <span className={`text-sm ${activeTab === "Feedback" ? "font-semibold" : ""}`}>
              Guest Feedback
            </span>
          </motion.button>
        )}
      </nav>  
      
      {/* FOOTER */}
      <div className="px-4 py-3 border-t border-slate-200 text-center mt-auto">
        <Creator variant="sidebar" />
      </div>
    </motion.aside>
  );
}