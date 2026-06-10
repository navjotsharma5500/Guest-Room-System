import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useParams } from "react-router-dom";
import { Send } from "lucide-react";
import SupportHeader from "../components/Support/SupportHeader";
import SupportTabs from "../components/Support/SupportTabs";
import QRRoomInfoCard from "../components/Support/QRRoomInfoCard";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL || "";

const fallbackOptions = {
  healthIssues: [
    "Fever", "Cold & Cough", "Headache", "Stomach Pain", "Food Poisoning", "Diarrhea",
    "Acidity", "Allergies", "Weakness", "Injury", "Stress", "Road Accident", "Other",
  ],
  cleaningComplaints: [
    "Guest Room Is Not Clean", "Bathroom Is Not Clean", "Bedsheets Are Dirty",
    "Dusting Required", "Room Smells Bad", "Other",
  ],
  maintenanceCategories: ["Electrical", "Carpenter", "Plumber", "Mason"],
  maintenanceSubcategories: {
    Electrical: ["Light", "Fan", "Switch", "Socket", "MCB", "AC", "Geyser", "Other"],
    Carpenter: ["Door", "Window", "Bed", "Chair", "Table", "Cupboard", "Lock", "Other"],
    Plumber: ["Tap", "Flush", "Washbasin", "Shower", "Drainage", "Leakage", "Water Supply", "Other"],
    Mason: ["Wall", "Floor", "Tiles", "Seepage", "Ceiling", "Plaster", "Other"],
  },
};

const requestCopy = {
  medical: {
    title: "Medical Emergency",
    placeholder: "Describe symptoms, urgency, and exact help needed.",
  },
  cleaning: {
    title: "Cleaning Request",
    placeholder: "Describe the cleaning issue in the room or washroom.",
  },
  maintenance: {
    title: "Maintenance",
    placeholder: "Describe the electrical, plumbing, furniture, or AC issue.",
  },
  sos: {
    title: "SOS Alert",
    placeholder: "Describe the immediate safety concern.",
  },
};

