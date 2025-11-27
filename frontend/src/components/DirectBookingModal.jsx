// ======================= PART 1 =======================
// Keep this at the VERY TOP of DirectBookingModal.jsx

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "../context/ToastContext";
import AttachmentGrid from "./AttachmentGrid";
import { isDateRangeOverlapping } from "../utils/dateUtils";
import { IndianStates } from "../utils/indianStates";

  const API_BASE = "https://guestroom-backend.onrender.com";
  async function saveBookingToBackend(hostel, roomNo, booking) {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostel, roomNo, booking }),
      });
    
      const data = await res.json();
      return data;
    } catch (err) {  
      console.error("Booking save failed:", err);
      throw err;
    }
  }

// ================= CUSTOM UTILS ===================

// Generate Unique Booking ID → DRB-YYYYMMDD-001
function generateBookingID(existing = []) {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");

  const datePrefix = `DRB-${y}${m}${d}`;

  // Count existing bookings today
  const todaysCount = existing.filter(
    (b) => b.bookingID?.startsWith(datePrefix)
  ).length;

  const serial = String(todaysCount + 1).padStart(3, "0");

  return `${datePrefix}-${serial}`;
}

// ---------------------------
// STEP 1 (Date Selection)
// ---------------------------
export function Step1({ from, to, setFrom, setTo, validateDateRange }) {
  return (
    <>
      <p className="text-sm text-gray-600 mb-4">Select booking date range</p>

      <div className="flex gap-3 items-center">
        <div>
          <label className="text-sm block mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border p-2 rounded"
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div>
          <label className="text-sm block mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border p-2 rounded"
            min={from || new Date().toISOString().split("T")[0]}
          />
        </div>
      </div>

      {!validateDateRange() && from && to && (
        <p className="text-sm text-red-600 mt-3">
          ⚠️ This range overlaps with an existing booking or is invalid.
        </p>
      )}
    </>
  );
}

