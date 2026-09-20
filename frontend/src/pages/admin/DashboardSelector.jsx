// src/pages/admin/DashboardSelector.jsx
//
// Campus Connect Workspace — the role-aware launch page shown after login.
//
// Access model (unchanged):
//  - Internal dashboards (Guest Room / Venue / Night Pass) come from
//    resolveDashboardAccess() + settings.dashboardRegistry.
//  - Everything else (campus portals, Grievance, Fretbox, admin tools) is
//    described in src/config/campusPortals.js and is independent of the
//    dashboardRegistry.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Calendar, Globe, X, ArrowRight, LayoutDashboard,
  MessageSquare, CalendarDays, ArrowLeft, ExternalLink, Menu, Star,
} from "lucide-react";
import EchoOrb from "../../components/EchoOrb";
import EchoModal from "../../components/EchoModal";
import { useAuth } from "../../context/AuthContext";
import useSystemSettings from "../../hooks/useSystemSettings";
import {
  resolveDashboardAccess,
  shouldAlwaysShowDashboardSelector,
} from "../../utils/dashboardAccess";
import { WorkspaceRail, WorkspaceDrawer } from "../../components/WorkspaceSidebar";
import {
  MAX_QUICK_ACCESS,
  PUBLIC_FORMS_ITEM,
  getWorkspaceItems,
  getWorkspaceRoleLabel,
  readQuickAccessIds,
  readSidebarPinned,
  writeQuickAccessIds,
  writeSidebarPinned,
} from "../../config/campusPortals";
import AdvancedAnalyticsPage from "./AdvancedAnalyticsPage";

