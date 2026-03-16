import PublicUiConfig from "../models/PublicUiConfig.js";

const ALLOWED_CARD_IDS = [
  "guest-booking",
  "venue-booking",
  "feedback",
  "society-night-pass",
  "calendar",
  "lost-found",
];

const DEFAULT_PUBLIC_UI_CONFIG = {
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
    cardOrder: [...ALLOWED_CARD_IDS],
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
        id: "society-night-pass",
        enabled: true,
        title: "Society Night Pass",
        description: "Student society night event permissions",
        features: ["Google Login", "Raise Request", "Track Status"],
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

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const deepMerge = (base, patch) => {
  if (!isObject(base)) return patch;
  const merged = { ...base };
  Object.keys(patch || {}).forEach((key) => {
    const baseValue = merged[key];
    const patchValue = patch[key];

    if (Array.isArray(patchValue)) {
      merged[key] = patchValue;
      return;
    }

    if (isObject(baseValue) && isObject(patchValue)) {
      merged[key] = deepMerge(baseValue, patchValue);
      return;
    }

    merged[key] = patchValue;
  });
  return merged;
};

const cleanText = (value, fallback) => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const sanitizeCard = (inputCard = {}, fallbackCard = {}) => ({
  id: fallbackCard.id,
  enabled:
    typeof inputCard.enabled === "boolean"
      ? inputCard.enabled
      : typeof fallbackCard.enabled === "boolean"
      ? fallbackCard.enabled
      : true,
  title: cleanText(inputCard.title, fallbackCard.title || ""),
  description: cleanText(inputCard.description, fallbackCard.description || ""),
  features: Array.isArray(inputCard.features)
    ? inputCard.features.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6)
    : Array.isArray(fallbackCard.features)
    ? fallbackCard.features
    : [],
});

const sanitizeConfig = (input = {}) => {
  const merged = deepMerge(DEFAULT_PUBLIC_UI_CONFIG, input || {});

  const widgets = {
    developerText: cleanText(
      merged.widgets?.developerText,
      DEFAULT_PUBLIC_UI_CONFIG.widgets.developerText
    ),
    poweredByText: cleanText(
      merged.widgets?.poweredByText,
      DEFAULT_PUBLIC_UI_CONFIG.widgets.poweredByText
    ),
    maintainedByText: cleanText(
      merged.widgets?.maintainedByText,
      DEFAULT_PUBLIC_UI_CONFIG.widgets.maintainedByText
    ),
    systemStatusText: cleanText(
      merged.widgets?.systemStatusText,
      DEFAULT_PUBLIC_UI_CONFIG.widgets.systemStatusText
    ),
    systemOnline:
      typeof merged.widgets?.systemOnline === "boolean"
        ? merged.widgets.systemOnline
        : DEFAULT_PUBLIC_UI_CONFIG.widgets.systemOnline,
    echoEnabled:
      typeof merged.widgets?.echoEnabled === "boolean"
        ? merged.widgets.echoEnabled
        : DEFAULT_PUBLIC_UI_CONFIG.widgets.echoEnabled,
  };

  const themePreset = ["light", "cool", "warm", "slate"].includes(merged.selector?.themePreset)
    ? merged.selector.themePreset
    : DEFAULT_PUBLIC_UI_CONFIG.selector.themePreset;

  const cardStyle = ["glass", "solid", "outline"].includes(merged.selector?.cardStyle)
    ? merged.selector.cardStyle
    : DEFAULT_PUBLIC_UI_CONFIG.selector.cardStyle;

  const layoutStyle = ["grid-3", "grid-2", "list"].includes(merged.selector?.layoutStyle)
    ? merged.selector.layoutStyle
    : DEFAULT_PUBLIC_UI_CONFIG.selector.layoutStyle;

  const fallbackCardsMap = new Map(
    DEFAULT_PUBLIC_UI_CONFIG.selector.cards.map((card) => [card.id, card])
  );

  const incomingCards = Array.isArray(merged.selector?.cards) ? merged.selector.cards : [];
  const incomingCardsMap = new Map();

  incomingCards.forEach((card) => {
    const id = String(card?.id || "").trim();
    if (!ALLOWED_CARD_IDS.includes(id)) return;
    incomingCardsMap.set(id, card);
  });

  const cards = ALLOWED_CARD_IDS.map((id) => {
    const fallbackCard = fallbackCardsMap.get(id) || { id };
    const incomingCard = incomingCardsMap.get(id) || {};
    return sanitizeCard(incomingCard, fallbackCard);
  });

  const orderInput = Array.isArray(merged.selector?.cardOrder)
    ? merged.selector.cardOrder.map((id) => String(id || "").trim())
    : [];

  const cardOrder = [];
  orderInput.forEach((id) => {
    if (ALLOWED_CARD_IDS.includes(id) && !cardOrder.includes(id)) cardOrder.push(id);
  });
  ALLOWED_CARD_IDS.forEach((id) => {
    if (!cardOrder.includes(id)) cardOrder.push(id);
  });

  return {
    widgets,
    selector: {
      title: cleanText(merged.selector?.title, DEFAULT_PUBLIC_UI_CONFIG.selector.title),
      subtitle: cleanText(merged.selector?.subtitle, DEFAULT_PUBLIC_UI_CONFIG.selector.subtitle),
      themePreset,
      cardStyle,
      layoutStyle,
      cardOrder,
      cards,
    },
  };
};

export const getPublicUiConfig = async (req, res) => {
  try {
    const doc = await PublicUiConfig.findOne({ key: "global" }).lean();
    const config = sanitizeConfig(doc || {});
    return res.json({ success: true, config });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePublicUiConfig = async (req, res) => {
  try {
    const existing = await PublicUiConfig.findOne({ key: "global" }).lean();
    const mergedInput = deepMerge(existing || {}, req.body || {});
    const config = sanitizeConfig(mergedInput);

    const updated = await PublicUiConfig.findOneAndUpdate(
      { key: "global" },
      { key: "global", ...config },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ success: true, config: sanitizeConfig(updated || config) });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
