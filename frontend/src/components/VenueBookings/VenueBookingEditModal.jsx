import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { IKContext, IKUpload } from "imagekitio-react";
import {
  AlertCircle,
  Building,
  Calendar,
  Clock,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Upload,
  User,
  X,
} from "lucide-react";
import AttachmentGrid from "../AttachmentGrid";
import { VENUE_DEPARTMENTS } from "../../config/venueDepartments";
import { getEnabledVenueFormOptions } from "../../config/venueRoomsConfig";
import useVenueConfig from "../../hooks/useVenueConfig";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { useToast } from "../../context/ToastContext";
import {
  BACKEND_URL,
  IMAGEKIT_AUTH_ENDPOINT,
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
} from "../../utils/apiConfig";
import { isDailySlotOverlapping, timeToMinutes } from "../../utils/dateUtils";
import {
  DEFAULT_VENUE_BOOKING_FOR,
  VENUE_BOOKING_FOR_OPTIONS,
  isValidVenueBookingFor,
} from "../../constants/venueBookingForOptions";

const API = BACKEND_URL;

const authenticator = async () => {
  const response = await fetch(IMAGEKIT_AUTH_ENDPOINT, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Auth request failed ${response.status}`);
  }

  const data = await response.json();
  return {
    signature: data.signature,
    expire: data.expire,
    token: data.token,
    publicKey: data.publicKey,
  };
};

const toFormData = (booking = {}) => ({
  hall: booking.hall || "",
  roomNo: booking.roomNo || "",
  name: booking.name || "",
  societyName: booking.societyName || "",
  eventName: booking.eventName || "",
  department: booking.department || "",
  contact: booking.contact || "",
  email: booking.email || "",
  societyEmail: booking.societyEmail || "",
  presidentEmail: booking.presidentEmail || "",
  checkInDate: booking.checkInDate || "",
  checkInTime: booking.checkInTime || "",
  checkOutDate: booking.checkOutDate || "",
  checkOutTime: booking.checkOutTime || "",
  purpose: booking.purpose || "",
  description: booking.description || "",
  attachments: Array.isArray(booking.attachments) ? booking.attachments : [],
  bookingFor: booking.bookingFor || DEFAULT_VENUE_BOOKING_FOR,
});

const getVenueValue = (formData) =>
  formData.hall && formData.roomNo ? `${formData.hall}|||${formData.roomNo}` : "";

export const canEditVenueBooking = (booking) => {
  if (!booking) return false;
  if (!["booked", "checked_in"].includes(String(booking.status || ""))) return false;
  const end = new Date(`${booking.checkOutDate || ""}T${booking.checkOutTime || ""}`);
  return !Number.isNaN(end.getTime()) && end > new Date();
};

export default function VenueBookingEditModal({ booking, theme, onClose, onSaved }) {
  useEscapeKey(onClose);
  const { showToast } = useToast();
  const { enabledVenueConfig } = useVenueConfig();
  const [formData, setFormData] = useState(() => toFormData(booking));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [existingBookings, setExistingBookings] = useState([]);
  const [availability, setAvailability] = useState({
    isLoading: false,
    isValid: true,
    message: "",
  });

  useEffect(() => {
    setFormData(toFormData(booking));
    setErrors({});
    setUploadError("");
  }, [booking]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await fetch(`${API}/api/venue-bookings`, {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch venue bookings");
        const data = await response.json();
        setExistingBookings(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch venue bookings for edit conflict check:", error);
        setExistingBookings([]);
      }
    };
    fetchBookings();
  }, []);

  const venueOptions = useMemo(
    () =>
      getEnabledVenueFormOptions(enabledVenueConfig).flatMap((group) =>
        (group.rooms || []).map((roomName) => ({
          value: `${group.hall}|||${roomName}`,
          label: `${roomName} (${group.groupLabel})`,
          hall: group.hall,
          roomNo: roomName,
        }))
      ),
    [enabledVenueConfig]
  );

  useEffect(() => {
    const { hall, roomNo, checkInDate, checkOutDate, checkInTime, checkOutTime } =
      formData;

    if (!hall || !roomNo || !checkInDate || !checkOutDate || !checkInTime || !checkOutTime) {
      setAvailability({ isLoading: false, isValid: true, message: "" });
      return;
    }

    const start = new Date(`${checkInDate}T${checkInTime}`);
    const end = new Date(`${checkOutDate}T${checkOutTime}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setAvailability({
        isLoading: false,
        isValid: false,
        message: "Check-out date/time must be after check-in date/time.",
      });
      return;
    }

    if (timeToMinutes(checkOutTime) <= timeToMinutes(checkInTime)) {
      setAvailability({
        isLoading: false,
        isValid: false,
        message: "Daily end time must be after daily start time.",
      });
      return;
    }

    setAvailability((prev) => ({ ...prev, isLoading: true }));
    const timer = setTimeout(() => {
      const conflict = existingBookings.find((item) => {
        if (item._id === booking?._id) return false;
        if (!["booked", "checked_in"].includes(item.status)) return false;
        if (item.hall !== hall || item.roomNo !== roomNo) return false;
        return isDailySlotOverlapping(
          checkInDate,
          checkOutDate,
          checkInTime,
          checkOutTime,
          item.checkInDate,
          item.checkOutDate,
          item.checkInTime,
          item.checkOutTime
        );
      });

      setAvailability({
        isLoading: false,
        isValid: !conflict,
        message: conflict
          ? `Time overlap detected with ${conflict.eventName || "another booking"}.`
          : "",
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [booking?._id, existingBookings, formData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleVenueChange = (event) => {
    const [hall = "", roomNo = ""] = event.target.value.split("|||");
    setFormData((prev) => ({ ...prev, hall, roomNo }));
    if (errors.hall || errors.roomNo) {
      setErrors((prev) => ({ ...prev, hall: "", roomNo: "" }));
    }
  };

  const handleUploadStart = () => {
    setUploading(true);
    setUploadError("");
  };

  const handleUploadSuccess = (response) => {
    setUploading(false);
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, response.url],
    }));
    showToast("File uploaded successfully", "success");
  };

  const handleUploadError = (error) => {
    console.error("Venue edit ImageKit upload error:", error);
    setUploading(false);
    setUploadError("Failed to upload file. Please try again.");
    showToast("File upload failed", "error");
  };

  const removeAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.hall || !formData.roomNo) nextErrors.hall = "Venue is required";
    if (!formData.name.trim()) nextErrors.name = "Name is required";
    if (!formData.eventName.trim()) nextErrors.eventName = "Event name is required";
    if (!formData.department.trim()) nextErrors.department = "Department is required";
    if (!formData.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!formData.email.endsWith("@thapar.edu")) {
      nextErrors.email = "Email must be @thapar.edu";
    }
    if (formData.contact.trim() && !/^\d{10}$/.test(formData.contact)) {
      nextErrors.contact = "Contact must be exactly 10 digits";
    }
    if (!formData.checkInDate) nextErrors.checkInDate = "Start date is required";
    if (!formData.checkInTime) nextErrors.checkInTime = "Start time is required";
    if (!formData.checkOutDate) nextErrors.checkOutDate = "End date is required";
    if (!formData.checkOutTime) nextErrors.checkOutTime = "End time is required";
    if (
      formData.checkInTime &&
      formData.checkOutTime &&
      timeToMinutes(formData.checkOutTime) <= timeToMinutes(formData.checkInTime)
    ) {
      nextErrors.checkOutTime = "End time must be after start time";
    }
    if (!formData.attachments.length) {
      nextErrors.attachments = "At least one attachment is required";
    }
    if (!isValidVenueBookingFor(formData.bookingFor)) {
      nextErrors.bookingFor = "Calendar type is required";
    }
    if (!availability.isValid) {
      nextErrors.availability = availability.message || "Selected slot is not available";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      showToast("Please fix the highlighted fields", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${API}/api/venue-bookings/${booking._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to update venue booking");
      }

      showToast(data.message || "Venue booking updated successfully", "success");
      onSaved?.(data.booking);
    } catch (error) {
      showToast(error.message || "Failed to update venue booking", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full rounded border px-4 py-3 text-sm ${
      errors[field]
        ? "border-red-500"
        : theme === "dark"
        ? "border-[#5f6368] bg-[#3c4043] text-[#e8eaed]"
        : "border-[#dadce0] bg-white text-[#202124]"
    }`;

  return (
    <IKContext
      publicKey={IMAGEKIT_PUBLIC_KEY}
      urlEndpoint={IMAGEKIT_URL_ENDPOINT}
      authenticator={authenticator}
    >
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className={`relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl shadow-2xl ${
            theme === "dark" ? "bg-[#292a2d]" : "bg-white"
          }`}
        >
          <div
            className={`flex items-center justify-between border-b px-6 py-4 ${
              theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"
            }`}
          >
            <div>
              <h2
                className={`text-xl font-semibold ${
                  theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                }`}
              >
                Edit Venue Booking
              </h2>
              <p
                className={`mt-1 text-sm ${
                  theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                }`}
              >
                Update booking details, venue, date/time, attachments, and calendar type.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-full p-2 ${
                theme === "dark"
                  ? "text-[#9aa0a6] hover:bg-[#3c4043]"
                  : "text-[#5f6368] hover:bg-[#f1f3f4]"
              }`}
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  <MapPin className="mr-2 inline h-4 w-4 text-red-600" />
                  Venue <span className="text-red-500">*</span>
                </label>
                <select
                  value={getVenueValue(formData)}
                  onChange={handleVenueChange}
                  className={inputClass("hall")}
                >
                  <option value="">Select venue</option>
                  {venueOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.hall && <p className="mt-1 text-xs text-red-500">{errors.hall}</p>}
              </div>

              <Field label="Name" icon={<User />} required error={errors.name}>
                <input name="name" value={formData.name} onChange={handleChange} className={inputClass("name")} />
              </Field>
              <Field label="Email" icon={<Mail />} required error={errors.email}>
                <input name="email" value={formData.email} onChange={handleChange} className={inputClass("email")} />
              </Field>
              <Field label="Event Name" icon={<Building />} required error={errors.eventName}>
                <input name="eventName" value={formData.eventName} onChange={handleChange} className={inputClass("eventName")} />
              </Field>
              <Field label="Department" icon={<Building />} required error={errors.department}>
                <input
                  list="venue-edit-departments"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={inputClass("department")}
                />
                <datalist id="venue-edit-departments">
                  {VENUE_DEPARTMENTS.map((department) => (
                    <option key={department} value={department} />
                  ))}
                </datalist>
              </Field>
              <Field label="Calendar Type" icon={<Calendar />} required error={errors.bookingFor}>
                <select
                  name="bookingFor"
                  value={formData.bookingFor}
                  onChange={handleChange}
                  className={inputClass("bookingFor")}
                >
                  {VENUE_BOOKING_FOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Contact" icon={<Phone />} error={errors.contact}>
                <input
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  maxLength={10}
                  className={inputClass("contact")}
                />
              </Field>
              <Field label="Society Name" icon={<Building />}>
                <input name="societyName" value={formData.societyName} onChange={handleChange} className={inputClass("societyName")} />
              </Field>
              <Field label="Purpose" icon={<FileText />}>
                <input name="purpose" value={formData.purpose} onChange={handleChange} className={inputClass("purpose")} />
              </Field>
              <Field label="Start Date" icon={<Calendar />} required error={errors.checkInDate}>
                <input type="date" name="checkInDate" value={formData.checkInDate} onChange={handleChange} className={inputClass("checkInDate")} />
              </Field>
              <Field label="Start Time" icon={<Clock />} required error={errors.checkInTime}>
                <input type="time" name="checkInTime" value={formData.checkInTime} onChange={handleChange} className={inputClass("checkInTime")} />
              </Field>
              <Field label="End Date" icon={<Calendar />} required error={errors.checkOutDate}>
                <input type="date" name="checkOutDate" min={formData.checkInDate} value={formData.checkOutDate} onChange={handleChange} className={inputClass("checkOutDate")} />
              </Field>
              <Field label="End Time" icon={<Clock />} required error={errors.checkOutTime}>
                <input type="time" name="checkOutTime" value={formData.checkOutTime} onChange={handleChange} className={inputClass("checkOutTime")} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Description" icon={<FileText />}>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className={inputClass("description")}
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <div
                  className={`rounded-xl border p-4 ${
                    availability.isLoading
                      ? "border-blue-200 bg-blue-50"
                      : availability.isValid
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  {availability.isLoading ? (
                    <p className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking availability...
                    </p>
                  ) : availability.isValid ? (
                    <p className="text-sm font-semibold text-green-700">
                      Selected slot is available.
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
                      <AlertCircle className="h-4 w-4" />
                      {availability.message}
                    </p>
                  )}
                  {errors.availability && (
                    <p className="mt-1 text-xs text-red-500">{errors.availability}</p>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Upload className="h-4 w-4 text-red-600" />
                  Attachments <span className="text-red-500">*</span>
                </h3>
                <IKUpload
                  onUploadStart={handleUploadStart}
                  onSuccess={handleUploadSuccess}
                  onError={handleUploadError}
                  folder="/venuebooking"
                  useUniqueFileName
                  isPrivateFile={false}
                />
                {uploading && <p className="mt-2 text-sm text-blue-600">Uploading...</p>}
                {uploadError && <p className="mt-2 text-sm text-red-500">{uploadError}</p>}
                {formData.attachments.length > 0 && (
                  <div className="mt-4">
                    <AttachmentGrid
                      files={formData.attachments}
                      onRemove={removeAttachment}
                      theme={theme}
                    />
                  </div>
                )}
                {errors.attachments && (
                  <p className="mt-2 text-sm text-red-500">{errors.attachments}</p>
                )}
              </div>
            </div>
          </div>

          <div
            className={`flex flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:justify-end ${
              theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploading || !availability.isValid}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </motion.form>
      </motion.div>
    </IKContext>
  );
}

function Field({ label, icon, required = false, error, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-700">
        {icon &&
          React.cloneElement(icon, {
            className: "mr-2 inline h-4 w-4 text-red-600",
          })}
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
