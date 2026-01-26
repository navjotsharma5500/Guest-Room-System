// src/components/ProfileModal.jsx
import React, { useState, useEffect } from "react";
import { X, Lock, ChevronDown, ChevronUp, Camera, Loader2 } from "lucide-react";
import { useToast } from "../context/ToastContext";
import axios from "axios";
import { IKContext, IKUpload } from "imagekitio-react";
import { API } from "../utils/api";
import { 
  IMAGEKIT_PUBLIC_KEY, 
  IMAGEKIT_URL_ENDPOINT, 
  IMAGEKIT_AUTH_ENDPOINT 
} from "../utils/apiConfig";

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

export default function ProfileModal({ open, onClose, currentUser, onUpdate }) {
  const { showToast } = useToast();
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

    // ImageKit returns url property when successful
    if (!response || !response.url) {
      console.error("❌ Missing URL in response:", response);
      setUploadError("Upload failed - no URL returned from ImageKit");
      return;
    }

    const uploadedFileUrl = response.url;

    console.log("📍 Extracted URL:", uploadedFileUrl);
    console.log("📋 File Path:", response.filePath);
    console.log("🆔 File ID:", response.fileId);

    // Validate URL format
    if (!isValidUrl(uploadedFileUrl)) {
      console.error("❌ Invalid URL format:", uploadedFileUrl);
      setUploadError("Invalid file URL returned from ImageKit");
      return;
    }

    // Trust ImageKit's response - add URL immediately
    console.log("✅ URL validated, saving profile picture");
    setUploadError("");
    setPreviewUrl(uploadedFileUrl);
    setForm({ ...form, profilePicture: uploadedFileUrl });

    // Auto-save to MongoDB
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
    alert(`Upload failed: ${errorMessage}`);
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
        alert("Profile picture updated successfully!");
      } else {
        console.log("✅ Profile picture saved (local update)");
        onUpdate && onUpdate({ ...currentUser, profilePicture: picUrl });
        alert("Profile picture updated successfully!");
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
          alert("Profile picture saved locally. Please log in to sync with server.");
          return;
        } catch {
          alert("Profile picture uploaded. Local save failed.");
          return;
        }
      }

      console.error("Error saving profile picture:", err);
      alert(`Failed to save profile picture: ${err.response?.data?.message || err.message || "Unknown error"}`);
    }
  };

  if (!open) return null;

  // ==========================
  // SAVE PROFILE (API version)
  // ==========================
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
          const existingUser = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...existingUser,
              profilePicture: form.profilePicture,
            })
          );
          window.dispatchEvent(
            new CustomEvent("userProfileUpdated", {
              detail: { profilePicture: form.profilePicture },
            })
          );
        } catch {}
        setEditing(false);
        showToast("Profile updated locally. Please log in to sync with server.", "info");
        return;
      }
      console.error("❌ Failed to update profile:", err);
      showToast("Failed to update profile.", "error");
    }
  };

  // ==========================
  // CHANGE PASSWORD (API)
  // ==========================
  const changePasswordForCurrentUser = async () => {
    setPassMessage("");

    if (!oldPassword || !newPassword) {
      setPassMessage("Please fill in both fields");
      return;
    }

    if (newPassword.length < 6) {
      setPassMessage("New password must be at least 6 characters");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/api/users/change-password`,
        { oldPassword, newPassword },
        {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      console.log("✅ Password changed successfully");
      setPassMessage("Password updated successfully ✓");
      setOldPassword("");
      setNewPassword("");
      setTimeout(() => setPassMessage(""), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to change password";
      console.error("❌ Password change error:", msg);
      setPassMessage(msg);
    }
  };

  // ==========================
  // UI
  // ==========================

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-2xl w-[480px] max-h-[90vh] overflow-y-auto shadow-2xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-red-700">Profile</h2>
          <button className="hover:bg-red-100 p-1 rounded" onClick={onClose}>
            <X className="text-red-700" size={22} />
          </button>
        </div>

        {/* Profile Picture */}
        <IKContext
          publicKey={IMAGEKIT_PUBLIC_KEY}
          urlEndpoint={IMAGEKIT_URL_ENDPOINT}
          authenticationEndpoint={IMAGEKIT_AUTH_ENDPOINT}
          authenticator={authenticator}
        >
          <div className="mb-5">
            <label className="text-sm font-medium block mb-2">Profile Picture</label>
            <div className="flex flex-col items-center">
              <div className="relative">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-red-300 shadow-lg"
                    onError={(e) => {
                      console.warn("⚠️ Profile image failed to load:", previewUrl);
                      // Keep showing the broken image - it will load when ImageKit processes it
                    }}
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-dashed border-gray-300">
                    <Camera className="text-gray-400" size={32} />
                  </div>
                )}

                {/* Upload button overlay */}
                <div className="absolute bottom-0 right-0">
                  {uploading ? (
                    <div className="bg-red-600 text-white p-2 rounded-full shadow-lg">
                      <Loader2 className="animate-spin" size={20} />
                    </div>
                  ) : (
                    <label className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-lg cursor-pointer inline-block">
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
                            alert("Please select an image file.");
                            return false;
                          }

                          if (file.size > 5 * 1024 * 1024) {
                            console.error("❌ File too large:", file.size);
                            alert("Image must be 5MB or less.");
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

              <p className="text-xs text-gray-500 mt-2 text-center">
                Click the camera icon to upload<br />Max size: 5MB
              </p>
              {uploadError && (
                <p className="text-red-600 text-xs mt-2">{uploadError}</p>
              )}
            </div>
          </div>
        </IKContext>

        {/* Form Fields */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              className="w-full border rounded p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={!editing}
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="w-full border rounded p-2 mt-1 bg-gray-100 cursor-not-allowed"
              value={form.email || currentUser?.email || ""}
              disabled
            />
          </div>

          <div>
            <label className="text-sm font-medium">Hostel</label>
            <input
              className="w-full border rounded p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={!editing}
              value={form.hostel || ""}
              onChange={(e) => setForm({ ...form, hostel: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
            >
              Close
            </button>

            {editing ? (
              <button
                onClick={handleSaveProfile}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Save Changes
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Password Section */}
        <div className="mt-6 border-t pt-4">
          <button
            className="flex justify-between items-center w-full p-3 border rounded hover:bg-red-50 transition-colors"
            onClick={() => setShowPasswordBox(!showPasswordBox)}
          >
            <span className="flex items-center gap-2 font-medium">
              <Lock size={18} className="text-red-700" />
              Change Password
            </span>

            {showPasswordBox ? (
              <ChevronUp size={20} className="text-red-700" />
            ) : (
              <ChevronDown size={20} className="text-red-700" />
            )}
          </button>

          {showPasswordBox && (
            <div className="p-4 mt-3 bg-red-50 rounded-lg space-y-3">
              <div>
                <label className="text-sm font-medium">Old Password</label>
                <input
                  type="password"
                  className="w-full border rounded p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="text-sm font-medium">New Password</label>
                <input
                  type="password"
                  className="w-full border rounded p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>

              {passMessage && (
                <p
                  className={`text-sm font-medium ${
                    passMessage.includes("successfully")
                      ? "text-green-600"
                      : "text-red-700"
                  }`}
                >
                  {passMessage}
                </p>
              )}

              <button
                onClick={changePasswordForCurrentUser}
                className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition-colors font-medium"
              >
                Update Password
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}