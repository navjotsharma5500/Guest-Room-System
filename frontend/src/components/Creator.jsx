// src/components/Creator.jsx
import React from "react";
import { ExternalLink } from "lucide-react";

// âš™ï¸ CONFIGURATION - Change your profile link here
const CREATOR_CONFIG = {
  name: "Navjot Sharma",
  profileUrl: "https://github.com/navjotsharma5500",
  // You can add more fields if needed in future:
  // linkedIn: "https://linkedin.com/in/yourprofile",
  // portfolio: "https://yourwebsite.com",
};

export default function Creator({ variant = "default", className = "" }) {
  const handleClick = () => {
    window.open(CREATOR_CONFIG.profileUrl, "_blank", "noopener,noreferrer");
  };

  // Variant styles
  const variants = {
    default: "text-xs text-gray-500 bg-white/70 backdrop-blur px-3 py-1.5 rounded-full shadow hover:shadow-md transition-all duration-200",
    sidebar: "text-xs text-slate-500 hover:text-slate-700 transition-colors duration-200",
    footer: "text-sm text-gray-600 bg-white/80 backdrop-blur px-4 py-2 rounded-lg shadow hover:shadow-lg transition-all duration-200",
  };

  const variantClass = variants[variant] || variants.default;

  return (
    <button
      onClick={handleClick}
      className={`${variantClass} ${className} cursor-pointer group inline-flex items-center gap-1.5`}
      title={`Visit ${CREATOR_CONFIG.name}'s GitHub Profile`}
    >
      <span>
        Created by{" "}
        <span className="font-medium text-gray-700 group-hover:text-red-600 transition-colors duration-200">
          {CREATOR_CONFIG.name}
        </span>
      </span>
      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    </button>
  );
}

// Export config for direct access if needed
export { CREATOR_CONFIG };