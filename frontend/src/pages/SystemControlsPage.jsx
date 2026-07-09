import React, { useEffect, useMemo, useState } from "react";
import { Save, Users, LayoutGrid, Mail, CalendarDays, ShieldCheck, SlidersHorizontal } from "lucide-react";
import useSystemSettings from "../hooks/useSystemSettings";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL || "";

const TABS = [
  { key: "bookingDays", label: "Booking Days", icon: CalendarDays },
  { key: "extensionRules", label: "Extension Rules", icon: ShieldCheck },
  { key: "emailSettings", label: "Email Settings", icon: Mail },
  { key: "operations", label: "Operations", icon: SlidersHorizontal },
  { key: "userManagement", label: "User Management", icon: Users },
  { key: "dashboardAccess", label: "Dashboard Access", icon: LayoutGrid },
];

const EMAIL_TEMPLATE_OPTIONS = [
  "guestDirectBooking",
  "caretakerDirectBooking",
  "managerDirectBooking",
  "wardenDirectBooking",
  "guestBookingApprovedPaid",
  "guestBookingApprovedFree",
  "guestBookingCancelled",
  "guestBookingExtended",
  "enquiryNotification",
  "guestEnquiryReceived",
  "extensionRequest",
  "extensionApproved",
  "extensionRejected",
  "rebookingApprovalRequired",
];

const ROLE_OPTIONS = [
  "guest",
  "manager",
  "caretaker",
  "warden",
  "co_warden",
  "adosa",
  "admin",
  "assistant",
  "dd_assistant",
];

const USER_ROLE_OPTIONS = [
  "admin",
  "adosa",
  "manager",
  "Warden",
  "caretaker",
  "assistant",
  "dd_assistant",
  "guard",
  "gen_sec",
  "president",
  "student",
  "co_warden",
];

const createEmptyUserForm = () => ({
  name: "",
  email: "",
  password: "",
  role: "caretaker",
  assignedHostel: "",
  hostel: "",
  rollNo: "",
  societies: "",
  profilePicture: "",
  isActive: true,
  permissions: {
    guestRoom: true,
    venue: false,
    night: false,
  },
  dashboardAccess: {
    dashboards: ["guestRoom"],
    defaultDashboard: "guestRoom",
    skipSelectorWhenSingle: true,
  },
});

const parseUserPayload = (form) => ({
  ...form,
  societies: String(form.societies || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
});

const CheckboxGroup = ({ options, values = [], onChange }) => (
  <div className="grid grid-cols-2 gap-2">
    {options.map((option) => (
      <label key={option} className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.includes(option)}
          onChange={(e) => {
            if (e.target.checked) {
              onChange([...values, option]);
            } else {
              onChange(values.filter((item) => item !== option));
            }
          }}
        />
        <span>{option}</span>
      </label>
    ))}
  </div>
);

