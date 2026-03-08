import React, { useState } from "react";
import CreatorProfile from "./CreatorProfile";

const DashboardFooter = ({ config, mode = "fixed", className = "" }) => {
  const [showCreatorProfile, setShowCreatorProfile] = useState(false);

  const developerText = config?.developerText || "Developed by Navjot Sharma";
  const poweredByText =
    config?.poweredByText || "Powered by Thapar Institute of Engineering & Technology";
  const maintainedByText = config?.maintainedByText || "Created and Maintained by DoSA Office";
  const systemStatusText = config?.systemStatusText || "System Online";
  const systemOnline =
    typeof config?.systemOnline === "boolean" ? config.systemOnline : true;
  const isFlow = mode === "flow";

  return (
    <>
      <div
        className={`${
          isFlow
            ? "w-full px-6 py-4 flex flex-col md:flex-row items-center gap-3"
            : "fixed bottom-6 left-0 w-full px-6 flex flex-col md:flex-row items-center justify-between pointer-events-none z-40"
        } ${className}`}
      >
        <button
          onClick={() => setShowCreatorProfile(true)}
          className={`order-2 md:order-1 text-xs text-slate-500 hover:text-slate-700 transition-colors ${
            isFlow ? "mt-2 md:mt-0 md:mr-auto" : "pointer-events-auto mt-4 md:mt-0"
          }`}
        >
          {developerText}
        </button>

        <div
          className={`order-1 md:order-2 text-center ${
            isFlow ? "md:flex-1 md:text-center" : "md:absolute md:left-1/2 md:-translate-x-1/2 pointer-events-auto"
          }`}
        >
          <p className="text-sm text-slate-600 leading-tight">{poweredByText}</p>

          <p className="text-xs text-slate-400 mt-1 leading-tight">{maintainedByText}</p>

          <div className="flex items-center justify-center gap-2 mt-2">
            <div
              className={`w-2 h-2 rounded-full ${systemOnline ? "bg-emerald-500" : "bg-rose-500"}`}
            />
            <span className="text-xs text-slate-500">{systemStatusText}</span>
          </div>
        </div>
      </div>

      <CreatorProfile open={showCreatorProfile} onClose={() => setShowCreatorProfile(false)} />
    </>
  );
};

export default DashboardFooter;