const PublicFormsModal = ({ open, onClose }) => {
  if (!open) return null;

  const forms = [
    {
      title: "Hostel Guest Room Booking Form",
      description: "Book guest rooms for visitors",
      url: "http://campusconnect.thapar.edu/guest-enquiry",
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      hover: "hover:border-blue-400"
    },
    {
      title: "Guest Room Feedback Form",
      description: "Submit feedback for your stay",
      url: "http://campusconnect.thapar.edu/guest-feedback",
      icon: MessageSquare,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      hover: "hover:border-green-400"
    },
    {
      title: "Venue Booking Form",
      description: "Book venues for events",
      url: "http://campusconnect.thapar.edu/venue-enquiry",
      icon: Calendar,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200",
      hover: "hover:border-purple-400"
    },
    {
      title: "Event Calendar Page",
      description: "View upcoming events",
      url: "http://campusconnect.thapar.edu/event-calendar",
      icon: CalendarDays,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      hover: "hover:border-orange-400"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Globe className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                Public Forms
              </h2>
              <p className="text-sm text-slate-500">Access public booking portals and calendars</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50">
          {forms.map((form, index) => (
            <motion.a
              key={index}
              href={form.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-300 group bg-white ${form.border} ${form.hover} hover:shadow-lg cursor-pointer`}
            >
              <div className={`p-3 rounded-lg ${form.bg} ${form.color} group-hover:scale-110 transition-transform duration-300`}>
                <form.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {form.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {form.description}
                </p>
              </div>
            </motion.a>
          ))}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            These links open in a new tab
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Internal dashboard presentation (colour identity per dashboardRegistry key)
// ════════════════════════════════════════════════════════════════════════════
const DASHBOARD_UI = {
  guestRoom: {
    title: "Guest Room Dashboard",
    icon: Building2,
    gradient: "from-blue-600 via-blue-500 to-cyan-500",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  venue: {
    title: "Venue Booking Dashboard",
    icon: Calendar,
    gradient: "from-purple-600 via-purple-500 to-pink-500",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  night: {
    title: "Night Pass Dashboard",
    icon: LayoutDashboard,
    gradient: "from-slate-600 via-slate-500 to-indigo-500",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
  },
};

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 focus-visible:ring-offset-2";

// ════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD SELECTOR
// ════════════════════════════════════════════════════════════════════════════
const DashboardSelector = () => {
  const { currentUser } = useAuth();
  const role = (currentUser?.role || currentUser?.user?.role || "").toLowerCase();
  const [showPublicForms, setShowPublicForms] = useState(false);
  const [showEcho, setShowEcho] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Workspace UI preferences (sidebar pin + favourites) — never any auth data.
  const [sidebarPinned, setSidebarPinned] = useState(readSidebarPinned);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [favoritesVersion, setFavoritesVersion] = useState(0);
  const menuButtonRef = useRef(null);

  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const userName = currentUser?.name || "User";
  const { settings } = useSystemSettings();
  const dashboardAccess = resolveDashboardAccess(currentUser || {}, settings);

  const { campusPortals, adminTools, otherTools } = useMemo(() => getWorkspaceItems(role), [role]);
  const favoritableItems = useMemo(
    () => [...campusPortals, ...adminTools, ...otherTools].filter((item) => item.favoritable),
    [campusPortals, adminTools, otherTools]
  );
  const quickAccessItems = useMemo(() => {
    const byId = new Map(favoritableItems.map((item) => [item.id, item]));
    const ids = readQuickAccessIds(role, favoritableItems.map((item) => item.id));
    return ids.map((id) => byId.get(id));
    // favoritesVersion re-reads localStorage after a toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, favoritableItems, favoritesVersion]);
  const favoriteIds = useMemo(
    () => new Set(quickAccessItems.map((item) => item.id)),
    [quickAccessItems]
  );

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // A drawer left open across a resize to desktop would otherwise reappear
  // when shrinking again.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setDrawerOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (
    dashboardAccess.dashboards.length === 1 &&
    dashboardAccess.skipSelectorWhenSingle &&
    !shouldAlwaysShowDashboardSelector(role)
  ) {
    const onlyDashboard = (settings?.dashboardRegistry || []).find(
      (dashboard) => dashboard.key === dashboardAccess.dashboards[0]
    );
    if (onlyDashboard?.path) {
      return <Navigate to={onlyDashboard.path} replace />;
    }
  }

  const dashboards = (settings?.dashboardRegistry || [])
    .filter((dashboard) => dashboard.active && dashboardAccess.dashboards.includes(dashboard.key))
    .map((dashboard) => {
      const ui = DASHBOARD_UI[dashboard.key] || DASHBOARD_UI.guestRoom;
      return {
        id: dashboard.key,
        title: dashboard.label || ui.title,
        description: dashboard.description || ui.title,
        icon: ui.icon,
        gradient: ui.gradient,
        iconBg: ui.iconBg,
        iconColor: ui.iconColor,
        target: { type: "route", path: dashboard.path },
      };
    });

  // ─── Navigation ───────────────────────────────────────────────────────────
  const openItem = (item) => {
    const { target } = item;
    switch (target.type) {
      case "external":
        // New tab keeps the workspace open. The external portal owns its own
        // session; nothing is passed to it from here.
        window.open(target.url, "_blank", "noopener,noreferrer");
        break;
      case "route":
        navigate(target.path);
        break;
      case "redirect":
        // Separate app on the same domain (not in this SPA's router).
        window.location.href = target.path;
        break;
      case "action":
        if (target.action === "showAnalytics") setShowAnalytics(true);
        if (target.action === "showPublicForms") setShowPublicForms(true);
        break;
      default:
        break;
    }
  };

  const toggleSidebarPinned = () => {
    const next = !sidebarPinned;
    setSidebarPinned(next);
    writeSidebarPinned(next);
  };

  const canFavorite = quickAccessItems.length < MAX_QUICK_ACCESS;
  const toggleFavorite = (item) => {
    const currentIds = quickAccessItems.map((entry) => entry.id);
    const next = currentIds.includes(item.id)
      ? currentIds.filter((id) => id !== item.id)
      : currentIds.length < MAX_QUICK_ACCESS
      ? [...currentIds, item.id]
      : currentIds;
    writeQuickAccessIds(role, next);
    setFavoritesVersion((version) => version + 1);
  };

  // ─── Sidebar sections (Workspaces come from the dashboardRegistry result) ──
  const sidebarSections = [
    { key: "workspaces", title: "Workspaces", items: dashboards },
    { key: "campus-portals", title: "Campus Portals", items: campusPortals },
    { key: "admin-tools", title: "Admin Tools", items: adminTools },
    { key: "other-tools", title: "Other Tools", items: otherTools },
  ];
  const sidebarProps = {
    sections: sidebarSections,
    footerItems: [PUBLIC_FORMS_ITEM],
    favoriteIds,
    canFavorite,
    onSelect: openItem,
    onToggleFavorite: toggleFavorite,
  };

  // If Analytics view is active (Admin only)
  if (showAnalytics && isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 relative">
        <div className="fixed top-4 left-4 z-50">
           <button onClick={() => setShowAnalytics(false)}
             className="bg-white border border-slate-200 shadow-lg px-4 py-2 rounded-xl flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-all hover:scale-105">
             <ArrowRight className="w-4 h-4 rotate-180" /> Back to Dashboard
           </button>
        </div>
        <div className="p-8 pt-16">
          <AdvancedAnalyticsPage />
        </div>
        {/* Echo FAB still visible in Analytics */}
        <EchoOrb onClick={() => setShowEcho(true)} />
        <AnimatePresence>
          {showEcho && <EchoModal open={showEcho} onClose={()=>setShowEcho(false)} role={role} userName={userName}/>}
        </AnimatePresence>
      </div>
    );
  }

  const roleLabel = getWorkspaceRoleLabel(role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 lg:flex">
      <WorkspaceRail
        {...sidebarProps}
        pinned={sidebarPinned}
        onTogglePin={toggleSidebarPinned}
      />
      <WorkspaceDrawer
        {...sidebarProps}
        open={drawerOpen}
        onClose={closeDrawer}
        returnFocusRef={menuButtonRef}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="border-b border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <button
              type="button"
              ref={menuButtonRef}
              onClick={() => setDrawerOpen(true)}
              aria-label="Open workspace menu"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:text-slate-900 lg:hidden ${FOCUS_RING}`}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <img
              src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744"
              alt="Thapar Institute Logo"
              className="h-10 w-auto shrink-0 object-contain sm:h-12"
            />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1
                  className="text-[28px] font-bold leading-tight text-slate-900 sm:text-[32px] lg:text-[36px]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Campus Connect
                </h1>
                <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  {roleLabel} Workspace
                </span>
              </div>
              <p className="text-sm text-slate-500">Your campus operations workspace</p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/")}
              aria-label="Back"
              className={`ml-auto flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 ${FOCUS_RING}`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden text-sm font-semibold sm:inline">Back</span>
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mx-auto max-w-6xl space-y-8"
          >
            {/* Quick Access */}
            {favoritableItems.length > 0 && (
              <section aria-labelledby="quick-access-heading">
                <div className="mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <h2
                    id="quick-access-heading"
                    className="text-sm font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Quick Access
                  </h2>
                </div>

                {quickAccessItems.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,240px))]">
                    {quickAccessItems.map((item) => {
                      const Icon = item.icon;
                      const LinkIcon = item.external ? ExternalLink : ArrowRight;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openItem(item)}
                          aria-label={item.external ? `${item.title} (opens in new tab)` : item.title}
                          className={`group flex items-center gap-3 rounded-xl border border-slate-200 bg-white/90 p-3 text-left shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md ${FOCUS_RING}`}
                        >
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.iconBg}`}>
                            <Icon className={`h-[18px] w-[18px] ${item.iconColor}`} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">
                              {item.title}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              {item.description}
                            </span>
                          </span>
                          <LinkIcon
                            className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500"
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-500">
                    Nothing pinned yet. Use the star next to a portal in the sidebar to add it here.
                  </p>
                )}
              </section>
            )}

            {/* Internal dashboards */}
            <section aria-labelledby="dashboards-heading">
              <h2
                id="dashboards-heading"
                className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500"
              >
                Dashboards
              </h2>

              {dashboards.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {dashboards.map((dashboard) => {
                    const Icon = dashboard.icon;
                    return (
                      <button
                        key={dashboard.id}
                        type="button"
                        onClick={() => openItem(dashboard)}
                        className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg ${FOCUS_RING}`}
                      >
                        <span
                          className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${dashboard.gradient}`}
                          aria-hidden="true"
                        />
                        <span className="flex items-start gap-3">
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${dashboard.iconBg}`}>
                            <Icon className={`h-5 w-5 ${dashboard.iconColor}`} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-base font-bold text-slate-900">
                              {dashboard.title}
                            </span>
                            <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-slate-500">
                              {dashboard.description}
                            </span>
                          </span>
                        </span>
                        <span
                          className={`mt-3 inline-flex items-center gap-1.5 bg-gradient-to-r ${dashboard.gradient} bg-clip-text text-sm font-semibold text-transparent`}
                        >
                          Open Dashboard
                          <ArrowRight
                            className={`h-4 w-4 ${dashboard.iconColor} transition-transform duration-200 group-hover:translate-x-1`}
                            aria-hidden="true"
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-500">
                  No dashboards are assigned to your account.
                </p>
              )}
            </section>
          </motion.div>
        </main>

        <footer className="border-t border-slate-200/70 px-4 py-3 text-center text-xs text-slate-400">
          Created and Maintained by DoSA Office © 2026
        </footer>
      </div>

      {/* ECHO FAB */}
      <EchoOrb onClick={() => setShowEcho(true)} />

      <AnimatePresence>
        {showEcho && <EchoModal open={showEcho} onClose={()=>setShowEcho(false)} role={role} userName={userName}/>}
      </AnimatePresence>

      <PublicFormsModal open={showPublicForms} onClose={() => setShowPublicForms(false)} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;600;700&display=swap');
      `}</style>
    </div>
  );
};

export default DashboardSelector;
