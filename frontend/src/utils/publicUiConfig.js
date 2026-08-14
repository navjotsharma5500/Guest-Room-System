import { BACKEND_URL } from "./apiConfig";

export const PUBLIC_CARD_IDS = [
  "guest-booking",
  "venue-booking",
  "event-calendar",
  "library-pass",
  "society-pass",
  "lost-found",
  "community-feedback",
  "institute-calendar",
  "student-calendar",
  "student-society-portal",
];

export const DEFAULT_PUBLIC_UI_CONFIG = {
  widgets: {
    developerText: "Created by DoSA Office",
    poweredByText: "Powered by Thapar Institute of Engineering & Technology",
    maintainedByText: "Created and Maintained by DoSA Office",
    systemStatusText: "System Online",
    systemOnline: true,
    echoEnabled: true,
  },
  header: {
    logoUrl: "https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744",
    logoAlt: "Thapar",
    title: "Thapar Institute of Engineering and Technology",
    subtitle: "",
    announcement: "",
    topNotice: "",
    navigationVisible: true,
  },
  navigation: [
    { id: "home", title: "Home", action: "home", enabled: true, order: 0 },
    {
      id: "booking",
      title: "Booking Form",
      enabled: true,
      order: 1,
      items: [
        { id: "guest-room", title: "Hostel Guest-Room Booking", destination: "https://campusconnect.thapar.edu/guest-room", target: "_blank", enabled: true },
        { id: "venue", title: "Event Venue Booking", destination: "https://campusconnect.thapar.edu/venue-enquiry", target: "_blank", enabled: true },
      ],
    },
    {
      id: "calendar",
      title: "Calendar",
      enabled: true,
      order: 2,
      items: [
        { id: "event-calendar", title: "Event Calendar", destination: "https://campusconnect.thapar.edu/event-calendar", target: "_blank", enabled: true },
      ],
    },
    {
      id: "night-pass",
      title: "Night Pass",
      enabled: true,
      order: 3,
      items: [
      { id: "library-pass", title: "Library Night Pass", action: "libraryUnavailable", enabled: true },
        { id: "society-pass", title: "Society Night Pass", action: "cs", badge: "Soon", enabled: true },
      ],
    },
    {
      id: "student-notices",
      title: "Student Notices",
      destination: "/student-notices",
      enabled: true,
      order: 4,
    },
    {
      id: "services",
      title: "Services",
      enabled: true,
      order: 5,
      items: [
        { id: "lost-found", title: "Lost & Found", destination: "https://campusconnect.thapar.edu/lostnfound", target: "_blank", enabled: true },
      ],
    },
    {
      id: "support",
      title: "Support",
      enabled: true,
      order: 6,
      items: [
        { id: "queries", title: "Any Queries", action: "q1", enabled: true },
        { id: "reach", title: "Reach Out To Us", action: "q2", enabled: true },
      ],
    },
    { id: "about", title: "About Us", action: "about", enabled: true, order: 6 },
  ],
  hero: {
    enabled: true,
    badge: "Thapar Campus Connect",
    title: "One Platform",
    subtitle: "Seamlessly Connected.",
    description: "",
    backgroundUrl: "https://ik.imagekit.io/7khjnlfow/email-assets/03_dsyrsv.png?updatedAt=1774118995455",
    overlay: "linear-gradient(to bottom, rgba(0,0,0,.25) 0%, rgba(0,0,0,.55) 100%)",
    minHeight: 480,
    height: "70vh",
    buttons: [],
  },
  sections: [
    { id: "hero", title: "Hero", enabled: true, order: 0 },
    { id: "services", title: "Services", enabled: true, order: 1 },
    { id: "footer", title: "Footer", enabled: true, order: 2 },
    { id: "echo", title: "Echo AI", enabled: true, order: 3 },
  ],
  timeline: [
    { id: "launch", year: "Feb 2026", title: "Launch", description: "Full platform live with 6 integrated services", enabled: true },
    { id: "testing", year: "Jan 2026", title: "Testing", description: "Beta launched with Guest Room & Venue modules", enabled: true },
    { id: "development", year: "Nov 2025", title: "Development", description: "Core team assembled, tech stack finalized", enabled: true },
    { id: "idea", year: "Oct 2025", title: "Idea", description: "Conceptualized by Dr. Meenakshi Rana, DoSA", enabled: true },
  ],
  echo: {
    defaultReply: "I'm here to help with campus operations.",
    responses: [
      { id: "guest", keywords: ["guest", "room", "hostel", "book"], reply: "To book a hostel guest room, visit https://campusconnect.thapar.edu/guest-room.", priority: 1, enabled: true },
      { id: "venue", keywords: ["venue", "event", "hall", "auditorium"], reply: "Event venue bookings are done at https://campusconnect.thapar.edu/venue-enquiry.", priority: 1, enabled: true },
      { id: "calendar", keywords: ["calendar", "schedule", "fest", "event"], reply: "Check the Event Calendar at https://campusconnect.thapar.edu/event-calendar.", priority: 1, enabled: true },
      { id: "library", keywords: ["library", "night", "pass", "permission"], reply: "Library Night Pass applications are handled at https://permissions.thapar.edu.", priority: 1, enabled: true },
      { id: "society", keywords: ["society", "club", "late"], reply: "Society Night Pass is coming soon.", priority: 1, enabled: true },
      { id: "lost", keywords: ["lost", "found", "item"], reply: "Visit the Lost & Found portal at https://campusconnect.thapar.edu/lostnfound.", priority: 1, enabled: true },
      { id: "login", keywords: ["login", "admin", "staff"], reply: "Admin/Staff login is at https://campusconnect.thapar.edu/login.", priority: 1, enabled: true },
      { id: "support", keywords: ["help", "support", "query", "contact"], reply: "For support, email itmh@thapar.edu for technical issues, or dosa.office@thapar.edu for general queries.", priority: 1, enabled: true },
      { id: "hello", keywords: ["hello", "hi", "hey", "namaste"], reply: "Hello. I'm Echo, the DoSA Operations assistant.", priority: 1, enabled: true },
    ],
  },
  modals: {
    q1: {
      title: "Any Queries?",
      description: "Contact us for any assistance:",
      emails: ["hostel.support@thapar.edu"],
      blocks: [
        { id: "technical", label: "Technical Support", lines: [], emails: ["itmh@thapar.edu"], enabled: true },
      ],
    },
    q2: {
      title: "Reach Out To Us",
      description: "For any feedback you can contact us on DoSA Office.",
      blocks: [
        { id: "timings", label: "Timings", lines: ["9 AM to 5:30 PM, Monday to Friday"], emails: [], enabled: true },
        { id: "email", label: "E-mail", lines: [], emails: ["dosa.office@thapar.edu"], enabled: true },
      ],
    },
    about: {
      title: "About Thapar Operations",
      description: "The Thapar Operations Portal centralizes campus services for students, staff, and guests.",
      blocks: [
        { id: "maintained", label: "Maintained By", lines: ["DoSA Office", "Version 1.0"], emails: [], enabled: true },
      ],
    },
    libraryUnavailable: {
      title: "Coming Soon",
      description: "Library Night Pass is currently unavailable.",
      emails: [],
      blocks: [],
    },
  },
  footer: {
    enabled: true,
    quickLinksTitle: "Quick Links",
    contactTitle: "Contact Us",
    copyright: "© 2026 TIET. All rights reserved.",
    legalLinks: [
      { id: "license", title: "License", destination: "/license", enabled: true },
      { id: "policies", title: "Policies", destination: "/policies", enabled: true },
      { id: "terms", title: "Terms", destination: "/terms", enabled: true },
    ],
    quickLinks: [
      { id: "home", title: "Home", action: "home", enabled: true },
      { id: "install", title: "How to Install", destination: "/install-app", enabled: true },
      { id: "signin", title: "Sign In", destination: "https://campusconnect.thapar.edu/login", target: "_blank", enabled: true },
      { id: "community", title: "Student Notices", destination: "/student-notices", enabled: true },
      { id: "ic", title: "Institute Calendar", destination: "https://campusconnect.thapar.edu/ic", target: "_blank", enabled: true },
      { id: "tc", title: "Student Calendar", destination: "https://campusconnect.thapar.edu/tc", target: "_blank", enabled: true },
      { id: "societies", title: "Student Societies", destination: "https://studentsocieties.thapar.edu/", target: "_blank", enabled: true },
      { id: "about", title: "About Us", action: "about", enabled: true },
    ],
    contactBlocks: [
      { id: "timings", label: "Timings", lines: ["9:00 AM to 5:30 PM", "Monday to Friday"], enabled: true },
      { id: "general", label: "Any General Query or Assistance", lines: ["Email:"], emails: ["dosa.office@thapar.edu", "hostel.support@thapar.edu"], enabled: true },
      { id: "technical", label: "Technical Support", lines: ["Email:"], emails: ["itmh@thapar.edu"], enabled: true },
    ],
  },
  selector: {
    title: "Thapar Campus Connect",
    subtitle: "Seamlessly Connected.",
    themePreset: "light",
    cardStyle: "default",
    layoutStyle: "grid-3",
    homepageLayout: "classic-grid",
    accentColor: "#c62828",
    spacing: "normal",
    borderRadius: 16,
    shadow: "normal",
    buttonStyle: "solid",
    glassLevel: "medium",
    cardOrder: [...PUBLIC_CARD_IDS],
    cards: [
      { id: "guest-booking", enabled: true, locked: false, lockMessage: "", title: "Hostel GuestRoom Booking Form", subtitle: "Booking Form", status: "Live", description: "Fully operational and available to all students.", working: "Book and manage campus guest-room stays.", destination: "https://campusconnect.thapar.edu/guest-room", icon: "building", badge: "", comingSoon: false, accentColor: "#c62828", cardColor: "#ffffff", features: ["Single & Double Occupancy Rooms", "Online Booking System", "Guest Registration & Verification", "Advance Booking up to 30 Days"], order: 0 },
      { id: "venue-booking", enabled: true, locked: false, lockMessage: "", title: "Event Venue Booking Form", subtitle: "Booking Form", description: "Request campus venues for events and activities.", destination: "https://campusconnect.thapar.edu/venue-enquiry", icon: "calendar", badge: "", comingSoon: false, accentColor: "#1a56db", cardColor: "#ffffff", features: ["Auditorium & Seminar Hall Booking", "Open Air & Outdoor Spaces", "Equipment & AV Support Request", "Multi-day Event Scheduling"], order: 1 },
      { id: "event-calendar", enabled: true, locked: false, lockMessage: "", title: "Event Calendar", subtitle: "Campus-wide schedule", description: "", destination: "https://campusconnect.thapar.edu/event-calendar", icon: "calendar", badge: "", comingSoon: false, accentColor: "#0d7a4e", cardColor: "#ffffff", features: ["Upcoming Fests & Competitions", "Department & Club Events", "Venue Availability Overview", "Monthly & Weekly View"], order: 2 },
      { id: "library-pass", enabled: true, locked: false, lockMessage: "", title: "Library Night Pass", subtitle: "2 pass categories", description: "", destination: "https://permissions.thapar.edu/", icon: "moon", badge: "", comingSoon: false, accentColor: "#6d28d9", cardColor: "#ffffff", features: ["Overnight Study Access", "Research & Project Work", "Barcode Scanning", "Digital Pass on Mobile"], order: 3 },
      { id: "society-pass", enabled: true, locked: false, lockMessage: "", title: "Society Night Pass", subtitle: "Coming soon", description: "", destination: "", action: "cs", icon: "sparkles", badge: "Coming Soon", comingSoon: true, accentColor: "#b45309", cardColor: "#ffffff", features: ["Late-Night Society Activities", "Cultural & Technical Clubs", "Coordinator Approval Flow", "Security Gate Integration"], order: 4 },
      { id: "lost-found", enabled: true, locked: false, lockMessage: "", title: "Lost & Found", subtitle: "Online Portal", description: "", destination: "https://campusconnect.thapar.edu/lostnfound", icon: "search", badge: "", comingSoon: false, accentColor: "#c2410c", cardColor: "#ffffff", features: ["Report Lost Items Online", "Browse Found Item Listings", "Photo Upload & Description", "Claim & Handover Process"], order: 5 },
      { id: "community-feedback", enabled: true, locked: false, lockMessage: "", title: "Student Notices", subtitle: "Official campus communication", description: "Find official announcements, circulars and important updates from departments across TIET.", destination: "/student-notices", icon: "Megaphone", badge: "", comingSoon: false, accentColor: "#2e7d32", cardColor: "#ffffff", features: [], order: 6 },
      { id: "institute-calendar", enabled: true, title: "Institute Calendar", shortDescription: "View institute-wide academic dates, holidays and schedules.", detailedDescription: "Stay updated with official institute dates, holidays, teaching days and important academic schedules.", destination: "/ic", icon: "CalendarRange", image: "", status: "Active", comingSoon: false, accentColor: "#2563eb", order: 7 },
      { id: "student-calendar", enabled: true, title: "Student Calendar", shortDescription: "Explore student events and campus activities.", detailedDescription: "Discover student-focused events, activities and schedules across the campus community.", destination: "/tc", icon: "CalendarDays", image: "", status: "Active", comingSoon: false, accentColor: "#0f766e", order: 8 },
      { id: "student-society-portal", enabled: true, title: "Student Society Portal", shortDescription: "Connect with student societies, clubs and chapters.", detailedDescription: "A unified portal for discovering and engaging with student societies, clubs and chapters.", destination: "", icon: "UsersRound", image: "", status: "Coming Soon", comingSoon: true, accentColor: "#7c3aed", order: 9 },
    ],
  },
  developers: [
    { id: "navjot-sharma", name: "Navjot Sharma", role: "Lead Full Stack Developer", photo: "https://ik.imagekit.io/7khjnlfow/email-assets/ChatGPT%20Image%20Mar%2013,%202026,%2002_52_10%20AM.png?updatedAt=1773433334832", description: "Associate IT, DoSA Office", email: "", linkedin: "https://www.linkedin.com/in/navjot-sharma-0bb7143b1", github: "https://github.com/navjotsharma5500", portfolio: "", contribution: "Architected and developed the core platform infrastructure and key booking modules.", tags: ["GuestRoom Portal", "Venue Booking", "Library Night Pass", "Event Calendar"], order: 0, enabled: true },
    { id: "aman-kapoor", name: "Aman Kapoor", role: "Core Developer", photo: "https://ik.imagekit.io/7khjnlfow/email-assets/1725703687306.jpg?updatedAt=1773176346179", description: "AIML, 2nd Year", email: "", linkedin: "https://www.linkedin.com/in/aman-kapoor201/", github: "", portfolio: "", contribution: "Implemented the backend architecture for the Library Night Pass module.", tags: ["Library Night Pass"], order: 1, enabled: true },
    { id: "sagarika-wankhede", name: "Sagarika Wankhede", role: "Frontend Developer", photo: "https://ik.imagekit.io/7khjnlfow/email-assets/1753485244517.jpg?updatedAt=1773176346191", description: "COE, 2nd Year", email: "", linkedin: "https://www.linkedin.com/in/sagarikawankhede/", github: "", portfolio: "", contribution: "Designed and implemented the Library Night Pass user interface.", tags: ["Library Night Pass"], order: 2, enabled: true },
    { id: "surya-kant-tiwari", name: "Surya Kant Tiwari", role: "Lost & Found Lead Dev", photo: "https://ik.imagekit.io/7khjnlfow/email-assets/157281664.png", description: "COE, 3rd Year", email: "", linkedin: "https://www.linkedin.com/in/surya-kant-tiwari-0707a52a9/", github: "https://github.com/navjotsharma5500/softwareProject", portfolio: "", contribution: "Led development of the Lost & Found portal and its claim workflow.", tags: ["Lost & Found Portal"], order: 3, enabled: true },
    { id: "akshat-kakkar", name: "Akshat Kakkar", role: "Product & Strategy Lead", photo: "https://ik.imagekit.io/7khjnlfow/email-assets/215835845.jpg", description: "COE, 3rd Year", email: "", linkedin: "https://www.linkedin.com/in/akshat-kakkar-452b13342/", github: "", portfolio: "", contribution: "Led product strategy and UX research for the platform.", tags: ["Lost & Found Portal"], order: 4, enabled: true },
  ],
};

