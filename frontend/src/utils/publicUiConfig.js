import { BACKEND_URL } from "./apiConfig";

export const DEFAULT_PUBLIC_UI_CONFIG = {
  widgets: {
    developerText: "Developed by Navjot Sharma",
    poweredByText: "Powered by Thapar Institute of Engineering & Technology",
    maintainedByText: "Created and Maintained by DoSA Office",
    systemStatusText: "System Online",
    systemOnline: true,
    echoEnabled: true,
  },
  selector: {
    title: "Thapar Operations",
    subtitle: "Centralized portal for Guest Rooms, Venues & Student Services",
    themePreset: "light",
    cardStyle: "glass",
    layoutStyle: "grid-3",
    cardOrder: [
      "guest-booking",
      "venue-booking",
      "feedback",
      "night-permissions",
      "calendar",
      "lost-found",
    ],
    cards: [
      {
        id: "guest-booking",
        enabled: true,
        title: "Guest Room Booking Form",
        description: "Book hostel guest rooms (Requires Google Login)",
        features: ["Room Availability", "Booking Request", "Status Tracking"],
      },
      {
        id: "venue-booking",
        enabled: true,
        title: "Event Venue Booking Form",
        description: "Book institute venues for events (Requires Google Login)",
        features: ["Venue Search", "Event Registration", "Approval Status"],
      },
      {
        id: "feedback",
        enabled: true,
        title: "Guest Room Feedback Form",
        description: "Share your experience (Requires Google Login)",
        features: ["Rate Stay", "Suggestions", "Report Issues"],
      },
      {
        id: "night-permissions",
        enabled: true,
        title: "Night Permissions",
        description: "Student Night Out & Dashboard (Requires Google Login)",
        features: ["Apply for Pass", "Check Status", "QR Code"],
      },
      {
        id: "calendar",
        enabled: true,
        title: "Event Calendar",
        description: "View upcoming events and bookings",
        features: ["Public Events", "Venue Availability", "Schedule"],
      },
      {
        id: "lost-found",
        enabled: true,
        title: "Lost & Found",
        description: "Report or find lost items on campus",
        features: ["Search Items", "Report Lost", "Report Found"],
      },
    ],
  },
};

const deepMerge = (base, patch) => {
  if (!base || typeof base !== "object") return patch;
  const merged = Array.isArray(base) ? [...base] : { ...base };

  Object.keys(patch || {}).forEach((key) => {
    const baseValue = merged[key];
    const patchValue = patch[key];

    if (Array.isArray(patchValue)) {
      merged[key] = patchValue;
      return;
    }

    if (
      baseValue &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue) &&
      patchValue &&
      typeof patchValue === "object" &&
      !Array.isArray(patchValue)
    ) {
      merged[key] = deepMerge(baseValue, patchValue);
      return;
    }

    merged[key] = patchValue;
  });

  return merged;
};

export const normalizePublicUiConfig = (config) =>
  deepMerge(DEFAULT_PUBLIC_UI_CONFIG, config || {});

export const fetchPublicUiConfig = async () => {
  const res = await fetch(`${BACKEND_URL}/api/public-ui/config`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to load public UI config (HTTP ${res.status})`);
  }

  const data = await res.json();
  return normalizePublicUiConfig(data?.config || {});
};

export const updatePublicUiConfig = async (config, token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BACKEND_URL}/api/public-ui/config`, {
    method: "PUT",
    credentials: "include",
    headers,
    body: JSON.stringify(config || {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || `Failed to update config (HTTP ${res.status})`);
  }

  return normalizePublicUiConfig(data?.config || {});
};
