import React, { useState } from "react";
import CreatorProfile from "./CreatorProfile";

const DashboardFooter = () => {
  const [showCreatorProfile, setShowCreatorProfile] = useState(false);

  return (
    <>
      <div className="absolute bottom-6 left-0 w-full px-6 flex flex-col md:flex-row items-center justify-between pointer-events-none z-10">
        
        {/* Left: Creator */}
        <button
          onClick={() => setShowCreatorProfile(true)}
          className="order-2 md:order-1 text-xs text-slate-500 hover:text-slate-700 transition-colors pointer-events-auto mt-4 md:mt-0"
        >
          Developed by Navjot Sharma
        </button>

        {/* Center: Branding */}
        <div className="order-1 md:order-2 md:absolute md:left-1/2 md:-translate-x-1/2 text-center pointer-events-auto">
          
          <p className="text-sm text-slate-600 leading-tight">
            Powered by Thapar Institute of Engineering & Technology
          </p>

          <p className="text-xs text-slate-400 mt-1 leading-tight">
            Created and Maintained by DoSA Office
          </p>

          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-500">
              System Online
            </span>
          </div>

        </div>
      </div>

      <CreatorProfile
        open={showCreatorProfile}
        onClose={() => setShowCreatorProfile(false)}
      />
    </>
  );
};

export default DashboardFooter;