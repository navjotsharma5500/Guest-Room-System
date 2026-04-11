import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isDDAssistantRole, isDDOfficeRoom } from '../../utils/venueAccessPolicy';
import {
  Home,
  Grid,
  Calendar,
  Building2,
  CalendarCheck,
  FileText,
  ChevronDown,
  ChevronRight,
  BarChart3,
  LayoutDashboard,
} from "lucide-react";
import Creator from "../Creator";
import { Wallet } from "lucide-react"; 
import { getEnabledVenueRoomsConfig } from "../../config/venueRoomsConfig";

export default function VenueSidebar({ theme, onNavigate, activeSection = "home", currentUser }) {
  const navigate = useNavigate();
  const currentUserRole = currentUser?.role || '';

  // Roles that see "Switch Dashboard" button
  const SWITCH_DASHBOARD_ROLES = ['admin', 'adosa', 'assistant'];
  const canSwitchDashboard = SWITCH_DASHBOARD_ROLES.includes(currentUserRole.toLowerCase());

  const NAV_ITEMS = [ 
    { id: "home", label: "Dashboard", icon: Home },
    { id: "manage-bookings", label: "Common Bookings", icon: Grid },
    { id: "enquiries", label: "Enquiries", icon: FileText },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "society-budget",   label: "Society Budget",  icon: Wallet },
  ];

  const venueTree = useMemo(() => getEnabledVenueRoomsConfig(), []);

  // Filter venue tree based on user role
  const filteredVenueTree = useMemo(() => {
    // If not DD Assistant, show everything
    if (!isDDAssistantRole(currentUserRole)) {
      return venueTree;
    }

    // For DD Assistant, filter strict list of allowed rooms
    return venueTree
      .map((main) => ({
        ...main,
        sections: main.sections
          .map((section) => ({
            ...section,
            // Filter the rooms inside the section
            rooms: section.rooms.filter((room) => isDDOfficeRoom(room.name)),
          }))
          // Only keep sections that have at least one allowed room
          .filter((section) => section.rooms.length > 0),
      }))
      // Only keep main categories that have at least one allowed section
      .filter((main) => main.sections.length > 0);
  }, [venueTree, currentUserRole]);

  const [openMainGroups, setOpenMainGroups] = useState({});

  const toggleMainGroup = (mainId) => {
    setOpenMainGroups((prev) => ({ ...prev, [mainId]: !prev[mainId] }));
  };

  const getButtonClassName = (isActive) =>
    `
      w-full text-left px-4 py-3 rounded-lg mb-1
      flex items-center gap-3 text-sm font-normal transition-all duration-200
      ${
        isActive
          ? theme === "dark"
            ? "bg-[#8ab4f8]/10 text-[#8ab4f8]"
            : "bg-[#e8f0fe] text-[#1967d2]"
          : theme === "dark"
          ? "text-[#e8eaed] hover:bg-[#3c4043]"
          : "text-[#5f6368] hover:bg-[#f1f3f4]"
      }
    `;

  return (
    <div className={`h-full flex flex-col ${theme === "dark" ? "bg-[#292a2d]" : "bg-white"}`}>
      <div className={`px-6 py-5 border-b ${theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"}`}>
        <h2 className={`text-base font-normal ${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>
          Venue Booking System
        </h2>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={getButtonClassName(isActive)}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className={`mt-2 mb-2 px-4 text-xs uppercase tracking-wide ${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}>
          Venue Rooms
        </div>

        {filteredVenueTree.map((main) => {
          const isOpenMain = !!openMainGroups[main.id];
          return (
            <div key={main.id} className="mb-1">
              <button
                onClick={() => toggleMainGroup(main.id)}
                className={getButtonClassName(false)}
              >
                <Building2 className="w-5 h-5" />
                <span className="flex-1">{main.label}</span>
                {isOpenMain ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {isOpenMain && (
                <div className="pl-3">
                  {main.sections.map((section) => {
                    const isSectionActive = activeSection === section.id;

                    return (
                      <div key={section.id} className="mb-1">
                        <button
                          onClick={() => onNavigate(section.id)}
                          className={`
                            w-full text-left px-3 py-2 rounded-lg
                            flex items-center gap-2 text-sm transition-all duration-200
                            ${
                              isSectionActive
                                ? theme === "dark"
                                  ? "bg-[#8ab4f8]/10 text-[#8ab4f8]"
                                  : "bg-[#e8f0fe] text-[#1967d2]"
                                : theme === "dark"
                                ? "text-[#e8eaed] hover:bg-[#3c4043]"
                                : "text-[#5f6368] hover:bg-[#f1f3f4]"
                            }
                          `}
                        >
                          <span className="flex-1">{section.label}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className={`px-4 py-3 border-t ${theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"}`}>
        {canSwitchDashboard && (
          <button
            onClick={() => navigate('/admin/dashboard-selector')}
            className={`w-full text-left px-3 py-2 rounded-lg mb-2 flex items-center gap-2 text-sm transition-all duration-200 ${
              theme === "dark"
                ? "text-[#9aa0a6] hover:bg-[#3c4043] hover:text-[#e8eaed]"
                : "text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Switch Dashboard</span>
          </button>
        )}
        <Creator variant="sidebar" />
      </div>
    </div>
  );
}