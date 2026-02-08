// src/components/Sidebar.jsx - COMPLETE FIXED VERSION
import React, { useEffect, useState, useRef, useMemo } from "react";
import { AlertCircle, Star, X, Menu, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext.js";
import { hasPermission } from "../utils/checkPermission.js";
import Creator from "./Creator";
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const logoPublicPath = "/Logo.jpg";
  const isEnquiry = activeTab === "Enquiry";

  // âœ… ROLE EXTRACTION
  const role = currentUser?.role || currentUser?.user?.role;
  const isRestrictedRole = role === 'caretaker' || role === 'warden';
  const isAdminLike = role === 'admin' || role === 'manager';

  // âœ… PERMISSION CHECKS
  const canSeeAllHostels = hasPermission(currentUser, "sidebar.allHostels");
  const canSeeHostels = hasPermission(currentUser, "sidebar.hostels");

  const assignedHostel =
    currentUser?.assignedHostel ||
    currentUser?.hostel ||
    null;

  // Helper: Extract hostel initial
  const extractInitial = (hostelName) => {
    const match = hostelName.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return match[1].trim().toUpperCase();
    }
    return hostelName.charAt(0).toUpperCase();
  };

  // âœ… SORTED HOSTEL NAMES
  const hostelNames = useMemo(() => {
    return Object.keys(hostelData || {}).sort((a, b) => {
      const initialA = extractInitial(a);
      const initialB = extractInitial(b);
      return initialA.localeCompare(initialB, undefined, { sensitivity: 'base', numeric: true });
    });
  }, [hostelData]);

  // âœ… VISIBLE HOSTELS (Role-based)
  const visibleHostels = useMemo(() => {
    console.log("ðŸ” Sidebar - Checking visible hostels:", {
      role,
      canSeeAllHostels,
      canSeeHostels,
      assignedHostel,
      availableHostels: Object.keys(hostelData || {})
    });

    if (canSeeAllHostels) {
      console.log("âœ… Admin/Manager - showing all hostels:", hostelNames);
      return hostelNames; // admin + manager (already sorted by initial)
    } else if (canSeeHostels && assignedHostel) {
      // âœ… FIX: Don't check if hostel exists in data - just show it
      // The data will load, and if hostel doesn't exist, it will show empty
      console.log("âœ… Caretaker/Warden - showing assigned hostel:", assignedHostel);
      return [assignedHostel];
    }
    
    console.warn("âŒ No hostels visible - check permissions");
    return [];
  }, [canSeeAllHostels, canSeeHostels, assignedHostel, hostelData, hostelNames, role]);

  // Warn if restricted role has no hostel
  if (isRestrictedRole && !assignedHostel) {
    console.warn(`âš ï¸ ${role} has no assigned hostel`);
  }

  // Auto-select hostel (only for admins with single hostel)
  const didAutoSelect = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (activeTab !== "Home") return;

    if (
      !didAutoSelect.current &&
      visibleHostels.length === 1 &&
      canSeeAllHostels
    ) {
      didAutoSelect.current = true;
      setActiveHostel(visibleHostels[0]);
    }
  }, [loading, visibleHostels, canSeeAllHostels, activeTab, setActiveHostel]);

  // âœ… NAVIGATION HANDLER (closes mobile menu)
  const handleNavigation = (callback) => {
    callback();
    setIsMobileOpen(false);
  };

  // âœ… CLOSE MOBILE MENU ON OUTSIDE CLICK
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMobileOpen && !e.target.closest('.mobile-sidebar') && !e.target.closest('.mobile-menu-button')) {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileOpen]);

  // âœ… SIDEBAR CONTENT (reusable for desktop & mobile)
  const SidebarContent = ({ isMobile = false }) => (
    <>
      {/* LOGO */}
      <div className={`flex flex-col items-center gap-1 border-b border-slate-200 ${
        isMobile ? 'py-4' : 'py-6'
      }`}>
        <img
          src={logoPublicPath}
          alt="Logo"
          className={`object-contain rounded-xl shadow-sm mb-2 ${
            isMobile ? 'w-32 h-16' : 'w-40 h-20'
          }`}
        />
        <p className="text-[11px] text-slate-500">Guest Room Booking System</p>
      </div>

      {/* NAVIGATION */}
      <nav
        className={`flex-1 overflow-y-auto px-3 pt-3 pb-4 space-y-2 ${
          isEnquiry ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {/* âœ… ALL HOSTELS BUTTON (Admin + Manager only) */}
        {canSeeAllHostels && (
          <motion.button
            whileHover={!isEnquiry ? { scale: 1.01 } : {}}
            whileTap={!isEnquiry ? { scale: 0.98 } : {}}
            onClick={() => handleNavigation(() => {
              setActiveHostel(null);
              setActiveRoomRef(null);
              setActiveTab("AllHostelsPortal");
            })}
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

        {/* âœ… HOSTEL LIST (All roles see their visible hostels) */}
        {visibleHostels.map((hostelName) => {
          const isActive = activeHostel === hostelName;

          return (
            <motion.button
              key={hostelName}
              whileHover={!isEnquiry ? { scale: 1.01 } : {}}
              whileTap={!isEnquiry ? { scale: 0.98 } : {}}
              onClick={() => handleNavigation(() => {
                setActiveHostel(hostelName);
                setActiveRoomRef(null);
                setActiveTab((prev) =>
                  ["Defaulters", "Feedback", "DepartmentPayments"].includes(prev) ? prev : "Home"
                );
              })}
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

        {/* âœ… DEFAULTERS BUTTON (Admin, Manager, Caretaker, Warden) */}
        {['admin', 'manager', 'caretaker', 'warden'].includes(role) && (
          <motion.button
            whileHover={!isEnquiry ? { scale: 1.01 } : {}}
            whileTap={!isEnquiry ? { scale: 0.98 } : {}}
            onClick={() => handleNavigation(() => {
              console.log("ðŸ”´ Defaulters clicked");
              setActiveTab("Defaulters");
              setActiveHostel(null);
              setActiveRoomRef(null);
            })}
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

        {/* âœ… DEPARTMENT PAYMENTS BUTTON (Admin, Manager, Caretaker, Warden) */}
        {['admin', 'manager', 'caretaker', 'warden'].includes(role) && (
          <motion.button
            whileHover={!isEnquiry ? { scale: 1.01 } : {}}
            whileTap={!isEnquiry ? { scale: 0.98 } : {}}
            onClick={() => handleNavigation(() => {
              console.log("ðŸ¢ Department Payments clicked");
              setActiveTab("DepartmentPayments");
              setActiveHostel(null);
              setActiveRoomRef(null);
            })}
            className={`
              relative group w-full text-left px-3 py-2 rounded-xl border
              bg-white/30 backdrop-blur-xl flex items-center gap-3
              ${
                activeTab === "DepartmentPayments"
                  ? "border-red-500 shadow-md"
                  : "border-transparent hover:bg-white/80"
              }
            `}
          >
            <Building2 className="w-4 h-4 text-slate-600" />
            <span className={`text-sm ${activeTab === "DepartmentPayments" ? "font-semibold" : ""}`}>
              Dept. Payments
            </span>
          </motion.button>
        )}

        {/* âœ… FEEDBACK BUTTON (All roles) */}
        <motion.button
          whileHover={!isEnquiry ? { scale: 1.01 } : {}}
          whileTap={!isEnquiry ? { scale: 0.98 } : {}}
          onClick={(e) => handleNavigation(() => {
            e.stopPropagation();
            console.log("â­ Feedback clicked");
            setActiveTab("Feedback");
            setActiveHostel(null);
            setActiveRoomRef(null);
          })}
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
      </nav>

      {/* FOOTER */}
      <div className="px-4 py-3 border-t border-slate-200 text-center mt-auto">
        <Creator variant="sidebar" />
      </div>
    </>
  );

  return (
    <>
      {/* âœ… MOBILE MENU BUTTON */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="mobile-menu-button fixed top-4 left-4 z-50 lg:hidden p-2 bg-white rounded-lg shadow-lg border border-red-300 hover:bg-red-50 transition"
      >
        {isMobileOpen ? (
          <X className="w-6 h-6 text-red-600" />
        ) : (
          <Menu className="w-6 h-6 text-red-600" />
        )}
      </button>

      {/* âœ… DESKTOP SIDEBAR */}
      <motion.aside
        initial={{ x: -250, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="
          hidden lg:flex
          fixed top-0 left-0 h-full w-64 flex-col z-20
          bg-white/70 backdrop-blur-xl
          border-r-4 border-red-500
          shadow-[0_18px_45px_rgba(15,23,42,0.18)]
          rounded-r-3xl text-slate-800
        "
      >
        <SidebarContent />
      </motion.aside>

      {/* âœ… MOBILE SIDEBAR */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />

            {/* Sidebar */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="
                mobile-sidebar
                fixed top-0 left-0 h-full w-64 flex flex-col z-50
                bg-white/95 backdrop-blur-xl
                border-r-4 border-red-500
                shadow-2xl text-slate-800
                lg:hidden
              "
            >
              <SidebarContent isMobile={true} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* âœ… MODALS */}
      {blockRoomModal && (
        <BlockRoomModal
          hostelName={blockRoomModal.hostelName}
          roomNo={blockRoomModal.roomNo}
          onClose={() => setBlockRoomModal(null)}
          onSuccess={() => {
            setBlockRoomModal(null);
            if (typeof window.fetchLatestHostelData === "function") {
              window.fetchLatestHostelData();
            }
          }}
        />
      )}

      {unblockRoomModal && (
        <UnblockRoomModal
          hostelName={unblockRoomModal.hostelName}
          roomNo={unblockRoomModal.roomNo}
          blockInfo={unblockRoomModal.blockInfo}
          onClose={() => setUnblockRoomModal(null)}
          onSuccess={() => {
            setUnblockRoomModal(null);
            if (typeof window.fetchLatestHostelData === "function") {
              window.fetchLatestHostelData();
            }
          }}
        />
      )}
    </>
  );
}