//ExtensionModal.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "../context/ToastContext";
import { IKContext, IKUpload } from "imagekitio-react";
import AttachmentGrid from "./AttachmentGrid";
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

export default function ExtensionModalWrapper(props) {
  if (!props.modal) return null;
  return <ExtensionModal {...props} />;
}

function ExtensionModal({ modal, onClose, onExtend }) {
  const toastContext = useToast();
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) {
      toastContext.showToast(message, type);
    }
  };
  const [step, setStep] = useState(1); 
  const [newTo, setNewTo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // ✅ NEW: Payment fields
  const [extensionPaymentType, setExtensionPaymentType] = useState("Paid");
  const [extensionAmount, setExtensionAmount] = useState("");
  const [extensionPaymentRemarks, setExtensionPaymentRemarks] = useState("");
  const [paymentFiles, setPaymentFiles] = useState([]);

  const getMinDate = () => {
    if (!modal.booking?.to) return "";
    
    try {
      const currentCheckout = new Date(modal.booking.to);
      currentCheckout.setDate(currentCheckout.getDate() + 1);
      return currentCheckout.toISOString().split('T')[0];
    } catch (err) {
      console.error("Date parsing error:", err);
      return "";
    }
  };

  const minDate = getMinDate();

  // ✅ Handle extension attachments upload
  const handleIKSuccess = (response) => {
    console.log("✅ Extension Attachment Upload Success:", response);

    let finalUrl =
      response.url ||
      (response.response && response.response.url) ||
      (response.filePath ? `${IMAGEKIT_URL_ENDPOINT}${response.filePath}` : null);

    if (!finalUrl) {
      finalUrl = response?.data?.url || response?.response?.data?.url || null;
    }

    if (!finalUrl) {
      console.error("❌ No URL received from ImageKit:", response);
      setUploading(false);
      setUploadError("Upload failed: Could not get file URL");
      return;
    }

    console.log("📎 Extension Attachment URL:", finalUrl);
    setUploading(false);
    setFiles((prev) => [...prev, finalUrl]);
  };

  // ✅ Handle payment attachments upload
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
      setUploading(false);
      setUploadError("Upload failed: Could not get file URL");
      return;
    }

    console.log("📎 Payment File URL:", finalUrl);
    setUploading(false);
    setPaymentFiles((prev) => [...prev, finalUrl]);
  };

  const handleIKError = (err) => {
    console.error("❌ ImageKit Upload Error:", err);
    setUploading(false);
    const msg = err?.message || err?.details || "Upload failed. Please try again.";
    setUploadError(msg);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removePaymentFile = (index) => {
    setPaymentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ Validation for Step 2 (Payment)
  const canProceedToPayment = () => {
    if (!newTo) return false;
    return true;
  };

  // ✅ Validation for final submission
  const canSubmit = () => {
    if (!newTo) return false;
    
    if (extensionPaymentType === "Paid") {
      if (!extensionAmount || Number(extensionAmount) <= 0) return false;
      // Payment attachments optional for Paid
    } else if (extensionPaymentType === "Free") {
      if (!extensionPaymentRemarks.trim()) return false;
      if (paymentFiles.length === 0) return false; // Mandatory for Free
    }
    
    return true;
  };

  const handleExtend = async () => {
    if (!newTo) {
      setError("Please select a new checkout date");
      return;
    }

    console.log("================================================================================");
    console.log("🔥 EXTENSION MODAL: handleExtend triggered");
    console.log("📦 Data:", {
      modal: modal ? "present" : "null",
      newTo,
      remarks,
      filesCount: files.length,
      extensionPaymentType,
      extensionAmount,
      extensionPaymentRemarks,
      paymentFilesCount: paymentFiles.length
    });
    console.log("================================================================================");

    setLoading(true);
    setError("");

    try {
      await onExtend(
        {
          hostel: modal.hostel,
          roomNo: modal.roomNo,
          booking: modal.booking,
        },
        newTo,
        remarks,
        files,
        // ✅ NEW: Payment data
        {
          extensionPaymentType,
          extensionAmount: extensionPaymentType === "Paid" ? Number(extensionAmount) : 0,
          extensionPaymentRemarks: extensionPaymentType === "Free" ? extensionPaymentRemarks : "",
          extensionPaymentAttachments: paymentFiles
        }
      );
      
      console.log("✅ onExtend completed successfully");
      
      setLoading(false);
    } catch (err) {
      console.error("================================================================================");
      console.error("❌ EXTENSION MODAL: Extension error:", err);
      console.error("================================================================================");
      setError(err.message || "Failed to extend booking. Please try again.");
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
  };

  return (
    <IKContext
      publicKey={IMAGEKIT_PUBLIC_KEY}
      urlEndpoint={IMAGEKIT_URL_ENDPOINT}
      authenticationEndpoint={IMAGEKIT_AUTH_ENDPOINT}
      authenticator={authenticator}
    >
      <motion.div
        className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="bg-white rounded-xl p-4 sm:p-5 w-full max-w-[95%] sm:max-w-[500px] shadow-xl max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
        >
          <h2 className="text-base sm:text-lg font-semibold text-red-700 mb-3">
            Extend Booking {step === 2 && "- Payment Details"}
          </h2>

          {step === 1 && (
            <>
              <div className="mb-4">
                <p className="text-xs sm:text-sm text-gray-600 mb-2">
                  <strong>Current Checkout:</strong> {formatDate(modal.booking?.to)}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                  <strong>Guest:</strong> {modal.booking?.guest || "Guest"}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 mb-2 sm:mb-3">
                  Select a date after {formatDate(modal.booking?.to)}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm mb-1 font-medium">New Checkout Date</label>
                  <input
                    type="date"
                    className="border rounded px-3 py-2 text-sm sm:text-base w-full"
                    value={newTo}
                    min={minDate}
                    onChange={(e) => {
                      setNewTo(e.target.value);
                      setError("");
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm mb-1 font-medium">Extension Remarks</label>
                  <textarea
                    className="border rounded px-3 py-2 text-sm sm:text-base w-full h-20 resize-none"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Reason for extension..."
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm mb-1 font-medium">
                    Extension Attachments (Max 5) - {files.length} uploaded
                  </label>
                  <IKUpload
                    fileName={`extension_${Date.now()}_${Math.random()
                      .toString(36)
                      .substring(2)}`}
                    folder="/extension"
                    useUniqueFileName={true}
                    isPrivateFile={false}
                    tags={["extension"]}
                    overwriteFile={false}
                    onUploadStart={() => {
                      setUploading(true);
                      setUploadError("");
                    }}
                    onError={handleIKError}
                    onSuccess={handleIKSuccess}
                    validateFile={(file) => {
                      if (files.length >= 5) {
                        showToast("Max 5 files allowed", "error");
                        return false;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        showToast("File size must be under 5MB", "error");
                        return false;
                      }
                      return true;
                    }}
                    className="text-xs sm:text-sm border p-2 rounded w-full"
                  />

                  {uploading && (
                    <div className="mt-2 text-xs sm:text-sm text-blue-600 flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                      Uploading file...
                    </div>
                  )}

                  {uploadError && (
                    <p className="text-red-600 text-xs mt-2">{uploadError}</p>
                  )}

                  {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {files.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-gray-50 border px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm"
                        >
                          <div className="flex items-center gap-2 truncate max-w-[200px]">
                            📄 File {i + 1}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="text-gray-500 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <div className="mt-2">
                        <AttachmentGrid files={files} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-5">
                <button
                  onClick={onClose}
                  className="px-4 py-2 w-full sm:w-auto text-sm sm:text-base rounded bg-gray-200 hover:bg-gray-300 transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceedToPayment()}
                  className={`px-4 py-2 rounded text-white transition ${
                    canProceedToPayment()
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  Next: Payment
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-4">
                {/* Payment Type Selection */}
                <div>
                  <label className="text-xs sm:text-sm font-medium block mb-2">
                    Payment Type <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="border p-2 text-sm sm:text-base rounded w-full"
                    value={extensionPaymentType}
                    onChange={(e) => {
                      setExtensionPaymentType(e.target.value);
                      setExtensionAmount("");
                      setExtensionPaymentRemarks("");
                      setPaymentFiles([]);
                    }}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Free">Without Charges Subject to Approval</option>
                  </select>
                </div>

                {/* PAID - Amount + Optional Remarks + Optional Attachments */}
                {extensionPaymentType === "Paid" && (
                  <>
                    <div>
                      <label className="text-xs sm:text-sm font-medium block mb-2">
                        Extension Amount (₹) <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        className="border p-2 text-sm sm:text-base rounded w-full"
                        value={extensionAmount}
                        onChange={(e) => setExtensionAmount(e.target.value)}
                        placeholder="Enter extension amount"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="text-xs sm:text-sm font-medium block mb-2">
                        Remarks (Optional)
                      </label>
                      <textarea
                        className="border p-2 rounded w-full h-20 resize-none"
                        value={extensionPaymentRemarks}
                        onChange={(e) => setExtensionPaymentRemarks(e.target.value)}
                        placeholder="Any additional remarks..."
                      />
                    </div>

                    <div>
                      <label className="text-xs sm:text-sm font-medium block mb-2">
                        Attachments (Optional) - {paymentFiles.length} uploaded
                      </label>
                      <p className="text-xs text-gray-600 mb-2">Upload payment documents if needed</p>

                      <IKUpload
                        fileName={`extension_payment_${Date.now()}_${Math.random()
                          .toString(36)
                          .substring(2)}`}
                        folder="/extension-payment"
                        useUniqueFileName={true}
                        isPrivateFile={false}
                        tags={["extension", "payment", "paid"]}
                        overwriteFile={false}
                        onUploadStart={() => {
                          setUploading(true);
                          setUploadError("");
                        }}
                        onError={handleIKError}
                        onSuccess={handlePaymentFileSuccess}
                        validateFile={(file) => {
                          if (paymentFiles.length >= 5) {
                            showToast("⚠️ Max 5 files allowed", "warning");
                            return false;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            showToast("⚠️ File size must be under 5MB", "warning");
                            return false;
                          }
                          return true;
                        }}
                        className="text-xs sm:text-sm border p-2 rounded w-full"
                      />

                      {uploading && (
                        <div className="mt-2 text-xs sm:text-sm text-blue-600 flex items-center gap-2">
                          <span className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                          Uploading...
                        </div>
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
                                className="text-gray-500 hover:text-red-600"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <div className="mt-2">
                            <AttachmentGrid files={paymentFiles} />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* FREE - Mandatory Remarks + Mandatory Attachments */}
                {extensionPaymentType === "Free" && (
                  <>
                    <div>
                      <label className="text-xs sm:text-sm font-medium block mb-2">
                        Remarks (Why Free?) <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        className="border p-2 rounded w-full h-20 resize-none"
                        value={extensionPaymentRemarks}
                        onChange={(e) => setExtensionPaymentRemarks(e.target.value)}
                        placeholder="Enter reason for free extension..."
                      />
                    </div>

                    <div>
                      <label className="text-xs sm:text-sm font-medium block mb-2">
                        Upload Approval Documents <span className="text-red-600">*</span> - {paymentFiles.length} uploaded
                      </label>
                      <p className="text-xs text-gray-600 mb-2">Required for free extensions</p>

                      <IKUpload
                        fileName={`extension_free_${Date.now()}_${Math.random()
                          .toString(36)
                          .substring(2)}`}
                        folder="/extension-approval"
                        useUniqueFileName={true}
                        isPrivateFile={false}
                        tags={["extension", "approval", "free"]}
                        overwriteFile={false}
                        onUploadStart={() => {
                          setUploading(true);
                          setUploadError("");
                        }}
                        onError={handleIKError}
                        onSuccess={handlePaymentFileSuccess}
                        validateFile={(file) => {
                          if (paymentFiles.length >= 5) {
                            showToast("⚠️ Max 5 files allowed", "warning");
                            return false;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            showToast("⚠️ File size must be under 5MB", "warning");
                            return false;
                          }
                          return true;
                        }}
                        className="text-xs sm:text-sm border p-2 rounded w-full"
                      />

                      {uploading && (
                        <div className="mt-2 text-xs sm:text-sm text-blue-600 flex items-center gap-2">
                          <span className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                          Uploading...
                        </div>
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
                                className="text-gray-500 hover:text-red-600"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <div className="mt-2">
                            <AttachmentGrid files={paymentFiles} />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-5">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 w-full sm:w-auto text-sm sm:text-base rounded bg-gray-200 hover:bg-gray-300 transition"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={handleExtend}
                  disabled={loading || uploading || !canSubmit()}
                  className={`px-4 py-2 rounded text-white transition ${
                    loading || uploading || !canSubmit()
                      ? "bg-red-400 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {loading ? "Extending..." : "Confirm Extension"}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </IKContext>
  );
}