// ---------------------------
// STEP 2 (Guest Details – generic)
// ---------------------------
export function Step2({
  form,
  setForm,
  from,
  to,
  handleFile,
  fileNames,
  files,
  setFiles,
  setFileNames,
  prefill,
}) {
  return (
    <>
      <p className="text-sm text-gray-600 mb-3">
        Enter guest details for {from} → {to}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Name / Society Name */}
        <input
          placeholder="Name / Society Name"
          value={form.guest}
          onChange={(e) => setForm({ ...form, guest: e.target.value })}
          className="border p-2 rounded"
        />

        {/* Roll No / Employee ID */}
        <input
          placeholder="Roll No. / Employee ID"
          value={form.rollno || ""}
          onChange={(e) => setForm({ ...form, rollno: e.target.value })}
          className="border p-2 rounded"
        />

        {/* Department */}
        <select
          value={form.department || ""}
          onChange={(e) => setForm({ ...form, department: e.target.value })}
          className="border p-2 rounded"
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
        </select>

        {/* Contact */}
        <input
          placeholder="Contact (10 digits only)"
          value={form.contact}
          onChange={(e) =>
            setForm({
              ...form,
              contact: e.target.value.replace(/[^0-9]/g, ""),
            })
          }
          className="border p-2 rounded"
          maxLength={10}
        />

        {/* Email */}
        <input
          placeholder="Email (.com/.in/.edu only)"
          value={form.email}
          onChange={(e) =>
            setForm({
              ...form,
              email: e.target.value,
            })
          }
          className="border p-2 rounded"
        />

        {/* Gender */}
        <select
          value={form.gender}
          onChange={(e) => setForm({ ...form, gender: e.target.value })}
          className="border p-2 rounded"
        >
          <option>Male</option>
          <option>Female</option>
          <option>Both</option>
        </select>

        {/* Total Guests */}
        <input
          type="number"
          min="1"
          placeholder="Total Guests"
          value={form.numGuests}
          onChange={(e) =>
            setForm({ ...form, numGuests: Number(e.target.value) })
          }
          className="border p-2 rounded"
        />

        {/* Number of Females */}
        <input
          type="number"
          min="0"
          placeholder="Number of Females"
          value={form.females === "" ? "" : form.females}
          onChange={(e) =>
            setForm({ ...form, females: Number(e.target.value) })
          }
          className="border p-2 rounded"
        />

        {/* Number of Males */}
        <input
          type="number"
          min="0"
          placeholder="Number of Males"
          value={form.males === "" ? "" : form.males}
          onChange={(e) =>
            setForm({ ...form, males: Number(e.target.value) })
          }
          className="border p-2 rounded"
        />

        {/* City */}
        <input
          placeholder="City"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="border p-2 rounded"
        />

        {/* State */}
        <select
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">Select State</option>
          {IndianStates.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Reference */}
        <input
          placeholder="Reference"
          value={form.reference}
          onChange={(e) =>
            setForm({ ...form, reference: e.target.value })
          }
          className="border p-2 rounded"
        />

        {/* Purpose of Stay */}
        <input
          placeholder="Purpose of stay"
          value={form.purpose}
          onChange={(e) => setForm({ ...form, purpose: e.target.value })}
          className="border p-2 rounded col-span-2"
        />

        {/* Attachments */}
        <div className="col-span-2">
          <label className="text-sm block mb-1">
            Attachments (max 5 files required)
          </label>
          <input
            type="file"
            onChange={handleFile}
            multiple
            className="text-sm w-full"
          />

          <div className="text-xs text-gray-500 mt-1">
            Files selected: {fileNames.length}/5
            {fileNames.length > 0 && (
              <div className="mt-2 p-2 bg-gray-50 rounded">
                {fileNames.map((name, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-gray-600 py-0.5 flex justify-between"
                  >
                    <span>📎 {name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newNames = fileNames.filter((_, i) => i !== idx);
                        const newFiles = files.filter((_, i) => i !== idx);
                        setFileNames(newNames);
                        setFiles(newFiles);
                        setForm((prev) => ({
                          ...prev,
                          files: prev.files.filter((_, i) => i !== idx),
                        }));
                      }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Prefill attachment preview */}
        {prefill?.files?.length > 0 && (
          <div className="col-span-2 mt-4">
            <AttachmentGrid files={prefill.files} />
          </div>
        )}

        {/* Payment */}
        <div className="col-span-2">
          <label className="text-sm block mb-1">Payment</label>
          <select
            value={form.paymentType}
            onChange={(e) =>
              setForm({ ...form, paymentType: e.target.value })
            }
            className="border p-2 rounded"
          >
            <option>Free</option>
            <option>Paid</option>
          </select>
        </div>

        {form.paymentType === "Paid" && (
          <div className="col-span-2">
            <input
              type="number"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) =>
                setForm({ ...form, amount: Number(e.target.value) })
              }
              className="border p-2 rounded w-full"
            />
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------
// STEP 3 (Review – generic)
// ---------------------------
export function Step3({ form, from, to }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-red-700 mb-2">
        Review Details Before Submit
      </h3>

      <p>
        <strong>Name:</strong> {form.guest}
      </p>
      <p>
        <strong>Roll / Emp ID:</strong> {form.rollno}
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
        <strong>Stay:</strong> {from} → {to}
      </p>
      <p>
        <strong>Total Guests:</strong> {form.numGuests}
      </p>
      <p>
        <strong>Females:</strong> {form.females}
      </p>
      <p>
        <strong>Males:</strong> {form.males}
      </p>
      <p>
        <strong>City:</strong> {form.city}
      </p>
      <p>
        <strong>State:</strong> {form.state}
      </p>
      <p>
        <strong>Purpose:</strong> {form.purpose}</p>
      <p>
        <strong>Payment:</strong> {form.paymentType}
      </p>

      {/* FINAL ATTACHMENT PREVIEW */}
      {form.files?.length > 0 && (
        <div className="mt-4">
          <AttachmentGrid files={form.files} />
        </div>
      )}
    </div>
  );
}

// ======================= PART 2 =======================
// Main DirectBookingModal used in the dashboard

export default function DirectBookingModal({ modal, onClose, onSubmit }) {
  const { showToast } = useToast();
  const { hostel, room, prefill } = modal || {};

  // ---------------------------
  // MAIN STATES
  // ---------------------------
  const [step, setStep] = useState(1);
  const [emailError, setEmailError] = useState("");

  const [from, setFrom] = useState(prefill?.from || "");
  const [to, setTo] = useState(prefill?.to || "");

  const [files, setFiles] = useState([]);
  const [fileNames, setFileNames] = useState([]);

  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [remarks, setRemarks] = useState("");

  const [selectedState, setSelectedState] = useState(prefill?.state || "");
  const [cityList, setCityList] = useState(() => {
    const match = IndianStates.find((s) => s.name === (prefill?.state || ""));
    return match ? match.cities : [];
  });

  const [form, setForm] = useState({
    guest: prefill?.guest || "",
    rollno: prefill?.rollno || "",
    department: prefill?.department || "",
    contact: prefill?.contact || "",
    email: prefill?.email || "",
    gender: prefill?.gender || "Male",
    numGuests: prefill?.guests || 1,
    females: prefill?.females || "",
    males: prefill?.males || "",
    city: prefill?.city || "",
    state: prefill?.state || "",
    reference: prefill?.reference || "",
    purpose: prefill?.purpose || "",
    paymentType: "Paid",
    amount: "",
    files: prefill?.files || [],
  });

  // ---------------------------
  // VALIDATIONS
  // ---------------------------
  const validateDateRange = () => {
    if (!from || !to) return false;

    const start = new Date(from);
    const end = new Date(to);
    if (start > end) return false;

    const overlaps = (room?.bookings || []).some((b) =>
      isDateRangeOverlapping(b.from, b.to, from, to)
    );

    return !overlaps;
  };

  // Contact must be exactly 10 digits
  const validateContact = (val) => /^[0-9]{10}$/.test(val);

  // Only @thapar.edu emails allowed
  const validateEmail = (val) => val.trim() !== "";

  // At least 1 attachment
  const validateFile = () =>
    (form.files?.length || 0) + files.length > 0;

  const canSubmit = () => {
    const basic =
      form.guest.trim() &&
      validateContact(form.contact) &&
      form.email.trim()
      validateFile();

    if (!basic) return false;
    
    // If Paid → amount is required
    if (form.paymentType === "Paid") {
      return form.amount && Number(form.amount) > 0;
    }  

    // If Free → remarks must not be empty
    if (form.paymentType === "Free") {
      return remarks.trim().length > 0;
    }
    
    return false;
  };

  // ---------------------------
  // FILE HANDLING
  // ---------------------------
  const handleFile = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles?.length) return;

    const newFiles = Array.from(selectedFiles);

    if (files.length + newFiles.length > 5) {
      showToast(
        `❌ Only 5 attachments allowed. Current: ${files.length}`,
        "error"
      );
      return;
    }

    try {
      const fileToBase64 = (f) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(f);
        });

      const processed = await Promise.all(
        newFiles.map(async (f) => {
          const data = await fileToBase64(f);
          return {
            name: f.name,
            url: data,
          };
        })
      );

      setFiles((prev) => [...prev, ...newFiles]);
      setFileNames((prev) => [...prev, ...processed.map((p) => p.name)]);

      setForm((prev) => ({
        ...prev,
        files: [...(prev.files || []), ...processed.map((p) => p.url)],
      }));

      showToast(`📎 ${processed.length} file(s) added`, "success");
    } catch (err) {
      console.error("Failed to upload file:", err);
      showToast("❌ Failed to upload", "error");
    }
  };

  // ---------------------------
  // SUBMIT BOOKING
  // ---------------------------
  const handleSubmit = async () => {
    if (!canSubmit()) {
      showToast("⚠️ Fill all required fields properly", "warning");
      return;
    }
    
    const booking = {
      bookingID: generateBookingID(room?.bookings || []),
      ...form,
      remarks,
      from,
      to,
      files: form.files, // final base64 list
      id: `b_${Date.now()}_${Math.floor(Math.random() * 10000)}`, // IMPORTANT for Mongo 
    };
    
    try {
      // 🔥 SEND BOOKING TO BACKEND
      const result = await saveBookingToBackend(hostel, room.roomNo, booking);

      if (result.success) {
        showToast("✅ Booking created successfully!", "success");
       
         // Update frontend UI immediately
        onSubmit(booking);

        onClose();
      } else {
        showToast(`❌ Failed: ${result.error}`, "error"); 
      }
    } catch (err) {
      showToast("❌ Server error while saving booking", "error");
    }      
  };  

  // ======================= PART 3 =======================
  // DirectBookingModal JSX
  return (
    <motion.div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-2xl p-6 w-[750px] max-h-[90vh] overflow-y-auto shadow-xl"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
      >
        {/* HEADER */}
        <h2 className="text-xl font-bold text-red-700 mb-4">
          Direct Booking — {hostel} / Room {room?.roomNo}
        </h2>

        {/* ===================== STEP 1: SELECT DATES ===================== */}
        {step === 1 && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Select stay duration
            </p>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm mb-1 block">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="border p-2 rounded w-full"
                />
              </div>

              <div className="flex-1">
                <label className="text-sm mb-1 block">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="border p-2 rounded w-full"
                  min={from}
                />
              </div>
            </div>

            {!validateDateRange() && from && to && (
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Invalid range (overlaps or incorrect)
              </p>
            )}

            <div className="flex justify-end mt-6 gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Close
              </button>

              <button
                disabled={!validateDateRange()}
                onClick={() => setStep(2)}
                className={`px-4 py-2 rounded text-white ${
                  validateDateRange()
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* ===================== STEP 2: ENTER DETAILS ===================== */}
        {step === 2 && (
          <>
            <p className="text-sm text-gray-600 mb-3">Enter guest details</p>

            <div className="grid grid-cols-2 gap-4">
              {/* Name / Society Name */}
              <input
                className="border p-2 rounded"
                placeholder="Name / Society Name"
                value={form.guest}
                onChange={(e) =>
                  setForm({ ...form, guest: e.target.value })
                }
              />

              {/* Roll No / Employee ID */}
              <input
                className="border p-2 rounded"
                placeholder="Roll No. / Employee ID"
                value={form.rollno || ""}
                onChange={(e) =>
                  setForm({ ...form, rollno: e.target.value })
                }
              />

              {/* Department */}
              <select
                className="border p-2 rounded"
                value={form.department || ""}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
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
              </select>

              {/* Contact */}
              <input
                className="border p-2 rounded"
                placeholder="Contact (10 digits only)"
                value={form.contact}
                maxLength={10}
                onChange={(e) =>
                  setForm({
                    ...form,
                    contact: e.target.value.replace(/[^0-9]/g, ""),
                  })
                }
              />

              {/* Email */}
              <div className="col-span-2">
                <input
                  className="border p-2 rounded w-full"
                  placeholder="Email (.com/.in/.edu only)"
                  value={form.email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({ ...form, email: val });
                      setEmailError("");
                  }}
                />
                {emailError && (
                  <p className="text-xs text-red-600 mt-1">{emailError}</p>
                )}
              </div>

              {/* Gender */}
              <select
                className="border p-2 rounded"
                value={form.gender}
                onChange={(e) =>
                  setForm({ ...form, gender: e.target.value })
                }
              >
                <option>Male</option>
                <option>Female</option>
                <option>Both</option>
              </select>

              {/* Total Guests */}
              <input
                className="border p-2 rounded"
                type="number"
                min="1"
                placeholder="Total Guests"
                value={form.numGuests}
                onChange={(e) =>
                  setForm({ ...form, numGuests: Number(e.target.value) })
                }
              />

              {/* Females */}
              <input
                className="border p-2 rounded"
                type="number"
                min="0"
                placeholder="Number of Females"
                value={form.females === "" ? "" : form.females}
                onChange={(e) =>
                  setForm({ ...form, females: Number(e.target.value) })
                }
              />

              {/* Males */}
              <input
                className="border p-2 rounded"
                type="number"
                min="0"
                placeholder="Number of Males"
                value={form.males === "" ? "" : form.males}
                onChange={(e) =>
                  setForm({ ...form, males: Number(e.target.value) })
                }
              />

              {/* City */}
              <select
                value={form.city}
                onChange={(e) =>
                  setForm({ ...form, city: e.target.value })
                }
                className="border p-2 rounded"
                disabled={!cityList.length}
              >
                <option value="">Select City</option>
                {cityList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* State */}
              <select
                className="border p-2 rounded"
                value={form.state}
                onChange={(e) => {
                  const stateName = e.target.value;
                  setForm({ ...form, state: stateName, city: "" });
                  setSelectedState(stateName);

                  const match = IndianStates.find(
                    (s) => s.name === stateName
                  );
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

              {/* Reference */}
              <input
                className="border p-2 rounded"
                placeholder="Reference"
                value={form.reference}
                onChange={(e) =>
                  setForm({ ...form, reference: e.target.value })
                }
              />

              {/* Purpose */}
              <input
                className="border p-2 rounded col-span-2"
                placeholder="Purpose of stay"
                value={form.purpose}
                onChange={(e) =>
                  setForm({ ...form, purpose: e.target.value })
                }
              />

              {/* ATTACHMENTS */}
              <div className="col-span-2">
                <label className="text-sm text-gray-700">
                  Attach Address Proof (max 5)
                </label>

                <input
                  type="file"
                  multiple
                  onChange={handleFile}
                  className="block mt-1"
                />

                {fileNames.length > 0 && (
                  <div className="mt-2 p-2 bg-gray-100 rounded">
                    {fileNames.map((name, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm py-1"
                      >
                        <span>📎 {name}</span>
                        <button
                          onClick={() => {
                            const nf = fileNames.filter(
                              (_, idx) => idx !== i
                            );
                            const fl = files.filter((_, idx) => idx !== i);
                            setFileNames(nf);
                            setFiles(fl);
                            setForm((prev) => ({
                              ...prev,
                              files: prev.files.filter(
                                (_, idx) => idx !== i
                              ),
                            }));
                          }}
                          className="text-red-500 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PAYMENT */}
              <div className="col-span-2">
                <select
                  value={form.paymentType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({ ...form, paymentType: val });

                    if (val === "Free") {
                      setShowRemarksModal(true);
                    }
                  }}
                  className="border p-2 rounded w-full"
                >
                  <option>Free</option>
                  <option>Paid</option>
                </select>
              </div>

              {form.paymentType === "Paid" && (
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Amount"
                    className="border p-2 rounded w-full"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        amount: Number(e.target.value),
                      })
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Back
              </button>

              <button
                disabled={!canSubmit()}
                onClick={() => setStep(3)}
                className={`px-4 py-2 rounded text-white ${
                  canSubmit()
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                Review
              </button>
            </div>

            {/* Remarks modal for Free booking */}
            {showRemarksModal && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-white p-5 rounded-xl shadow-xl w-[400px]">
                  <h2 className="text-lg font-semibold mb-3 text-red-600">
                    Remarks Required
                  </h2>

                  <textarea
                    className="border p-2 rounded w-full h-24"
                    placeholder="Enter remarks for Free Booking"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />

                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={() => setShowRemarksModal(false)}
                      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>

                    <button
                      disabled={!remarks.trim()}
                      onClick={() => setShowRemarksModal(false)}
                      className="px-4 py-2 bg-red-600 text-white rounded disabled:bg-gray-300"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===================== STEP 3: FINAL REVIEW ===================== */}
        {step === 3 && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Review Details
            </h3>

            <div className="bg-gray-100 p-4 rounded-lg space-y-1 text-sm">
              <p>
                <strong>Booking ID:</strong>{" "}
                {form.bookingIDPreview || "Will be generated"}
              </p>
              <p>
                <strong>Name:</strong> {form.guest}
              </p>
              <p>
                <strong>Roll / Emp ID:</strong> {form.rollno}
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
                <strong>Total Guests:</strong> {form.numGuests}
              </p>
              <p>
                <strong>Females:</strong> {form.females}</p>
              <p>
                <strong>Males:</strong> {form.males}</p>
              <p>
                <strong>Purpose:</strong> {form.purpose}
              </p>
              <p>
                <strong>City:</strong> {form.city}
              </p>
              <p>
                <strong>State:</strong> {form.state}
              </p>
              <p>
                <strong>Reference:</strong> {form.reference}
              </p>
              <p>
                <strong>Stay:</strong> {from} → {to}
              </p>
              <p>
                <strong>Payment:</strong> {form.paymentType}</p>
              <p>
                <strong>Remarks:</strong> {remarks || "—"}
              </p>

              <p className="mt-3 font-semibold">Attachments:</p>
              {form.files.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {form.files.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="attachment"
                      className="w-full h-24 object-cover rounded shadow"
                    />
                  ))}
                </div>
              ) : (
                <p>No attachments</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Back
              </button>

              <button
                onClick={handleSubmit}
                className="px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm Booking
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
