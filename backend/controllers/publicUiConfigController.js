import PublicUiConfig from "../models/PublicUiConfig.js";

const ALLOWED_CARD_IDS = [
  "guest-booking",
  "venue-booking",
  "event-calendar",
  "library-pass",
  "society-pass",
  "lost-found",
  "community-feedback",
];

const ALLOWED_LAYOUT_STYLES = [
  "grid-3",
  "grid-4",
  "grid-2",
  "list",
  "bento",
  "featured",
  "compact",
  "horizontal",
  "masonry",
];

const DEFAULT_PUBLIC_UI_CONFIG = {
  widgets: {
    developerText: "Created by DoSA Office",
    poweredByText: "Powered by Thapar Institute of Engineering & Technology",
    maintainedByText: "Created and Maintained by DoSA Office",
    systemStatusText: "System Online",
    systemOnline: true,
    echoEnabled: true,
  },
  selector: {
    title: "Thapar Campus Connect",
    subtitle: "Seamlessly Connected.",
    themePreset: "light",
    cardStyle: "default",
    layoutStyle: "grid-3",
    accentColor: "#c62828",
    cardOrder: [...ALLOWED_CARD_IDS],
    cards: [
      { id: "guest-booking", enabled: true, locked: false, lockMessage: "", title: "Hostel Guest Room Booking", subtitle: "Booking Form", description: "", destination: "https://campusconnect.thapar.edu/guest-room", features: ["Single & Double Occupancy Rooms", "Online Booking System", "Guest Registration & Verification", "Advance Booking up to 30 Days"], order: 0 },
      { id: "venue-booking", enabled: true, locked: false, lockMessage: "", title: "Event Venue Booking", subtitle: "Booking Form", description: "", destination: "https://campusconnect.thapar.edu/venue-enquiry", features: ["Auditorium & Seminar Hall Booking", "Open Air & Outdoor Spaces", "Equipment & AV Support Request", "Multi-day Event Scheduling"], order: 1 },
      { id: "event-calendar", enabled: true, locked: false, lockMessage: "", title: "Event Calendar", subtitle: "Campus-wide schedule", description: "", destination: "https://campusconnect.thapar.edu/event-calendar", features: ["Upcoming Fests & Competitions", "Department & Club Events", "Venue Availability Overview", "Monthly & Weekly View"], order: 2 },
      { id: "library-pass", enabled: true, locked: false, lockMessage: "", title: "Library Night Pass", subtitle: "2 pass categories", description: "", destination: "https://permissions.thapar.edu/", features: ["Overnight Study Access", "Research & Project Work", "Barcode Scanning", "Digital Pass on Mobile"], order: 3 },
      { id: "society-pass", enabled: true, locked: false, lockMessage: "", title: "Society Night Pass", subtitle: "Coming soon", description: "", destination: "", features: ["Late-Night Society Activities", "Cultural & Technical Clubs", "Coordinator Approval Flow", "Security Gate Integration"], order: 4 },
      { id: "lost-found", enabled: true, locked: false, lockMessage: "", title: "Lost & Found", subtitle: "Online Portal", description: "", destination: "https://campusconnect.thapar.edu/lostnfound", features: ["Report Lost Items Online", "Browse Found Item Listings", "Photo Upload & Description", "Claim & Handover Process"], order: 5 },
      { id: "community-feedback", enabled: true, locked: false, lockMessage: "", title: "Community & Feedback", subtitle: "Public forum", description: "", destination: "/community-feedback", features: ["Share Suggestions & Ideas", "Report Issues & Problems", "Ask Questions Publicly", "Like, Comment & Engage with Posts"], order: 6 },
    ],
  },
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

const deepMerge = (base, patch) => {
  if (!isObject(base)) return patch;
  const merged = { ...base };
  Object.keys(patch || {}).forEach((key) => {
    const baseValue = merged[key];
    const patchValue = patch[key];
    if (Array.isArray(patchValue)) merged[key] = patchValue;
    else if (isObject(baseValue) && isObject(patchValue)) merged[key] = deepMerge(baseValue, patchValue);
    else merged[key] = patchValue;
  });
  return merged;
};

const cleanText = (value, fallback = "") => String(value ?? fallback ?? "").replace(/[<>]/g, "").trim();

const sanitizeDestination = (value = "") => {
  const destination = cleanText(value);
  if (!destination) return "";
  const lower = destination.toLowerCase();
  if (["javascript:", "data:", "file:", "vbscript:"].some((scheme) => lower.startsWith(scheme))) {
    throw new Error("Unsafe destination URL rejected");
  }
  if (destination.startsWith("/") || lower.startsWith("http://") || lower.startsWith("https://")) return destination;
  throw new Error("Destination must start with /, http://, or https://");
};

const sanitizeCard = (inputCard = {}, fallbackCard = {}, index = 0) => ({
  id: fallbackCard.id,
  enabled: typeof inputCard.enabled === "boolean" ? inputCard.enabled : fallbackCard.enabled !== false,
  locked: typeof inputCard.locked === "boolean" ? inputCard.locked : fallbackCard.locked === true,
  lockMessage: cleanText(inputCard.lockMessage, fallbackCard.lockMessage),
  title: cleanText(inputCard.title, fallbackCard.title),
  subtitle: cleanText(inputCard.subtitle ?? inputCard.sub, fallbackCard.subtitle),
  description: cleanText(inputCard.description, fallbackCard.description),
  destination: sanitizeDestination(inputCard.destination ?? inputCard.href ?? fallbackCard.destination),
  action: cleanText(inputCard.action, fallbackCard.action),
  icon: cleanText(inputCard.icon, fallbackCard.icon),
  badge: cleanText(inputCard.badge, fallbackCard.badge),
  comingSoon: typeof inputCard.comingSoon === "boolean" ? inputCard.comingSoon : fallbackCard.comingSoon === true,
  accentColor: cleanText(inputCard.accentColor, fallbackCard.accentColor),
  cardColor: cleanText(inputCard.cardColor, fallbackCard.cardColor),
  ctaText: cleanText(inputCard.ctaText, fallbackCard.ctaText),
  order: Number.isFinite(Number(inputCard.order)) ? Number(inputCard.order) : index,
  features: Array.isArray(inputCard.features || inputCard.bullets)
    ? (inputCard.features || inputCard.bullets).map((item) => cleanText(item)).filter(Boolean).slice(0, 8)
    : fallbackCard.features || [],
});

const sanitizeCmsTree = (value) => {
  if (Array.isArray(value)) return value.map((item) => sanitizeCmsTree(item));
  if (!isObject(value)) return value;
  return Object.keys(value).reduce((acc, key) => {
    if (["destination", "href", "loginDestination", "backgroundUrl", "logoUrl"].includes(key)) {
      const raw = cleanText(value[key]);
      acc[key] = raw ? sanitizeDestination(raw) : "";
    } else {
      acc[key] = sanitizeCmsTree(value[key]);
    }
    return acc;
  }, {});
};

export const sanitizeConfig = (input = {}) => {
  const merged = deepMerge(DEFAULT_PUBLIC_UI_CONFIG, stripDatabaseFields(input || {}));
  const fallbackCards = new Map(DEFAULT_PUBLIC_UI_CONFIG.selector.cards.map((card) => [card.id, card]));
  const incomingCards = new Map((merged.selector?.cards || []).map((card) => [String(card?.id || ""), card]));

  const cards = ALLOWED_CARD_IDS.map((id, index) =>
    sanitizeCard(incomingCards.get(id) || {}, fallbackCards.get(id) || { id }, index)
  );
  const orderInput = Array.isArray(merged.selector?.cardOrder) ? merged.selector.cardOrder.map((id) => String(id || "")) : [];
  const cardOrder = [
    ...orderInput.filter((id, index, arr) => ALLOWED_CARD_IDS.includes(id) && arr.indexOf(id) === index),
    ...ALLOWED_CARD_IDS.filter((id) => !orderInput.includes(id)),
  ];

  const preserved = sanitizeCmsTree(merged);

  return stripDatabaseFields({
    ...preserved,
    widgets: {
      developerText: cleanText(merged.widgets?.developerText, DEFAULT_PUBLIC_UI_CONFIG.widgets.developerText),
      poweredByText: cleanText(merged.widgets?.poweredByText, DEFAULT_PUBLIC_UI_CONFIG.widgets.poweredByText),
      maintainedByText: cleanText(merged.widgets?.maintainedByText, DEFAULT_PUBLIC_UI_CONFIG.widgets.maintainedByText),
      systemStatusText: cleanText(merged.widgets?.systemStatusText, DEFAULT_PUBLIC_UI_CONFIG.widgets.systemStatusText),
      systemOnline: typeof merged.widgets?.systemOnline === "boolean" ? merged.widgets.systemOnline : true,
      echoEnabled: typeof merged.widgets?.echoEnabled === "boolean" ? merged.widgets.echoEnabled : true,
    },
    selector: {
      title: cleanText(merged.selector?.title, DEFAULT_PUBLIC_UI_CONFIG.selector.title),
      subtitle: cleanText(merged.selector?.subtitle, DEFAULT_PUBLIC_UI_CONFIG.selector.subtitle),
      themePreset: ["light", "cool", "warm", "slate"].includes(merged.selector?.themePreset) ? merged.selector.themePreset : "light",
      cardStyle: ["default", "shadow", "outline", "glass", "solid"].includes(merged.selector?.cardStyle) ? merged.selector.cardStyle : "default",
      layoutStyle: ALLOWED_LAYOUT_STYLES.includes(merged.selector?.layoutStyle) ? merged.selector.layoutStyle : "grid-3",
      accentColor: cleanText(merged.selector?.accentColor, "#c62828") || "#c62828",
      cardOrder,
      cards,
    },
  });
};

const publicSafeConfig = (config) => ({
  ...config,
  selector: {
    ...config.selector,
    cards: config.selector.cards,
  },
});

const getGlobalConfig = async () => {
  const doc = await PublicUiConfig.findOne({ key: "global" }).lean();
  return sanitizeConfig(doc || {});
};

export const getPublicUiConfig = async (req, res) => {
  try {
    const config = await getGlobalConfig();
    return res.json({ success: true, config: publicSafeConfig(config) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminPublicUiConfig = async (req, res) => {
  try {
    const config = await getGlobalConfig();
    return res.json({ success: true, config });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePublicUiConfig = async (req, res) => {
  try {
    const existing = await PublicUiConfig.findOne({ key: "global" }).lean();
    const sanitizedPayload = stripDatabaseFields(req.body || {});
    const config = sanitizeConfig(deepMerge(existing || {}, sanitizedPayload));
    const { key, ...editableConfig } = stripDatabaseFields(config);
    const updated = await PublicUiConfig.findOneAndUpdate(
      { key: "global" },
      { $set: { ...editableConfig, key: "global" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    return res.json({ success: true, config: sanitizeConfig(updated || config) });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
