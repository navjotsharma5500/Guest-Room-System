//DirectBookingModal.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "../context/ToastContext";
import AttachmentGrid from "./AttachmentGrid";
import { isDateTimeRangeOverlapping, combineDateAndTime, formatTimeWithAMPM } from "../utils/dateUtils";
import { IndianStates } from "../utils/indianStates";
import { IKContext, IKUpload } from "imagekitio-react";
import { 
  BACKEND_URL, 
  IMAGEKIT_PUBLIC_KEY, 
  IMAGEKIT_URL_ENDPOINT, 
  IMAGEKIT_AUTH_ENDPOINT 
} from "../utils/apiConfig";

const API = BACKEND_URL;

const authenticator = async () => {
  try {
    const r = await fetch(IMAGEKIT_AUTH_ENDPOINT, { method: "GET" });
    if (!r.ok) throw new Error(`Auth request failed ${r.status}`);
    const data = await r.json();
    return {
      signature: data.signature,
      expire: data.expire,
      token: data.token,
      publicKey: data.publicKey,
    };
  } catch (err) {
    console.error("ImageKit authenticator error:", err);
    throw err;
  }
};

export default function DirectBookingModal({ modal, onClose, onSubmit }) {
  const { hostel, room, prefill } = modal || {};
  const toastContext = useToast();
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) {
      toastContext.showToast(message, type);
    }
  };

  /* ------------------ STATES ------------------ */
  const [step, setStep] = useState(1);
  const [from, setFrom] = useState(prefill?.from || "");
  const [to, setTo] = useState(prefill?.to || "");
  const [checkInTime, setCheckInTime] = useState(prefill?.checkInTime || "");
  const [checkOutTime, setCheckOutTime] = useState(prefill?.checkOutTime || "");
  const [remarks, setRemarks] = useState("");
  const [cityList, setCityList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  /* --- MAIN FORM --- */
  const [form, setForm] = useState({
    guest: prefill?.guest || prefill?.name || "",
    rollno: prefill?.rollno || "",
    department: prefill?.department || "",
    contact: prefill?.contact || "",
    email: prefill?.email || "",
    gender: prefill?.gender || "Male",
    numGuests: prefill?.numGuests || prefill?.guests || 1,
    females: prefill?.females || "",
    males: prefill?.males || "",
    city: prefill?.city || "",
    state: prefill?.state || "",
    reference: prefill?.reference || "",
    purpose: prefill?.purpose || "",
    paymentType: "Paid",
    amount: "",
    files: prefill?.files || [], // Address Proof - saved to /directbooking
  });

  // Payment-specific attachments - saved to /approval
  const [paymentFiles, setPaymentFiles] = useState([]);

  const [validationErrors, setValidationErrors] = useState({
    dates: "",
    rollno: "",
    guestCount: "",
  });

  /* ------------------ VALIDATIONS ------------------ */
  // ✅ Get today's date at midnight
  const getTodayMidnight = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  // ✅ Calculate date difference in days
  const getDaysDifference = (fromDate, toDate) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);
    const diffTime = to - from;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // ✅ Validate booking dates (no past dates, max 3 days)
  const validateBookingDates = (fromDate, toDate) => {
    const errors = {};
    const today = getTodayMidnight();
    
    if (!fromDate || !toDate) {
      errors.dates = "Both check-in and check-out dates are required";
      return errors;
    }

    const checkInDate = new Date(fromDate);
    const checkOutDate = new Date(toDate);
    checkInDate.setHours(0, 0, 0, 0);
    checkOutDate.setHours(0, 0, 0, 0);

    // Validation 1: Cannot select past dates
    if (checkInDate < today) {
      errors.dates = "❌ Check-in date cannot be in the past";
      return errors;
    }

    if (checkOutDate < today) {
      errors.dates = "❌ Check-out date cannot be in the past";
      return errors;
    }

    if (checkOutDate <= checkInDate) {
      errors.dates = "❌ Check-out date must be after check-in date";
      return errors;
    }

    // Validation 2: Maximum 3 days booking
    const daysDiff = getDaysDifference(fromDate, toDate);
    if (daysDiff > 3) {
      errors.dates = `❌ Maximum booking duration is 3 days. You selected ${daysDiff} days.`;
      return errors;
    }

    return errors;
  };

  // ✅ Validate Roll No format (numeric only, max 12 digits)
  const validateRollNo = (value) => {
    if (!value || value.trim() === "") return "";
    
    if (!/^\d+$/.test(value)) {
      return "❌ Roll No/Emp ID must contain only numbers";
    }
    
    if (value.length > 12) {
      return "❌ Roll No/Emp ID cannot exceed 12 digits";
    }
    
    return "";
  };

  // ✅ Validate guest counts (males + females = total)
  const validateGuestCounts = (total, males, females) => {
    const totalGuests = Number(total) || 0;
    const maleCount = Number(males) || 0;
    const femaleCount = Number(females) || 0;

    if (totalGuests <= 0) {
      return "❌ Total guests must be at least 1";
    }

    if (maleCount + femaleCount !== totalGuests) {
      return `❌ Male (${maleCount}) + Female (${femaleCount}) guests must equal Total (${totalGuests})`;
    }

    return "";
  };

  const validateDateRange = () => {
    if (!from || !to || !checkInTime || !checkOutTime) return false;

    // ✅ Check date validations but DON'T update state here
    const dateErrors = validateBookingDates(from, to);
    if (Object.keys(dateErrors).length > 0) {
      return false;
    }

    const startDate = new Date(from);
    const endDate = new Date(to);
    if (startDate > endDate) return false;

    return !(room?.bookings || []).some((b) => {
      if (b.status === "cancelled") return false;

      return isDateTimeRangeOverlapping(
        b.from,
        b.to,
        b.checkInTime || "00:00",
        b.checkOutTime || "23:59",
        from,
        to,
        checkInTime,
        checkOutTime
      );
    });
  };

  const validateContact = (v) => /^[0-9]{10}$/.test(v);
  const validateEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

  const canSubmit = () => {
    if (!form.guest.trim()) return false;
    if (!validateContact(form.contact)) return false;
    if (!validateEmail(form.email)) return false;
    if (form.files.length === 0) return false;

    // ✅ NEW: Validate dates
    const dateErrors = validateBookingDates(from, to);
    if (Object.keys(dateErrors).length > 0) return false;

    // ✅ NEW: Validate Roll No
    if (form.rollno && form.rollno.trim() !== "") {
      const rollnoError = validateRollNo(form.rollno);
      if (rollnoError) return false;
    }

    // ✅ NEW: Validate guest counts
    const guestCountError = validateGuestCounts(form.numGuests, form.males, form.females);
    if (guestCountError) return false;

    if (form.paymentType === "Paid") {
      if (Number(form.amount) <= 0) return false;
    }
    
    if (form.paymentType === "Free") {
      if (!remarks.trim()) return false;
      if (paymentFiles.length === 0) return false;
    }

    if (!from || !to || !checkInTime || !checkOutTime) return false;
    if (!validateDateRange()) return false;
    
    return true;
  };

  /* ------------------ ADDRESS PROOF FILE UPLOAD (Step 2) ------------------ */
  const handleAddressProofSuccess = (response) => {
    console.log("✅ Address Proof Upload Success:", response);

    let finalUrl =
      response.url ||
      (response.response && response.response.url) ||
      (response.filePath ? `${IMAGEKIT_URL_ENDPOINT}${response.filePath}` : null);

    if (!finalUrl) {
      finalUrl = response?.data?.url || response?.response?.data?.url || null;
    }

    if (!finalUrl) {
      console.error("❌ No URL received from ImageKit:", response);
      showToast("❌ Upload failed - no URL received", "error");
      setUploading(false);
      setUploadError("Upload failed: Could not get file URL");
      return;
    }

    console.log("📋Ž Address Proof URL:", finalUrl);
    setUploading(false);
    showToast("📋Ž Address proof uploaded successfully", "success");

    setForm((prev) => ({
      ...prev,
      files: [...prev.files, finalUrl],
    }));
  };

  const removeAddressProof = (index) => {
    setForm((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  /* ------------------ PAYMENT FILE UPLOAD (Step 3) ------------------ */
  const handlePaymentFileSuccess = (response) => {
    console.log("✅ Payment File Upload Success:", response);

    let finalUrl =
      response.url ||
      (response.response && response.response.url) ||
      (response.filePath ? `${IMAGEKIT_URL_ENDPOINT}${response.filePath}` : null);

    if (!finalUrl) {
      finalUrl = response?.data?.url || response?.response?.data?.url || null;
    }

    if (!finalUrl) {
      console.error("❌ No URL received from ImageKit:", response);
      showToast("❌ Upload failed - no URL received", "error");
      setUploading(false);
      setUploadError("Upload failed: Could not get file URL");
      return;
    }

    console.log("📋Ž Payment File URL:", finalUrl);
    setUploading(false);
    showToast("📋Ž Payment file uploaded successfully", "success");

    setPaymentFiles((prev) => [...prev, finalUrl]);
  };

  const removePaymentFile = (index) => {
    setPaymentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /* ------------------ COMMON ERROR HANDLER ------------------ */
  const handleIKError = (err) => {
    console.error("❌ ImageKit Upload Error:", err);
    setUploading(false);
    const msg = err?.message || err?.details || "Upload failed. Please try again.";
    setUploadError(msg);
    showToast("❌ Upload failed", "error");
  };

  /* ------------------ FINAL SUBMIT FUNCTION ------------------ */
  const handleSubmit = async () => {
    if (!validateDateRange()) {
      showToast(
        "⚠️ The selected date/time overlaps with an existing booking.",
        "error"
      );
      return;
    }

    // ✅ ADD THIS CHECK
    if (room?.isBlocked) {
      showToast(
        "❌ This room is currently blocked and cannot be booked.",
        "error"
      );
      return;
    }

    const toISO = (dateStr, timeStr) => {
      try {
        const iso = combineDateAndTime(dateStr, timeStr || "00:00");
        return iso ? iso.toISOString() : dateStr;
      } catch {
        return dateStr;
      }
    };

    // ✅ CRITICAL FIX: Proper attachment routing based on payment type
    const bookingPayload = {
      guest: form.guest,
      rollno: form.rollno,
      department: form.department,
      contact: form.contact,
      email: form.email,
      gender: form.gender,
      numGuests: form.numGuests,
      females: form.females,
      males: form.males,
      city: form.city,
      state: form.state,
      reference: form.reference,
      purpose: form.purpose,
      
      // ✅ Payment Type and Amount
      paymentType: form.paymentType,
      totalAmount: form.paymentType === "Paid" ? Number(form.amount) : 0,
      paidAmount: 0,
      balanceAmount: form.paymentType === "Paid" ? Number(form.amount) : 0,
      
      remarks: remarks,
      
      // ✅ Address Proof (always from Step 2)
      files: form.files,
      
      // ✅ CRITICAL FIX: ALL payment attachments go to approvalDocuments
      approvalDocuments: paymentFiles,
      
      // ✅ paymentAttachments should be EMPTY for new bookings
      paymentAttachments: [],
      
      // ✅ Extension attachments should be EMPTY for new bookings
      extensionAttachments: [],
      
      from: toISO(from, "00:00"),
      to: toISO(to, "23:59"),
      checkInTime: checkInTime || "00:00",
      checkOutTime: checkOutTime || "23:59",
      
      hostel: hostel,
      roomNo: room?.roomNo,
      
      enquiryId: prefill?.enquiryId || null,
    };

    try {
      console.log("â¬†ï¸ Uploading booking to MongoDB:", bookingPayload);

      const token = localStorage.getItem("token");
      const bookingHeaders = {
        "Content-Type": "application/json",
      };

      if (token) {
        bookingHeaders["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API}/api/bookings`, {
        method: "POST",
        credentials: "include",
        headers: bookingHeaders,
        body: JSON.stringify(bookingPayload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ Booking upload failed:", res.status, errText);
        showToast("❌ Failed to save booking", "error");
        return;
      }

      const saved = await res.json();
      console.log("✅ Booking saved to MongoDB:", saved);

      const savedBooking = saved?.booking ? {
        ...bookingPayload,
        ...saved.booking,
        _id: saved.booking._id,
        id: saved.booking._id,
      } : bookingPayload;

      onSubmit(savedBooking);
      showToast("✅ Booking saved successfully!", "success");
      onClose();
    } catch (err) {
      console.error("🔓 Direct booking error:", err);
      showToast("❌ Server error while saving booking", "error");
    }
  };

  const isDateValid =
    from && to && checkInTime && checkOutTime
      ? validateDateRange()
      : true;

  /* ------------------ RENDER ------------------ */
  return (
    <IKContext
      publicKey={IMAGEKIT_PUBLIC_KEY}
      urlEndpoint={IMAGEKIT_URL_ENDPOINT}
      authenticationEndpoint={IMAGEKIT_AUTH_ENDPOINT}
      authenticator={authenticator}
    >
      <motion.div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-[95%] sm:max-w-[750px] max-h-[90vh] overflow-y-auto shadow-xl"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          {/* HEADER */}
          <h2 className="text-lg sm:text-xl font-bold text-red-700 mb-3 sm:mb-4">
            Direct Booking — {hostel} / Room {room?.roomNo}
          </h2>

          {/* ------------------ STEP 1: DATE SELECTION ------------------ */}
          {step === 1 && (
            <>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                Select booking date range
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm mb-1 block">From</label>
                  <input
                    type="date"
                    value={from}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newFrom = e.target.value;
                      setFrom(newFrom);
                      
                      // Only validate if both dates are filled
                      if (newFrom && to) {
                        const errors = validateBookingDates(newFrom, to);
                        setValidationErrors(prev => ({ ...prev, ...errors }));
                      } else {
                        setValidationErrors(prev => ({ ...prev, dates: "" }));
                      }
                    }}
                    className="border p-2 text-sm sm:text-base rounded w-full"
                  />
                </div>

                <div>
                  <label className="text-sm mb-1 block">To</label>
                  <input
                    type="date"
                    value={to}
                    min={from || new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newTo = e.target.value;
                      setTo(newTo);
                      
                      // Only validate if both dates are filled
                      if (from && newTo) {
                        const errors = validateBookingDates(from, newTo);
                        setValidationErrors(prev => ({ ...prev, ...errors }));
                      } else {
                        setValidationErrors(prev => ({ ...prev, dates: "" }));
                      }
                    }}
                    className="border p-2 text-sm sm:text-base rounded w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
                <div className="flex-1">
                  <label className="text-xs sm:text-sm mb-1 block">Check-in Time</label>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="border p-2 text-sm sm:text-base rounded w-full"
                  />
                  {checkInTime && (
                    <p className="text-[10px] sm:text-xs text-gray-600 mt-1">
                      {formatTimeWithAMPM(checkInTime)}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <label className="text-sm mb-1 block">Check-out Time</label>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="border p-2 text-sm sm:text-base rounded w-full"
                  />
                  {checkOutTime && (
                    <p className="text-[10px] sm:text-xs text-gray-600 mt-1">
                      {formatTimeWithAMPM(checkOutTime)}
                    </p>
                  )}
                </div>
              </div>

              {validationErrors.dates && (
                <div className="col-span-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 font-medium flex items-center gap-2">
                    <span>⚠️</span>
                    {validationErrors.dates}
                  </p>
                </div>
              )}

              {!isDateValid && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ This date and time range conflicts with an existing booking.
                </p>
              )}

              <div className="flex flex-col sm:flex-row justify-end mt-4 sm:mt-6 gap-2 sm:gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 w-full sm:w-auto text-sm sm:text-base bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>

                <button
                  disabled={!isDateValid}
                  onClick={() => setStep(2)}
                  className={`px-4 py-2 rounded text-white transition-colors ${
                    isDateValid
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  Next
                </button>
              </div>
            </>
          )}

          {/* ------------------ STEP 2: GUEST DETAILS ------------------ */}
          {step === 2 && (
            <>
              <p className="text-xs sm:text-sm text-gray-600 mb-3">Enter guest details</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <input
                  className={`border p-2 rounded ${!form.guest.trim() ? 'border-red-500' : 'border-green-500'}`}
                  placeholder="Guest Name / Society Name"
                  value={form.guest}
                  onChange={(e) => setForm({ ...form, guest: e.target.value })}
                />

                <div className="col-span-2">
                  <input
                    className="border p-2 text-sm sm:text-base rounded w-full"
                    placeholder="Roll No / Emp ID (max 12 digits, numbers only)"
                    value={form.rollno}
                    maxLength={12}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setForm({ ...form, rollno: value });
                      const error = validateRollNo(value);
                      setValidationErrors(prev => ({ ...prev, rollno: error }));
                    }}
                  />
                  {validationErrors.rollno && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.rollno}</p>
                  )}
                </div>

                <select
                  className={`border p-2 rounded ${!form.department && form.guest ? 'border-red-500' : ''}`}
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                >
                  <option value="">Select Department</option>
                  <option>ALUMNI</option>
                  <option>BTECH</option>
                  <option>BEMBA</option>
                  <option>BLAS</option>
                  <option>JRF</option>
                  <option>PHD</option>
                  <option>PHDP</option>
                  <option>ME</option>
                  <option>MSc</option>
                  <option>MCA</option>
                  <option>MTECH</option>
                  <option>MA</option>
                  <option>RA</option>
                  <option>Others</option>
                </select>

                <input
                  className={`border p-2 rounded ${
                    form.contact 
                      ? (validateContact(form.contact) ? 'border-green-500' : 'border-red-500')
                      : ''
                  }`}
                  placeholder="Contact (10 digits)"
                  value={form.contact}
                  maxLength={10}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contact: e.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                />

                <input
                  className={`border p-2 rounded col-span-2 ${
                    form.email 
                      ? (validateEmail(form.email) ? 'border-green-500' : 'border-red-500')
                      : ''
                  }`}
                  placeholder="Email (.com/.in/.edu only)"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />

                <select
                  className="border p-2 text-sm sm:text-base rounded"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Both</option>
                </select>

                <input
                  type="number"
                  className="border p-2 text-sm sm:text-base rounded"
                  placeholder="Total Guests"
                  value={form.numGuests}
                  min={1}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setForm({ ...form, numGuests: value });
                    const error = validateGuestCounts(value, form.males, form.females);
                    setValidationErrors(prev => ({ ...prev, guestCount: error }));
                  }}
                />

                <input
                  type="number"
                  className="border p-2 text-sm sm:text-base rounded"
                  placeholder="Females"
                  value={form.females}
                  min={0}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setForm({ ...form, females: value });
                    const error = validateGuestCounts(form.numGuests, form.males, value);
                    setValidationErrors(prev => ({ ...prev, guestCount: error }));
                  }}
                />

                <input
                  type="number"
                  className="border p-2 text-sm sm:text-base rounded"
                  placeholder="Males"
                  value={form.males}
                  min={0}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setForm({ ...form, males: value });
                    const error = validateGuestCounts(form.numGuests, value, form.females);
                    setValidationErrors(prev => ({ ...prev, guestCount: error }));
                  }}
                />

                {validationErrors.guestCount && (
                  <p className="text-sm text-red-600 col-span-2 bg-red-50 p-2 rounded border border-red-200">
                    {validationErrors.guestCount}
                  </p>
                )}

                <select
                  className="border p-2 text-sm sm:text-base rounded"
                  value={form.state}
                  onChange={(e) => {
                    const s = e.target.value;
                    setForm({ ...form, state: s, city: "" });
                    const match = IndianStates.find((i) => i.name === s);
                    setCityList(match ? match.cities : []);
                  }}
                >
                  <option value="">Select State</option>
                  {IndianStates.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  className="border p-2 text-sm sm:text-base rounded"
                  value={form.city}
                  disabled={!cityList.length}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                >
                  <option value="">Select City</option>
                  {cityList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <input
                  className="border p-2 text-sm sm:text-base rounded col-span-2"
                  placeholder="Reference"
                  value={form.reference}
                  onChange={(e) =>
                    setForm({ ...form, reference: e.target.value })
                  }
                />

                <input
                  className="border p-2 text-sm sm:text-base rounded col-span-2"
                  placeholder="Purpose"
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                />

                {/* Validation Guidelines */}
                <div className="col-span-1 sm:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-[10px] sm:text-xs text-blue-700">
                  <p className="font-semibold mb-2">📋 Input Guidelines:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Roll No/Emp ID:</strong> Numbers only, maximum 12 digits</li>
                    <li><strong>Guest Counts:</strong> Male + Female must equal Total Guests</li>
                    <li><strong>Booking Duration:</strong> Maximum 3 days allowed</li>
                    <li><strong>Dates:</strong> Cannot select past dates</li>
                  </ul>
                </div>

                {/* ADDRESS PROOF UPLOAD */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="text-xs sm:text-sm font-medium block mb-1">
                    Upload Address Proof (up to 5 files) * — {form.files.length} file(s) uploaded
                  </label>

                  <IKUpload
                    fileName={`address_proof_${Date.now()}_${Math.random()
                      .toString(36)
                      .substring(2)}`}
                    folder="/enquiry"
                    useUniqueFileName={true}
                    isPrivateFile={false}
                    tags={["enquiry", "addressproof"]}
                    overwriteFile={false}
                    overwriteAITags={false}
                    onUploadStart={() => {
                      setUploading(true);
                      setUploadError("");
                    }}
                    onUploadProgress={(progress) => {
                      console.log("Upload progress:", progress);
                    }}
                    onError={handleIKError}
                    onSuccess={handleAddressProofSuccess}
                    validateFile={(file) => {
                      if (form.files.length >= 5) {
                        showToast("Max 5 files allowed", "error");
                        return false;
                      }

                      const allowedTypes = [
                        "image/jpeg",
                        "image/jpg",
                        "image/png",
                        "image/webp",
                        "image/gif",
                        "application/pdf",
                        "image/heic",
                        "image/heif",
                      ];

                      if (!allowedTypes.includes(file.type)) {
                        showToast("Only JPG, PNG, GIF, WEBP, HEIC, or PDF allowed", "error");
                        return false;
                      }

                      if (file.size > 5 * 1024 * 1024) {
                        showToast("File size must be under 5MB", "error");
                        return false;
                      }

                      return true;
                    }}
                    className="text-sm border p-2 rounded w-full"
                  />

                  {uploading && (
                    <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Uploading file...
                    </div>
                  )}

                  {uploadError && (
                    <p className="text-red-600 text-xs mt-2">{uploadError}</p>
                  )}

                  {form.files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {form.files.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-blue-50 border border-blue-200 px-3 py-1.5 rounded text-sm sm:text-base"
                        >
                          <div className="flex items-center gap-2">
                            📄 Address Proof {i + 1}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAddressProof(i)}
                            className="text-gray-500 hover:text-red-600 text-lg font-bold transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {form.files.length > 0 && (
                    <div className="mt-3">
                      <AttachmentGrid files={form.files} />
                    </div>
                  )}
                </div>
              </div>

              {/* NAVIGATION */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 w-full sm:w-auto text-sm sm:text-base bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>

                <button
                  onClick={() => setStep(3)}
                  disabled={
                    validationErrors.rollno || 
                    validationErrors.guestCount || 
                    !form.guest.trim() || 
                    !validateContact(form.contact) || 
                    !validateEmail(form.email) ||
                    form.files.length === 0
                  }
                  className={`px-4 py-2 rounded text-white transition-colors ${
                    (validationErrors.rollno || validationErrors.guestCount || 
                    !form.guest.trim() || !validateContact(form.contact) || 
                    !validateEmail(form.email) || form.files.length === 0)
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  Next: Payment
                </button>
              </div>
            </>
          )}

          {/* ------------------ STEP 3: PAYMENT DETAILS ------------------ */}
          {step === 3 && (
            <>
              <p className="text-xs sm:text-sm text-gray-600 mb-3">Payment Information</p>

              <div className="grid grid-cols-1 gap-4">
                {/* PAYMENT TYPE SELECTION */}
                <div>
                  <label className="text-xs sm:text-sm font-medium block mb-2">
                    Payment Type <span className="text-red-600">*</span>
                  </label>

                  <select
                    className="border p-2 text-sm sm:text-base rounded w-full"
                    value={form.paymentType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        paymentType: e.target.value,
                        amount: "",
                      })
                    }
                  >
                    <option value="Paid">Paid</option>
                    <option value="Free">Without Charges Subject to Approval</option>
                  </select>
                </div>

                {/* PAID - Show Amount, Remarks, Attachments (Optional) */}
                {form.paymentType === "Paid" && (
                  <>
                    <div>
                      <label className="text-sm font-medium block mb-2">
                        Total Bill Amount (â‚¹) <span className="text-red-600">*</span>
                      </label>
                      <input
                        className="border p-2 text-sm sm:text-base rounded w-full"
                        type="number"
                        min={1}
                        placeholder="Enter total bill amount"
                        value={form.amount}
                        onChange={(e) =>
                          setForm({ ...form, amount: Number(e.target.value) })
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2">
                        Remarks (Optional)
                      </label>
                      <textarea
                        className="border p-2 text-sm sm:text-base rounded w-full h-20 resize-none"
                        placeholder="Any additional remarks (optional)"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2">
                        Attachments (Optional) — {paymentFiles.length} file(s) uploaded
                      </label>
                      <p className="text-xs text-gray-600 mb-2">Upload additional payment documents if needed (up to 5 files)</p>

                      <IKUpload
                        fileName={`paid_payment_${Date.now()}_${Math.random()
                          .toString(36)
                          .substring(2)}`}
                        folder="/approval"
                        useUniqueFileName={true}
                        isPrivateFile={false}
                        tags={["payment", "paid"]}
                        overwriteFile={false}
                        overwriteAITags={false}
                        onUploadStart={() => {
                          setUploading(true);
                          setUploadError("");
                        }}
                        onUploadProgress={(progress) => {
                          console.log("Upload progress:", progress);
                        }}
                        onError={handleIKError}
                        onSuccess={handlePaymentFileSuccess}
                        validateFile={(file) => {
                          if (paymentFiles.length >= 5) {
                            showToast("Max 5 files allowed", "warning");
                            return false;
                          }

                          const allowedTypes = [
                            "image/jpeg",
                            "image/jpg",
                            "image/png",
                            "image/webp",
                            "image/gif",
                            "application/pdf",
                            "image/heic",
                            "image/heif",
                          ];

                          if (!allowedTypes.includes(file.type)) {
                            showToast("Only JPG, PNG, GIF, WEBP, HEIC, or PDF allowed", "warning");
                            return false;
                          }

                          if (file.size > 5 * 1024 * 1024) {
                            showToast("File size must be under 5MB", "warning");
                            return false;
                          }

                          return true;
                        }}
                        className="text-sm border p-2 rounded w-full"
                      />

                      {uploading && (
                        <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Uploading payment file...
                        </div>
                      )}

                      {uploadError && (
                        <p className="text-red-600 text-xs mt-2">{uploadError}</p>
                      )}

                      {paymentFiles.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {paymentFiles.map((file, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-green-50 border border-green-200 px-3 py-1.5 rounded text-sm"
                            >
                              <div className="flex items-center gap-2">
                                📄 Payment File {i + 1}
                              </div>
                              <button
                                type="button"
                                onClick={() => removePaymentFile(i)}
                                className="text-gray-500 hover:text-red-600 text-lg font-bold transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {paymentFiles.length > 0 && (
                        <div className="mt-3">
                          <AttachmentGrid files={paymentFiles} />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* FREE - Show Remarks and Approval Documents (Mandatory) */}
                {form.paymentType === "Free" && (
                  <>
                    <div>
                      <label className="text-sm font-medium block mb-2">
                        Remarks (Why Free?) <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        className="border p-2 text-sm sm:text-base rounded w-full h-20 resize-none"
                        placeholder="Enter reason for free booking (e.g., Official Guest, Staff, Emergency)"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2">
                        Upload Approval Documents <span className="text-red-600">*</span> — {paymentFiles.length} file(s) uploaded
                      </label>
                      <p className="text-xs text-gray-600 mb-2">Required for free bookings (up to 5 files)</p>

                      <IKUpload
                        fileName={`free_approval_${Date.now()}_${Math.random()
                          .toString(36)
                          .substring(2)}`}
                        folder="/approval"
                        useUniqueFileName={true}
                        isPrivateFile={false}
                        tags={["payment", "free", "approval"]}
                        overwriteFile={false}
                        overwriteAITags={false}
                        onUploadStart={() => {
                          setUploading(true);
                          setUploadError("");
                        }}
                        onUploadProgress={(progress) => {
                          console.log("Upload progress:", progress);
                        }}
                        onError={handleIKError}
                        onSuccess={handlePaymentFileSuccess}
                        validateFile={(file) => {
                          if (paymentFiles.length >= 5) {
                            showToast("Max 5 files allowed", "warning");
                            return false;
                          }

                          const allowedTypes = [
                            "image/jpeg",
                            "image/jpg",
                            "image/png",
                            "image/webp",
                            "image/gif",
                            "application/pdf",
                            "image/heic",
                            "image/heif",
                          ];

                          if (!allowedTypes.includes(file.type)) {
                            showToast("Only JPG, PNG, GIF, WEBP, HEIC, or PDF allowed", "warning");
                            return false;
                          }

                          if (file.size > 5 * 1024 * 1024) {
                            showToast("File size must be under 5MB", "warning");
                            return false;
                          }

                          return true;
                        }}
                        className="text-sm border p-2 rounded w-full"
                      />

                      {uploading && (
                        <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Uploading approval document...
                        </div>
                      )}

                      {uploadError && (
                        <p className="text-red-600 text-xs mt-2">{uploadError}</p>
                      )}

                      {paymentFiles.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {paymentFiles.map((file, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-red-50 border border-red-200 px-3 py-1.5 rounded text-sm"
                            >
                              <div className="flex items-center gap-2">
                                📄 Approval Doc {i + 1}
                              </div>
                              <button
                                type="button"
                                onClick={() => removePaymentFile(i)}
                                className="text-gray-500 hover:text-red-600 text-lg font-bold transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {paymentFiles.length > 0 && (
                        <div className="mt-3">
                          <AttachmentGrid files={paymentFiles} />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* NAVIGATION */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 w-full sm:w-auto text-sm sm:text-base bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>

                <button
                  disabled={!canSubmit()}
                  onClick={() => setStep(4)}
                  className={`px-4 py-2 rounded text-white transition-colors ${
                    canSubmit()
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  Review
                </button>
              </div>
            </>
          )}

          {/* ------------------ STEP 4: REVIEW ------------------ */}
          {step === 4 && (
            <>
              <h3 className="text-lg font-semibold mb-4">Review Booking Details</h3>

              <div className="bg-gray-100 p-4 rounded-lg space-y-1 text-sm">
                <p>
                  <strong>Name:</strong> {form.guest}
                </p>
                <p>
                  <strong>Roll No:</strong> {form.rollno}
                </p>
                <p>
                  <strong>Department:</strong> {form.department}
                </p>
                <p>
                  <strong>Contact:</strong> {form.contact}
                </p>
                <p>
                  <strong>Email:</strong> {form.email}
                </p>
                <p>
                  <strong>Gender:</strong> {form.gender}
                </p>
                <p>
                  <strong>Stay:</strong> {from} → {to}
                </p>
                <p>
                  <strong>Check-in:</strong> {formatTimeWithAMPM(checkInTime)}
                </p>
                <p>
                  <strong>Check-out:</strong> {formatTimeWithAMPM(checkOutTime)}
                </p>
                <p>
                  <strong>Total Guests:</strong> {form.numGuests}
                </p>
                <p>
                  <strong>Females:</strong> {form.females || "—"}
                </p>
                <p>
                  <strong>Males:</strong> {form.males || "—"}
                </p>
                <p>
                  <strong>City:</strong> {form.city}
                </p>
                <p>
                  <strong>State:</strong> {form.state}
                </p>
                <p>
                  <strong>Reference:</strong> {form.reference || "—"}
                </p>
                <p>
                  <strong>Purpose:</strong> {form.purpose}
                </p>
                <p>
                  <strong>Payment Type:</strong> {form.paymentType}
                </p>
                {form.paymentType === "Paid" && (
                  <p>
                    <strong>Total Bill Amount:</strong> â‚¹{form.amount}
                  </p>
                )}
                {remarks && (
                  <p>
                    <strong>Remarks:</strong> {remarks}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="font-semibold mb-2">Address Proof:</p>
                  {form.files.length > 0 ? (
                    <AttachmentGrid files={form.files} />
                  ) : (
                    <p className="text-gray-500">No address proof uploaded</p>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="font-semibold mb-2">Payment Attachments:</p>
                  {paymentFiles.length > 0 ? (
                    <AttachmentGrid files={paymentFiles} />
                  ) : (
                    <p className="text-gray-500">No payment attachments</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 w-full sm:w-auto text-sm sm:text-base bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>

                <button
                  onClick={handleSubmit}
                  className="px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Confirm Booking
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </IKContext>
  );
}