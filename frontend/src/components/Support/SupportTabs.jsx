import React from "react";
import { HeartPulse, Sparkles, Wrench, Siren } from "lucide-react";

const tabs = [
  { key: "medical", label: "Medical Emergency", icon: HeartPulse, color: "red" },
  { key: "cleaning", label: "Cleaning Request", icon: Sparkles, color: "amber" },
  { key: "maintenance", label: "Maintenance", icon: Wrench, color: "blue" },
  { key: "sos", label: "SOS", icon: Siren, color: "rose" },
];

const colorClasses = {
  red: "border-red-500 bg-red-50 text-red-700",
  amber: "border-amber-500 bg-amber-50 text-amber-700",
  blue: "border-blue-500 bg-blue-50 text-blue-700",
  rose: "border-rose-500 bg-rose-50 text-rose-700",
};

export default function SupportTabs({ active, onChange, enabled = {} }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const disabled = enabled[tab.key] === false;
        return (
          <button
            key={tab.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(tab.key)}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              active === tab.key ? colorClasses[tab.color] : "border-slate-200 bg-white text-slate-700"
            } ${disabled ? "opacity-40 cursor-not-allowed" : "hover:shadow-md"}`}
          >
            <Icon className="w-6 h-6 mb-3" />
            <span className="text-sm font-black leading-tight">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
