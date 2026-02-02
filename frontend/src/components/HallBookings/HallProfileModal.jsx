// src/components/HallBookings/HallProfileModal.jsx - Glassmorphism Version
import React, { useState, useEffect } from "react";
import { X, Lock, ChevronDown, ChevronUp, Camera, Loader2, User, Mail, Building2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../../context/ToastContext";
import axios from "axios";
import { IKContext, IKUpload } from "imagekitio-react";
import { API } from "../../utils/api";
import { 
  IMAGEKIT_PUBLIC_KEY, 
  IMAGEKIT_URL_ENDPOINT, 
  IMAGEKIT_AUTH_ENDPOINT 
} from "../../utils/apiConfig";

// ==================== ImageKit Authenticator ====================
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

const isValidUrl = (url) => {
  try {
    return url && (url.startsWith("http://") || url.startsWith("https://"));
  } catch {
    return false;
  }
};

export default function HallProfileModal({ open, onClose, currentUser, onUpdate }) {
  const toastContext = useToast();
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) {
      toastContext.showToast(message, type);
    }
  };
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(currentUser || {});
  const [showPasswordBox, setShowPasswordBox] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passMessage, setPassMessage] = useState("");

  const [previewUrl, setPreviewUrl] = useState(currentUser?.profilePicture || null);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    setForm(currentUser || {});
    setPreviewUrl(currentUser?.profilePicture || null);
  }, [currentUser]);

  // ==================== ImageKit Upload Handlers ====================
  const handleIKSuccess = (response) => {
    console.log("✅ ImageKit Upload Success:", response);

    setUploading(false);

    if (!response || !response.url) {
      console.error("❌ Missing URL in response:", response);
      setUploadError("Upload failed - no URL returned from ImageKit");
      return;
    }

    const uploadedFileUrl = response.url;

    console.log("📍 Extracted URL:", uploadedFileUrl);

    if (!isValidUrl(uploadedFileUrl)) {
      console.error("❌ Invalid URL format:", uploadedFileUrl);
      setUploadError("Invalid file URL returned from ImageKit");
      return;
    }

    console.log("✅ URL validated, saving profile picture");
    setUploadError("");
    setPreviewUrl(uploadedFileUrl);
    setForm({ ...form, profilePicture: uploadedFileUrl });

    // Auto-save to backend
    saveProfilePicture(uploadedFileUrl);
  };

  const handleIKError = (err) => {
    console.error("❌ ImageKit Upload Error:", err);
    setUploading(false);
    
    let errorMessage = "Upload failed. Please try again.";
    
    if (err?.message) {
      errorMessage = err.message;
    } else if (err?.details) {
      errorMessage = err.details;
    } else if (typeof err === "string") {
      errorMessage = err;
    }
    
    console.error("Error details:", errorMessage);
    setUploadError(errorMessage);
    showToast(`❌ Upload failed: ${errorMessage}`, "error");
  };

  // ==================== Save Profile Picture ====================
  const saveProfilePicture = async (picUrl) => {
    try {
      const token = localStorage.getItem("token");
      const payload = {
        name: currentUser?.name || form.name,
        hostel: currentUser?.hostel || currentUser?.assignedHostel || form.hostel,
        profilePicture: picUrl,
      };
      const config = {
        withCredentials: true,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
      };

      const res = await axios.put(`${API}/api/auth/profile`, payload, config);

      if (res?.data && res.data.user) {
        console.log("✅ Profile picture saved to backend:", res.data.user);
        onUpdate && onUpdate(res.data.user);
        showToast("✅ Profile picture updated successfully!", "success");
      } else {
        console.log("✅ Profile picture saved (local update)");
        onUpdate && onUpdate({ ...currentUser, profilePicture: picUrl });
        showToast("✅ Profile picture updated successfully!", "success");
      }
    } catch (err) {
      const unauth =
        err?.response?.status === 401 ||
        String(err?.response?.data?.message || "").toLowerCase().includes("not authenticated");
      const notFound = err?.response?.status === 404;

      if (unauth || notFound) {
        try {
          console.log("⚠️ Saving profile picture locally");
          onUpdate && onUpdate({ ...currentUser, profilePicture: picUrl });
          const existingUser = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem(
            "user",
            JSON.stringify({ ...existingUser, profilePicture: picUrl })
          );
          window.dispatchEvent(
            new CustomEvent("userProfileUpdated", {
              detail: { profilePicture: picUrl },
            })
          );
          showToast("✅ Profile picture saved locally. Please log in to sync with server.", "success");
          return;
        } catch {
          showToast("⚠️ Profile picture uploaded. Local save failed.", "warning");
          return;
        }
      }

      console.error("Error saving profile picture:", err);
      showToast(`❌ Failed to save profile picture: ${err.response?.data?.message || err.message || "Unknown error"}`, "error");
    }
  };

  if (!open) return null;

  // Save Profile
  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const payload = {
        name: form.name,
        hostel: form.hostel,
        profilePicture: form.profilePicture,
      };
      const config = {
        withCredentials: true,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
      };

      const res = await axios.put(`${API}/api/auth/profile`, payload, config);

      console.log("✅ Profile updated:", res.data);
      onUpdate && onUpdate(res.data.user);
      setEditing(false);
      showToast("Profile updated successfully!", "success");
    } catch (err) {
      const unauth =
        err?.response?.status === 401 ||
        String(err?.response?.data?.message || "").toLowerCase().includes("not authenticated");
      const notFound = err?.response?.status === 404;

      if (unauth || notFound) {
        console.log("⚠️ Saving profile locally");
        onUpdate && onUpdate({
          ...currentUser,
          profilePicture: form.profilePicture,
        });
        try {
          const existing = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...existing,
              ...form,
            })
          );
          setEditing(false);
          showToast("✅ Profile saved locally. Please log in to sync.", "success");
        } catch (storageError) {
          console.error("Local storage error:", storageError);
          showToast("⚠️ Could not save to local storage.", "warning");
        }
        return;
      }

      console.error("Error saving profile:", err);
      showToast(`❌ Profile save failed: ${err.response?.data?.message || err.message}`, "error");
    }
  };

  // Change Password
  const changePasswordForCurrentUser = async () => {
    setPassMessage("");
    if (!oldPassword.trim() || !newPassword.trim()) {
      setPassMessage("❌ Please fill both fields.");
      return;
    }
    if (newPassword.length < 6) {
      setPassMessage("❌ New password must be at least 6 characters.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${API}/api/auth/change-password`,
        { oldPassword, newPassword },
        {
          withCredentials: true,
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
        }
      );
      setPassMessage("✅ Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      showToast("✅ Password changed successfully!", "success");
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Unknown error";
      setPassMessage(`❌ ${msg}`);
      showToast(`❌ Password change failed: ${msg}`, "error");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="glassmorphism-card rounded-2xl p-6 w-full max-w-lg shadow-2xl border-2 border-white/40 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative Background Blobs */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-br from-pink-500/10 to-red-500/10 rounded-full blur-3xl -z-10" />

          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
                <User size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
                  Profile
                  <Sparkles className="w-5 h-5 text-red-600" />
                </h2>
                <p className="text-sm text-gray-600">Manage your account details</p>
              </div>
            </div>
            <button 
              className="p-2 rounded-lg hover:bg-red-100/50 text-gray-500 hover:text-red-700 transition-all" 
              onClick={onClose}
            >
              <X size={22} />
            </button>
          </div>

          {/* Profile Picture Section */}
          <IKContext
            publicKey={IMAGEKIT_PUBLIC_KEY}
            urlEndpoint={IMAGEKIT_URL_ENDPOINT}
            authenticationEndpoint={IMAGEKIT_AUTH_ENDPOINT}
            authenticator={authenticator}
          >
            <div className="mb-6">
              <label className="text-sm font-semibold text-gray-700 block mb-3">Profile Picture</label>
              <div className="flex flex-col items-center">
                <div className="relative">
                  {previewUrl ? (
                    <motion.img
                      whileHover={{ scale: 1.05 }}
                      src={previewUrl}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-red-300 shadow-xl"
                      onError={(e) => {
                        console.warn("⚠️ Profile image failed to load:", previewUrl);
                      }}
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-dashed border-gray-400 shadow-lg">
                      <Camera className="text-gray-500" size={36} />
                    </div>
                  )}

                  {/* Upload button overlay */}
                  <div className="absolute bottom-0 right-0">
                    {uploading ? (
                      <div className="bg-gradient-to-br from-red-600 to-red-700 text-white p-3 rounded-full shadow-xl">
                        <Loader2 className="animate-spin" size={20} />
                      </div>
                    ) : (
                      <label className="bg-gradient-to-br from-red-600 to-red-700 text-white p-3 rounded-full hover:from-red-700 hover:to-red-800 shadow-xl cursor-pointer inline-block transition-all hover:scale-110">
                        <IKUpload
                          folder="/profile"
                          useUniqueFileName={true}
                          isPrivateFile={false}
                          tags={["profile"]}
                          overwriteFile={false}
                          onUploadStart={() => {
                            console.log("🚀 Starting profile picture upload...");
                            setUploading(true);
                            setUploadError("");
                          }}
                          onError={handleIKError}
                          onSuccess={handleIKSuccess}
                          validateFile={(file) => {
                            console.log("📁 Validating profile image:", {
                              name: file.name,
                              size: file.size,
                              type: file.type,
                            });

                            if (!file.type.startsWith("image/")) {
                              console.error("❌ File is not an image");
                              showToast("⚠️ Please select an image file.", "warning");
                              return false;
                            }

                            if (file.size > 5 * 1024 * 1024) {
                              console.error("❌ File too large:", file.size);
                              showToast("⚠️ Image must be 5MB or less.", "warning");
                              return false;
                            }

                            console.log("✅ Profile image validation passed");
                            return true;
                          }}
                          className="hidden"
                        />
                        <Camera size={20} className="pointer-events-none" />
                      </label>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-600 mt-3 text-center font-medium">
                  Click the camera icon to upload<br />
                  <span className="text-gray-500">Max size: 5MB • JPG, PNG, GIF</span>
                </p>
                {uploadError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-xs mt-2 bg-red-50 px-3 py-1 rounded-lg"
                  >
                    {uploadError}
                  </motion.p>
                )}
              </div>
            </div>
          </IKContext>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                <User size={16} className="text-red-600" />
                Name
              </label>
              <input
                className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all bg-white/50 backdrop-blur-sm disabled:bg-gray-100/50 disabled:cursor-not-allowed"
                disabled={!editing}
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                <Mail size={16} className="text-red-600" />
                Email
              </label>
              <input
                className="w-full border-2 border-gray-200 rounded-xl p-3 bg-gray-100/50 cursor-not-allowed backdrop-blur-sm"
                value={form.email || currentUser?.email || ""}
                disabled
              />
            </div>

            {/* Hostel Field */}
            <div>
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                <Building2 size={16} className="text-red-600" />
                Hostel
              </label>
              <input
                className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all bg-white/50 backdrop-blur-sm disabled:bg-gray-100/50 disabled:cursor-not-allowed"
                disabled={!editing}
                value={form.hostel || ""}
                onChange={(e) => setForm({ ...form, hostel: e.target.value })}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-5 py-2.5 glassmorphism-card border border-gray-300 rounded-xl hover:bg-gray-50/80 transition-all font-medium text-gray-700"
              >
                Close
              </motion.button>

              {editing ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveProfile}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:shadow-xl transition-all font-semibold shadow-lg"
                >
                  Save Changes
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setEditing(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:shadow-xl transition-all font-semibold shadow-lg"
                >
                  Edit Profile
                </motion.button>
              )}
            </div>
          </div>

          {/* Password Section */}
          <div className="mt-6 border-t-2 border-gray-200/50 pt-5">
            <motion.button
              whileHover={{ backgroundColor: "rgba(254, 226, 226, 0.5)" }}
              className="flex justify-between items-center w-full p-4 border-2 border-gray-200 rounded-xl hover:border-red-300 transition-all glassmorphism-card"
              onClick={() => setShowPasswordBox(!showPasswordBox)}
            >
              <span className="flex items-center gap-3 font-semibold text-gray-800">
                <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
                  <Lock size={18} />
                </div>
                Change Password
              </span>

              <motion.div
                animate={{ rotate: showPasswordBox ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown size={20} className="text-red-700" />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {showPasswordBox && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 mt-3 glassmorphism-card rounded-xl border-2 border-red-200/50 space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">Old Password</label>
                      <input
                        type="password"
                        className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 bg-white/50 backdrop-blur-sm"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">New Password</label>
                      <input
                        type="password"
                        className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 bg-white/50 backdrop-blur-sm"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 6 characters)"
                      />
                    </div>

                    {passMessage && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-sm font-semibold p-3 rounded-lg ${
                          passMessage.includes("successfully")
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {passMessage}
                      </motion.p>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={changePasswordForCurrentUser}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-xl hover:shadow-xl transition-all font-semibold shadow-lg"
                    >
                      Update Password
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}