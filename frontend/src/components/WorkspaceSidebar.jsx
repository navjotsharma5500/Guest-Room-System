// src/components/WorkspaceSidebar.jsx
//
// Left navigation for the Campus Connect workspace (DashboardSelector).
//  - WorkspaceRail:   desktop rail. 60px icon strip that expands to 270px on
//                     hover/keyboard focus, or stays expanded when pinned.
//  - WorkspaceDrawer: mobile/tablet overlay drawer (no hover reliance).
// Both render the same SidebarBody. This component is presentational: it never
// decides access — it only renders the sections it is handed.
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Pin, PinOff, Star, X } from "lucide-react";

export const SIDEBAR_COLLAPSED_WIDTH = 60;
export const SIDEBAR_EXPANDED_WIDTH = 270;

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 focus-visible:ring-offset-1";

const SidebarItem = ({ item, expanded, favorite, canFavorite, onSelect, onToggleFavorite }) => {
  const Icon = item.icon;
  const showStar = expanded && item.favoritable;
  const label = item.external ? `${item.title} (opens in new tab)` : item.title;

  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => onSelect(item)}
        aria-label={label}
        title={expanded ? undefined : item.title}
        className={`flex h-10 w-full items-center gap-3 rounded-xl px-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 ${FOCUS_RING} ${
          showStar ? "pr-10" : ""
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.iconBg}`}
        >
          <Icon className={`h-4 w-4 ${item.iconColor}`} aria-hidden="true" />
        </span>
        <span
          className={`min-w-0 flex-1 truncate whitespace-nowrap transition-opacity duration-150 ${
            expanded ? "opacity-100" : "opacity-0"
          }`}
        >
          {item.title}
        </span>
        {expanded && item.external && (
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
        )}
      </button>

      {showStar && (
        <button
          type="button"
          aria-pressed={favorite}
          aria-label={
            favorite
              ? `Remove ${item.title} from Quick Access`
              : `Add ${item.title} to Quick Access`
          }
          title={
            favorite
              ? "Remove from Quick Access"
              : canFavorite
              ? "Add to Quick Access"
              : "Quick Access is full"
          }
          disabled={!favorite && !canFavorite}
          onClick={() => onToggleFavorite(item)}
          className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-amber-50 hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-300 ${FOCUS_RING}`}
        >
          <Star
            className={`h-4 w-4 ${favorite ? "fill-amber-400 text-amber-500" : ""}`}
            aria-hidden="true"
          />
        </button>
      )}
    </li>
  );
};

const SidebarBody = ({
  mode,
  expanded,
  pinned,
  onTogglePin,
  onClose,
  closeButtonRef,
  sections,
  footerItems = [],
  favoriteIds,
  canFavorite,
  onSelect,
  onToggleFavorite,
}) => {
  const renderItem = (item) => (
    <SidebarItem
      key={item.id}
      item={item}
      expanded={expanded}
      favorite={favoriteIds.has(item.id)}
      canFavorite={canFavorite}
      onSelect={onSelect}
      onToggleFavorite={onToggleFavorite}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top row: pin control (rail) / title + close (drawer) */}
      <div className="flex h-14 shrink-0 items-center border-b border-slate-100 px-2">
        {mode === "rail" ? (
          <button
            type="button"
            onClick={onTogglePin}
            aria-pressed={pinned}
            aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
            title={expanded ? undefined : "Pin sidebar open"}
            className={`flex h-10 w-full items-center gap-3 rounded-xl px-2 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 ${FOCUS_RING}`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                pinned ? "bg-red-600 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {pinned ? (
                <PinOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Pin className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <span
              className={`min-w-0 flex-1 truncate whitespace-nowrap transition-opacity duration-150 ${
                expanded ? "opacity-100" : "opacity-0"
              }`}
            >
              {pinned ? "Sidebar pinned" : "Pin sidebar"}
            </span>
          </button>
        ) : (
          <>
            <span
              className="flex-1 px-2 text-base font-bold text-slate-900"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Campus Connect
            </span>
            <button
              type="button"
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="Close workspace menu"
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 ${FOCUS_RING}`}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Grouped navigation */}
      <nav
        aria-label={mode === "rail" ? "Workspace navigation" : "Workspace menu navigation"}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3"
      >
        {sections
          .filter((section) => section.items.length > 0)
          .map((section, index) => (
            <div key={section.key} className={index === 0 ? "" : "mt-4"}>
              {expanded ? (
                <h3 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.title}
                </h3>
              ) : (
                index > 0 && <div className="mx-2 mb-2 border-t border-slate-200" aria-hidden="true" />
              )}
              <ul aria-label={section.title} className="space-y-0.5">
                {section.items.map(renderItem)}
              </ul>
            </div>
          ))}
      </nav>

      {footerItems.length > 0 && (
        <div className="shrink-0 border-t border-slate-100 px-2 py-2">
          <ul className="space-y-0.5">{footerItems.map(renderItem)}</ul>
        </div>
      )}
    </div>
  );
};

// ─── Desktop rail ───────────────────────────────────────────────────────────
export const WorkspaceRail = ({ pinned, onTogglePin, ...bodyProps }) => {
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const expanded = pinned || hovered || keyboardFocus;

  const handleFocus = (event) => {
    // Expand for keyboard users only; a mouse click must not keep it open.
    try {
      if (event.target.matches(":focus-visible")) setKeyboardFocus(true);
    } catch {
      /* :focus-visible unsupported — hover / pin still work */
    }
  };
  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false);
  };

  return (
    // The wrapper reserves layout space (60px, or 270px when pinned) so the
    // page never jumps; the aside itself overlays content while hover-expanded.
    <div
      className="sticky top-0 z-30 hidden h-screen shrink-0 self-start transition-[width] duration-200 ease-out lg:block"
      style={{ width: pinned ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH }}
    >
      <aside
        aria-label="Workspace sidebar"
        data-expanded={expanded ? "true" : "false"}
        data-pinned={pinned ? "true" : "false"}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`absolute inset-y-0 left-0 overflow-hidden border-r border-slate-200 bg-white transition-[width,box-shadow] duration-200 ease-out ${
          expanded && !pinned ? "shadow-xl shadow-slate-900/10" : ""
        }`}
        style={{ width: expanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH }}
      >
        <SidebarBody
          {...bodyProps}
          mode="rail"
          expanded={expanded}
          pinned={pinned}
          onTogglePin={onTogglePin}
        />
      </aside>
    </div>
  );
};

// ─── Mobile / tablet drawer ─────────────────────────────────────────────────
const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export const WorkspaceDrawer = ({ open, onClose, returnFocusRef, onSelect, ...bodyProps }) => {
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Move focus into the drawer on open and hand it back to the opener on close.
  useEffect(() => {
    if (!open) return undefined;
    closeButtonRef.current?.focus();
    const opener = returnFocusRef?.current;
    return () => opener?.focus?.();
  }, [open, returnFocusRef]);

  // Escape closes; Tab is kept inside the drawer while it is open.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll(FOCUSABLE);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            data-testid="workspace-drawer-backdrop"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Workspace menu"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] bg-white shadow-2xl"
          >
            <SidebarBody
              {...bodyProps}
              mode="drawer"
              expanded
              onClose={onClose}
              closeButtonRef={closeButtonRef}
              // Selecting anything is navigation: run it, then dismiss the drawer.
              onSelect={(item) => {
                onSelect(item);
                onClose();
              }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
