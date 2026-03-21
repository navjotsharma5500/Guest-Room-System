import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  Calendar,
  Users,
  Globe,
  Search,
  Sparkles,
  Lock,
  MessageSquare,
  ArrowRight,
  LogIn,
  SlidersHorizontal,
  Eye,
  Save,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PublicPageWidgets from "../components/PublicPageWidgets";
import { DEFAULT_PUBLIC_UI_CONFIG, fetchPublicUiConfig } from "../utils/publicUiConfig";

const LOCAL_PREFS_KEY = "public_dashboard_selector_local_prefs_v1";

const CARD_META = {
  "guest-booking": {
    icon: Building2,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    action: (navigate) => navigate("/guest-enquiry"),
    authRequired: true,
  },
  "venue-booking": {
    icon: Calendar,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    action: (navigate) => navigate("/venue-guest-enquiry"),
    authRequired: true,
  },
  feedback: {
    icon: MessageSquare,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
    action: (navigate) => navigate("/guest-feedback"),
    authRequired: true,
  },
  "society-night-pass": {
    icon: Users,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    action: () => window.open("https://permissions.thapar.edu", "_blank"),
    authRequired: false,
    badge: { label: "PUBLIC", bg: "bg-rose-100", text: "text-rose-700" },
  },
  calendar: {
    icon: Globe,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    action: (navigate) => navigate("/venue-event-calendar"),
    authRequired: false,
  },
  "lost-found": {
    icon: Search,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    action: () => window.open("https://lost-and-found-portal-six.vercel.app/", "_blank"),
    authRequired: false,
  },
};

const CARD_LABELS = {
  "guest-booking": "Guest Booking",
  "venue-booking": "Venue Booking",
  feedback: "Feedback",
  "society-night-pass": "Library Night Permission",
  calendar: "Event Calendar",
  "lost-found": "Lost & Found",
};

const THEME_CLASSES = {
  light: "bg-gradient-to-br from-slate-50 via-white to-blue-50",
  cool: "bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100",
  warm: "bg-gradient-to-br from-amber-50 via-rose-50 to-orange-100",
  slate: "bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-100",
};

const CARD_STYLE_CLASSES = {
  glass: "bg-white/80 backdrop-blur-sm border-slate-200 hover:border-slate-300 hover:shadow-2xl",
  solid: "bg-white border-slate-300 hover:border-slate-400 hover:shadow-2xl",
  outline: "bg-transparent border-slate-300 hover:border-slate-500 hover:bg-white/60 hover:shadow-xl",
};

const GRID_CLASSES = {
  "grid-3": "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl w-full",
  "grid-2": "grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl w-full",
  list: "grid grid-cols-1 gap-6 max-w-5xl w-full",
};

const makeDefaultPrefs = (selectorConfig) => ({
  themePreset: selectorConfig.themePreset || "light",
  cardStyle: selectorConfig.cardStyle || "glass",
  layoutStyle: selectorConfig.layoutStyle || "grid-3",
  accentColor: "#2563eb",
  cardOrder: Array.isArray(selectorConfig.cardOrder)
    ? [...selectorConfig.cardOrder]
    : [...DEFAULT_PUBLIC_UI_CONFIG.selector.cardOrder],
  hiddenCardIds: [],
});

const sanitizePrefs = (prefs, selectorConfig) => {
  const safe = makeDefaultPrefs(selectorConfig);
  if (!prefs || typeof prefs !== "object") return safe;

  if (["light", "cool", "warm", "slate"].includes(prefs.themePreset)) {
    safe.themePreset = prefs.themePreset;
  }

  if (["glass", "solid", "outline"].includes(prefs.cardStyle)) {
    safe.cardStyle = prefs.cardStyle;
  }

  if (["grid-3", "grid-2", "list"].includes(prefs.layoutStyle)) {
    safe.layoutStyle = prefs.layoutStyle;
  }

  if (typeof prefs.accentColor === "string" && /^#([0-9A-Fa-f]{6})$/.test(prefs.accentColor)) {
    safe.accentColor = prefs.accentColor;
  }

  const allowed = new Set(Object.keys(CARD_META));

  if (Array.isArray(prefs.cardOrder)) {
    const ordered = [];
    prefs.cardOrder.forEach((id) => {
      const value = String(id || "").trim();
      if (allowed.has(value) && !ordered.includes(value)) ordered.push(value);
    });
    Object.keys(CARD_META).forEach((id) => {
      if (!ordered.includes(id)) ordered.push(id);
    });
    safe.cardOrder = ordered;
  }

  if (Array.isArray(prefs.hiddenCardIds)) {
    safe.hiddenCardIds = prefs.hiddenCardIds
      .map((id) => String(id || "").trim())
      .filter((id) => allowed.has(id));
  }

  return safe;
};

