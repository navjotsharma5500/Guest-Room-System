// src/components/Sidebar.jsx - FIXED VERSION
import React, { useEffect, useState, useRef, useMemo } from "react";
import { AlertCircle } from "lucide-react";
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
}) {
  const { currentUser, loading } = useAuth();
  const [blockRoomModal, setBlockRoomModal] = useState(null);
  const [unblockRoomModal, setUnblockRoomModal] = useState(null);

  const logoPublicPath = "/Logo.jpg";
  const isEnquiry = activeTab === "Enquiry";

  // Permission checks
  const canSeeAllHostels = hasPermission(currentUser, "sidebar.allHostels");
  const canSeeHostels = hasPermission(currentUser, "sidebar.hostels");
  
  const assignedHostel =
    currentUser?.assignedHostel ||
    currentUser?.hostel ||
    null;

  // ✅ Block/Unblock handlers
  const handleBlockRoom = (hostelName, roomNo) => {
    console.log("🔒 Block room clicked:", hostelName, roomNo);
    setBlockRoomModal({ hostelName, roomNo });
  };

  const handleUnblockRoom = (hostelName, roomNo, blockInfo) => {
    console.log("🔓 Unblock room clicked:", hostelName, roomNo);
    setUnblockRoomModal({ hostelName, roomNo, blockInfo });
  };

  // Extract initial from hostel name
  const extractInitial = (hostelName) => {
    const match = hostelName.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return match[1].trim().toUpperCase();
    }
    return hostelName.charAt(0).toUpperCase();
  };

  // Sort hostels alphabetically
  const hostelNames = useMemo(() => {
    return Object.keys(hostelData || {}).sort((a, b) => {
      const initialA = extractInitial(a);
      const initialB = extractInitial(b);
      return initialA.localeCompare(initialB, undefined, { sensitivity: 'base', numeric: true });
    });
  }, [hostelData]);

  // Visible hostels based on permissions
  const visibleHostels = useMemo(() => {
    if (canSeeAllHostels) {
      return hostelNames;
    } else if (canSeeHostels && assignedHostel && hostelData[assignedHostel]) {
      return [assignedHostel];
    }
    return [];
  }, [canSeeAllHostels, canSeeHostels, assignedHostel, hostelData, hostelNames]);

  // Auto-select hostel (only once)
  const didAutoSelect = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (
      !didAutoSelect.current &&
      visibleHostels.length === 1 &&
      canSeeAllHostels &&
      activeTab !== "Defaulters"
    ) {
      didAutoSelect.current = true;
      setActiveHostel(visibleHostels[0]);
    }
  }, [
    loading,
    visibleHostels,
    setActiveHostel,
    canSeeAllHostels,
    activeTab
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
        {/* ALL HOSTELS BUTTON */}
        {canSeeAllHostels && (
          <motion.button
            whileHover={!isEnquiry ? { scale: 1.01 } : {}}
            whileTap={!isEnquiry ? { scale: 0.98 } : {}}
            onClick={() => {
              setActiveHostel(null);
              setActiveRoomRef(null);
              setActiveTab("AllHostelsPortal");
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

        {/* ✅ HOSTEL LIST WITH THREE DOTS MENU */}
        {visibleHostels.map((hostelName) => {
          const isActive = activeHostel === hostelName;
          const rooms = hostelData[hostelName]?.rooms || [];

          return (
            <div
              key={hostelName}
              className={`
                relative group w-full rounded-xl border
                bg-white/30 backdrop-blur-xl
                ${
                  isActive
                    ? "border-red-500 shadow-md"
                    : "border-transparent hover:bg-white/80"
                }
              `}
            >
              {/* ✅ FIXED: Flex container with proper spacing */}
              <div className="flex items-center justify-between w-full px-3 py-2 gap-2">
                {/* Left side: Clickable hostel name */}
                <button
                  onClick={() => {
                    setActiveHostel(hostelName);
                    setActiveRoomRef(null);
                    setActiveTab("Home");
                  }}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <Building2 className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  <span className={`text-sm truncate ${isActive ? "font-semibold" : ""}`}>
                    {hostelName}
                  </span>
                </button>
                
                {/* ✅ Right side: Three dots menu (CRITICAL: Stop propagation) */}
                <div 
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  <HostelMenuButton
                    hostelName={hostelName}
                    rooms={rooms}
                    onBlockRoom={handleBlockRoom}
                    onUnblockRoom={handleUnblockRoom}
                    theme="light"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* DEFAULTERS BUTTON */}
        <motion.button
          onClick={() => {
            console.log("🔴 Defaulters clicked");
            setActiveTab("Defaulters");
            setActiveHostel(null);
            setActiveRoomRef(null);
          }}
          className="relative group w-full text-left px-3 py-2 rounded-xl
                    border bg-gradient-to-r from-red-500 to-red-600 text-white
                    flex items-center gap-3 shadow-lg"
        >
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">Defaulters</span>
        </motion.button>
      </nav>  
      
      {/* FOOTER */}
      <div className="px-4 py-3 border-t border-slate-200 text-center mt-auto">
        <Creator variant="sidebar" />
      </div>

      {/* ✅ Block Room Modal */}
      {blockRoomModal && (
        <BlockRoomModal
          hostelName={blockRoomModal.hostelName}
          roomNo={blockRoomModal.roomNo}
          onClose={() => setBlockRoomModal(null)}
          onSuccess={() => {
            setBlockRoomModal(null);
            window.dispatchEvent(new Event('hostelDataUpdated'));
          }}
          theme="light"
        />
      )}

      {/* ✅ Unblock Room Modal */}
      {unblockRoomModal && (
        <UnblockRoomModal
          hostelName={unblockRoomModal.hostelName}
          roomNo={unblockRoomModal.roomNo}
          blockInfo={unblockRoomModal.blockInfo}
          onClose={() => setUnblockRoomModal(null)}
          onSuccess={() => {
            setUnblockRoomModal(null);
            window.dispatchEvent(new Event('hostelDataUpdated'));
          }}
          theme="light"
        />
      )}
    </motion.aside>
  );
}