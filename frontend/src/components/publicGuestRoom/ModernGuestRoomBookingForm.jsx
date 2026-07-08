import React, { useMemo, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { ArrowLeft, CheckCircle2, Info, Loader2, ShieldCheck } from "lucide-react";
import { IndianStates } from "../../utils/indianStates";
import { VENUE_DEPARTMENTS } from "../../config/venueDepartments";
import useSystemSettings from "../../hooks/useSystemSettings";
import { useToast } from "../../context/ToastContext";
import { BACKEND_URL } from "../../utils/apiConfig";

const initialForm = {
  name: "",
  empId: "",
  department: "",
  contact: "",
  email: "",
  from: "",
  to: "",
  checkInTime: "",
  checkOutTime: "",
  guests: "",
  females: "",
  males: "",
  state: "",
  city: "",
  reference: "",
  purpose: "",
};

const emptyErrors = {};

const normalizeNumber = (value) => {
  if (value === "") return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return String(Math.max(0, Math.floor(parsed)));
};

const stayDaysBetween = (from, to) => {
  if (!from || !to) return 0;
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return (end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24);
};

const FieldError = ({ message }) => {
  if (!message) return null;
  return <p className="mt-1 text-xs font-semibold text-red-600">{message}</p>;
};

const Input = ({ label, error, className = "", helper, ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--guest-muted)]">{label}</span>
    <input
      {...props}
      className={`w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-red-100 ${
        error ? "border-red-400 focus:border-red-500" : "border-[var(--guest-border)] focus:border-[var(--guest-red)]"
      } ${props.disabled ? "cursor-not-allowed bg-stone-100 text-stone-500" : ""}`}
    />
    {helper && !error && <p className="mt-1 text-xs text-[var(--guest-muted)]">{helper}</p>}
    <FieldError message={error} />
  </label>
);

const Select = ({ label, error, children, className = "", ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--guest-muted)]">{label}</span>
    <select
      {...props}
      className={`w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-red-100 ${
        error ? "border-red-400 focus:border-red-500" : "border-[var(--guest-border)] focus:border-[var(--guest-red)]"
      }`}
    >
      {children}
    </select>
    <FieldError message={error} />
  </label>
);

const TextArea = ({ label, error, ...props }) => (
  <label className="block md:col-span-2">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--guest-muted)]">{label}</span>
    <textarea
      {...props}
      className={`min-h-28 w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-red-100 ${
        error ? "border-red-400 focus:border-red-500" : "border-[var(--guest-border)] focus:border-[var(--guest-red)]"
      }`}
    />
    <FieldError message={error} />
  </label>
);