const appendMissingCardIds = (ids) => {
  const ordered = [];
  (Array.isArray(ids) ? ids : []).forEach((id) => {
    const value = String(id || "").trim();
    if (CARD_META[value] && !ordered.includes(value)) ordered.push(value);
  });
  Object.keys(CARD_META).forEach((id) => {
    if (!ordered.includes(id)) ordered.push(id);
  });
  return ordered;
};

const readLocalPrefs = (selectorConfig) => {
  try {
    const raw = localStorage.getItem(LOCAL_PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return sanitizePrefs(parsed, selectorConfig);
  } catch {
    return null;
  }
};

const applyLocalPrefsToSelector = (selectorConfig, prefs) => {
  if (!prefs) return selectorConfig;
  return {
    ...selectorConfig,
    themePreset: prefs.themePreset,
    cardStyle: prefs.cardStyle,
    layoutStyle: prefs.layoutStyle,
    accentColor: prefs.accentColor,
    cardOrder: prefs.cardOrder,
    cards: (selectorConfig.cards || []).map((card) => ({
      ...card,
      enabled: !prefs.hiddenCardIds.includes(card.id),
    })),
  };
};

const PublicDashboardSelector = () => {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [uiConfig, setUiConfig] = useState(DEFAULT_PUBLIC_UI_CONFIG);
  const [localPrefs, setLocalPrefs] = useState(() =>
    readLocalPrefs(DEFAULT_PUBLIC_UI_CONFIG.selector)
  );
  const [draftPrefs, setDraftPrefs] = useState(() =>
    readLocalPrefs(DEFAULT_PUBLIC_UI_CONFIG.selector) ||
      makeDefaultPrefs(DEFAULT_PUBLIC_UI_CONFIG.selector)
  );
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const role = String(currentUser?.role || currentUser?.user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const userEmail = String(currentUser?.email || currentUser?.user?.email || "").toLowerCase();

  useEffect(() => {
    if (!currentUser) return;
    if (userEmail === "adosa3@thapar.edu" || role === "assistant") {
      navigate("/venue-booking", { replace: true });
    }
  }, [currentUser, userEmail, role, navigate]);

  useEffect(() => {
    let mounted = true;

    const loadConfig = async () => {
      try {
        const config = await fetchPublicUiConfig();
        if (!mounted) return;
        setUiConfig(config);
      } catch (error) {
        console.error("Failed to load public selector config:", error.message);
      }
    };

    loadConfig();

    return () => {
      mounted = false;
    };
  }, []);

  const selectorConfig = uiConfig?.selector || DEFAULT_PUBLIC_UI_CONFIG.selector;

  const effectiveSelector = useMemo(() => {
    const base = selectorConfig;
    if (previewMode && draftPrefs) {
      return applyLocalPrefsToSelector(base, draftPrefs);
    }
    if (localPrefs) {
      return applyLocalPrefsToSelector(base, localPrefs);
    }
    return base;
  }, [selectorConfig, localPrefs, draftPrefs, previewMode]);

  const cards = useMemo(() => {
    const cardsById = new Map();
    (effectiveSelector.cards || []).forEach((card) => {
      if (!card?.id || !CARD_META[card.id]) return;
      cardsById.set(card.id, card);
    });
    const defaultCardsById = new Map();
    (DEFAULT_PUBLIC_UI_CONFIG.selector.cards || []).forEach((card) => {
      if (!card?.id || !CARD_META[card.id]) return;
      defaultCardsById.set(card.id, card);
    });

    const orderedIds = Array.isArray(effectiveSelector.cardOrder)
      ? appendMissingCardIds(effectiveSelector.cardOrder)
      : appendMissingCardIds(DEFAULT_PUBLIC_UI_CONFIG.selector.cardOrder);

    return orderedIds
      .filter((id) => CARD_META[id])
      .map((id) => {
        const meta = CARD_META[id];
        const cfg = cardsById.get(id) || defaultCardsById.get(id) || {};
        return {
          id,
          title: cfg.title || CARD_LABELS[id] || id,
          description: cfg.description || "",
          features: Array.isArray(cfg.features) ? cfg.features : [],
          enabled: cfg.enabled !== false,
          ...meta,
        };
      })
      .filter((card) => card.enabled);
  }, [effectiveSelector]);

  const updateDraft = (patch) => {
    setDraftPrefs((prev) => {
      const source = prev || makeDefaultPrefs(selectorConfig);
      return { ...source, ...patch };
    });
  };

  const moveDraftCard = (id, direction) => {
    setDraftPrefs((prev) => {
      const source = prev || makeDefaultPrefs(selectorConfig);
      const order = [...source.cardOrder];
      const index = order.indexOf(id);
      if (index < 0) return source;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= order.length) return source;
      [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
      return { ...source, cardOrder: order };
    });
  };

  const toggleDraftCardHidden = (id) => {
    setDraftPrefs((prev) => {
      const source = prev || makeDefaultPrefs(selectorConfig);
      const hidden = new Set(source.hiddenCardIds || []);
      if (hidden.has(id)) hidden.delete(id);
      else hidden.add(id);
      return { ...source, hiddenCardIds: [...hidden] };
    });
  };

  const onSaveMyView = () => {
    const sanitized = sanitizePrefs(draftPrefs, selectorConfig);
    localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(sanitized));
    setLocalPrefs(sanitized);
    setPreviewMode(false);
  };

  const onResetMyView = () => {
    localStorage.removeItem(LOCAL_PREFS_KEY);
    setLocalPrefs(null);
    setDraftPrefs(makeDefaultPrefs(selectorConfig));
    setPreviewMode(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const accentColor = effectiveSelector.accentColor || "#2563eb";

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${
        THEME_CLASSES[effectiveSelector.themePreset] || THEME_CLASSES.light
      }`}
    >
      <div className="fixed top-4 left-4 z-50 flex flex-col gap-2">
        <button
          onClick={() => setShowCustomizer(true)}
          className="px-4 py-2 rounded-xl bg-white/90 border border-slate-200 shadow-md text-slate-700 hover:text-blue-700 hover:border-blue-300 transition flex items-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Customize My View
        </button>

        {isAdmin ? (
          <button
            onClick={() => navigate("/admin/public-ui-customizer")}
            className="px-4 py-2 rounded-xl bg-white/90 border border-slate-200 shadow-md text-slate-700 hover:text-rose-700 hover:border-rose-300 transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Admin Public UI
          </button>
        ) : null}
      </div>

      {showCustomizer ? (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm p-4 flex items-start justify-center overflow-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4 mt-12">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-semibold text-slate-900">Customize My Dashboard View</h2>
              <button
                onClick={() => {
                  setShowCustomizer(false);
                  setPreviewMode(false);
                }}
                className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              These settings are saved only in your browser. They do not change footer, heading, or logo.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="text-sm font-medium text-slate-700 block">
                Theme
                <select
                  value={draftPrefs?.themePreset || "light"}
                  onChange={(e) => updateDraft({ themePreset: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300"
                >
                  <option value="light">Light</option>
                  <option value="cool">Cool</option>
                  <option value="warm">Warm</option>
                  <option value="slate">Slate</option>
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700 block">
                Card Style
                <select
                  value={draftPrefs?.cardStyle || "glass"}
                  onChange={(e) => updateDraft({ cardStyle: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300"
                >
                  <option value="glass">Glass</option>
                  <option value="solid">Solid</option>
                  <option value="outline">Outline</option>
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700 block">
                Layout
                <select
                  value={draftPrefs?.layoutStyle || "grid-3"}
                  onChange={(e) => updateDraft({ layoutStyle: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300"
                >
                  <option value="grid-3">Grid 3</option>
                  <option value="grid-2">Grid 2</option>
                  <option value="list">List</option>
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700 block">
                Accent Color
                <input
                  type="color"
                  value={draftPrefs?.accentColor || "#2563eb"}
                  onChange={(e) => updateDraft({ accentColor: e.target.value })}
                  className="mt-1 w-full h-10 px-1 py-1 rounded-lg border border-slate-300"
                />
              </label>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">Buttons (order and visibility)</h3>
              {(draftPrefs?.cardOrder || []).map((id, index) => {
                const hidden = (draftPrefs?.hiddenCardIds || []).includes(id);
                return (
                  <div key={id} className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{CARD_LABELS[id] || id}</p>
                      <p className="text-xs text-slate-500">{hidden ? "Hidden" : "Visible"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveDraftCard(id, "up")}
                        className="p-1.5 rounded border border-slate-300 disabled:opacity-40"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index === (draftPrefs?.cardOrder || []).length - 1}
                        onClick={() => moveDraftCard(id, "down")}
                        className="p-1.5 rounded border border-slate-300 disabled:opacity-40"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDraftCardHidden(id)}
                        className={`px-3 py-1 rounded text-xs font-semibold border ${
                          hidden
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : "border-emerald-300 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {hidden ? "Show" : "Hide"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 justify-end pt-2">
              <button
                onClick={() => setPreviewMode((prev) => !prev)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {previewMode ? "Stop Preview" : "Preview"}
              </button>
              <button
                onClick={onResetMyView}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset My View
              </button>
              <button
                onClick={onSaveMyView}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save on This Device
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], opacity: [0.03, 0.06, 0.03] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0], opacity: [0.03, 0.06, 0.03] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-br from-red-400 to-orange-400 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-12 pb-32">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16 relative w-full max-w-7xl mx-auto"
        >
          <div className="w-full flex justify-end md:absolute md:top-0 md:right-0 md:w-auto mb-4 md:mb-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span className="text-sm font-semibold">Admin / Staff Login</span>
            </motion.button>
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="inline-flex items-center justify-center mb-6"
          >
            <img
              src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744"
              alt="Thapar Institute Logo"
              className="h-24 w-auto object-contain"
            />
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 pb-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {selectorConfig.title}
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-xl md:text-2xl text-slate-600 font-light"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {selectorConfig.subtitle}
          </motion.p>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="w-24 h-1 mx-auto mt-6 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className={GRID_CLASSES[effectiveSelector.layoutStyle] || GRID_CLASSES["grid-3"]}
        >
          {cards.map((dashboard) => {
            const Icon = dashboard.icon;
            const isHovered = hoveredCard === dashboard.id;

            return (
              <motion.div
                key={dashboard.id}
                variants={itemVariants}
                onMouseEnter={() => setHoveredCard(dashboard.id)}
                onMouseLeave={() => setHoveredCard(null)}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative group"
              >
                <button
                  onClick={() => dashboard.action(navigate, currentUser)}
                  className={`w-full h-full p-8 rounded-3xl border-2 shadow-xl transition-all duration-500 text-left cursor-pointer ${
                    CARD_STYLE_CLASSES[effectiveSelector.cardStyle] || CARD_STYLE_CLASSES.glass
                  }`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <motion.div
                      animate={
                        isHovered
                          ? {
                              rotate: [0, -5, 5, -5, 0],
                              scale: [1, 1.05, 1],
                            }
                          : {}
                      }
                      transition={{ duration: 0.5 }}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center ${dashboard.iconBg} shadow-lg`}
                    >
                      <Icon className={`w-8 h-8 ${dashboard.iconColor}`} />
                    </motion.div>

                    {dashboard.authRequired && !currentUser ? (
                      <div className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 border border-slate-200">
                        <Lock className="w-3 h-3" />
                        Google Auth
                      </div>
                    ) : null}

                    {dashboard.badge ? (
                      <div
                        className={`${dashboard.badge.bg} ${dashboard.badge.text} px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1`}
                      >
                        <Sparkles className="w-3 h-3" />
                        {dashboard.badge.label}
                      </div>
                    ) : null}
                  </div>

                  <h3
                    className="text-2xl font-bold text-slate-900 mb-3"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {dashboard.title}
                  </h3>

                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">{dashboard.description}</p>

                  <div className="space-y-2 mb-6">
                    {dashboard.features.map((feature, idx) => (
                      <motion.div
                        key={`${dashboard.id}-feature-${idx}`}
                        className="flex items-center gap-2 text-slate-500"
                        initial={{ opacity: 0.6, x: 0 }}
                        whileHover={{ opacity: 1, x: 4 }}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${dashboard.iconBg
                            .replace("bg-", "bg-")
                            .replace("100", "400")}`}
                        />
                        <span className="text-xs font-medium">{feature}</span>
                      </motion.div>
                    ))}
                  </div>

                  <div
                    className="flex items-center gap-2 font-semibold text-sm group-hover:translate-x-2 transition-transform duration-300"
                    style={{ color: accentColor }}
                  >
                    {dashboard.authRequired && !currentUser ? "Login to Access" : "Open Portal"}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <PublicPageWidgets
        footerMode="flow"
        footerClassName="mt-12 w-full"
        echoClassName="bottom-24"
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;600;700&display=swap');
      `}</style>
    </div>
  );
};

export default PublicDashboardSelector;