export default function GuestSupportPortal() {
  const { hostelId, roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [settings, setSettings] = useState(null);
  const [googleCredential, setGoogleCredential] = useState("");
  const [googleUser, setGoogleUser] = useState(null);
  const [form, setForm] = useState({
    email: "",
    contact: "",
    message: "",
    issueType: "Fever",
    complaintType: "Guest Room Is Not Clean",
    urgency: "medium",
    category: "Electrical",
    subcategory: "Light",
  });
  const [activeTab, setActiveTab] = useState("medical");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const loadMyRequests = useCallback(async (credential = googleCredential) => {
    if (!credential) return;
    try {
      setLoadingRequests(true);
      const res = await fetch(`${API}/api/guest-support/room/${encodeURIComponent(hostelId)}/${encodeURIComponent(roomId)}/my-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleCredential: credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load your requests");
      setMyRequests(data.requests || []);
    } catch (err) {
      setMyRequests([]);
      setStatus(err.message);
    } finally {
      setLoadingRequests(false);
    }
  }, [googleCredential, hostelId, roomId]);

  useEffect(() => {
    const loadRoom = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/guest-support/room/${encodeURIComponent(hostelId)}/${encodeURIComponent(roomId)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Support link not found");
        setRoom(data.room);
        setSettings(data.settings);
      } catch (err) {
        setStatus(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadRoom();
  }, [hostelId, roomId]);

  const enabledTabs = useMemo(() => ({
    medical: settings?.support?.enableMedicalRequests !== false,
    cleaning: settings?.cleaning?.enableCleaningRequests === true,
    maintenance: settings?.support?.enableMaintenanceRequests !== false,
    sos: settings?.support?.enableSosAlerts !== false,
  }), [settings]);

  const options = settings?.supportOptions || fallbackOptions;

  useEffect(() => {
    if (enabledTabs[activeTab] !== false) return;
    const firstEnabled = Object.entries(enabledTabs).find(([, enabled]) => enabled !== false)?.[0];
    if (firstEnabled) setActiveTab(firstEnabled);
  }, [activeTab, enabledTabs]);

  const handleGoogleSuccess = (credentialResponse) => {
    const credential = credentialResponse.credential;
    const decoded = jwtDecode(credential);
    setGoogleCredential(credential);
    setGoogleUser(decoded);
    setForm((prev) => ({
      ...prev,
      email: decoded.email || "",
    }));
    setStatus("");
    loadMyRequests(credential);
  };

  const submitRequest = async () => {
    if (!googleCredential) {
      setStatus("Please sign in with Google first.");
      return;
    }
    if (!form.email.trim() || (activeTab !== "sos" && !form.contact.trim())) {
      setStatus(activeTab === "sos" ? "Email is required." : "Email and contact number are required.");
      return;
    }

    try {
      setSubmitting(true);
      setStatus("");
      const res = await fetch(`${API}/api/guest-support/room/${encodeURIComponent(hostelId)}/${encodeURIComponent(roomId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: activeTab,
          googleCredential,
          email: form.email,
          contact: form.contact,
          message: form.message,
          issueType: form.issueType,
          complaintType: form.complaintType,
          urgency: activeTab === "sos" ? "critical" : form.urgency,
          category: form.category,
          subcategory: form.subcategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit request");
      setForm((prev) => ({ ...prev, message: "" }));
      setStatus("Request submitted successfully. Hostel staff has been notified.");
      await loadMyRequests();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reopenRequest = async (request) => {
    if (!googleCredential) return;
    try {
      setSubmitting(true);
      setStatus("");
      const res = await fetch(`${API}/api/guest-support/room/${encodeURIComponent(hostelId)}/${encodeURIComponent(roomId)}/reopen/${request.requestType}/${request._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleCredential,
          remarks: "Guest reopened: issue not fixed properly",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reopen request");
      setStatus("Request reopened. Hostel staff has been notified.");
      await loadMyRequests();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-red-50">
      <SupportHeader googleUser={googleUser} onLogout={() => {
        setGoogleCredential("");
        setGoogleUser(null);
      }} />

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {loading ? (
          <div className="rounded-3xl bg-white border p-8 text-center text-slate-500">Loading room support...</div>
        ) : !room ? (
          <div className="rounded-3xl bg-white border p-8 text-center text-red-600 font-bold">{status || "Invalid support link."}</div>
        ) : settings?.operations?.enableGuestSupportPortal === false ? (
          <div className="rounded-3xl bg-white border p-8 text-center text-red-600 font-bold">Guest support portal is currently disabled.</div>
        ) : (
          <>
            <QRRoomInfoCard room={room} />

            <section className="rounded-3xl bg-white border shadow-sm p-4">
              {!googleUser ? (
                <div className="text-center py-4">
                  <h2 className="text-lg font-black text-slate-900">Google sign-in required</h2>
                  <p className="text-sm text-slate-500 mb-4">
                    Sign in with the same Google email used in the active room booking.
                  </p>
                  {room && !room.hasActiveGuest && (
                    <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                      No active guest booking is currently mapped to this room.
                    </p>
                  )}
                  <div className="flex justify-center">
                    <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setStatus("Google login failed. Please try again.")} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {googleUser.picture && <img src={googleUser.picture} alt="" className="w-12 h-12 rounded-full" />}
                  <div>
                    <p className="font-black text-slate-900">{googleUser.name}</p>
                    <p className="text-xs text-slate-500">{googleUser.email}</p>
                  </div>
                </div>
              )}
            </section>

            {googleUser && (
              <section className="rounded-3xl bg-white border shadow-sm p-4 space-y-4">
                <SupportTabs active={activeTab} onChange={setActiveTab} enabled={enabledTabs} />

                {activeTab === "medical" && (
                  <ChipGroup
                    label="Health Issue"
                    options={options.healthIssues || fallbackOptions.healthIssues}
                    value={form.issueType}
                    onChange={(value) => setForm((prev) => ({ ...prev, issueType: value }))}
                  />
                )}

                {activeTab === "cleaning" && (
                  <ChipGroup
                    label="Complaint"
                    options={options.cleaningComplaints || fallbackOptions.cleaningComplaints}
                    value={form.complaintType}
                    onChange={(value) => setForm((prev) => ({ ...prev, complaintType: value }))}
                  />
                )}

                {activeTab === "maintenance" && (
                  <div className="space-y-3">
                    <ChipGroup
                      label="Category"
                      options={options.maintenanceCategories || fallbackOptions.maintenanceCategories}
                      value={form.category}
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          category: value,
                          subcategory: (options.maintenanceSubcategories?.[value] || fallbackOptions.maintenanceSubcategories[value] || ["Other"])[0],
                        }))
                      }
                    />
                    <ChipGroup
                      label="Subcategory"
                      options={options.maintenanceSubcategories?.[form.category] || fallbackOptions.maintenanceSubcategories[form.category] || ["Other"]}
                      value={form.subcategory}
                      onChange={(value) => setForm((prev) => ({ ...prev, subcategory: value }))}
                    />
                  </div>
                )}

                {activeTab !== "sos" && (
                  <ChipGroup
                    label="Urgency"
                    options={["low", "medium", "high", "critical"]}
                    value={form.urgency}
                    onChange={(value) => setForm((prev) => ({ ...prev, urgency: value }))}
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="Email"
                    className="rounded-2xl border px-4 py-3"
                  />
                  {activeTab !== "sos" && (
                    <input
                      value={form.contact}
                      onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
                      placeholder="Contact number"
                      className="rounded-2xl border px-4 py-3"
                    />
                  )}
                </div>

                <div>
                  <h2 className="font-black text-slate-900 mb-2">{requestCopy[activeTab]?.title}</h2>
                  <textarea
                    value={form.message}
                    onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                    placeholder={requestCopy[activeTab]?.placeholder}
                    rows={5}
                    className="w-full rounded-2xl border px-4 py-3 resize-none"
                  />
                </div>

                <button
                  onClick={submitRequest}
                  disabled={submitting || enabledTabs[activeTab] === false}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 text-white py-3 font-black disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </section>
            )}

            {googleUser && (
              <RequestStatusPanel
                requests={myRequests}
                loading={loadingRequests}
                onReopen={reopenRequest}
              />
            )}
          </>
        )}

        {status && (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
            status.includes("successfully") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
          }`}>
            {status}
          </div>
        )}
      </main>
    </div>
  );
}

function RequestStatusPanel({ requests, loading, onReopen }) {
  const topRequests = requests.slice(0, 6);
  return (
    <section className="rounded-3xl bg-white border shadow-sm p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-slate-900">Your Requests</h2>
          <p className="text-xs text-slate-500">Track current status. Reopen a resolved request if the issue is not fixed.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {requests.length}
        </span>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">Loading request status...</div>
      ) : topRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">No support requests submitted yet.</div>
      ) : (
        <div className="space-y-3">
          {topRequests.map((request) => (
            <div key={`${request.requestType}-${request._id}`} className="rounded-2xl border bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-red-600">{request.requestType}</p>
                  <p className="font-bold text-slate-900">{request.description || request.details?.issueType || request.details?.complaintType || "Support request"}</p>
                  <p className="text-xs text-slate-500">{new Date(request.createdAt).toLocaleString()}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                  request.status === "resolved"
                    ? "bg-green-100 text-green-700"
                    : request.status === "escalated"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-blue-100 text-blue-700"
                }`}>
                  {String(request.status || "open").replace("_", " ")}
                </span>
              </div>
              {request.status === "resolved" && (
                <button
                  type="button"
                  onClick={() => onReopen(request)}
                  className="mt-3 rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white"
                >
                  Reopen if not fixed
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ChipGroup({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400 font-black">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              value === option
                ? "bg-red-600 border-red-600 text-white"
                : "bg-white border-slate-200 text-slate-700"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