const DB_MANAGED_FIELDS = new Set(["_id", "__v", "createdAt", "updatedAt"]);

const isObject = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const stripDatabaseFields = (value) => {
  if (Array.isArray(value)) return value.map((item) => stripDatabaseFields(item));
  if (!isObject(value)) return value;
  return Object.keys(value).reduce((acc, key) => {
    if (DB_MANAGED_FIELDS.has(key)) return acc;
    acc[key] = stripDatabaseFields(value[key]);
    return acc;
  }, {});
};

const mergeDefaults = (base, patch) => {
  if (typeof patch === "undefined") return base;
  if (Array.isArray(base) || Array.isArray(patch)) return Array.isArray(patch) ? patch : base;
  if (!isObject(base) || !isObject(patch)) return patch;
  const keys = new Set([...Object.keys(base), ...Object.keys(patch)]);
  return [...keys].reduce((acc, key) => {
    acc[key] = mergeDefaults(base[key], patch[key]);
    return acc;
  }, {});
};

const sortEnabled = (items = []) =>
  [...items]
    .filter((item) => item?.enabled !== false)
    .sort((a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0));

export const normalizePublicUiConfig = (config) => {
  const merged = mergeDefaults(DEFAULT_PUBLIC_UI_CONFIG, stripDatabaseFields(config || {}));
  const timelineSource = Array.isArray(merged.timeline) && merged.timeline.length
    ? merged.timeline
    : DEFAULT_PUBLIC_UI_CONFIG.timeline;
  const cardOrder = Array.isArray(merged.selector?.cardOrder)
    ? merged.selector.cardOrder
    : DEFAULT_PUBLIC_UI_CONFIG.selector.cardOrder;
  const cards = Array.isArray(merged.selector?.cards)
    ? merged.selector.cards.map((card, index) => {
      const isStudentNotices = card.id === "community-feedback";
      const title = isStudentNotices && ["Community Service", "Community Feedback"].includes(card.title) ? "Student Notices" : card.title;
      const description = isStudentNotices && card.description === "Connect, share feedback and engage with campus." ? "Find official announcements, circulars and important updates from departments across TIET." : card.description;
      const shortDescription = isStudentNotices && ["Connect, share feedback and engage with campus.", "Public forum"].includes(card.shortDescription) ? "Find official announcements, circulars and important updates from departments across TIET." : (card.shortDescription ?? description ?? "");
      return { ...card, title, description, destination: isStudentNotices && card.destination === "/community-feedback" ? "/student-notices" : card.destination, icon: isStudentNotices && ["message", "MessageSquare"].includes(card.icon) ? "Megaphone" : card.icon, id: card.id || `card-${index}`, shortDescription, detailedDescription: card.detailedDescription ?? card.working ?? description ?? "", status: card.status === "Live" ? "Active" : (card.status || (card.comingSoon ? "Coming Soon" : "Active")), order: Number.isFinite(Number(card.order)) ? Number(card.order) : index };
    })
    : DEFAULT_PUBLIC_UI_CONFIG.selector.cards;
  const developerDefaults = new Map(DEFAULT_PUBLIC_UI_CONFIG.developers.map((developer) => [developer.id, developer]));
  const savedNavigation = Array.isArray(merged.navigation) ? merged.navigation : [];
  const navigation = savedNavigation
    .filter((item) => item.id !== "community-feedback")
    .map((item) => item.id === "services" ? {
      ...item,
      order: Math.max(5, Number(item.order) || 0),
      items: (item.items || []).filter((child) => child.id !== "community-feedback" && child.id !== "student-notices" && child.destination !== "/community-feedback" && child.destination !== "/student-notices"),
    } : item.id === "support" ? { ...item, order: Math.max(6, Number(item.order) || 0) } : item);
  const existingNoticeTab = navigation.find((item) => item.id === "student-notices" || item.destination === "/student-notices");
  if (existingNoticeTab) {
    Object.assign(existingNoticeTab, { id: "student-notices", title: "Student Notices", destination: "/student-notices", action: undefined, items: undefined, order: 4 });
  } else {
    navigation.push({ id: "student-notices", title: "Student Notices", destination: "/student-notices", enabled: true, order: 4 });
  }
  const footer = {
    ...merged.footer,
    quickLinks: (merged.footer?.quickLinks || []).map((item) => item.id === "community" || item.destination === "/community-feedback" ? { ...item, title: "Student Notices", destination: "/student-notices", action: undefined, target: undefined } : item),
  };

  return stripDatabaseFields({
    ...merged,
    navigation,
    footer,
    sections: Array.isArray(merged.sections) ? merged.sections : [],
    timeline: timelineSource.map((item, index) => ({
      ...item,
      id: item.id || `milestone-${index}`,
      title: item.title || item.label || "",
      description: item.description || item.desc || "",
      enabled: item.enabled !== false,
    })),
    developers: (Array.isArray(merged.developers) && merged.developers.length ? merged.developers : DEFAULT_PUBLIC_UI_CONFIG.developers).map((developer, index) => ({
      ...(developerDefaults.get(developer.id) || {}),
      ...developer,
      id: developer.id || `developer-${index}`,
      order: Number.isFinite(Number(developer.order)) ? Number(developer.order) : index,
      enabled: developer.enabled !== false,
    })),
    modals: isObject(merged.modals) ? merged.modals : {},
    selector: {
      ...merged.selector,
      cardOrder,
      cards,
      accentColor: merged.selector?.accentColor ?? DEFAULT_PUBLIC_UI_CONFIG.selector.accentColor,
    },
  });
};

export const getEnabledItems = sortEnabled;

const requestConfig = async (path, options = {}) => {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Public UI request failed (HTTP ${res.status})`);
  }
  return normalizePublicUiConfig(data?.config || {});
};

export const fetchPublicUiConfig = async () => requestConfig("/api/public-ui/config");

export const fetchAdminPublicUiConfig = async () => requestConfig("/api/public-ui/admin/config");

export const updatePublicUiConfig = async (config) => {
  const normalizedConfig = normalizePublicUiConfig(config || {});
  const editableConfig = stripDatabaseFields(normalizedConfig);

  return requestConfig("/api/public-ui/admin/config", {
    method: "PUT",
    body: JSON.stringify(editableConfig),
  });
};
