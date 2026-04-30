// src/components/Creator.jsx
import React from "react";

export default function Creator({ variant = "default", className = "" }) {
  const variants = {
    default: "text-xs text-gray-500 bg-white/70 backdrop-blur px-3 py-1.5 rounded-full shadow hover:shadow-md transition-all duration-200",
    sidebar: "text-xs text-slate-500 transition-colors duration-200",
    footer: "text-sm text-gray-600 bg-white/80 backdrop-blur px-4 py-2 rounded-lg shadow hover:shadow-lg transition-all duration-200",
  };

  const variantClass = variants[variant] || variants.default;

  return (
    <div className={`${variantClass} ${className} inline-flex items-center gap-1.5`}>
      <span>
        Created by <span className="font-medium text-gray-700">DoSA Office</span>
      </span>
    </div>
  );
}
