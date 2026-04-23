import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Building,
  FileText,
  CheckCircle,
  AlertCircle,
  CheckCircle2,
  Loader,
  MapPin,
} from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { IKContext, IKUpload } from "imagekitio-react";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import {
  BACKEND_URL,
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
  IMAGEKIT_AUTH_ENDPOINT,
} from "../../utils/apiConfig";
import AttachmentGrid from "../AttachmentGrid";
import { VENUE_DEPARTMENTS } from "../../config/venueDepartments";
import { getEnabledVenueFormOptions } from "../../config/venueRoomsConfig";
import useVenueConfig from "../../hooks/useVenueConfig";
import {
  isDailySlotOverlapping,
  timeToMinutes,
} from "../../utils/dateUtils";

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

const getInitialFormData = ({ prefill, checkIn, checkOut, mode }) => ({
  name: prefill?.name || "",
  societyName: prefill?.societyName || "",
  eventName: prefill?.eventName || "",
  department: prefill?.department || "",
  contact: prefill?.contact || "",
  email: prefill?.email || "",
  societyEmail: prefill?.societyEmail || "",
  presidentEmail: prefill?.presidentEmail || "",
  bookingStartDate:
    mode === "rebook"
      ? ""
      : checkIn || prefill?.checkInDate || prefill?.bookingStartDate || "",
  bookingEndDate:
    mode === "rebook"
      ? ""
      : checkOut || prefill?.checkOutDate || prefill?.bookingEndDate || "",
  dailyStartTime:
    mode === "rebook"
      ? "10:00"
      : prefill?.checkInTime || prefill?.dailyStartTime || "10:00",
  dailyEndTime:
    mode === "rebook"
      ? "16:00"
      : prefill?.checkOutTime || prefill?.dailyEndTime || "16:00",
  purpose: prefill?.purpose || "",
  description: prefill?.description || "",
  attachments: [],
});

const getStepTitle = (step) => {
  switch (step) {
    case 0:
      return "Select Venue";
    case 1:
      return "Guest Information";
    case 2:
      return "Booking Details";
    case 3:
      return "Attachments";
    default:
      return "Review";
  }
};

