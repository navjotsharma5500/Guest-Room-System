import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import PublicPageWidgets from "../components/PublicPageWidgets";
import { createSocietyNightRequest } from "../utils/societyNightPassApi";
import { clearSocietyNightPassSession } from "../utils/societyNightPassAuth";

const initialForm = {
  society_name: "",
  purpose: "",
  location: "",
  event_date: "",
  start_time: "",
  end_date: "",
  end_time: "",
  notes: "",
};

export default function SocietyNightPassRequestPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit = useMemo(
    () =>
      form.society_name &&
      form.purpose &&
      form.location &&
      form.event_date &&
      form.start_time &&
      form.end_date &&
      form.end_time,
    [form]
  );

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) {
      setError("Please fill all required fields.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await createSocietyNightRequest(form);
      setSuccess("Permission request submitted successfully.");
      setForm(initialForm);
      setTimeout(() => navigate("/society-night-pass/dashboard"), 800);
    } catch (err) {
      if (err?.status === 401) {
        clearSocietyNightPassSession();
        navigate("/society-night-pass", { replace: true });
        return;
      }
      setError(err.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed_0%,_#f8fafc_50%,_#eef2ff_100%)]">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-600">SOCIETY NIGHT PASS</p>
            <h1 className="mt-2 text-4xl font-black text-slate-950">Raise Night Permission</h1>
          </div>
          <Link
            to="/society-night-pass/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[32px] border border-white/80 bg-white/90 p-8 shadow-[0_24px_64px_rgba(15,23,42,0.12)] backdrop-blur"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Society Name</span>
              <input
                type="text"
                value={form.society_name}
                onChange={(e) => updateField("society_name", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                placeholder="Robotics Club"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Location</span>
              <input
                type="text"
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                placeholder="COS Lab"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Purpose of Event</span>
              <input
                type="text"
                value={form.purpose}
                onChange={(e) => updateField("purpose", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                placeholder="Overnight Hackathon"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Event Date</span>
              <input
                type="date"
                value={form.event_date}
                onChange={(e) => updateField("event_date", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Start Time</span>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => updateField("start_time", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">End Date</span>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => updateField("end_date", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">End Time</span>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => updateField("end_time", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Additional Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={5}
                className="w-full rounded-3xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                placeholder="Add anything the reviewers should know."
              />
            </label>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {loading ? "Submitting..." : "Submit Permission Request"}
            </button>
          </div>
        </form>
      </div>

      <PublicPageWidgets footerMode="flow" footerClassName="mt-8 pb-4" echoClassName="bottom-24" />
    </div>
  );
}
