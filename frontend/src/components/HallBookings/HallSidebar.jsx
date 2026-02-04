// src/components/HallBookings/HallSidebar.jsx - Google-Inspired Minimal Design
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Home, Grid, Calendar, Building2, CalendarCheck, Menu } from "lucide-react";
import Creator from "../Creator";

export default function HallSidebar({ theme, onNavigate, activeSection = "home" }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const menuItems = [
    { id: "home", label: "Dashboard", icon: Home },
    { id: "manage-bookings", label: "Manage Bookings", icon: Grid },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "event-calendar", label: "Event Calendar", icon: CalendarCheck },
    { id: "hall", label: "Hall", icon: Building2, isCategory: true },
    { id: "rooms", label: "Rooms", icon: Building2, isCategory: true },
    { id: "creativity-rooms", label: "Creativity Rooms", icon: Building2, isCategory: true },
    { id: "green-rooms", label: "Green Rooms", icon: Building2, isCategory: true },
    { id: "open-area", label: "Open Area", icon: Building2, isCategory: true },
    { id: "desk-area", label: "Desk Area", icon: Building2, isCategory: true },
    { id: "common-rooms", label: "Common Rooms", icon: Building2, isCategory: true }
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className={`
          fixed top-20 left-4 z-30 p-2 rounded-lg md:hidden
          ${theme === "dark" ? "bg-[#292a2d]" : "bg-white"}
          shadow-lg
        `}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 flex flex-col z-50
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        ${theme === "dark" ? "bg-[#202124]" : "bg-white"}
        border-r ${theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"}
      `}>
      {/* Title */}
      <div className={`px-6 py-5 border-b ${theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"}`}>
        <h2 className={`text-base font-normal ${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>
          Hall Booking System
        </h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full text-left px-4 py-3 rounded-lg mb-1
                flex items-center gap-3 text-sm font-normal
                transition-all duration-200
                ${isActive 
                  ? theme === "dark"
                    ? "bg-[#8ab4f8]/10 text-[#8ab4f8]"
                    : "bg-[#e8f0fe] text-[#1967d2]"
                  : theme === "dark"
                    ? "text-[#e8eaed] hover:bg-[#3c4043]"
                    : "text-[#5f6368] hover:bg-[#f1f3f4]"
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`px-4 py-3 border-t ${theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"}`}>
        <Creator variant="sidebar" />
      </div>
    </aside>
    </>
  );
}