export default function VenueBookingModal({
  theme,
  selectedRooms = [],
  checkIn,
  checkOut,
  prefill,
  mode = "create",
  onClose,
  onSubmit,
  onSelectedRoomsChange,
}) {
  useEscapeKey(onClose);
  const { showToast } = useToast();
  const { enabledVenueConfig } = useVenueConfig();

  const isRebookMode = mode === "rebook";
  const initialStep = isRebookMode ? 0 : 1;
  const finalStep = isRebookMode ? 4 : 4;
  const prefillKey = prefill?._id || prefill?.id || "";

  const [formData, setFormData] = useState(
    getInitialFormData({ prefill, checkIn, checkOut, mode })
  );
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [step, setStep] = useState(initialStep);
  const [existingBookings, setExistingBookings] = useState([]);
  const [availability, setAvailability] = useState({
    isLoading: false,
    hasOverlap: false,
    overlapMessage: "",
    isValid: true,
  });

  const venueOptions = useMemo(() => {
    return getEnabledVenueFormOptions(enabledVenueConfig).flatMap((group) =>
      (group.rooms || []).map((roomName) => ({
        value: `${group.hall}|||${roomName}`,
        label: `${roomName} (${group.groupLabel})`,
        hall: group.hall,
        roomNo: roomName,
      }))
    );
  }, [enabledVenueConfig]);

  const selectedVenueValue = useMemo(() => {
    if (!selectedRooms.length) return "";
    const room = selectedRooms[0];
    return `${room.hall}|||${room.roomNo}`;
  }, [selectedRooms]);

  useEffect(() => {
    setFormData(getInitialFormData({ prefill, checkIn, checkOut, mode }));
    setStep(initialStep);
    setErrors({});
    setUploadError("");
  }, [prefillKey, checkIn, checkOut, mode, initialStep]);

  useEffect(() => {
    if (!selectedRooms.length) {
      setExistingBookings([]);
      return;
    }

    const fetchBookings = async () => {
      try {
        const response = await fetch(`${API}/api/venue-bookings`, {
          method: "GET",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch existing venue bookings");
        }

        const bookings = await response.json();
        const filteredBookings = (Array.isArray(bookings) ? bookings : []).filter(
          (booking) =>
            selectedRooms.some(
              (room) =>
                room.hall === booking.hall && room.roomNo === booking.roomNo
            )
        );
        setExistingBookings(filteredBookings);
      } catch (error) {
        console.error("Failed to fetch existing bookings:", error);
        setExistingBookings([]);
      }
    };

    fetchBookings();
  }, [selectedRooms]);

  useEffect(() => {
    const { bookingStartDate, bookingEndDate, dailyStartTime, dailyEndTime } =
      formData;

    if (!bookingStartDate || !bookingEndDate || !dailyStartTime || !dailyEndTime) {
      setAvailability({
        isLoading: false,
        hasOverlap: false,
        overlapMessage: "",
        isValid: true,
      });
      return;
    }

    const checkAvailability = async () => {
      const startDateTime = new Date(`${bookingStartDate}T${dailyStartTime}`);
      const endDateTime = new Date(`${bookingEndDate}T${dailyEndTime}`);

      if (endDateTime <= startDateTime) {
        setAvailability({
          isLoading: false,
          hasOverlap: true,
          overlapMessage: "❌ End time must be after start time",
          isValid: false,
        });
        return;
      }

      if (bookingStartDate === bookingEndDate) {
        const startTimeMin = timeToMinutes(dailyStartTime);
        const endTimeMin = timeToMinutes(dailyEndTime);
        if (endTimeMin <= startTimeMin) {
          setAvailability({
            isLoading: false,
            hasOverlap: true,
            overlapMessage: "❌ End time must be after start time",
            isValid: false,
          });
          return;
        }
      }

      setAvailability((prev) => ({ ...prev, isLoading: true }));

      await new Promise((resolve) => setTimeout(resolve, 250));

      let conflictingBooking = null;
      for (const booking of existingBookings) {
        if (!["booked", "checked_in", "approved"].includes(booking.status)) {
          continue;
        }

        const overlap = isDailySlotOverlapping(
          bookingStartDate,
          bookingEndDate,
          dailyStartTime,
          dailyEndTime,
          booking.checkInDate || booking.bookingStartDate,
          booking.checkOutDate || booking.bookingEndDate,
          booking.checkInTime || booking.dailyStartTime,
          booking.checkOutTime || booking.dailyEndTime
        );

        if (overlap) {
          conflictingBooking = booking;
          break;
        }
      }

      if (conflictingBooking) {
        const conflictStart = new Date(
          conflictingBooking.checkInDate || conflictingBooking.bookingStartDate
        );
        const conflictEnd = new Date(
          conflictingBooking.checkOutDate || conflictingBooking.bookingEndDate
        );
        const dateFormat = { month: "short", day: "numeric" };

        setAvailability({
          isLoading: false,
          hasOverlap: true,
          overlapMessage: `❌ Time overlap detected: ${conflictingBooking.hall} - ${conflictingBooking.roomNo} is booked from ${conflictStart.toLocaleDateString(
            "en-IN",
            dateFormat
          )} to ${conflictEnd.toLocaleDateString(
            "en-IN",
            dateFormat
          )} during ${
            conflictingBooking.checkInTime || conflictingBooking.dailyStartTime
          }–${
            conflictingBooking.checkOutTime || conflictingBooking.dailyEndTime
          }.`,
          isValid: false,
        });
      } else {
        setAvailability({
          isLoading: false,
          hasOverlap: false,
          overlapMessage: "",
          isValid: true,
        });
      }
    };

    checkAvailability();
  }, [formData, existingBookings]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleVenueSelection = (event) => {
    const value = event.target.value;
    if (!value) {
      onSelectedRoomsChange?.([]);
      if (errors.selectedRooms) {
        setErrors((prev) => ({ ...prev, selectedRooms: "" }));
      }
      return;
    }

    const [hall, roomNo] = value.split("|||");
    onSelectedRoomsChange?.([{ hall, roomNo }]);
    if (errors.selectedRooms) {
      setErrors((prev) => ({ ...prev, selectedRooms: "" }));
    }
  };

  const handleUploadStart = () => {
    setUploading(true);
    setUploadError("");
  };

  const handleUploadSuccess = (res) => {
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, res.url],
    }));
    setUploading(false);
    showToast("✅ File uploaded successfully", "success");
    if (errors.attachments) {
      setErrors((prev) => ({ ...prev, attachments: "" }));
    }
  };

  const handleUploadError = (err) => {
    console.error("❌ ImageKit upload error:", err);
    setUploading(false);
    setUploadError("Failed to upload file. Please try again.");
    showToast("❌ File upload failed", "error");
  };

  const removeAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (isRebookMode && step >= 0 && selectedRooms.length === 0) {
      newErrors.selectedRooms = "Venue is required";
    }

    if (step >= 1) {
      if (!formData.name.trim()) newErrors.name = "Name is required";
      if (!formData.eventName.trim()) newErrors.eventName = "Event name is required";
      if (!formData.department.trim()) newErrors.department = "Department is required";
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!formData.email.endsWith("@thapar.edu")) {
        newErrors.email = "Email must be @thapar.edu";
      }
      if (formData.contact.trim() && !/^\d{10}$/.test(formData.contact)) {
        newErrors.contact = "Contact must be exactly 10 digits";
      }
    }

    if (step >= 2) {
      if (!formData.bookingStartDate) {
        newErrors.bookingStartDate = "Start date is required";
      }
      if (!formData.bookingEndDate) {
        newErrors.bookingEndDate = "End date is required";
      }
      if (!formData.dailyStartTime) {
        newErrors.dailyStartTime = "Daily start time is required";
      }
      if (!formData.dailyEndTime) {
        newErrors.dailyEndTime = "Daily end time is required";
      }

      if (
        formData.bookingStartDate &&
        formData.bookingEndDate &&
        new Date(formData.bookingEndDate) < new Date(formData.bookingStartDate)
      ) {
        newErrors.bookingEndDate = "End date must be >= start date";
      }

      if (
        formData.dailyStartTime &&
        formData.dailyEndTime &&
        timeToMinutes(formData.dailyEndTime) <=
          timeToMinutes(formData.dailyStartTime)
      ) {
        newErrors.dailyEndTime = "End time must be > start time";
      }
    }

    if (step >= 3 && formData.attachments.length === 0) {
      newErrors.attachments = "At least one attachment is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canProceedToNext = () => {
    if (step === 0) {
      return selectedRooms.length > 0;
    }

    if (step === 1) {
      return (
        Boolean(formData.name.trim()) &&
        Boolean(formData.eventName.trim()) &&
        Boolean(formData.department.trim()) &&
        (!formData.contact.trim() || /^\d{10}$/.test(formData.contact)) &&
        formData.email.endsWith("@thapar.edu")
      );
    }

    if (step === 2) {
      if (
        !formData.bookingStartDate ||
        !formData.bookingEndDate ||
        !formData.dailyStartTime ||
        !formData.dailyEndTime
      ) {
        return false;
      }

      return availability.isValid;
    }

    if (step === 3) {
      return formData.attachments.length > 0;
    }

    return false;
  };

  const handleNext = () => {
    if (!validateForm()) {
      showToast("⚠️ Please fill all required fields correctly", "warning");
      return;
    }

    if (step === 2 && !availability.isValid) {
      showToast("❌ Please select an available time slot", "error");
      return;
    }

    if (canProceedToNext()) {
      setStep((prev) => prev + 1);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      showToast("⚠️ Please fill all required fields correctly", "warning");
      return;
    }

    if (selectedRooms.length === 0) {
      showToast("⚠️ Please select a venue", "warning");
      return;
    }

    const payload = {
      ...formData,
      checkInDate: formData.bookingStartDate,
      checkOutDate: formData.bookingEndDate,
      checkInTime: formData.dailyStartTime,
      checkOutTime: formData.dailyEndTime,
    };

    await onSubmit(payload);
  };

  const formatDateRange = () => {
    if (!formData.bookingStartDate || !formData.bookingEndDate) return "—";

    const options = { month: "short", day: "numeric" };
    const startDate = new Date(formData.bookingStartDate);
    const endDate = new Date(formData.bookingEndDate);
    const dayCount =
      Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    return `${startDate.toLocaleDateString(
      "en-IN",
      options
    )} – ${endDate.toLocaleDateString("en-IN", options)} (${dayCount}d)`;
  };

  const getDailySlotSummary = () => {
    if (!formData.dailyStartTime || !formData.dailyEndTime) return "—";
    return `${formData.dailyStartTime}–${formData.dailyEndTime}`;
  };

  const venueSummary = selectedRooms.map((room) => `${room.hall} — ${room.roomNo}`);

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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(event) => event.stopPropagation()}
          className={`relative w-full max-w-3xl overflow-hidden rounded-lg shadow-2xl ${
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
                className={`text-xl font-normal ${
                  theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                }`}
              >
                {isRebookMode ? "Rebook Venue" : "Create Venue Booking"}
              </h2>
              <p
                className={`mt-1 text-sm ${
                  theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                }`}
              >
                {getStepTitle(step)} • Step {step + (isRebookMode ? 1 : 0)} of{" "}
                {isRebookMode ? 5 : 4}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`rounded-full p-2 transition-colors ${
                theme === "dark"
                  ? "text-[#9aa0a6] hover:bg-[#3c4043]"
                  : "text-[#5f6368] hover:bg-[#f1f3f4]"
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[calc(90vh-200px)] overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              {step === 0 && isRebookMode && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  className="space-y-6"
                >
                  <div>
                    <h3
                      className={`flex items-center gap-2 text-xl font-semibold ${
                        theme === "dark" ? "text-gray-100" : "text-gray-800"
                      }`}
                    >
                      <MapPin className="h-6 w-6 text-red-600" />
                      Select Venue For Rebooking
                    </h3>
                    <p
                      className={`mt-2 text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Choose a fresh venue for this rebooking. Previous venue,
                      dates, and attachments are intentionally not reused.
                    </p>
                  </div>

                  <div>
                    <label
                      className={`mb-2 block text-sm font-semibold ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Venue <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedVenueValue}
                      onChange={handleVenueSelection}
                      className={`w-full rounded border px-4 py-3 text-sm ${
                        errors.selectedRooms
                          ? "border-red-500"
                          : theme === "dark"
                          ? "border-[#5f6368] bg-[#3c4043] text-[#e8eaed]"
                          : "border-[#dadce0] bg-white text-[#202124]"
                      }`}
                    >
                      <option value="">Select venue</option>
                      {venueOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.selectedRooms && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.selectedRooms}
                      </p>
                    )}
                  </div>

                  {selectedRooms.length > 0 && (
                    <div
                      className={`rounded-2xl border-2 p-5 ${
                        theme === "dark"
                          ? "border-blue-700 bg-blue-900/20"
                          : "border-blue-200 bg-blue-50"
                      }`}
                    >
                      <p
                        className={`mb-3 flex items-center gap-2 text-sm font-semibold ${
                          theme === "dark" ? "text-blue-400" : "text-blue-700"
                        }`}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Selected Venue
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {venueSummary.map((label) => (
                          <span
                            key={label}
                            className={`rounded-full px-4 py-2 text-sm font-medium ${
                              theme === "dark"
                                ? "bg-blue-800 text-blue-100"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  className="space-y-6"
                >
                  <div>
                    <h3
                      className={`flex items-center gap-2 text-xl font-semibold ${
                        theme === "dark" ? "text-gray-100" : "text-gray-800"
                      }`}
                    >
                      <User className="h-6 w-6 text-red-600" />
                      Basic Information
                    </h3>
                  </div>

                  <div
                    className={`rounded-2xl border-2 p-5 ${
                      theme === "dark"
                        ? "border-blue-700 bg-blue-900/20"
                        : "border-blue-200 bg-blue-50"
                    }`}
                  >
                    <p
                      className={`mb-3 flex items-center gap-2 text-sm font-semibold ${
                        theme === "dark" ? "text-blue-400" : "text-blue-700"
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Selected Halls/Rooms ({selectedRooms.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {venueSummary.map((label) => (
                        <span
                          key={label}
                          className={`rounded-full px-4 py-2 text-sm font-medium ${
                            theme === "dark"
                              ? "bg-blue-800 text-blue-100"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label
                        className={`mb-2 block text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <User className="mr-2 inline h-4 w-4 text-red-600" />
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full rounded border px-4 py-3 text-sm ${
                          errors.name
                            ? "border-red-500"
                            : theme === "dark"
                            ? "border-[#5f6368] bg-[#3c4043] text-[#e8eaed]"
                            : "border-[#dadce0] bg-white text-[#202124]"
                        }`}
                        placeholder="Your name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label
                        className={`mb-2 block text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <Mail className="mr-2 inline h-4 w-4 text-red-600" />
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full rounded border px-4 py-3 text-sm ${
                          errors.email
                            ? "border-red-500"
                            : theme === "dark"
                            ? "border-[#5f6368] bg-[#3c4043] text-[#e8eaed]"
                            : "border-[#dadce0] bg-white text-[#202124]"
                        }`}
                        placeholder="example@thapar.edu"
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label
                        className={`mb-2 block text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <Building className="mr-2 inline h-4 w-4 text-red-600" />
                        Event Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="eventName"
                        value={formData.eventName}
                        onChange={handleChange}
                        className={`w-full rounded border px-4 py-3 text-sm ${
                          errors.eventName
                            ? "border-red-500"
                            : theme === "dark"
                            ? "border-[#5f6368] bg-[#3c4043] text-[#e8eaed]"
                            : "border-[#dadce0] bg-white text-[#202124]"
                        }`}
                        placeholder="Event name"
                      />
                      {errors.eventName && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.eventName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        className={`mb-2 block text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <Building className="mr-2 inline h-4 w-4 text-red-600" />
                        Department <span className="text-red-500">*</span>
                      </label>
                      <input
                        list="venue-departments"
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className={`w-full rounded border px-4 py-3 text-sm ${
                          errors.department
                            ? "border-red-500"
                            : theme === "dark"
                            ? "border-[#5f6368] bg-[#3c4043] text-[#e8eaed]"
                            : "border-[#dadce0] bg-white text-[#202124]"
                        }`}
                        placeholder="Department"
                      />
                      <datalist id="venue-departments">
                        {VENUE_DEPARTMENTS.map((department) => (
                          <option key={department} value={department} />
                        ))}
                      </datalist>
                      {errors.department && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.department}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        className={`mb-2 block text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <Phone className="mr-2 inline h-4 w-4 text-red-600" />
                        Contact
                      </label>
                      <input
                        type="tel"
                        name="contact"
                        value={formData.contact}
                        onChange={handleChange}
                        maxLength={10}
                        className={`w-full rounded border px-4 py-3 text-sm ${
                          errors.contact
                            ? "border-red-500"
                            : theme === "dark"
                            ? "border-[#5f6368] bg-[#3c4043] text-[#e8eaed]"
                            : "border-[#dadce0] bg-white text-[#202124]"
                        }`}
                        placeholder="10 digit number"
                      />
                      {errors.contact && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.contact}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        className={`mb-2 block text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <Building className="mr-2 inline h-4 w-4 text-red-600" />
                        Society Name
                      </label>
                      <input
                        type="text"
                        name="societyName"
                        value={formData.societyName}
                        onChange={handleChange}
                        className={`w-full rounded border px-4 py-3 text-sm ${
                          theme === "dark"
                            ? "border-[#5f6368] bg-[#3c4043] text-[#e8eaed]"
                            : "border-[#dadce0] bg-white text-[#202124]"
                        }`}
                        placeholder="Society name"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label
                        className={`mb-2 block text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <FileText className="mr-2 inline h-4 w-4 text-red-600" />
                        Purpose
                      </label>
                      <input
                        type="text"
                        name="purpose"
                        value={formData.purpose}
                        onChange={handleChange}
                        className={`w-full rounded border px-4 py-3 text-sm ${
                          theme === "dark"
                            ? "border-[#5f6368] bg-[#3c4043] text-[#e8eaed]"
                            : "border-[#dadce0] bg-white text-[#202124]"
                        }`}
                        placeholder="Purpose of booking"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label
                        className={`mb-2 block text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <FileText className="mr-2 inline h-4 w-4 text-red-600" />
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={4}
                        className={`w-full rounded border px-4 py-3 text-sm ${
                          theme === "dark"
                            ? "border-[#5f6368] bg-[#3c4043] text-[#e8eaed]"
                            : "border-[#dadce0] bg-white text-[#202124]"
                        }`}
                        placeholder="Event description"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  className="space-y-8"
                >
                  <div>
                    <h3
                      className={`mb-4 flex items-center gap-2 text-lg font-semibold ${
                        theme === "dark" ? "text-gray-100" : "text-gray-800"
                      }`}
                    >
                      <Calendar className="h-5 w-5 text-blue-600" />
                      Booking Dates
                    </h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <label
                          className={`mb-2 block text-sm font-semibold ${
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="bookingStartDate"
                          value={formData.bookingStartDate}
                          onChange={handleChange}
                          className={`w-full rounded border px-4 py-3 text-sm ${
                            errors.bookingStartDate
                              ? "border-red-500"
                              : theme === "dark"
                              ? "border-[#5f6368] bg-[#3c4043] text-[#e8eaed]"
                              : "border-[#dadce0] bg-white text-[#202124]"
                          }`}
                        />
                        {errors.bookingStartDate && (
                          <p className="mt-1 text-xs text-red-500">
                            {errors.bookingStartDate}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          className={`mb-2 block text-sm font-semibold ${
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          End Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="bookingEndDate"
                          min={formData.bookingStartDate}
                          value={formData.bookingEndDate}
                          onChange={handleChange}
                          className={`w-full rounded border px-4 py-3 text-sm ${
                            errors.bookingEndDate
                              ? "border-red-500"
                              : theme === "dark"
                              ? "border-[#5f6368] bg-[#3c4043] text-[#e8eaed]"
                              : "border-[#dadce0] bg-white text-[#202124]"
                          }`}
                        />
                        {errors.bookingEndDate && (
                          <p className="mt-1 text-xs text-red-500">
                            {errors.bookingEndDate}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`rounded-xl border p-6 ${
                      theme === "dark"
                        ? "border-purple-700 bg-purple-900/30"
                        : "border-purple-200 bg-purple-50"
                    }`}
                  >
                    <h3
                      className={`mb-4 flex items-center gap-2 text-lg font-semibold ${
                        theme === "dark" ? "text-purple-300" : "text-purple-700"
                      }`}
                    >
                      <Clock className="h-5 w-5" />
                      Daily Time Slot
                    </h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <label
                          className={`mb-2 block text-sm font-semibold ${
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Daily Start Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          name="dailyStartTime"
                          value={formData.dailyStartTime}
                          onChange={handleChange}
                          className={`w-full rounded border px-4 py-3 text-sm ${
                            errors.dailyStartTime
                              ? "border-red-500"
                              : theme === "dark"
                              ? "border-[#5f6368] bg-[#3c4043] text-[#e8eaed]"
                              : "border-[#dadce0] bg-white text-[#202124]"
                          }`}
                        />
                        {errors.dailyStartTime && (
                          <p className="mt-1 text-xs text-red-500">
                            {errors.dailyStartTime}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          className={`mb-2 block text-sm font-semibold ${
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Daily End Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          name="dailyEndTime"
                          value={formData.dailyEndTime}
                          onChange={handleChange}
                          className={`w-full rounded border px-4 py-3 text-sm ${
                            errors.dailyEndTime
                              ? "border-red-500"
                              : theme === "dark"
                              ? "border-[#5f6368] bg-[#3c4043] text-[#e8eaed]"
                              : "border-[#dadce0] bg-white text-[#202124]"
                          }`}
                        />
                        {errors.dailyEndTime && (
                          <p className="mt-1 text-xs text-red-500">
                            {errors.dailyEndTime}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {formData.bookingStartDate &&
                    formData.bookingEndDate &&
                    formData.dailyStartTime &&
                    formData.dailyEndTime && (
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`flex items-center gap-3 rounded-lg border-2 p-4 ${
                          availability.isLoading
                            ? theme === "dark"
                              ? "border-blue-600 bg-blue-900/20"
                              : "border-blue-300 bg-blue-50"
                            : availability.hasOverlap
                            ? theme === "dark"
                              ? "border-red-600 bg-red-900/20"
                              : "border-red-300 bg-red-50"
                            : theme === "dark"
                            ? "border-green-600 bg-green-900/20"
                            : "border-green-300 bg-green-50"
                        }`}
                      >
                        {availability.isLoading ? (
                          <>
                            <Loader
                              className={`h-5 w-5 animate-spin ${
                                theme === "dark"
                                  ? "text-blue-400"
                                  : "text-blue-600"
                              }`}
                            />
                            <span
                              className={`text-sm font-semibold ${
                                theme === "dark"
                                  ? "text-blue-300"
                                  : "text-blue-700"
                              }`}
                            >
                              Checking availability...
                            </span>
                          </>
                        ) : availability.hasOverlap ? (
                          <>
                            <AlertCircle
                              className={`h-5 w-5 ${
                                theme === "dark"
                                  ? "text-red-400"
                                  : "text-red-600"
                              }`}
                            />
                            <span
                              className={`text-sm font-semibold ${
                                theme === "dark"
                                  ? "text-red-300"
                                  : "text-red-700"
                              }`}
                            >
                              {availability.overlapMessage}
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2
                              className={`h-5 w-5 ${
                                theme === "dark"
                                  ? "text-green-400"
                                  : "text-green-600"
                              }`}
                            />
                            <span
                              className={`text-sm font-semibold ${
                                theme === "dark"
                                  ? "text-green-300"
                                  : "text-green-700"
                              }`}
                            >
                              Booking Summary: Daily {getDailySlotSummary()} ·{" "}
                              {formatDateRange()}
                            </span>
                          </>
                        )}
                      </motion.div>
                    )}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  className="space-y-6"
                >
                  <div>
                    <h3
                      className={`mb-4 text-lg font-semibold ${
                        theme === "dark" ? "text-gray-100" : "text-gray-800"
                      }`}
                    >
                      <Upload className="mr-2 inline h-5 w-5 text-red-600" />
                      Upload Attachments
                    </h3>
                    <p
                      className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Rebooking requires fresh document upload. Previous attachments
                      are not reused.
                    </p>
                  </div>

                  <IKUpload
                    onUploadStart={handleUploadStart}
                    onSuccess={handleUploadSuccess}
                    onError={handleUploadError}
                    folder="/venuebooking"
                    useUniqueFileName={true}
                    isPrivateFile={false}
                  />

                  {uploading && (
                    <p
                      className={`text-sm ${
                        theme === "dark" ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      Uploading...
                    </p>
                  )}
                  {uploadError && (
                    <p className="text-sm text-red-500">{uploadError}</p>
                  )}

                  {formData.attachments.length > 0 && (
                    <div>
                      <h4
                        className={`mb-3 text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Uploaded Files ({formData.attachments.length})
                      </h4>
                      <AttachmentGrid
                        files={formData.attachments}
                        onRemove={removeAttachment}
                        theme={theme}
                      />
                    </div>
                  )}

                  {errors.attachments && (
                    <p className="text-sm text-red-500">{errors.attachments}</p>
                  )}
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  className="space-y-6"
                >
                  <h3
                    className={`text-lg font-semibold ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}
                  >
                    Review Your Booking
                  </h3>

                  <div
                    className={`rounded-lg p-6 ${
                      theme === "dark" ? "bg-[#3c4043]" : "bg-[#f1f3f4]"
                    }`}
                  >
                    <div className="space-y-4">
                      <div>
                        <p
                          className={`text-xs font-semibold ${
                            theme === "dark"
                              ? "text-[#9aa0a6]"
                              : "text-[#5f6368]"
                          }`}
                        >
                          Venue
                        </p>
                        <p
                          className={`text-base ${
                            theme === "dark"
                              ? "text-[#e8eaed]"
                              : "text-[#202124]"
                          }`}
                        >
                          {venueSummary.join(", ") || "—"}
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-xs font-semibold ${
                            theme === "dark"
                              ? "text-[#9aa0a6]"
                              : "text-[#5f6368]"
                          }`}
                        >
                          Name
                        </p>
                        <p
                          className={`text-base ${
                            theme === "dark"
                              ? "text-[#e8eaed]"
                              : "text-[#202124]"
                          }`}
                        >
                          {formData.name || "—"}
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-xs font-semibold ${
                            theme === "dark"
                              ? "text-[#9aa0a6]"
                              : "text-[#5f6368]"
                          }`}
                        >
                          Booking Dates
                        </p>
                        <p
                          className={`text-base ${
                            theme === "dark"
                              ? "text-[#e8eaed]"
                              : "text-[#202124]"
                          }`}
                        >
                          {formatDateRange()}
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-xs font-semibold ${
                            theme === "dark"
                              ? "text-[#9aa0a6]"
                              : "text-[#5f6368]"
                          }`}
                        >
                          Daily Time Slot
                        </p>
                        <p
                          className={`text-base ${
                            theme === "dark"
                              ? "text-[#e8eaed]"
                              : "text-[#202124]"
                          }`}
                        >
                          {getDailySlotSummary()}
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-xs font-semibold ${
                            theme === "dark"
                              ? "text-[#9aa0a6]"
                              : "text-[#5f6368]"
                          }`}
                        >
                          Event
                        </p>
                        <p
                          className={`text-base ${
                            theme === "dark"
                              ? "text-[#e8eaed]"
                              : "text-[#202124]"
                          }`}
                        >
                          {formData.eventName || "—"}
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-xs font-semibold ${
                            theme === "dark"
                              ? "text-[#9aa0a6]"
                              : "text-[#5f6368]"
                          }`}
                        >
                          Purpose
                        </p>
                        <p
                          className={`text-base ${
                            theme === "dark"
                              ? "text-[#e8eaed]"
                              : "text-[#202124]"
                          }`}
                        >
                          {formData.purpose || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className={`flex-1 rounded py-3 font-medium ${
                        theme === "dark"
                          ? "bg-[#3c4043] text-[#e8eaed] hover:bg-[#5f6368]"
                          : "bg-[#f1f3f4] text-[#202124] hover:bg-[#dadce0]"
                      }`}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className={`flex-1 rounded py-3 font-medium text-white ${
                        theme === "dark"
                          ? "bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124]"
                          : "bg-[#1a73e8] hover:bg-[#1765cc]"
                      }`}
                    >
                      {isRebookMode ? "Complete Rebooking" : "Complete Booking"}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div
            className={`flex gap-3 border-t px-8 py-4 ${
              theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"
            }`}
          >
            {step > initialStep && step < finalStep && (
              <button
                onClick={() => setStep((prev) => prev - 1)}
                className={`flex-1 rounded py-2.5 font-medium ${
                  theme === "dark"
                    ? "bg-[#3c4043] text-[#e8eaed] hover:bg-[#5f6368]"
                    : "bg-[#f1f3f4] text-[#202124]"
                }`}
              >
                Back
              </button>
            )}
            {step < finalStep && (
              <button
                onClick={handleNext}
                disabled={step === 2 && !availability.isValid}
                className={`flex-1 rounded py-2.5 font-medium text-white ${
                  step === 2 && !availability.isValid
                    ? theme === "dark"
                      ? "cursor-not-allowed bg-[#5f6368] text-[#9aa0a6] opacity-60"
                      : "cursor-not-allowed bg-[#dadce0] text-[#9aa0a6] opacity-60"
                    : theme === "dark"
                    ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                    : "bg-[#1a73e8] hover:bg-[#1765cc]"
                }`}
              >
                Next
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </IKContext>
  );
}
