// src/components/AllHostels/ConsolidatedBookingModal.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Upload, CheckCircle, Trash2 } from "lucide-react";
import { IKContext, IKUpload } from "imagekitio-react";
import { formatShortDate, formatTimeWithAMPM } from "../../utils/hostelUtils";
import { BACKEND_URL } from '../utils/apiConfig';

const API = BACKEND_URL;

const imagekitAuthenticator = async () => {
  const response = await fetch(`${API}/api/imagekit/auth`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch ImageKit auth parameters");
  return response.json();
};

export default function ConsolidatedBookingModal({
  theme,
  prefillGuest,
  selectedRooms,
  checkIn,
  checkOut,
  onClose,
  onSubmit,
}) {
  const [paymentType, setPaymentType] = useState("Free");
  const [amount, setAmount] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (prefillGuest) {
      setPaymentType("Free");
      setAmount(0);
      setRemarks("");
      setUploadedFiles([]);
    }
  }, [prefillGuest]);

  const handleRemoveFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    // ✅ Validation for Paid bookings
    if (paymentType === "Paid") {
      if (!amount || amount <= 0) {
        alert("⚠️ Please enter total bill amount");
        return;
      }
    }

    // ✅ Validation for Free bookings
    if (paymentType === "Free") {
      if (!remarks.trim()) {
        alert("⚠️ Remarks are required for free booking");
        return;
      }
      if (uploadedFiles.length === 0) {
        alert("⚠️ Supporting documents are required for free booking");
        return;
      }
    }

    const finalFrom = prefillGuest?.from || checkIn;
    const finalTo = prefillGuest?.to || checkOut;

    // ✅ CRITICAL FIX: Pass structured data with correct attachment field
    onSubmit(
      {
        from: finalFrom,
        to: finalTo,
        checkInTime: prefillGuest?.checkInTime || "00:00",
        checkOutTime: prefillGuest?.checkOutTime || "23:59",
      },
      paymentType,         // "Paid" or "Free"
      amount || 0,         // Total bill amount (only for Paid)
      remarks,             // Remarks
      uploadedFiles,       // ✅ These should go to approvalDocuments
      "approvalDocuments"  // ✅ NEW: Explicitly specify field name
    );
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-2xl p-6 w-[720px] shadow-2xl max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2">
              📋 Consolidated Booking Form
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Review and confirm booking details for {selectedRooms.length} room(s)
            </p>
          </div>
          <motion.button
            whileHover={{ rotate: 90, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="text-gray-500 hover:text-red-600"
          >
            <X size={24} />
          </motion.button>
        </div>

        {/* Guest Information */}
        {prefillGuest && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl"
          >
            <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2 text-lg">
              👤 Guest Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: "Name", value: prefillGuest.guest || prefillGuest.name },
                { label: "Email", value: prefillGuest.email },
                { label: "Contact", value: prefillGuest.contact },
                { label: "Gender", value: prefillGuest.gender },
                { label: "Total Guests", value: prefillGuest.numGuests || prefillGuest.guests },
                { label: "Department", value: prefillGuest.department },
                { label: "State", value: prefillGuest.state },
                { label: "City", value: prefillGuest.city },
                { label: "Males", value: prefillGuest.males ?? "—" },
                { label: "Females", value: prefillGuest.females ?? "—" },
                {
                  label: prefillGuest.idType === "EMP" ? "Employee ID" : "Roll No",
                  value: prefillGuest.rollno,
                },
                { label: "Reference", value: prefillGuest.reference },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-white/70 p-2 rounded-lg"
                >
                  <p className="font-semibold text-gray-700 text-xs">{item.label}</p>
                  <p className="text-gray-900 font-medium">{item.value || "—"}</p>
                </motion.div>
              ))}
              <div className="col-span-2 bg-white/70 p-2 rounded-lg">
                <p className="font-semibold text-gray-700 text-xs">Purpose</p>
                <p className="text-gray-900 font-medium">{prefillGuest.purpose || "—"}</p>
              </div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/70 p-2 rounded-lg"
              >
                <p className="font-semibold text-gray-700 text-xs">Check-In</p>
                <p className="text-gray-900 font-medium">
                  {formatShortDate(prefillGuest.from || checkIn)}
                </p>
                <p className="text-xs text-gray-600">
                  {formatTimeWithAMPM(prefillGuest.checkInTime || "00:00")}
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/70 p-2 rounded-lg"
              >
                <p className="font-semibold text-gray-700 text-xs">Check-Out</p>
                <p className="text-gray-900 font-medium">
                  {formatShortDate(prefillGuest.to || checkOut)}
                </p>
                <p className="text-xs text-gray-600">
                  {formatTimeWithAMPM(prefillGuest.checkOutTime || "23:59")}
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Payment Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Payment Type
            </label>
            <motion.select
              value={paymentType}
              onChange={(e) => {
                setPaymentType(e.target.value);
                setRemarks("");
                setUploadedFiles([]);
              }}
              className="border-2 border-red-300 p-3 rounded-xl w-full"
            >
              <option value="Paid">Paid</option>
              <option value="Free">Without Charges Subject to Approval</option>
            </motion.select>
          </div>

          {/* FREE BOOKING */}
          {paymentType === "Free" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Remarks */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Remarks (Why Free?) <span className="text-red-600">*</span>
                </label>
                <motion.textarea
                  whileFocus={{ scale: 1.01 }}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter reason for free booking (e.g., Staff, Official Guest, Emergency, etc.)"
                  className="border-2 border-red-300 p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none"
                  required
                />
              </div>

              {/* Supporting Documents Upload - Up to 5 */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Supporting Documents (Up to 5) <span className="text-red-600">*</span>
                </label>
                <IKContext
                  publicKey={process.env.REACT_APP_IMAGEKIT_PUBLIC_KEY}
                  urlEndpoint={process.env.REACT_APP_IMAGEKIT_URL_KEY}
                  authenticator={imagekitAuthenticator}
                >
                  <div className="relative">
                    <IKUpload
                      folder="/approval"
                      useUniqueFileName={true}
                      isPrivateFile={false}
                      tags={["approval", "free-booking"]}
                      onUploadStart={() => setUploading(true)}
                      onError={(err) => {
                        console.error("Upload failed:", err);
                        setUploading(false);
                        alert("Failed to upload document");
                      }}
                      onSuccess={(res) => {
                        const fileData = {
                          url: res.url,
                          name: res.name,
                          type: res.fileType
                        };
                        setUploadedFiles(prev => [...prev, fileData]);
                        setUploading(false);
                      }}
                      validateFile={(file) => {
                        if (uploadedFiles.length >= 5) {
                          alert("Maximum 5 files allowed");
                          return false;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          alert("Maximum file size is 5 MB");
                          return false;
                        }
                        const allowedTypes = [
                          "image/jpeg",
                          "image/png",
                          "image/webp",
                          "application/pdf",
                        ];
                        if (!allowedTypes.includes(file.type)) {
                          alert("Only JPG, PNG, WEBP or PDF files allowed");
                          return false;
                        }
                        return true;
                      }}
                      className="border-2 border-dashed border-red-300 p-4 rounded-xl w-full bg-white cursor-pointer hover:border-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2 text-gray-600"
                    />
                    {uploadedFiles.length < 5 && !uploading && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Upload className="w-5 h-5" />
                          <span>Click to upload ({uploadedFiles.length}/5)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </IKContext>

                {uploading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 p-3 bg-blue-50 border border-blue-300 rounded-lg flex items-center gap-2"
                  >
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    <p className="text-sm text-blue-700 font-medium">Uploading...</p>
                  </motion.div>
                )}

                {/* Display uploaded files */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 bg-green-50 border border-green-300 rounded-lg"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-green-700 font-semibold truncate">
                                📄 {file.name}
                              </p>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View Document →
                              </a>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* PAID - Amount, Remarks (Optional), Attachments (Optional) */}
          {paymentType === "Paid" && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Total Bill Amount (₹) <span className="text-red-600">*</span>
                </label>
                <motion.input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  placeholder="Enter total bill amount"
                  className="border-2 border-red-300 p-3 rounded-xl w-full"
                  required
                />
              </div>

              {/* Remarks (Optional) for Paid */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Remarks (Optional)
                </label>
                <textarea
                  className="border-2 border-red-300 p-3 rounded-xl w-full h-20 resize-none"
                  placeholder="Any remarks (optional)"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              {/* Attachments (Optional) for Paid */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Attachments (Optional)
                </label>

                <IKContext
                  publicKey={process.env.REACT_APP_IMAGEKIT_PUBLIC_KEY}
                  urlEndpoint={process.env.REACT_APP_IMAGEKIT_URL_KEY}
                  authenticator={imagekitAuthenticator}
                >
                  <div className="relative">
                    <IKUpload
                      folder="/approval"
                      useUniqueFileName
                      isPrivateFile={false}
                      tags={["payment", "paid"]}
                      onUploadStart={() => setUploading(true)}
                      onError={(err) => {
                        console.error("Upload failed:", err);
                        setUploading(false);
                        alert("Failed to upload document");
                      }}
                      onSuccess={(res) => {
                        const fileData = {
                          url: res.url,
                          name: res.name,
                          type: res.fileType
                        };
                        setUploadedFiles((prev) => [...prev, fileData]);
                        setUploading(false);
                      }}
                      validateFile={(file) => {
                        if (uploadedFiles.length >= 5) {
                          alert("Maximum 5 files allowed");
                          return false;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          alert("Maximum file size is 5 MB");
                          return false;
                        }
                        const allowedTypes = [
                          "image/jpeg",
                          "image/png",
                          "image/webp",
                          "application/pdf",
                        ];
                        if (!allowedTypes.includes(file.type)) {
                          alert("Only JPG, PNG, WEBP or PDF files allowed");
                          return false;
                        }
                        return true;
                      }}
                      className="border-2 border-dashed border-red-300 p-4 rounded-xl w-full bg-white cursor-pointer hover:border-red-500 hover:bg-red-50 transition-all"
                    />
                    {uploadedFiles.length < 5 && !uploading && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Upload className="w-5 h-5" />
                          <span>Click to upload ({uploadedFiles.length}/5)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </IKContext>

                {uploading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 p-3 bg-blue-50 border border-blue-300 rounded-lg flex items-center gap-2"
                  >
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    <p className="text-sm text-blue-700 font-medium">Uploading...</p>
                  </motion.div>
                )}

                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 bg-green-50 border border-green-300 rounded-lg"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-green-700 font-semibold truncate">
                                📄 {file.name}
                              </p>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View Document →
                              </a>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Selected Rooms Summary */}
        {selectedRooms.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 p-4 bg-green-50 border-2 border-green-300 rounded-xl"
          >
            <p className="text-sm font-bold text-green-800 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              ✓ {selectedRooms.length} room(s) selected
            </p>
            <div className="text-xs text-gray-700 space-y-1 max-h-32 overflow-y-auto">
              {selectedRooms.map((r, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white/70 p-2 rounded font-medium"
                >
                  {r.hostel} - Room {r.roomNo}
                </motion.p>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition font-semibold"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(220, 38, 38, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            className="px-8 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg transition font-semibold"
          >
            Confirm Booking
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}