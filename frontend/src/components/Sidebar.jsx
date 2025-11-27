// src/components/Sidebar.jsx
import React from "react";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";

export default function Sidebar({
  activeHostel,
  setActiveHostel,
  setActiveRoomRef,
  hostelData,
  activeTab,
  setActiveTab,
  theme, // still accepted, just not used for colors now
}) {
  // Auth hook (must stay here)
  const { currentUser, loading } = useAuth();

  const logoPublicPath = "/Logo.jpg";
  const isEnquiry = activeTab === "Enquiry";

  // Prevent sidebar flash
  if (loading || !currentUser) return null;

  const role = currentUser?.role || "caretaker";
  const userHostel = currentUser?.hostel || null;

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isCaretaker = role === "caretaker";

  // ============================
  // ROLE-BASED HOSTEL VISIBILITY
  // ============================
  let visibleHostels = [];

  // Normalize hostel keys
  const hostelKeys = Object.keys(hostelData).map(h => h.trim().toLowerCase());
  const normalizedUserHostel = userHostel ? userHostel.trim().toLowerCase() : null;

  if (isAdmin) {
    visibleHostels = Object.keys(hostelData);   // admin sees all
  } 
  
  else if (isManager) {
    visibleHostels = [];   
  }
  
  else if (isCaretaker) {
    const index = hostelKeys.indexOf(normalizedUserHostel);
    if (index !== -1) {
      visibleHostels = [Object.keys(hostelData)[index]];   // caretaker sees ONLY his hostel
    }
  }

  return (
    <motion.aside
      initial={{ x: -250, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="
        fixed top-0 left-0 h-full w-64 flex flex-col z-20
        bg-white/70 backdrop-blur-xl
        border-r-4 border-red-500
        shadow-[0_18px_45px_rgba(15,23,42,0.18)]
        rounded-r-3xl
        text-slate-800
      "
    >
      {/* ==== Header Logo ==== */}
      <div
        className="
          flex flex-col items-center gap-1 py-6
          border-b border-slate-200
          bg-white/80 backdrop-blur-xl
          rounded-tr-3xl
        "
      >
        <img
          src={logoPublicPath}
          alt="Thapar Logo"
          className="w-40 h-20 rounded-xl object-contain shadow-sm mb-2"
        />
        <p className="text-[11px] text-slate-500">
          Guest Room Booking System
        </p>
      </div>

      {/* ==== Navigation ==== */}
      <nav
        className={`flex-1 overflow-y-auto px-3 pt-3 pb-4 space-y-2 ${
          isEnquiry ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {(isAdmin || isManager) && (
          <motion.button
            whileHover={!isEnquiry ? { scale: 1.01 } : {}}
            whileTap={!isEnquiry ? { scale: 0.98 } : {}}
            disabled={isEnquiry}
            onClick={() => {
              if (!isEnquiry) {
                setActiveHostel(null);
                setActiveRoomRef(null);
                setActiveTab("AllHostelsPortal");
              }
            }}
            className={`
              relative group w-full text-left px-3 py-2
              rounded-xl transition-all duration-200
              border bg-white/40 backdrop-blur-xl
              flex items-center gap-3
              ${
                activeTab === "AllHostelsPortal"
                  ? "border-red-500 shadow-md"
                  : "border-transparent hover:bg-white/80 hover:shadow-sm"
              }
              ${isEnquiry ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            {/* Left animated highlight bar */}
            <span
              className={`
                absolute left-0 top-1 bottom-1 w-1 rounded-full bg-red-500
                transform origin-top transition-all duration-200
                ${
                  activeTab === "AllHostelsPortal"
                    ? "scale-y-100 opacity-100"
                    : "scale-y-0 opacity-0 group-hover:scale-y-100 group-hover:opacity-100"
                }
              `}
            />
            {/* Content */}
            <span className="relative flex items-center gap-3">
              <Building2
                className={`
                  w-4 h-4
                  ${
                    activeTab === "AllHostelsPortal"
                      ? "text-red-600"
                      : "text-slate-500 group-hover:text-red-500"
                  }
                `}
              />
              <span
                className={`
                  text-sm
                  ${
                    activeTab === "AllHostelsPortal"
                      ? "font-semibold text-red-700"
                      : "text-slate-700 group-hover:text-slate-900"
                  }
                `}
              >
                All Hostels
              </span>
            </span>
          </motion.button>
        )}

        {/* HOSTEL BUTTONS */}
        {visibleHostels.map((h) => {
          const isActive = activeHostel === h;
          return (
            <motion.button
              key={h}
              whileHover={!isEnquiry ? { scale: 1.01 } : {}}
              whileTap={!isEnquiry ? { scale: 0.98 } : {}}
              disabled={isEnquiry}
              onClick={() => {
                if (!isEnquiry) {
                  setActiveHostel(h);
                  setActiveRoomRef(null);
                  setActiveTab("Home");
                }
              }}
              className={`
                relative group w-full text-left px-3 py-2
                rounded-xl transition-all duration-200
                border bg-white/30 backdrop-blur-xl
                flex items-center gap-3
                ${
                  isActive
                    ? "border-red-500 shadow-md"
                    : "border-transparent hover:bg-white/80 hover:shadow-sm"
                }
                ${isEnquiry ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {/* Left animated highlight bar */}
              <span
                className={`
                  absolute left-0 top-1 bottom-1 w-1 rounded-full bg-red-500
                  transform origin-top transition-all duration-200
                  ${
                    isActive
                      ? "scale-y-100 opacity-100"
                      : "scale-y-0 opacity-0 group-hover:scale-y-100 group-hover:opacity-100"
                  }
                `}
              />
              {/* Content */}
              <span className="relative flex items-center gap-3">
                <Building2
                  className={`
                    w-4 h-4
                    ${
                      isActive
                        ? "text-red-600"
                        : "text-slate-500 group-hover:text-red-500"
                    }
                  `}
                />
                <span
                  className={`
                    text-sm truncate
                    ${
                      isActive
                        ? "font-semibold text-red-700"
                        : "text-slate-700 group-hover:text-slate-900"
                    }
                  `}
                >
                  {h}
                </span>
              </span>
            </motion.button>
          );
        })}
      </nav>
    </motion.aside>
  );
}
