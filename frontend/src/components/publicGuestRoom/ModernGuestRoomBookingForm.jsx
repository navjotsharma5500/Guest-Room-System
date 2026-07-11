import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { IndianStates } from "../../utils/indianStates";
import { VENUE_DEPARTMENTS } from "../../config/venueDepartments";
import useSystemSettings from "../../hooks/useSystemSettings";
import { useToast } from "../../context/ToastContext";
import { BACKEND_URL } from "../../utils/apiConfig";

const initialForm = {
  name: "",
  empId: "",
  rollno: "",
  department: "",
  contact: "",
  email: "",
  hostelId: "",
  roomId: "",
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

const CATEGORY_PARENT = "parents_students";
const CATEGORY_FACULTY = "faculty_staff";

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
      } ${props.disabled ? "cursor-not-allowed bg-stone-100 text-stone-500" : ""}`}
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

  const [category, setCategory] = useState("");
  const [googleUser, setGoogleUser] = useState(null);
  const [googleError, setGoogleError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [terms, setTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({});
  const [hostels, setHostels] = useState([]);
  const [hostelLoadError, setHostelLoadError] = useState("");
  const [loadingHostels, setLoadingHostels] = useState(false);

  const isParentStudent = category === CATEGORY_PARENT;
  const isFacultyStaff = category === CATEGORY_FACULTY;
  const parentStudentEnabled = content.enableParentStudentForm !== false && content.studentCard?.enabled !== false;
  const facultyStaffEnabled = content.enableFacultyStaffForm !== false && content.staffCard?.enabled !== false;
  const unavailableMessage = "Online booking is currently unavailable. Please contact the Hostel Office.";
  const defaultMaxDays = isParentStudent ? 4 : 7;
  const configuredMaxDays = Number(
    isParentStudent
      ? settings?.bookingDays?.parentStudentMaxRequestDays
      : settings?.bookingDays?.facultyStaffMaxRequestDays || settings?.bookingDays?.guestMaxRequestDays
  );
  const maxDays = !settingsLoading && !settingsError && Number.isFinite(configuredMaxDays) && configuredMaxDays > 0
    ? configuredMaxDays
    : defaultMaxDays;

  useEffect(() => {
    if (!isParentStudent) return;
    const loadHostels = async () => {
      try {
        setLoadingHostels(true);
        setHostelLoadError("");
        const res = await axios.get(`${BACKEND_URL}/api/hostels/public-options`, { timeout: 15000 });
        setHostels(Array.isArray(res.data?.hostels) ? res.data.hostels : []);
      } catch (err) {
        setHostelLoadError(err.response?.data?.message || "Unable to load hostels. Please try again.");
        setHostels([]);
      } finally {
        setLoadingHostels(false);
      }
    };
    loadHostels();
  }, [isParentStudent]);

  const selectedHostel = useMemo(
    () => hostels.find((hostel) => String(hostel._id) === String(form.hostelId)) || null,
    [hostels, form.hostelId]
  );

  const selectedRoom = useMemo(
    () => (selectedHostel?.rooms || []).find((room) => String(room._id) === String(form.roomId)) || null,
    [selectedHostel, form.roomId]
  );

  const isGirlsHostel = selectedHostel?.hostelType === "girls";
  const roomCapacity = Number(selectedRoom?.guestCapacity || 0);

  const cities = useMemo(() => {
    const state = IndianStates.find((item) => item.name === form.state);
    return state?.cities || [];
  }, [form.state]);

  const showToast = (message, type = "info") => toast?.showToast?.(message, type);

  const validationErrors = useMemo(() => {
    const errors = {};
    const contact = form.contact.trim();
    const totalGuests = Number(form.guests);
    const males = isGirlsHostel ? 0 : Number(form.males || 0);
    const females = Number(form.females || 0);
    const stayDays = stayDaysBetween(form.from, form.to);

    if (!form.name.trim()) errors.name = "Full name of the guest is required.";
    if (!form.email.trim()) errors.email = "Google email is required.";
    else if (isFacultyStaff && !form.email.toLowerCase().endsWith("@thapar.edu")) errors.email = "Only @thapar.edu email is allowed.";
    if (!contact) errors.contact = "Contact number is required.";
    else if (!/^\d{10}$/.test(contact)) errors.contact = "Enter a valid 10 digit contact number.";

    if (isFacultyStaff) {
      if (!form.empId.trim()) errors.empId = "Emp ID is required.";
      if (!form.department) errors.department = "Department is required.";
      if (!form.reference.trim()) errors.reference = "Host / referring faculty or staff name is required.";
    }

    if (isParentStudent) {
      if (!form.hostelId) errors.hostelId = "Hostel is required.";
      if (!form.roomId) errors.roomId = "Guest room is required.";
      if (roomCapacity > 0 && Number.isFinite(totalGuests) && totalGuests > roomCapacity) {
        errors.guests = `This guest room allows maximum ${roomCapacity} guest(s).`;
      }
      if (!form.reference.trim()) errors.reference = "Student name is required.";
    }

    if (!form.from) errors.from = "Check-in date is required.";
    if (!form.to) errors.to = "Check-out date is required.";
    if (form.from && form.to && stayDays < 0) errors.to = "Check-out date cannot be before check-in date.";
    if (form.from && form.to && stayDays > maxDays) errors.to = `Guest room requests can be submitted for a maximum stay of ${maxDays} days.`;
    if (form.guests === "") errors.guests = errors.guests || "Total guests is required.";
    else if (!Number.isFinite(totalGuests) || totalGuests < 1) errors.guests = "Total guests must be at least 1.";

    if (!isGirlsHostel) {
      if (form.males === "") errors.males = "Male guests count is required.";
      else if (!Number.isFinite(males) || males < 0) errors.males = "Male guests cannot be negative.";
    }
    if (form.females === "") errors.females = "Female guests count is required.";
    else if (!Number.isFinite(females) || females < 0) errors.females = "Female guests cannot be negative.";

    if (Number.isFinite(totalGuests) && Number.isFinite(males) && Number.isFinite(females) && totalGuests >= 1 && males + females !== totalGuests) {
      errors.guestBreakup = isGirlsHostel
        ? "Female Guests must equal Total Guests for girls hostel."
        : "Male Guests + Female Guests must equal Total Guests.";
    }

    if (!form.state) errors.state = "State is required.";
    if (!form.city) errors.city = "City is required.";
    if (!form.purpose.trim()) errors.purpose = "Purpose is required.";
    if (!terms) errors.terms = "Please accept the guest room policies.";
    return errors;
  }, [form, isFacultyStaff, isGirlsHostel, isParentStudent, maxDays, roomCapacity, terms]);

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

  const handleHostelChange = (hostelId) => {
    const hostel = hostels.find((item) => String(item._id) === String(hostelId));
    setForm((prev) => ({
      ...prev,
      hostelId,
      roomId: "",
      males: hostel?.hostelType === "girls" ? "0" : prev.males,
      females: hostel?.hostelType === "girls" && prev.guests ? prev.guests : prev.females,
    }));
    setTouched((prev) => ({ ...prev, hostelId: true, roomId: true, guestBreakup: true }));
    if (preview) setPreview(false);
  };

  const handleGoogleSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      const email = String(decoded.email || "").trim().toLowerCase();
      if (isFacultyStaff && !email.endsWith("@thapar.edu")) {
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
      showToast("Google account verified", "success");
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

  useEffect(() => {
    if ((category === CATEGORY_PARENT && !parentStudentEnabled) || (category === CATEGORY_FACULTY && !facultyStaffEnabled)) {
      resetFlow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, parentStudentEnabled, facultyStaffEnabled]);

  const buildPayload = () => {
    const categoryPayload = isParentStudent
      ? {
          hostelId: form.hostelId,
          roomId: form.roomId,
          hostelName: selectedHostel?.name || "",
          roomName: selectedRoom?.roomNo || "",
          bookingCategory: "ParentStudent",
        }
      : {
          bookingCategory: "FacultyStaff",
        };

    return {
      guestName: form.name.trim(),
      guestEmail: googleUser.email,
      guestPhone: form.contact.trim(),
      message: form.purpose.trim(),
      fullData: {
        rollno: isParentStudent ? form.rollno.trim() : form.empId.trim(),
        department: isParentStudent ? "" : form.department,
        gender: "",
        from: form.from,
        to: form.to,
        checkInTime: form.checkInTime || "00:00",
        checkOutTime: form.checkOutTime || "23:59",
        guests: Number(form.guests),
        females: Number(form.females),
        males: isGirlsHostel ? 0 : Number(form.males),
        state: form.state,
        city: form.city,
        reference: form.reference.trim(),
        files: [],
        ...categoryPayload,
      },
    };
  };

  const submit = async () => {
    const allTouched = Object.keys(validationErrors).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched((prev) => ({ ...prev, ...allTouched }));

    if (!googleUser?.email) {
      setGoogleError("Please sign in with Google first.");
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

  const categoryCards = [
    parentStudentEnabled && [CATEGORY_PARENT, content.studentCard?.title || "Parents / Students", content.studentCard?.text || "Students and parents can submit a guest room enquiry after Google verification."],
    facultyStaffEnabled && [CATEGORY_FACULTY, content.staffCard?.title || "Faculty / Staff", content.staffCard?.text || "Faculty and staff may submit official guest accommodation requests after Thapar Google verification."],
  ].filter(Boolean);

  if (categoryCards.length === 0) {
    return (
      <div className="guest-card mx-auto max-w-3xl rounded-[2rem] p-10 text-center">
        <ShieldCheck className="mx-auto mb-5 h-14 w-14 text-[var(--guest-red)]" />
        <h2 className="guest-heading text-3xl font-semibold text-[var(--guest-blue)]">Online Booking Unavailable</h2>
        <p className="mt-4 text-[var(--guest-muted)]">{unavailableMessage}</p>
      </div>
    );
  }

  const renderGoogleGate = () => (
    <div className="mx-auto max-w-2xl rounded-[2rem] border border-[var(--guest-border)] bg-[#fbf6ee] p-8 text-center">
      <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-[var(--guest-red)]" />
      <h2 className="guest-heading text-4xl font-semibold text-[var(--guest-blue)]">
        {isParentStudent ? "Parents / Students Verification" : "Faculty / Staff Verification"}
      </h2>
      <p className="mt-3 text-[var(--guest-muted)]">
        {isParentStudent
          ? "Please sign in with any Google account to continue."
          : "Please sign in with your Thapar Google account to continue."}
      </p>
      <div className="mt-6 flex justify-center">
        <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setGoogleError("Google login failed. Please try again.")} />
      </div>
      {googleError && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{googleError}</p>}
    </div>
  );

  const renderCommonFields = () => (
    <>
      <Input label="Full Name of the Guest *" value={form.name} onChange={(e) => update("name", e.target.value)} error={visibleError("name")} />
      <Input label="Email *" type="email" value={form.email} disabled error={visibleError("email")} helper="Auto-filled from Google Auth" />
      <Input label="Contact *" value={form.contact} onChange={(e) => update("contact", e.target.value.replace(/[^0-9]/g, "").slice(0, 10))} error={visibleError("contact")} placeholder="10 digit mobile number" />
    </>
  );

  const renderParentStudentFields = () => (
    <>
      {renderCommonFields()}
      <Input label="Roll Number" value={form.rollno} onChange={(e) => update("rollno", e.target.value)} placeholder="Student roll number (optional)" />
      <Select label="Hostel *" value={form.hostelId} onChange={(e) => handleHostelChange(e.target.value)} error={visibleError("hostelId")}>
        <option value="">{loadingHostels ? "Loading hostels..." : "Select hostel"}</option>
        {hostels.map((hostel) => <option key={hostel._id} value={hostel._id}>{hostel.name}</option>)}
      </Select>
      <Select label="Guest Room *" value={form.roomId} disabled={!selectedHostel} onChange={(e) => update("roomId", e.target.value)} error={visibleError("roomId")}>
        <option value="">{selectedHostel ? "Select guest room" : "Select hostel first"}</option>
        {(selectedHostel?.rooms || []).map((room) => (
          <option key={room._id} value={room._id}>
            {room.roomNo} ({room.guestCapacity || 2} guest capacity)
          </option>
        ))}
      </Select>
      {hostelLoadError && <p className="md:col-span-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{hostelLoadError}</p>}
    </>
  );

  const renderFacultyFields = () => (
    <>
      {renderCommonFields()}
      <Input label="Emp ID *" value={form.empId} onChange={(e) => update("empId", e.target.value)} error={visibleError("empId")} />
      <Select label="Department *" value={form.department} onChange={(e) => update("department", e.target.value)} error={visibleError("department")}>
        <option value="">Select department</option>
        {VENUE_DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
      </Select>
    </>
  );

  const renderBookingFields = () => (
    <>
      <div className="md:col-span-2 rounded-2xl bg-[#fbf6ee] px-4 py-3 text-sm font-semibold text-[var(--guest-blue)]">
        Guest room requests can be submitted for a maximum stay of {maxDays} days.
      </div>
      <Input label="Check-in Date *" type="date" value={form.from} onChange={(e) => update("from", e.target.value)} error={visibleError("from")} />
      <Input label="Check-out Date *" type="date" value={form.to} onChange={(e) => update("to", e.target.value)} error={visibleError("to")} />
      <Input label="Check-in Time" type="time" value={form.checkInTime} onChange={(e) => update("checkInTime", e.target.value)} />
      <Input label="Check-out Time" type="time" value={form.checkOutTime} onChange={(e) => update("checkOutTime", e.target.value)} />
      <Input
        label="Total Guests *"
        type="number"
        min="1"
        max={roomCapacity || undefined}
        value={form.guests}
        onChange={(e) => {
          updateCount("guests", e.target.value, 1);
          if (isGirlsHostel) {
            const normalized = normalizeNumber(e.target.value);
            setForm((prev) => ({ ...prev, males: "0", females: normalized === "" ? "" : String(Math.max(1, Number(normalized))) }));
          }
        }}
        error={visibleError("guests")}
      />
      {!isGirlsHostel && (
        <Input label="Male Guests *" type="number" min="0" value={form.males} onChange={(e) => updateCount("males", e.target.value, 0)} error={visibleError("males") || visibleError("guestBreakup")} />
      )}
      <Input label="Female Guests *" type="number" min="0" value={form.females} onChange={(e) => updateCount("females", e.target.value, 0)} error={visibleError("females") || visibleError("guestBreakup")} />
      {isGirlsHostel && <input type="hidden" value="0" readOnly />}

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
        label={isParentStudent ? "Student Name *" : "Host / Referring Faculty or Staff Name *"}
        value={form.reference}
        onChange={(e) => update("reference", e.target.value)}
        error={visibleError("reference")}
        placeholder={isParentStudent ? "Enter the name of your son/daughter studying at TIET." : "Enter the name of the TIET faculty/staff member hosting or referring this guest"}
        className="md:col-span-2"
      />
      <TextArea label="Purpose *" value={form.purpose} onChange={(e) => update("purpose", e.target.value)} error={visibleError("purpose")} />
    </>
  );

  return (
    <div className="space-y-8">
      {!category && (
        <div className="grid gap-5 md:grid-cols-2">
          {categoryCards.map(([key, title, text]) => (
            <button key={key} onClick={() => setCategory(key)} className="guest-card rounded-[2rem] p-8 text-left transition hover:-translate-y-1">
              <h3 className="guest-heading text-3xl font-semibold text-[var(--guest-blue)]">{title}</h3>
              <p className="mt-3 leading-7 text-[var(--guest-muted)]">{text}</p>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {category && (
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="guest-card rounded-[2rem] p-5 md:p-8">
            <button onClick={resetFlow} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--guest-red)]">
              <ArrowLeft size={16} /> Change category
            </button>

            {!googleUser && renderGoogleGate()}

            {googleUser && (
              <>
                <div className="mb-8">
                  <h2 className="guest-heading text-4xl font-semibold text-[var(--guest-blue)]">
                    {isParentStudent ? "Parents / Students Guest Room Request" : "Guest Room Request Form"}
                  </h2>
                  <p className="mt-2 text-[var(--guest-muted)]">{content.instructionText}</p>
                </div>

                <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
                  Verified Google account: {googleUser.email}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  {isParentStudent ? renderParentStudentFields() : renderFacultyFields()}
                  {renderBookingFields()}
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
                      {isParentStudent ? <p><b>Roll No:</b> {form.rollno || "—"}</p> : <p><b>Emp ID:</b> {form.empId}</p>}
                      {isParentStudent ? <p><b>Hostel:</b> {selectedHostel?.name}</p> : <p><b>Department:</b> {form.department}</p>}
                      {isParentStudent && <p><b>Guest Room:</b> {selectedRoom?.roomNo}</p>}
                      <p><b>Stay:</b> {form.from} to {form.to}</p>
                      <p><b>Time:</b> {form.checkInTime || "00:00"} to {form.checkOutTime || "23:59"}</p>
                      <p><b>Guests:</b> {form.guests} ({isGirlsHostel ? 0 : form.males} male, {form.females} female)</p>
                      <p><b>Location:</b> {form.city}, {form.state}</p>
                      <p><b>{isParentStudent ? "Student" : "Reference"}:</b> {form.reference}</p>
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
