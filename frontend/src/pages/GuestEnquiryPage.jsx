import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { IndianStates } from "../utils/indianStates";
import thaparLogo from "../assets/thapar_logo.png";
import bgImage from "../assets/ThaparBackground1.png";
import studentImg from "../assets/Student.png";
import employeeImg from "../assets/employee.png";
import axios from "axios";
import { IKContext, IKUpload } from "imagekitio-react";
import { formatTimeWithAMPM } from "../utils/dateUtils";
import Creator from "../components/Creator";
import { 
  BACKEND_URL,
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
  IMAGEKIT_AUTH_ENDPOINT
} from "../utils/apiConfig";

// ==================== CONSTANTS ====================
const API = BACKEND_URL;

console.log("🔧 Backend API URL:", API);

const INITIAL_FORM_STATE = {
  name: "",
  idType: "",
  rollno: "",
  department: "",
  contact: "",
  email: "",
  gender: "Male",
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
  files: [],
};

const DEPARTMENTS = [
  "ALUMINI", "BETECH", "BEMBA", "BLAS", "JRF", "PHD", 
  "PHDP", "MA", "ME", "MCA", "MSc", "MTECH", "RA",
];

const ALLOWED_FILE_TYPES = [
  "image/jpeg", "image/jpg", "image/png", "image/webp",
  "image/gif", "application/pdf", "image/heic", "image/heif",
];

const IMAGEKIT_CONFIG = {
  PUBLIC_KEY: IMAGEKIT_PUBLIC_KEY,
  URL_ENDPOINT: IMAGEKIT_URL_ENDPOINT,
  AUTH_ENDPOINT: IMAGEKIT_AUTH_ENDPOINT,
  FOLDER: "/guestroom",
  MAX_FILES: 5,
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  TAGS: ["guestroom"],
};

// ✅ ADD THIS NEW FUNCTION HERE
const isValidFileType = (file) => {
  if (!file) return false;
  
  // ✅ iOS FIX: file.type might be empty on iOS
  if (!file.type || file.type === "") {
    console.log("⚠️ iOS: Empty MIME type, checking file extension");
    const fileName = file.name.toLowerCase();
    const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".heic", ".heif"];
    return validExtensions.some(ext => fileName.endsWith(ext));
  }
  
  return ALLOWED_FILE_TYPES.includes(file.type);
};

// ==================== UTILITY FUNCTIONS ====================
const authenticator = async () => {
  try {
    console.log("[AUTH] Fetching ImageKit auth from:", IMAGEKIT_AUTH_ENDPOINT);
    
    const r = await fetch(IMAGEKIT_AUTH_ENDPOINT, { 
      method: "GET",
      credentials: "include",
      headers: {
        "Accept": "application/json",
      },
    });
    
    console.log("[AUTH] Response status:", r.status);
    
    if (!r.ok) {
      const errorText = await r.text();
      console.error("[ERROR] Auth request failed:", errorText);
      throw new Error(`Auth request failed ${r.status}`);
    }
    
    const data = await r.json();
    console.log("[SUCCESS] Auth data received:", {
      hasSignature: !!data.signature,
      hasToken: !!data.token,
      hasPublicKey: !!data.publicKey,
    });
    
    return {
      signature: data.signature,
      expire: data.expire,
      token: data.token,
      publicKey: data.publicKey,
    };
  } catch (err) {
    console.error("[ERROR] ImageKit authenticator error:", err);
    throw err;
  }
};

const formatShortDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(/\s+/g, "-");
};

const validateDates = (from, to) => {
  if (!from || !to) return "";
  const start = new Date(from);
  const end = new Date(to);
  const diff = (end - start) / (1000 * 60 * 60 * 24);
  return diff > 5 ? "Please select a date within 5 days" : "";
};

const isValidUrl = (url) => {
  try {
    return url && (url.startsWith("http://") || url.startsWith("https://"));
  } catch {
    return false;
  }
};

const submitEnquiry = async (payload) => {
  try {
    const res = await axios.post(`${API}/api/enquiry/create`, payload, {
      timeout: 20000,
    });
    
    console.log("✅ Enquiry submitted successfully:", res.data);
    
    // ✅ Notify admin enquiry page instantly (AFTER DB SAVE)
    window.dispatchEvent(
      new CustomEvent("guestEnquiryCreated", {
        detail: res.data?.enquiry || null,
      })
    );
    
    return res.data;
  } catch (err) {
    console.error("❌ Submit Error:", err);
    throw err;
  }
};

