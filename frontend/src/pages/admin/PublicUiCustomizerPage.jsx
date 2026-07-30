import React, { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DEFAULT_PUBLIC_UI_CONFIG,
  fetchAdminPublicUiConfig,
  normalizePublicUiConfig,
  updatePublicUiConfig,
} from "../../utils/publicUiConfig";

const CARD_LABELS = {
  "guest-booking": "Guest Booking",
  "venue-booking": "Venue Booking",
  "event-calendar": "Event Calendar",
  "library-pass": "Library Night Pass",
  "society-pass": "Society Night Pass",
  "lost-found": "Lost & Found",
  "community-feedback": "Community & Feedback",
  "institute-calendar": "Institute Calendar",
  "student-calendar": "Student Calendar",
  "student-society-portal": "Student Society Portal",
};

const LAYOUT_OPTIONS = [
  ["grid-3", "Grid 3"],
  ["grid-4", "Grid 4"],
  ["grid-2", "Grid 2"],
  ["list", "List"],
  ["bento", "Bento"],
  ["featured", "Featured"],
  ["compact", "Compact"],
  ["horizontal", "Horizontal Cards"],
  ["masonry", "Masonry"],
];

const PublicUiCustomizerPage = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState(DEFAULT_PUBLIC_UI_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadConfig = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchAdminPublicUiConfig();
        if (mounted) setConfig(data);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load public UI config");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadConfig();
    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo(() => {
    const cardMap = new Map((config.selector.cards || []).map((card) => [card.id, card]));
    return (config.selector.cardOrder || []).map((id) => ({
      id,
      ...(cardMap.get(id) || { id, enabled: true, title: "" }),
    }));
  }, [config]);

  const updateSelector = (patch) => {
    setConfig((prev) => ({
      ...prev,
      selector: {
        ...prev.selector,
        ...patch,
      },
    }));
  };

  const updateWidgets = (patch) => {
    setConfig((prev) => ({
      ...prev,
      widgets: {
        ...prev.widgets,
        ...patch,
      },
    }));
  };

  const updateHeader = (patch) => {
    setConfig((prev) => ({
      ...prev,
      header: {
        ...prev.header,
        ...patch,
      },
    }));
  };

  const updateCard = (id, patch) => {
    setConfig((prev) => ({
      ...prev,
      selector: {
        ...prev.selector,
        cards: prev.selector.cards.map((card) =>
          card.id === id ? { ...card, ...patch } : card
        ),
      },
    }));
  };

  const moveCard = (id, direction) => {
    setConfig((prev) => {
      const order = [...prev.selector.cardOrder];
      const index = order.indexOf(id);
      if (index < 0) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= order.length) return prev;
      [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
      return {
        ...prev,
        selector: {
          ...prev.selector,
          cardOrder: order,
        },
      };
    });
  };

  const updateMilestone = (id, patch) => {
    setConfig((prev) => ({
      ...prev,
      timeline: (prev.timeline || []).map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  };

  const addMilestone = () => {
    const id = `milestone-${Date.now()}`;
    setConfig((prev) => ({
      ...prev,
      timeline: [...(prev.timeline || []), { id, year: "", title: "New Milestone", description: "", enabled: true }],
    }));
  };

  const deleteMilestone = (id) => {
    setConfig((prev) => ({ ...prev, timeline: (prev.timeline || []).filter((item) => item.id !== id) }));
  };

  const moveMilestone = (index, direction) => {
    setConfig((prev) => {
      const timeline = [...(prev.timeline || [])];
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= timeline.length) return prev;
      [timeline[index], timeline[nextIndex]] = [timeline[nextIndex], timeline[index]];
      return { ...prev, timeline };
    });
  };

  const updateDeveloper = (id, patch) => {
    setConfig((prev) => ({ ...prev, developers: (prev.developers || []).map((developer) => developer.id === id ? { ...developer, ...patch } : developer) }));
  };
  const addDeveloper = () => {
    const id = `developer-${Date.now()}`;
    setConfig((prev) => ({ ...prev, developers: [...(prev.developers || []), { id, name: "New Developer", role: "", photo: "", description: "", email: "", linkedin: "", github: "", portfolio: "", contribution: "", tags: [], order: (prev.developers || []).length, enabled: true }] }));
  };
  const deleteDeveloper = (id) => setConfig((prev) => ({ ...prev, developers: (prev.developers || []).filter((developer) => developer.id !== id) }));
  const moveDeveloper = (index, direction) => {
    setConfig((prev) => {
      const developers = [...(prev.developers || [])];
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= developers.length) return prev;
      [developers[index], developers[nextIndex]] = [developers[nextIndex], developers[index]];
      return { ...prev, developers: developers.map((developer, order) => ({ ...developer, order })) };
    });
  };

  const onSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const normalized = normalizePublicUiConfig(config);
      const updated = await updatePublicUiConfig(normalized);
      setConfig(updated);
      setSuccess("Public UI updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Loading public UI settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Public UI Customizer</h1>
            <p className="text-slate-600">Admin-only control for public footer widgets and dashboard selector design.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700"
            >
              Open Public Page
            </button>
            <button
              onClick={() => navigate("/admin/dashboard-selector")}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-red-600 text-white flex items-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700">{error}</div>
        ) : null}
        {success ? (
          <div className="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">{success}</div>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Footer Widgets</h2>
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 block">
                Developer Text
                <input
                  value={config.widgets.developerText}
                  onChange={(e) => updateWidgets({ developerText: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </label>
              <label className="text-sm font-medium text-slate-700 block">
                Powered By Text
                <input
                  value={config.widgets.poweredByText}
                  onChange={(e) => updateWidgets({ poweredByText: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </label>
              <label className="text-sm font-medium text-slate-700 block">
                Maintained By Text
                <input
                  value={config.widgets.maintainedByText}
                  onChange={(e) => updateWidgets({ maintainedByText: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </label>
              <label className="text-sm font-medium text-slate-700 block">
                System Status Text
                <input
                  value={config.widgets.systemStatusText}
                  onChange={(e) => updateWidgets({ systemStatusText: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={config.widgets.systemOnline}
                  onChange={(e) => updateWidgets({ systemOnline: e.target.checked })}
                />
                Show system as online
              </label>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Admin Login Button</h2>
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 block">
                Admin Login Button Link
                <input
                  value={config.header?.loginDestination || ""}
                  onChange={(e) => updateHeader({ loginDestination: e.target.value })}
                  placeholder="/login or https://campusconnect.thapar.edu/login"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </label>
              <p className="text-xs text-slate-500">
                Use an internal route like /login or a full https:// link. This controls the Admin Login button on the public homepage.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Selector Theme & Layout</h2>
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 block">
                Title
                <input
                  value={config.selector.title}
                  onChange={(e) => updateSelector({ title: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="text-sm font-medium text-slate-700 block">
                  Theme
                  <select
                    value={config.selector.themePreset}
                    onChange={(e) => updateSelector({ themePreset: e.target.value })}
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
                    value={config.selector.cardStyle}
                    onChange={(e) => updateSelector({ cardStyle: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300"
                  >
                    <option value="default">Default</option>
                    <option value="shadow">Shadow</option>
                    <option value="outline">Outline</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700 block">
                  Layout
                  <select
                    value={config.selector.layoutStyle}
                    onChange={(e) => updateSelector({ layoutStyle: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300"
                  >
                    {LAYOUT_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="text-sm font-medium text-slate-700 block">
                Accent Colour
                <input
                  type="color"
                  value={config.selector.accentColor || "#c62828"}
                  onChange={(e) => updateSelector({ accentColor: e.target.value })}
                  className="mt-1 h-11 w-full px-2 rounded-lg border border-slate-300"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Our Journey</h2>
              <p className="text-xs text-slate-500">Milestones appear publicly in this saved order, latest first.</p>
            </div>
            <button type="button" onClick={addMilestone} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm">Add Milestone</button>
          </div>
          <div className="space-y-4">
            {(config.timeline || []).map((milestone, index) => (
              <div key={milestone.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={milestone.enabled !== false} onChange={(e) => updateMilestone(milestone.id, { enabled: e.target.checked })} />
                    Enabled
                  </label>
                  <div className="flex gap-2">
                    <button type="button" disabled={index === 0} onClick={() => moveMilestone(index, "up")} className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40"><ArrowUp className="w-4 h-4" /></button>
                    <button type="button" disabled={index === config.timeline.length - 1} onClick={() => moveMilestone(index, "down")} className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40"><ArrowDown className="w-4 h-4" /></button>
                    <button type="button" onClick={() => deleteMilestone(milestone.id)} className="px-3 py-1 rounded border border-red-300 text-red-700 text-sm">Delete</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <label className="text-sm font-medium text-slate-700">Year / Date<input value={milestone.year || ""} onChange={(e) => updateMilestone(milestone.id, { year: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" /></label>
                  <label className="text-sm font-medium text-slate-700">Title<input value={milestone.title || milestone.label || ""} onChange={(e) => updateMilestone(milestone.id, { title: e.target.value, label: undefined })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" /></label>
                  <label className="text-sm font-medium text-slate-700 md:col-span-2">Description<textarea value={milestone.description || milestone.desc || ""} onChange={(e) => updateMilestone(milestone.id, { description: e.target.value, desc: undefined })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 min-h-[72px]" /></label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Platform Applications</h2>
          <div className="space-y-4">
            {cards.map((card, index) => (
              <div key={card.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {CARD_LABELS[card.id] || card.id}
                    </p>
                    <p className="text-xs text-slate-500">id: {card.id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveCard(card.id, "up")}
                      className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === cards.length - 1}
                      onClick={() => moveCard(card.id, "down")}
                      className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={card.enabled !== false}
                        onChange={(e) => updateCard(card.id, { enabled: e.target.checked })}
                      />
                      Enabled
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={card.locked === true}
                        onChange={(e) => updateCard(card.id, { locked: e.target.checked })}
                      />
                      Locked
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <label className="text-sm font-medium text-slate-700 block">
                    Title
                    <input
                      value={card.title || ""}
                      onChange={(e) => updateCard(card.id, { title: e.target.value })}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700 block">
                    Destination URL or Internal Route
                    <input
                      value={card.destination || ""}
                      onChange={(e) => updateCard(card.id, { destination: e.target.value })}
                      placeholder="/path or https://..."
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700 block md:col-span-2">
                    Short Description
                    <textarea
                      value={card.shortDescription ?? card.description ?? ""}
                      onChange={(e) => updateCard(card.id, { shortDescription: e.target.value, description: e.target.value })}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 min-h-[78px]"
                      placeholder="Short text shown inside this public homepage card."
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700 block">
                    Status
                    <select value={card.status || (card.comingSoon ? "Coming Soon" : "Active")} onChange={(e) => updateCard(card.id, { status: e.target.value, comingSoon: e.target.value === "Coming Soon" })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300"><option value="Active">Active</option><option value="Coming Soon">Coming Soon</option></select>
                  </label>
                  <label className="text-sm font-medium text-slate-700 block md:col-span-2">
                    Detailed Description
                    <textarea value={card.detailedDescription ?? card.working ?? ""} onChange={(e) => updateCard(card.id, { detailedDescription: e.target.value, working: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 min-h-[90px]" placeholder="Detailed content shown in the Learn More modal." />
                  </label>
                  <label className="text-sm font-medium text-slate-700 block md:col-span-2">Optional Image URL<input value={card.image || ""} onChange={(e) => updateCard(card.id, { image: e.target.value })} placeholder="https://..." className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" /></label>
                  <label className="text-sm font-medium text-slate-700 block">
                    Icon Key
                    <input
                      value={card.icon || ""}
                      onChange={(e) => updateCard(card.id, { icon: e.target.value })}
                      placeholder="Any Lucide icon name, e.g. Hotel, Search, CalendarDays"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700 block">
                    Accent Colour
                    <input
                      type="color"
                      value={card.accentColor || "#c62828"}
                      onChange={(e) => updateCard(card.id, { accentColor: e.target.value })}
                      className="mt-1 h-11 w-full px-2 rounded-lg border border-slate-300"
                    />
                  </label>
                </div>

                <label className="text-sm font-medium text-slate-700 block mt-3">
                  Lock Message
                  <textarea
                    value={card.lockMessage || ""}
                    onChange={(e) => updateCard(card.id, { lockMessage: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 min-h-[72px]"
                    placeholder="This service is currently unavailable."
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-lg font-semibold text-slate-900">Developers Team</h2><p className="text-xs text-slate-500">Manage the public Developers Team section.</p></div>
            <button type="button" onClick={addDeveloper} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm">Add Developer</button>
          </div>
          <div className="space-y-4">
            {(config.developers || []).map((developer, index) => (
              <div key={developer.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={developer.enabled !== false} onChange={(e) => updateDeveloper(developer.id, { enabled: e.target.checked })} />Enabled</label>
                  <div className="flex gap-2">
                    <button type="button" disabled={index === 0} onClick={() => moveDeveloper(index, "up")} className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40"><ArrowUp className="w-4 h-4" /></button>
                    <button type="button" disabled={index === config.developers.length - 1} onClick={() => moveDeveloper(index, "down")} className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40"><ArrowDown className="w-4 h-4" /></button>
                    <button type="button" onClick={() => deleteDeveloper(developer.id)} className="px-3 py-1 rounded border border-red-300 text-red-700 text-sm">Delete</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  {[
                    ["Name", "name"], ["Role", "role"], ["Photo URL", "photo"], ["Email", "email"],
                    ["LinkedIn URL", "linkedin"], ["GitHub URL", "github"], ["Portfolio URL", "portfolio"],
                  ].map(([label, field]) => <label key={field} className="text-sm font-medium text-slate-700">{label}<input value={developer[field] || ""} onChange={(e) => updateDeveloper(developer.id, { [field]: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" /></label>)}
                  <label className="text-sm font-medium text-slate-700 md:col-span-2">Description<textarea value={developer.description || ""} onChange={(e) => updateDeveloper(developer.id, { description: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 min-h-[72px]" /></label>
                  <label className="text-sm font-medium text-slate-700 md:col-span-2">Work Tags<input value={(developer.tags || []).join(", ")} onChange={(e) => updateDeveloper(developer.id, { tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="GuestRoom Portal, Venue Booking, Library Night Pass" className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" /><span className="block mt-1 text-xs font-normal text-slate-500">Separate multiple tags with commas.</span></label>
                  <label className="text-sm font-medium text-slate-700 md:col-span-2">Contribution<textarea value={developer.contribution || ""} onChange={(e) => updateDeveloper(developer.id, { contribution: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 min-h-[90px]" /></label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicUiCustomizerPage;
