import React from "react";
import {
  BatteryCharging,
  Bell,
  Building2,
  Camera,
  Car,
  CheckCircle2,
  CreditCard,
  Droplets,
  HeartPulse,
  QrCode,
  ShieldCheck,
  Sparkles,
  Utensils,
  Wifi,
  Wrench,
  Snowflake,
} from "lucide-react";

const iconRules = [
  [/wi-?fi|internet|network/i, Wifi],
  [/air|ac|conditioning|cool/i, Snowflake],
  [/parking|car/i, Car],
  [/laundry|linen|bedsheet|cloth/i, Sparkles],
  [/housekeeping|clean|dust/i, Sparkles],
  [/power|backup|electric/i, BatteryCharging],
  [/dining|food|canteen|mess|meal|cafe/i, Utensils],
  [/reception|front desk|support/i, Bell],
  [/medical|health|doctor|emergency/i, HeartPulse],
  [/security|warden|safe|supervision/i, ShieldCheck],
  [/cctv|camera/i, Camera],
  [/water|washroom|hot|cold|purified/i, Droplets],
  [/payment|cash|online/i, CreditCard],
  [/qr|digital|mobile|feedback/i, QrCode],
  [/maintenance|repair/i, Wrench],
  [/hostel|room|campus|building|elevator/i, Building2],
];

const getIcon = (title = "") => {
  const match = iconRules.find(([regex]) => regex.test(title));
  return match?.[1] || CheckCircle2;
};

export default function PublicFacilityCard({ title }) {
  const Icon = getIcon(title);
  return (
    <div className="guest-card rounded-3xl p-5">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-[var(--guest-red)]">
        <Icon size={22} />
      </div>
      <p className="font-semibold text-[var(--guest-blue)]">{title}</p>
    </div>
  );
}