// ==================== FORM COMPONENT ====================
function GuestForm({
  form, setForm, onSubmit, emailError, setEmailError,
  dateError, setDateError, uploading, setUploading,
  uploadError, setUploadError, onIKSuccess, onIKError,
}) {
  const [cities, setCities] = useState([]);

  const cityMap = useMemo(
    () => Object.fromEntries(IndianStates.map((s) => [s.name, s.cities])),
    []
  );

  useEffect(() => {
    setCities(cityMap[form.state] || []);
  }, [form.state, cityMap]);

  const removeFile = (index) => {
    setForm((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const handleEmailChange = (val) => {
    setEmailError(val.endsWith("@thapar.edu") ? "" : "Please use a @thapar.edu email address");
    setForm({ ...form, email: val });
  };

  const handleContactChange = (val) => {
    setForm({ ...form, contact: val.replace(/[^0-9]/g, "") });
  };

  const handleGuestCountChange = (field, value) => {
    const numValue = Number(value);
    const totalGuests = Number(form.guests || 0);
    const females = field === "females" ? numValue : Number(form.females || 0);
    const males = field === "males" ? numValue : Number(form.males || 0);

    if (females + males <= totalGuests) {
      setForm({ ...form, [field]: value });
    }
  };

  return (
    <motion.div
      key="form"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.6 }}
      className="w-full flex flex-col items-center"
    >
      <form
        onSubmit={onSubmit}
        className="bg-white bg-opacity-90 border-2 border-red-600 rounded-3xl shadow-2xl p-8 w-full max-w-3xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Full Name */}
          <div className="col-span-1 md:col-span-1">
            <input
              type="text"
              placeholder="Full name or society name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="border-2 border-red-400 p-2 rounded w-full"
            />
          </div>

          {/* ID Type Dropdown */}
          <div className="col-span-1 md:col-span-1">
            <select
              value={form.idType}
              onChange={(e) => setForm({ ...form, idType: e.target.value, rollno: "" })}
              required
              className="border-2 border-red-400 p-2 rounded w-full"
            >
              <option value="">Select ID Type *</option>
              <option value="ROLL">Roll No.</option>
              <option value="EMP">Employee ID</option>
            </select>
          </div>

          {/* Conditional Roll / Employee ID */}
          {form.idType && (
            <div className="col-span-1 md:col-span-1">
              <input
                type="text"
                placeholder={form.idType === "ROLL" ? "Enter Roll Number *" : "Enter Employee ID *"}
                value={form.rollno}
                onChange={(e) => setForm({ ...form, rollno: e.target.value.replace(/[^0-9]/g, "") })}
                required
                className="border-2 border-red-400 p-2 rounded w-full"
              />
              {form.idType === "ROLL" && (
                <p className="text-xs text-blue-600 mt-1">
                  Kindly book only for parents
                </p>
              )}
            </div>
          )}

          {/* Contact */}
          <div className="col-span-1 md:col-span-1">
            <input
              type="text"
              placeholder="Contact number (10 digits) *"
              value={form.contact}
              maxLength={10}
              onChange={(e) => handleContactChange(e.target.value)}
              required
              className="border-2 border-red-400 p-2 rounded w-full"
            />
          </div>

          {/* Email */}
          <div className="col-span-1 md:col-span-1">
            <input
              type="email"
              placeholder="Email (must be @thapar.edu) *"
              value={form.email}
              onChange={(e) => handleEmailChange(e.target.value)}
              required
              className="border-2 border-red-400 p-2 rounded w-full"
            />
            {emailError && (
              <p className="text-red-600 text-xs mt-1">{emailError}</p>
            )}
          </div>

          {/* Department */}
          <div className="col-span-1 md:col-span-1">
            <select
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              required
              className="border-2 border-red-400 p-2 rounded w-full"
            >
              <option value="">Select Department *</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div className="col-span-1 md:col-span-1">
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="border-2 border-red-400 p-2 rounded w-full"
            >
              <option>Male</option>
              <option>Female</option>
              <option>Both</option>
            </select>
          </div>

          {/* Check-in Date */}
          <div className="col-span-1 md:col-span-1">
            <input
              type="date"
              min={new Date().toISOString().split("T")[0]}
              value={form.from}
              onChange={(e) => {
                const newFrom = e.target.value;
                setDateError(validateDates(newFrom, form.to));
                setForm({ ...form, from: newFrom });
              }}
              required
              className="border-2 border-red-400 p-2 rounded w-full"
            />
          </div>

          {/* Check-out Date */}
          <div className="col-span-1 md:col-span-1">
            <input
              type="date"
              min={form.from || new Date().toISOString().split("T")[0]}
              value={form.to}
              onChange={(e) => {
                const newTo = e.target.value;
                setDateError(validateDates(form.from, newTo));
                setForm({ ...form, to: newTo });
              }}
              required
              className="border-2 border-red-400 p-2 rounded w-full"
            />
          </div>

          {/* Check-in Time */}
          <div className="col-span-1 md:col-span-1">
            <input
              type="time"
              value={form.checkInTime}
              onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
              required
              className="border-2 border-red-400 p-2 rounded w-full"
            />
            {form.checkInTime && (
              <p className="text-xs text-gray-600 mt-1">
                {formatTimeWithAMPM(form.checkInTime)}
              </p>
            )}
          </div>

          {/* Check-out Time */}
          <div className="col-span-1 md:col-span-1">
            <input
              type="time"
              value={form.checkOutTime}
              onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
              required
              className="border-2 border-red-400 p-2 rounded w-full"
            />
            {form.checkOutTime && (
              <p className="text-xs text-gray-600 mt-1">
                {formatTimeWithAMPM(form.checkOutTime)}
              </p>
            )}
          </div>

          {/* Date Error */}
          {dateError && (
            <p className="col-span-1 md:col-span-2 text-red-600 text-xs">{dateError}</p>
          )}

          {/* Total Guests */}
          <div className="col-span-1 md:col-span-1">
            <input
              type="number"
              placeholder="Total guests *"
              value={form.guests}
              onChange={(e) => setForm({ ...form, guests: e.target.value })}
              required
              className="border-2 border-red-400 p-2 rounded w-full"
            />
          </div>

          {/* Number of Females */}
          <div className="col-span-1 md:col-span-1">
            <input
              type="number"
              placeholder="Number of females"
              value={form.females}
              onChange={(e) => handleGuestCountChange("females", e.target.value)}
              className="border-2 border-red-400 p-2 rounded w-full"
            />
          </div>

          {/* Number of Males */}
          <div className="col-span-1 md:col-span-1">
            <input
              type="number"
              placeholder="Number of males"
              value={form.males}
              onChange={(e) => handleGuestCountChange("males", e.target.value)}
              className="border-2 border-red-400 p-2 rounded w-full"
            />
          </div>

          {/* State */}
          <div className="col-span-1 md:col-span-1">
            <select
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value, city: "" })}
              required
              className="border-2 border-red-400 p-2 rounded w-full"
            >
              <option value="">Select State *</option>
              {Object.keys(cityMap).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* City */}
          <div className="col-span-1 md:col-span-1">
            <select
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
              className="border-2 border-red-400 p-2 rounded w-full"
            >
              <option value="">Select City *</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Reference */}
          <div className="col-span-1 md:col-span-2">
            <input
              placeholder="Reference"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="border-2 border-red-400 p-2 rounded w-full"
            />
          </div>

          {/* Purpose */}
          <div className="col-span-1 md:col-span-2">
            <textarea
              placeholder="Purpose of stay *"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              required
              className="border-2 border-red-400 p-2 rounded w-full h-28"
            />
          </div>

          {/* ImageKit Uploader */}
          <div className="col-span-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Upload address proof (max 5). Files uploaded: {form.files.length}
            </label>

            <IKUpload
              folder="/Enquiry"
              useUniqueFileName={true}
              isPrivateFile={false}
              tags={["enquiry", "addressproof"]}
              overwriteFile={false}
              overwriteAITags={false}
              accept="image/*,application/pdf,.heic,.heif"  // ✅ ADD THIS LINE
              onUploadStart={() => {
                console.log("🚀 Starting ImageKit upload...");
                setUploading(true);
                setUploadError("");
              }}
              onUploadProgress={(progress) => {
                console.log("[PROGRESS] Upload progress:", {
                  loaded: progress.loaded,
                  total: progress.total,
                  percentage: ((progress.loaded / progress.total) * 100).toFixed(2) + "%",
                });
              }}
              onError={onIKError}
              onSuccess={onIKSuccess}
              validateFile={(file) => {
                console.log("🔍 Validating file:", {
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  typeEmpty: !file.type || file.type === "", // ✅ ADD THIS
                });

                if (form.files.length >= IMAGEKIT_CONFIG.MAX_FILES) {
                  console.error("❌ Maximum files exceeded");
                  alert("You can upload up to 5 files.");
                  return false;
                }

                // ✅ CHANGE THIS LINE - use isValidFileType instead
                if (!isValidFileType(file)) {
                  console.error("❌ File type not allowed:", file.type);
                  alert("Allowed file types: JPG, PNG, GIF, WEBP, HEIC, PDF.");
                  return false;
                }

                if (file.size > IMAGEKIT_CONFIG.MAX_FILE_SIZE) {
                  console.error("❌ File too large:", file.size);
                  alert("Maximum file size is 5 MB");
                  return false;
                }

                console.log("✅ File validation passed (iOS-safe)"); // ✅ UPDATE MESSAGE
                return true;
              }}
              className="border-2 border-red-400 p-2 rounded w-full cursor-pointer"
            />

            {uploading && (
              <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </div>
            )}

            {uploadError && (
              <p className="text-red-600 text-xs mt-2">{uploadError}</p>
            )}
          </div>

          {/* Uploaded Files List */}
          {form.files.length > 0 && (
            <div className="col-span-1 md:col-span-2 mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                ✅ {form.files.length} file(s) uploaded
              </p>
              <div className="space-y-2">
                {form.files.map((url, i) => (
                  <div key={i} className="flex justify-between items-center bg-green-50 border border-green-300 px-3 py-2 rounded">
                    <div className="flex-1">
                      <span className="text-green-700 font-medium">📄 File {i + 1}</span>
                      <p className="text-xs text-gray-500 truncate" title={url}>
                        {url.split('/').pop()}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      type="button"
                      className="text-red-600 hover:text-red-800 text-lg font-bold ml-2"
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="col-span-1 md:col-span-2 text-center mt-6">
            <button type="submit" className="px-8 py-2 bg-red-600 text-white rounded-full hover:bg-red-700">
              Preview and submit
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================
export default function GuestEnquiryPage() {
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [submitted, setSubmitted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [dateError, setDateError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [userType, setUserType] = useState(null);

  const validateForm = () => {
    const { name, contact, email, from, to, checkInTime, checkOutTime, guests, state, city, purpose, files } = form;
    
    if (dateError) return false;

    return (
      name.trim() &&
      /^[0-9]{10}$/.test(contact) &&
      email.toLowerCase().endsWith("@thapar.edu") &&
      from &&
      to &&
      checkInTime &&
      checkOutTime &&
      guests &&
      state &&
      city &&
      purpose.trim() &&
      files.length > 0
    );
  };

  const handleIKSuccess = (response) => {
    console.log("[SUCCESS] ImageKit Upload Success:", response);
    setUploading(false);

    if (!response || !response.url) {
      console.error("[ERROR] Missing URL in response:", response);
      setUploadError("Upload failed - no URL returned from ImageKit");
      return;
    }

    const uploadedFileUrl = response.url;
    console.log("[INFO] Extracted URL:", uploadedFileUrl);
    console.log("[INFO] File Path:", response.filePath);
    console.log("[INFO] File ID:", response.fileId);

    if (!isValidUrl(uploadedFileUrl)) {
      console.error("[ERROR] Invalid URL format:", uploadedFileUrl);
      setUploadError("Invalid file URL returned from ImageKit");
      return;
    }

    console.log("[SUCCESS] URL validated, adding to files list");
    setUploadError("");

    setForm((prev) => ({
      ...prev,
      files: [...prev.files, uploadedFileUrl],
    }));

    console.log("[SUCCESS] File added to form successfully");
  };

  const handleIKError = (err) => {
    console.error("❌ ImageKit Upload Error:", err);
    setUploading(false);
    const msg = err?.message || err?.details || "Upload failed. Please try again.";
    setUploadError(msg);
  };

  const handleConfirmSubmit = async () => {
    console.log("🔍 ========== DEBUGGING TIME FIELDS ==========");
    console.log("📋 Form state (full):", form);
    console.log("ðŸ• Times in form state:", {
      checkInTime: form.checkInTime,
      checkOutTime: form.checkOutTime,
      checkInTimeLength: form.checkInTime?.length,
      checkOutTimeLength: form.checkOutTime?.length,
      checkInTimeEmpty: !form.checkInTime || form.checkInTime === "",
      checkOutTimeEmpty: !form.checkOutTime || form.checkOutTime === "",
    });
    
    console.log("📋Ž Files array:", form.files);
    console.log("📋Ž Files count:", form.files.length);

    form.files.forEach((url, idx) => {
      console.log(`  File ${idx + 1}: ${url}`);
      console.log(`    Starts with https: ${url.startsWith("https://")}`);
      console.log(`    Contains imagekit: ${url.includes("imagekit")}`);
      console.log(`    URL length: ${url.length}`);
    });

    const validFiles = form.files.filter((url) => url && isValidUrl(url));

    if (validFiles.length === 0) {
      alert("⚠️ Please upload at least one valid file.");
      return;
    }

    if (validFiles.length !== form.files.length) {
      console.error("❌ Some files are invalid:");
      form.files.forEach((url, idx) => {
        if (!isValidUrl(url)) {
          console.error(`  File ${idx + 1} is invalid: ${url}`);
        }
      });
      alert("⚠️ Some files are invalid. Please remove and re-upload them.");
      return;
    }

    console.log("🚀 Submitting enquiry with valid files:", validFiles);

    const payload = {
      guestName: form.name,
      guestEmail: form.email,
      guestPhone: form.contact,
      message: form.purpose,
      preferredDate: form.from,
      fullData: {
        rollno: form.rollno,
        department: form.department,
        gender: form.gender,
        from: form.from,
        to: form.to,
        checkInTime: form.checkInTime,
        checkOutTime: form.checkOutTime,
        guests: form.guests,
        females: form.females,
        males: form.males,
        state: form.state,
        city: form.city,
        reference: form.reference,
        files: validFiles,
        enquiryAttachments: validFiles,
      },
    };

    console.log("📋 ========== PAYLOAD ABOUT TO SEND ==========");
    console.log("📋 Full payload:", JSON.stringify(payload, null, 2));
    console.log("ðŸ• Times in fullData:", {
      checkInTime: payload.fullData.checkInTime,
      checkOutTime: payload.fullData.checkOutTime,
    });

    try {
      console.log("📋 Sending to backend...");
      await submitEnquiry(payload);
      console.log("✅ Successfully submitted!");
      setShowPreview(false);
      setSubmitted(true);
    } catch (err) {
      console.error("❌ Submission error:", err);
      if (err.response) {
        console.error("❌ Backend error:", err.response.data);
        alert("❌ Failed to submit: No response from server. Please check your connection.");
      } else {
        console.error("❌ Request setup error:", err.message);
        alert(`❌ Failed to submit: ${err.message}`);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("🔍 ========== FORM SUBMISSION DEBUG ==========");
    console.log("📋 Form state at submission:", form);
    console.log("ðŸ• Times at submission:", {
      checkInTime: form.checkInTime,
      checkOutTime: form.checkOutTime,
      isEmpty: {
        checkInTime: !form.checkInTime,
        checkOutTime: !form.checkOutTime,
      },
    });

    if (!validateForm()) {
      alert("⚠️ Please fill all fields correctly.");
      return;
    }
    setShowPreview(true);
  };

  const resetForm = () => {
    setSubmitted(false);
    setShowPreview(false);
    setForm(INITIAL_FORM_STATE);
    setEmailError("");
    setDateError("");
    setUploadError("");
  };

  // ==================== LANDING PAGE ====================
  const LandingPage = () => (
    <motion.div
      key="landing"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.6 }}
      className="w-full flex flex-col items-center px-4"
    >
      <motion.img 
        src={thaparLogo} 
        alt="Thapar Logo" 
        className="w-48 md:w-56 mb-6"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
      
      <h1 className="text-4xl md:text-5xl font-bold text-red-700 mb-4 text-center">
        Guest Room Booking Request
      </h1>
      
      <p className="text-lg text-gray-700 mb-12 text-center max-w-2xl">
        Please select your category to proceed
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Students Button */}
        <motion.button
          onClick={() => setUserType('student')}
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          className="group relative bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-red-500 hover:border-red-600 transition-all duration-300 p-8 min-h-[320px] flex flex-col items-center justify-center"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-32 h-32 mb-6 rounded-full bg-red-100 flex items-center justify-center overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow">
              <img 
                src={studentImg} 
                alt="Students" 
                className="w-24 h-24 object-contain"
              />
            </div>
            
            <h2 className="text-3xl font-bold text-red-700 mb-3 group-hover:text-red-800 transition-colors">
              Students
            </h2>
            
            <p className="text-gray-600 text-center">
              Hostel guest booking instructions
            </p>
          </div>
        </motion.button>

        {/* Faculty & Employees Button */}
        <motion.button
          onClick={() => setUserType('faculty')}
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          className="group relative bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-red-500 hover:border-red-600 transition-all duration-300 p-8 min-h-[320px] flex flex-col items-center justify-center"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-32 h-32 mb-6 rounded-full bg-red-100 flex items-center justify-center overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow">
              <img 
                src={employeeImg} 
                alt="Faculty & Employees" 
                className="w-24 h-24 object-contain"
              />
            </div>
            
            <h2 className="text-3xl font-bold text-red-700 mb-3 group-hover:text-red-800 transition-colors">
              Faculty & Emp.
            </h2>
            
            <p className="text-gray-600 text-center">
              Book guest room accommodation
            </p>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );

  // ==================== STUDENT INFO PAGE ====================
  const StudentInfoPage = () => (
    <motion.div
      key="student-info"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.6 }}
      className="w-full flex flex-col items-center px-4"
    >
      <motion.img 
        src={thaparLogo} 
        alt="Thapar Logo" 
        className="w-48 md:w-56 mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
      />

      <div className="bg-white bg-opacity-95 border-4 border-red-600 rounded-3xl shadow-2xl p-10 md:p-12 w-full max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold text-red-700 mb-6 text-center">
          Hostel Guest Booking Instructions
        </h1>
        
        <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-lg mb-6">
          <p className="text-gray-800 text-lg leading-relaxed">
            Students are permitted to book guest accommodations through the caretaker of their respective hostel only. This service is available exclusively for guests visiting the student's own hostel.
          </p>
        </div>

        <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-lg mb-6">
          <p className="text-gray-800 text-lg leading-relaxed">
            Students may book guest stays for their parents, guardians, or immediate family members, subject to hostel rules and availability.
          </p>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg mb-8">
          <p className="text-gray-800 text-base">
            <strong>For any queries or feedback, please email:</strong>
            <br />
            <a 
              href="mailto:navjot.sharma@thapar.edu" 
              className="text-blue-600 hover:text-blue-800 underline font-medium mt-2 inline-block"
            >
              navjot.sharma@thapar.edu
            </a>
          </p>
        </div>

        <div className="text-center">
          <button
            onClick={() => setUserType(null)}
            className="px-8 py-3 bg-red-600 text-white text-lg font-semibold rounded-full hover:bg-red-700 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            ← Back to Selection
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <IKContext
      publicKey={IMAGEKIT_CONFIG.PUBLIC_KEY}
      urlEndpoint={IMAGEKIT_CONFIG.URL_ENDPOINT}
      authenticationEndpoint={IMAGEKIT_CONFIG.AUTH_ENDPOINT}
      authenticator={authenticator}
    >
      <div
        className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center bg-fixed relative"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundColor: "rgba(255,248,240,0.4)",
          backgroundBlendMode: "overlay",
        }}
      >
        <AnimatePresence mode="wait">
          
          {/* ==================== LANDING PAGE ==================== */}
          {!userType && <LandingPage />}

          {/* ==================== STUDENT INFO PAGE ==================== */}
          {userType === 'student' && <StudentInfoPage />}

          {/* ==================== FORM VIEW ==================== */}
          {userType === 'faculty' && !submitted && !showPreview && (
            <>
              <motion.img src={thaparLogo} alt="Thapar Logo" className="w-40 mb-4" />
              <h1 className="text-3xl font-bold text-red-700 mb-8 text-center">
                Guest Room Booking Form
              </h1>
              <GuestForm
                form={form}
                setForm={setForm}
                onSubmit={handleSubmit}
                emailError={emailError}
                setEmailError={setEmailError}
                dateError={dateError}
                setDateError={setDateError}
                uploading={uploading}
                setUploading={setUploading}
                uploadError={uploadError}
                setUploadError={setUploadError}
                onIKSuccess={handleIKSuccess}
                onIKError={handleIKError}
              />
            </>
          )}

          {/* ==================== PREVIEW VIEW ==================== */}
          {userType === 'faculty' && showPreview && !submitted && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.6 }}
              className="w-full flex flex-col items-center"
            >
              <motion.img
                src={thaparLogo}
                alt="Thapar Logo"
                className="w-40 mb-4"
              />
              <h1 className="text-3xl font-bold text-red-700 mb-6">
                Review Your Information
              </h1>

              <div className="bg-white bg-opacity-90 border-2 border-red-600 rounded-3xl shadow-xl p-8 w-full max-w-3xl">
                <div className="grid grid-cols-2 gap-3 text-gray-700 text-sm">
                  <p>
                    <strong>Name:</strong> {form.name}
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
                    <strong>Check-in:</strong> {formatShortDate(form.from)}{" "}
                    {form.checkInTime && `(${formatTimeWithAMPM(form.checkInTime)})`}
                  </p>
                  <p>
                    <strong>Check-out:</strong> {formatShortDate(form.to)}{" "}
                    {form.checkOutTime && `(${formatTimeWithAMPM(form.checkOutTime)})`}
                  </p>
                  <p>
                    <strong>Total Guests:</strong> {form.guests}
                  </p>
                  {form.females && (
                    <p>
                      <strong>Females:</strong> {form.females}
                    </p>
                  )}
                  {form.males && (
                    <p>
                      <strong>Males:</strong> {form.males}
                    </p>
                  )}
                  <p>
                    <strong>State:</strong> {form.state}
                  </p>
                  <p>
                    <strong>City:</strong> {form.city}
                  </p>
                  {form.reference && (
                    <p>
                      <strong>Reference:</strong> {form.reference}
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <p>
                    <strong>Purpose of Stay:</strong>
                  </p>
                  <p className="bg-gray-50 p-3 rounded mt-1 text-sm">
                    {form.purpose}
                  </p>
                </div>

                <p className="mt-4">
                  <strong>Files Uploaded:</strong> {form.files.length}
                </p>

                {form.files.length > 0 && (
                  <ul className="mt-2 text-sm list-disc list-inside text-gray-700">
                    {form.files.map((url, i) => (
                      <li key={i}>{url.split("/").pop()}</li>
                    ))}
                  </ul>
                )}

                <div className="flex justify-center gap-4 mt-6">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-6 py-2 bg-gray-500 text-white rounded-full hover:bg-gray-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleConfirmSubmit}
                    className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700"
                  >
                    Confirm and submit
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== THANK YOU VIEW ==================== */}
          {userType === 'faculty' && submitted && (
            <motion.div
              key="thankyou"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center text-center bg-white bg-opacity-90 border-2 border-red-500 rounded-3xl shadow-xl p-10 max-w-lg mx-auto"
            >
              <img
                src={thaparLogo}
                alt="Thapar Logo"
                className="w-24 mb-4"
              />
              <CheckCircle2 className="text-green-500 w-16 h-16 mb-4" />

              <h2 className="text-3xl font-bold text-red-700 mb-3">
                Thank you
              </h2>

              <p className="text-gray-700 mb-6">
                Your guest room booking request has been submitted.
                A confirmation email will be sent shortly.
              </p>

              <button
                onClick={resetForm}
                className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700"
              >
                Submit Another Enquiry
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {/* FOOTER CREDIT */}
        <div className="fixed bottom-4 right-6 z-50">
          <Creator variant="default" />
        </div>
      </div>
    </IKContext>
  );
}