export default function ModernGuestRoomBookingForm({ content = {} }) {
  const { settings, loading: settingsLoading, error: settingsError } = useSystemSettings();
  const toast = useToast();
  const configuredMaxDays = Number(settings?.bookingDays?.guestMaxRequestDays);
  const maxDays = !settingsLoading && !settingsError && Number.isFinite(configuredMaxDays) && configuredMaxDays > 0 ? configuredMaxDays : 7;

  const [category, setCategory] = useState("");
  const [googleUser, setGoogleUser] = useState(null);
  const [googleError, setGoogleError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [terms, setTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({});

  const cities = useMemo(() => {
    const state = IndianStates.find((item) => item.name === form.state);
    return state?.cities || [];
  }, [form.state]);

  const showToast = (message, type = "info") => toast?.showToast?.(message, type);

  const validationErrors = useMemo(() => {
    const errors = { ...emptyErrors };
    const contact = form.contact.trim();
    const totalGuests = Number(form.guests);
    const males = Number(form.males || 0);
    const females = Number(form.females || 0);
    const stayDays = stayDaysBetween(form.from, form.to);

    if (!form.name.trim()) errors.name = "Full name of the guest is required.";
    if (!form.email.trim()) errors.email = "Thapar email is required.";
    else if (!form.email.toLowerCase().endsWith("@thapar.edu")) errors.email = "Only @thapar.edu email is allowed.";
    if (!contact) errors.contact = "Contact number is required.";
    else if (!/^\d{10}$/.test(contact)) errors.contact = "Enter a valid 10 digit contact number.";
    if (!form.empId.trim()) errors.empId = "Emp ID is required.";
    if (!form.department) errors.department = "Department is required.";
    if (!form.from) errors.from = "Check-in date is required.";
    if (!form.to) errors.to = "Check-out date is required.";
    if (form.from && form.to && stayDays < 0) errors.to = "Check-out date cannot be before check-in date.";
    if (form.from && form.to && stayDays > maxDays) errors.to = `Guest room requests can be submitted for a maximum stay of ${maxDays} days.`;
    if (form.guests === "") errors.guests = "Total guests is required.";
    else if (!Number.isFinite(totalGuests) || totalGuests < 1) errors.guests = "Total guests must be at least 1.";
    if (form.males === "") errors.males = "Male guests count is required.";
    else if (!Number.isFinite(males) || males < 0) errors.males = "Male guests cannot be negative.";
    if (form.females === "") errors.females = "Female guests count is required.";
    else if (!Number.isFinite(females) || females < 0) errors.females = "Female guests cannot be negative.";
    if (Number.isFinite(totalGuests) && Number.isFinite(males) && Number.isFinite(females) && totalGuests >= 1 && males + females !== totalGuests) {
      errors.guestBreakup = "Male Guests + Female Guests must equal Total Guests.";
    }
    if (!form.state) errors.state = "State is required.";
    if (!form.city) errors.city = "City is required.";
    if (!form.reference.trim()) errors.reference = "Host / referring faculty or staff name is required.";
    if (!form.purpose.trim()) errors.purpose = "Purpose is required.";
    if (!terms) errors.terms = "Please accept the guest room policies.";
    return errors;
  }, [form, maxDays, terms]);

  const visibleError = (field) => (touched[field] || preview ? validationErrors[field] : "");

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (preview) setPreview(false);
  };

  const updateCount = (field, value, min = 0) => {
    const normalized = normalizeNumber(value);
    const finalValue = normalized === "" ? "" : String(Math.max(min, Number(normalized)));
    update(field, finalValue);
    setTouched((prev) => ({ ...prev, guestBreakup: true }));
  };

  const handleGoogleSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      const email = String(decoded.email || "").trim().toLowerCase();
      if (!email.endsWith("@thapar.edu")) {
        setGoogleUser(null);
        setGoogleError("Only @thapar.edu Google accounts can submit Faculty / Staff guest room requests.");
        return;
      }

      setGoogleError("");
      setGoogleUser({ name: decoded.name || "", email });
      setForm((prev) => ({
        ...prev,
        email,
        name: prev.name || decoded.name || "",
      }));
      setTouched((prev) => ({ ...prev, email: true }));
      showToast("Thapar Google account verified", "success");
    } catch {
      setGoogleUser(null);
      setGoogleError("Could not verify Google login. Please try again.");
    }
  };

  const resetFlow = () => {
    setCategory("");
    setGoogleUser(null);
    setGoogleError("");
    setForm(initialForm);
    setTerms(false);
    setPreview(false);
    setTouched({});
  };

  const buildPayload = () => ({
    guestName: form.name.trim(),
    guestEmail: googleUser.email,
    guestPhone: form.contact.trim(),
    message: form.purpose.trim(),
    fullData: {
      rollno: form.empId.trim(),
      department: form.department,
      gender: "",
      from: form.from,
      to: form.to,
      checkInTime: form.checkInTime || "00:00",
      checkOutTime: form.checkOutTime || "23:59",
      guests: Number(form.guests),
      females: Number(form.females),
      males: Number(form.males),
      state: form.state,
      city: form.city,
      reference: form.reference.trim(),
      files: [],
    },
  });

  const submit = async () => {
    const allTouched = Object.keys(validationErrors).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched((prev) => ({ ...prev, ...allTouched }));

    if (!googleUser?.email) {
      setGoogleError("Please sign in with a valid @thapar.edu Google account first.");
      return;
    }

    if (Object.keys(validationErrors).length > 0) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    if (!preview) {
      setPreview(true);
      return;
    }

    try {
      setSubmitting(true);
      const payload = buildPayload();
      const res = await axios.post(`${BACKEND_URL}/api/enquiry/create`, payload, { timeout: 20000 });
      window.dispatchEvent(new CustomEvent("guestEnquiryCreated", { detail: res.data?.enquiry || null }));
      setSubmitted(true);
      setForm(initialForm);
      setTerms(false);
      setPreview(false);
      showToast("Guest room request submitted", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Submission failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="guest-card mx-auto max-w-3xl rounded-[2rem] p-10 text-center">
        <CheckCircle2 className="mx-auto mb-5 h-16 w-16 text-green-600" />
        <h2 className="guest-heading text-4xl font-semibold text-[var(--guest-blue)]">Request Submitted</h2>
        <p className="mt-4 text-[var(--guest-muted)]">
          {content.successMessage || "Your guest room booking request has been submitted successfully. You will receive an email update after review."}
        </p>
        <button onClick={() => setSubmitted(false)} className="guest-button-primary mt-7 rounded-full px-6 py-3 font-semibold">
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!category && (
        <div className="grid gap-5 md:grid-cols-2">
          {[
            ["parents_students", content.studentCard?.title || "Parents / Students", content.studentCard?.text || "Students may request guest accommodation for parents or guardians through hostel caretaker/warden guidance."],
            ["faculty_staff", content.staffCard?.title || "Faculty / Staff", content.staffCard?.text || "Faculty and staff may submit official guest accommodation requests after Thapar Google verification."],
          ].map(([key, title, text]) => (
            <button key={key} onClick={() => setCategory(key)} className="guest-card rounded-[2rem] p-8 text-left transition hover:-translate-y-1">
              <h3 className="guest-heading text-3xl font-semibold text-[var(--guest-blue)]">{title}</h3>
              <p className="mt-3 leading-7 text-[var(--guest-muted)]">{text}</p>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {category === "parents_students" && (
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="guest-card rounded-[2rem] p-6 md:p-8">
            <button onClick={resetFlow} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--guest-red)]">
              <ArrowLeft size={16} /> Back
            </button>
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f5e5d8] text-[var(--guest-red)]">
                <Info />
              </div>
              <div>
                <h2 className="guest-heading text-4xl font-semibold text-[var(--guest-blue)]">Parents / Students Booking Guidance</h2>
                <p className="mt-4 max-w-3xl leading-8 text-[var(--guest-muted)]">
                  Students and parents must contact or report to the respective hostel caretaker for guest room booking.
                  The caretaker/warden will guide the booking process according to hostel rules and room availability.
                </p>
                <div className="mt-6 rounded-2xl border border-[var(--guest-border)] bg-[#fbf6ee] p-5">
                  <p className="font-semibold text-[var(--guest-blue)]">Please keep these details ready:</p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--guest-muted)]">
                    <li>Student name and hostel details</li>
                    <li>Parent/guardian visitor details</li>
                    <li>Visit dates and valid identity/address proof</li>
                    <li>Purpose of stay and contact number</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {category === "faculty_staff" && (
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="guest-card rounded-[2rem] p-5 md:p-8">
            <button onClick={resetFlow} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--guest-red)]">
              <ArrowLeft size={16} /> Change category
            </button>

            {!googleUser && (
              <div className="mx-auto max-w-2xl rounded-[2rem] border border-[var(--guest-border)] bg-[#fbf6ee] p-8 text-center">
                <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-[var(--guest-red)]" />
                <h2 className="guest-heading text-4xl font-semibold text-[var(--guest-blue)]">Faculty / Staff Verification</h2>
                <p className="mt-3 text-[var(--guest-muted)]">Please sign in with your Thapar Google account to continue.</p>
                <div className="mt-6 flex justify-center">
                  <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setGoogleError("Google login failed. Please try again.")} />
                </div>
                {googleError && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{googleError}</p>}
              </div>
            )}

            {googleUser && (
              <>
                <div className="mb-8">
                  <h2 className="guest-heading text-4xl font-semibold text-[var(--guest-blue)]">Guest Room Request Form</h2>
                  <p className="mt-2 text-[var(--guest-muted)]">{content.instructionText}</p>
                </div>

                <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
                  Verified Thapar account: {googleUser.email}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Input label="Full Name of the Guest *" value={form.name} onChange={(e) => update("name", e.target.value)} onBlur={() => setTouched((p) => ({ ...p, name: true }))} error={visibleError("name")} />
                  <Input label="Email *" type="email" value={form.email} disabled error={visibleError("email")} helper="Auto-filled from Google Auth" />
                  <Input label="Contact *" value={form.contact} onChange={(e) => update("contact", e.target.value.replace(/[^0-9]/g, "").slice(0, 10))} onBlur={() => setTouched((p) => ({ ...p, contact: true }))} error={visibleError("contact")} placeholder="10 digit mobile number" />
                  <Input label="Emp ID *" value={form.empId} onChange={(e) => update("empId", e.target.value)} onBlur={() => setTouched((p) => ({ ...p, empId: true }))} error={visibleError("empId")} />

                  <Select label="Department *" value={form.department} onChange={(e) => update("department", e.target.value)} error={visibleError("department")}>
                    <option value="">Select department</option>
                    {VENUE_DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                  </Select>

                  <div className="md:col-span-2 rounded-2xl bg-[#fbf6ee] px-4 py-3 text-sm font-semibold text-[var(--guest-blue)]">
                    Guest room requests can be submitted for a maximum stay of {maxDays} days.
                  </div>

                  <Input label="Check-in Date *" type="date" value={form.from} onChange={(e) => update("from", e.target.value)} error={visibleError("from")} />
                  <Input label="Check-out Date *" type="date" value={form.to} onChange={(e) => update("to", e.target.value)} error={visibleError("to")} />
                  <Input label="Check-in Time" type="time" value={form.checkInTime} onChange={(e) => update("checkInTime", e.target.value)} />
                  <Input label="Check-out Time" type="time" value={form.checkOutTime} onChange={(e) => update("checkOutTime", e.target.value)} />

                  <Input label="Total Guests *" type="number" min="1" value={form.guests} onChange={(e) => updateCount("guests", e.target.value, 1)} error={visibleError("guests")} />
                  <Input label="Male Guests *" type="number" min="0" value={form.males} onChange={(e) => updateCount("males", e.target.value, 0)} error={visibleError("males") || visibleError("guestBreakup")} />
                  <Input label="Female Guests *" type="number" min="0" value={form.females} onChange={(e) => updateCount("females", e.target.value, 0)} error={visibleError("females") || visibleError("guestBreakup")} />

                  <Select label="State *" value={form.state} onChange={(e) => {
                    setForm((prev) => ({ ...prev, state: e.target.value, city: "" }));
                    setTouched((prev) => ({ ...prev, state: true, city: true }));
                    if (preview) setPreview(false);
                  }} error={visibleError("state")}>
                    <option value="">Select state</option>
                    {IndianStates.map((state) => <option key={state.name} value={state.name}>{state.name}</option>)}
                  </Select>
                  <Select label="City *" value={form.city} onChange={(e) => update("city", e.target.value)} error={visibleError("city")}>
                    <option value="">Select city</option>
                    {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                  </Select>

                  <Input
                    label="Host / Referring Faculty or Staff Name *"
                    value={form.reference}
                    onChange={(e) => update("reference", e.target.value)}
                    error={visibleError("reference")}
                    placeholder="Enter the name of the TIET faculty/staff member hosting or referring this guest"
                    className="md:col-span-2"
                  />

                  <TextArea label="Purpose *" value={form.purpose} onChange={(e) => update("purpose", e.target.value)} error={visibleError("purpose")} />
                </div>

                <label className="mt-6 flex gap-3 text-sm leading-6 text-stone-700">
                  <input type="checkbox" checked={terms} onChange={(e) => {
                    setTerms(e.target.checked);
                    setTouched((prev) => ({ ...prev, terms: true }));
                    if (preview) setPreview(false);
                  }} className="mt-1" />
                  <span>{content.termsText || "I confirm that the details are correct and I agree to the hostel guest room policies."}</span>
                </label>
                <FieldError message={visibleError("terms")} />

                {preview && (
                  <div className="mt-6 rounded-[2rem] border border-[var(--guest-border)] bg-white/80 p-5">
                    <h3 className="guest-heading text-2xl font-semibold text-[var(--guest-blue)]">Preview</h3>
                    <div className="mt-4 grid gap-2 text-sm text-stone-700 md:grid-cols-2">
                      <p><b>Name:</b> {form.name}</p>
                      <p><b>Email:</b> {googleUser.email}</p>
                      <p><b>Contact:</b> {form.contact}</p>
                      <p><b>Emp ID:</b> {form.empId}</p>
                      <p><b>Department:</b> {form.department}</p>
                      <p><b>Stay:</b> {form.from} to {form.to}</p>
                      <p><b>Time:</b> {form.checkInTime || "00:00"} to {form.checkOutTime || "23:59"}</p>
                      <p><b>Guests:</b> {form.guests} ({form.males} male, {form.females} female)</p>
                      <p><b>Location:</b> {form.city}, {form.state}</p>
                      <p><b>Reference:</b> {form.reference}</p>
                    </div>
                  </div>
                )}

                <button onClick={submit} disabled={submitting} className="guest-button-primary mt-7 inline-flex items-center gap-2 rounded-full px-7 py-3 font-semibold disabled:opacity-60">
                  {submitting && <Loader2 className="animate-spin" size={18} />} {preview ? "Submit Request" : "Preview Request"}
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