export default function SystemControlsPage({ theme = "light", onClose = () => {} }) {
  const { settings, loading, updateSettings, dashboardRegistry } = useSystemSettings({ admin: true });
  const [activeTab, setActiveTab] = useState("bookingDays");
  const [draft, setDraft] = useState(settings);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState(createEmptyUserForm());
  const [editingUserId, setEditingUserId] = useState(null);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch(`${API}/api/users`, {
          credentials: "include",
        });
        const data = await response.json();
        if (response.ok) {
          setUsers(data);
        }
      } catch (error) {
        console.error("Failed to load users:", error);
      }
    };

    loadUsers();
  }, []);

  const availableDashboards = useMemo(
    () => (dashboardRegistry || []).filter((dashboard) => dashboard.active),
    [dashboardRegistry]
  );

  const persistSettings = async (payload) => {
    try {
      setSaving(true);
      setMessage("");
      await updateSettings(payload);
      setMessage("System controls updated successfully.");
    } catch (error) {
      setMessage(error.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUsers = async () => {
    try {
      const payload = parseUserPayload(userForm);
      const url = editingUserId ? `${API}/api/users/${editingUserId}` : `${API}/api/users`;
      const method = editingUserId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save user");
      }

      setMessage(data.message || "User saved successfully");
      setEditingUserId(null);
      setUserForm(createEmptyUserForm());

      const refreshed = await fetch(`${API}/api/users`, { credentials: "include" });
      const refreshedData = await refreshed.json();
      if (refreshed.ok) setUsers(refreshedData);
    } catch (error) {
      setMessage(error.message || "Failed to save user");
    }
  };

  const cardClass = theme === "dark"
    ? "bg-gray-900 border-gray-700 text-gray-100"
    : "bg-white border-gray-200 text-gray-900";

  return (
    <div className={`rounded-2xl border shadow-xl ${cardClass}`}>
      <div className="flex items-center justify-between border-b border-inherit px-6 py-4">
        <div>
          <h2 className="text-2xl font-bold text-red-700">System Controls</h2>
          <p className="text-sm text-gray-500">Dynamic controls for guest room, venue, users, emails, and dashboards.</p>
        </div>
        <button onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200">
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr]">
        <aside className="border-r border-inherit p-4">
          <div className="space-y-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium ${
                    activeTab === tab.key ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="p-6">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500">Loading system controls...</div>
          ) : (
            <>
              {activeTab === "bookingDays" && (
                <div className="space-y-4">
                  <Field label="Max Booking Days Request - Faculty / Staff">
                    <input
                      type="number"
                      className="w-full rounded-lg border px-3 py-2"
                      value={draft.bookingDays?.facultyStaffMaxRequestDays || draft.bookingDays?.guestMaxRequestDays || ""}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          bookingDays: {
                            ...prev.bookingDays,
                            facultyStaffMaxRequestDays: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field label="Max Booking Days Request - Parent / Student">
                    <input
                      type="number"
                      className="w-full rounded-lg border px-3 py-2"
                      value={draft.bookingDays?.parentStudentMaxRequestDays || ""}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          bookingDays: {
                            ...prev.bookingDays,
                            parentStudentMaxRequestDays: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field label="Max Direct Booking Days - Manager">
                    <input
                      type="number"
                      className="w-full rounded-lg border px-3 py-2"
                      value={draft.bookingDays?.managerMaxDirectBookingDays || ""}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          bookingDays: {
                            ...prev.bookingDays,
                            managerMaxDirectBookingDays: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field label="Max Direct Booking Days - Warden/Caretaker">
                    <input
                      type="number"
                      className="w-full rounded-lg border px-3 py-2"
                      value={draft.bookingDays?.caretakerMaxDirectBookingDays || ""}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          bookingDays: {
                            ...prev.bookingDays,
                            caretakerMaxDirectBookingDays: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </Field>
                  <SaveButton saving={saving} onClick={() => persistSettings({ bookingDays: draft.bookingDays })} />
                </div>
              )}

              {activeTab === "extensionRules" && (
                <div className="space-y-4">
                  {[
                    ["maxExtensionRequestDays", "Max Days for Extension Request"],
                    ["coWardenLevelDays", "Co-Warden Level"],
                    ["adosaLevelDays", "ADoSA Level"],
                    ["adminLevelDays", "Admin Level"],
                  ].map(([key, label]) => (
                    <Field key={key} label={label}>
                      <input
                        type="number"
                        className="w-full rounded-lg border px-3 py-2"
                        value={draft.extensionRules?.[key] || ""}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            extensionRules: {
                              ...prev.extensionRules,
                              [key]: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </Field>
                  ))}
                  <SaveButton saving={saving} onClick={() => persistSettings({ extensionRules: draft.extensionRules })} />
                </div>
              )}

              {activeTab === "emailSettings" && (
                <div className="space-y-6">
                  {EMAIL_TEMPLATE_OPTIONS.map((templateKey) => {
                    const config = draft.emailSettings?.[templateKey] || {
                      enabled: true,
                      sendToRoles: [],
                      ccRoles: [],
                      bccRoles: [],
                      customEmails: [],
                    };
                    return (
                      <div key={templateKey} className="rounded-xl border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-semibold">{templateKey}</h4>
                          <label className="flex items-center gap-2 text-sm">
                            <span>Enabled</span>
                            <input
                              type="checkbox"
                              checked={config.enabled !== false}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  emailSettings: {
                                    ...prev.emailSettings,
                                    [templateKey]: {
                                      ...config,
                                      enabled: e.target.checked,
                                    },
                                  },
                                }))
                              }
                            />
                          </label>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="Send To Roles">
                            <CheckboxGroup
                              options={ROLE_OPTIONS}
                              values={config.sendToRoles || []}
                              onChange={(values) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  emailSettings: {
                                    ...prev.emailSettings,
                                    [templateKey]: {
                                      ...config,
                                      sendToRoles: values,
                                    },
                                  },
                                }))
                              }
                            />
                          </Field>
                          <Field label="CC Roles">
                            <CheckboxGroup
                              options={ROLE_OPTIONS}
                              values={config.ccRoles || []}
                              onChange={(values) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  emailSettings: {
                                    ...prev.emailSettings,
                                    [templateKey]: {
                                      ...config,
                                      ccRoles: values,
                                    },
                                  },
                                }))
                              }
                            />
                          </Field>
                          <Field label="BCC Roles">
                            <CheckboxGroup
                              options={ROLE_OPTIONS}
                              values={config.bccRoles || []}
                              onChange={(values) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  emailSettings: {
                                    ...prev.emailSettings,
                                    [templateKey]: {
                                      ...config,
                                      bccRoles: values,
                                    },
                                  },
                                }))
                              }
                            />
                          </Field>
                          <Field label="Custom Emails (comma separated)">
                            <input
                              type="text"
                              className="w-full rounded-lg border px-3 py-2"
                              value={(config.customEmails || []).join(", ")}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  emailSettings: {
                                    ...prev.emailSettings,
                                    [templateKey]: {
                                      ...config,
                                      customEmails: e.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                                    },
                                  },
                                }))
                              }
                            />
                          </Field>
                        </div>
                      </div>
                    );
                  })}
                  <SaveButton saving={saving} onClick={() => persistSettings({ emailSettings: draft.emailSettings })} />
                </div>
              )}

              {activeTab === "operations" && (
                <div className="space-y-6">
                  <div className="rounded-xl border p-4">
                    <h3 className="font-bold text-gray-900 mb-3">Enterprise Feature Switches</h3>
                    <ToggleField
                      label="Enable Broadcast Center"
                      description="Turns Broadcast Center email and dashboard notice service on/off for every role."
                      checked={draft.operations?.enableBroadcastCenter !== false}
                      onChange={(checked) =>
                        setDraft((prev) => ({
                          ...prev,
                          operations: { ...prev.operations, enableBroadcastCenter: checked },
                        }))
                      }
                    />
                    <ToggleField
                      label="Enable Cleaning Workflow"
                      description="Controls room cleaning states, checklist flow, and Mark Clean operations globally."
                      checked={draft.operations?.enableCleaningWorkflow !== false}
                      onChange={(checked) =>
                        setDraft((prev) => ({
                          ...prev,
                          operations: { ...prev.operations, enableCleaningWorkflow: checked },
                        }))
                      }
                    />
                    <ToggleField
                      label="Enable Guest Support Portal"
                      description="Controls public QR based guest support requests globally."
                      checked={draft.operations?.enableGuestSupportPortal !== false}
                      onChange={(checked) =>
                        setDraft((prev) => ({
                          ...prev,
                          operations: { ...prev.operations, enableGuestSupportPortal: checked },
                        }))
                      }
                    />
                    <ToggleField
                      label="Enable Hostel Ratings"
                      description="Controls hostel and room rating analytics visibility."
                      checked={draft.operations?.enableHostelRatings !== false}
                      onChange={(checked) =>
                        setDraft((prev) => ({
                          ...prev,
                          operations: { ...prev.operations, enableHostelRatings: checked },
                        }))
                      }
                    />
                    <ToggleField
                      label="Enable Guest Flagging"
                      description="Controls guest flagging, auto-blocking, and blocked-guest operational guards globally."
                      checked={draft.operations?.enableGuestFlagging !== false}
                      onChange={(checked) =>
                        setDraft((prev) => ({
                          ...prev,
                          operations: { ...prev.operations, enableGuestFlagging: checked },
                        }))
                      }
                    />
                  </div>

                  <div className="rounded-xl border p-4">
                    <h3 className="font-bold text-gray-900 mb-3">Flag Threshold Rules</h3>
                    <p className="mb-4 text-sm text-gray-500">
                      Guests are auto-blocked when any threshold is reached. Mixed severity also counts toward blocking.
                    </p>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Yellow Threshold">
                        <input
                          type="number"
                          min="1"
                          className="w-full rounded-lg border px-3 py-2"
                          value={draft.flagRules?.yellowThreshold || ""}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              flagRules: {
                                ...prev.flagRules,
                                yellowThreshold: Number(e.target.value),
                              },
                            }))
                          }
                        />
                      </Field>
                      <Field label="Orange Threshold">
                        <input
                          type="number"
                          min="1"
                          className="w-full rounded-lg border px-3 py-2"
                          value={draft.flagRules?.orangeThreshold || ""}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              flagRules: {
                                ...prev.flagRules,
                                orangeThreshold: Number(e.target.value),
                              },
                            }))
                          }
                        />
                      </Field>
                      <Field label="Red Threshold">
                        <input
                          type="number"
                          min="1"
                          className="w-full rounded-lg border px-3 py-2"
                          value={draft.flagRules?.redThreshold || ""}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              flagRules: {
                                ...prev.flagRules,
                                redThreshold: Number(e.target.value),
                              },
                            }))
                          }
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <h3 className="font-bold text-gray-900 mb-3">Guest Support Request Types</h3>
                    <ToggleField
                      label="Enable Medical Requests"
                      checked={draft.support?.enableMedicalRequests !== false}
                      onChange={(checked) =>
                        setDraft((prev) => ({
                          ...prev,
                          support: { ...prev.support, enableMedicalRequests: checked },
                        }))
                      }
                    />
                    <ToggleField
                      label="Enable Cleaning Requests"
                      checked={draft.cleaning?.enableCleaningRequests === true}
                      onChange={(checked) =>
                        setDraft((prev) => ({
                          ...prev,
                          cleaning: { ...prev.cleaning, enableCleaningRequests: checked },
                        }))
                      }
                    />
                    <ToggleField
                      label="Enable Maintenance Requests"
                      checked={draft.support?.enableMaintenanceRequests !== false}
                      onChange={(checked) =>
                        setDraft((prev) => ({
                          ...prev,
                          support: { ...prev.support, enableMaintenanceRequests: checked },
                        }))
                      }
                    />
                    <ToggleField
                      label="Enable SOS Alerts"
                      checked={draft.support?.enableSosAlerts !== false}
                      onChange={(checked) =>
                        setDraft((prev) => ({
                          ...prev,
                          support: { ...prev.support, enableSosAlerts: checked },
                        }))
                      }
                    />
                  </div>

                  <SaveButton
                    saving={saving}
                    onClick={() =>
                      persistSettings({
                        operations: draft.operations,
                        flagRules: draft.flagRules,
                        cleaning: draft.cleaning,
                        support: draft.support,
                      })
                    }
                  />
                </div>
              )}

              {activeTab === "userManagement" && (
                <div className="space-y-6">
                  <div className="rounded-xl border p-4">
                    <h4 className="mb-4 font-semibold">{editingUserId ? "Edit User" : "Create User"}</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Name"><input className="w-full rounded-lg border px-3 py-2" value={userForm.name} onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))} /></Field>
                      <Field label="Email"><input className="w-full rounded-lg border px-3 py-2" value={userForm.email} onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))} /></Field>
                      <Field label="Password"><input type="password" className="w-full rounded-lg border px-3 py-2" value={userForm.password} onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))} /></Field>
                      <Field label="Role">
                        <select className="w-full rounded-lg border px-3 py-2" value={userForm.role} onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}>
                          {USER_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                      </Field>
                      <Field label="Assigned Hostel"><input className="w-full rounded-lg border px-3 py-2" value={userForm.assignedHostel} onChange={(e) => setUserForm((prev) => ({ ...prev, assignedHostel: e.target.value }))} /></Field>
                      <Field label="Hostel"><input className="w-full rounded-lg border px-3 py-2" value={userForm.hostel} onChange={(e) => setUserForm((prev) => ({ ...prev, hostel: e.target.value }))} /></Field>
                      <Field label="Roll No"><input className="w-full rounded-lg border px-3 py-2" value={userForm.rollNo} onChange={(e) => setUserForm((prev) => ({ ...prev, rollNo: e.target.value }))} /></Field>
                      <Field label="Societies"><input className="w-full rounded-lg border px-3 py-2" value={userForm.societies} onChange={(e) => setUserForm((prev) => ({ ...prev, societies: e.target.value }))} /></Field>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <Field label="Permissions">
                        <CheckboxGroup
                          options={["guestRoom", "venue", "night"]}
                          values={Object.entries(userForm.permissions).filter(([, enabled]) => enabled).map(([key]) => key)}
                          onChange={(values) =>
                            setUserForm((prev) => ({
                              ...prev,
                              permissions: {
                                guestRoom: values.includes("guestRoom"),
                                venue: values.includes("venue"),
                                night: values.includes("night"),
                              },
                            }))
                          }
                        />
                      </Field>
                      <Field label="Dashboard Access">
                        <CheckboxGroup
                          options={availableDashboards.map((dashboard) => dashboard.key)}
                          values={userForm.dashboardAccess.dashboards}
                          onChange={(values) =>
                            setUserForm((prev) => ({
                              ...prev,
                              dashboardAccess: {
                                ...prev.dashboardAccess,
                                dashboards: values,
                              },
                            }))
                          }
                        />
                      </Field>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <button
                        onClick={handleSaveUsers}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                      >
                        {editingUserId ? "Update User" : "Create User"}
                      </button>
                      {editingUserId && (
                        <button
                          onClick={() => {
                            setEditingUserId(null);
                            setUserForm(createEmptyUserForm());
                          }}
                          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <h4 className="mb-4 font-semibold">Existing Users</h4>
                    <div className="space-y-3">
                      {users.map((user) => (
                        <div key={user._id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email} · {user.role}</div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingUserId(user._id);
                              setUserForm({
                                ...createEmptyUserForm(),
                                ...user,
                                password: "",
                                societies: Array.isArray(user.societies) ? user.societies.join(", ") : "",
                              });
                              setActiveTab("userManagement");
                            }}
                            className="rounded-lg bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                          >
                            Edit
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "dashboardAccess" && (
                <div className="space-y-4">
                  {(draft.dashboardRegistry || []).map((dashboard, index) => (
                    <div key={dashboard.key} className="rounded-xl border p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Key"><input className="w-full rounded-lg border px-3 py-2" value={dashboard.key} onChange={(e) => {
                          const next = [...draft.dashboardRegistry];
                          next[index] = { ...dashboard, key: e.target.value };
                          setDraft((prev) => ({ ...prev, dashboardRegistry: next }));
                        }} /></Field>
                        <Field label="Label"><input className="w-full rounded-lg border px-3 py-2" value={dashboard.label} onChange={(e) => {
                          const next = [...draft.dashboardRegistry];
                          next[index] = { ...dashboard, label: e.target.value };
                          setDraft((prev) => ({ ...prev, dashboardRegistry: next }));
                        }} /></Field>
                        <Field label="Path"><input className="w-full rounded-lg border px-3 py-2" value={dashboard.path} onChange={(e) => {
                          const next = [...draft.dashboardRegistry];
                          next[index] = { ...dashboard, path: e.target.value };
                          setDraft((prev) => ({ ...prev, dashboardRegistry: next }));
                        }} /></Field>
                        <Field label="Description"><input className="w-full rounded-lg border px-3 py-2" value={dashboard.description || ""} onChange={(e) => {
                          const next = [...draft.dashboardRegistry];
                          next[index] = { ...dashboard, description: e.target.value };
                          setDraft((prev) => ({ ...prev, dashboardRegistry: next }));
                        }} /></Field>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={dashboard.active !== false} onChange={(e) => {
                            const next = [...draft.dashboardRegistry];
                            next[index] = { ...dashboard, active: e.target.checked };
                            setDraft((prev) => ({ ...prev, dashboardRegistry: next }));
                          }} />
                          Active
                        </label>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        dashboardRegistry: [
                          ...(prev.dashboardRegistry || []),
                          {
                            key: `dashboard_${Date.now()}`,
                            label: "New Dashboard",
                            path: "/new-dashboard",
                            active: false,
                            icon: "LayoutGrid",
                            description: "",
                          },
                        ],
                      }))
                    }
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    + Add Dashboard
                  </button>
                  <SaveButton saving={saving} onClick={() => persistSettings({ dashboardRegistry: draft.dashboardRegistry })} />
                </div>
              )}
            </>
          )}

          {message && (
            <div className="mt-6 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {message}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function ToggleField({ label, description = "", checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 border-b last:border-b-0 py-3">
      <span>
        <span className="block text-sm font-semibold text-gray-800">{label}</span>
        {description && <span className="block text-xs text-gray-500 mt-0.5">{description}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 shrink-0"
      />
    </label>
  );
}

function SaveButton({ saving, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white ${
        saving ? "bg-gray-400" : "bg-red-600 hover:bg-red-700"
      }`}
    >
      <Save size={16} />
      {saving ? "Saving..." : "Save Changes"}
    </button>
  );
}
