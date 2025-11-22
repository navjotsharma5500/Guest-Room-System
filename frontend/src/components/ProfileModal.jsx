// src/components/ProfileModal.jsx
import React, { useState, useEffect } from "react";
import { X, Lock, ChevronDown, ChevronUp, Camera } from "lucide-react";

export default function ProfileModal({ open, onClose, currentUser, onUpdate }) {
  // ---------------------
  // ALL HOOKS MUST BE HERE
  // ---------------------
  const MASTER_PIN = "5233";

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(currentUser || {});
  const [showPasswordBox, setShowPasswordBox] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passMessage, setPassMessage] = useState("");
  
  // Profile picture state
  const [profilePicture, setProfilePicture] = useState(form.profilePicture || null);
  const [previewUrl, setPreviewUrl] = useState(form.profilePicture || null);

  // Sync form when user changes
  useEffect(() => {
    setForm(currentUser || {});
    setProfilePicture(currentUser?.profilePicture || null);
    setPreviewUrl(currentUser?.profilePicture || null);
  }, [currentUser]);

  // ---------------------
  // HANDLE PROFILE PICTURE UPLOAD
  // ---------------------
  const handlePictureUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result;
      setProfilePicture(base64String);
      setPreviewUrl(base64String);
      setForm({ ...form, profilePicture: base64String });
    };
    reader.readAsDataURL(file);
  };

  // ---------------------
  // RETURN CONDITION NOW SAFE
  // ---------------------
  if (!open) return null;
  
  // Debug log
  console.log("ProfileModal rendering with:", { open, currentUser });

  // ---------------------
  // SAVE PROFILE
  // ---------------------
  const handleSaveProfile = () => {
    try {
      if (!currentUser?.email) {
        alert("User email not found. Cannot save profile.");
        return;
      }

      const users = JSON.parse(localStorage.getItem("gr_users") || "{}");
      const email = currentUser.email.toLowerCase();

      if (users[email]) {
        users[email] = {
          ...users[email],
          name: form.name,
          hostel: form.hostel,
          profilePicture: form.profilePicture,
        };
        localStorage.setItem("gr_users", JSON.stringify(users));
      }

      const updatedUser = {
        ...currentUser,
        name: form.name,
        hostel: form.hostel,
        profilePicture: form.profilePicture,
      };

      localStorage.setItem("currentUser", JSON.stringify(updatedUser));

      onUpdate && onUpdate(updatedUser);
      setEditing(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update profile.");
    }
  };

  // ---------------------
  // CHANGE PASSWORD
  // ---------------------
  const changePasswordForCurrentUser = () => {
    setPassMessage("");

    try {
      const cuRaw = localStorage.getItem("currentUser");
      if (!cuRaw) throw new Error("No current user");

      const CU = JSON.parse(cuRaw);
      const email = CU.email.toLowerCase();

      const usersRaw = localStorage.getItem("gr_users");
      const users = usersRaw ? JSON.parse(usersRaw) : {};

      if (!users[email]) throw new Error("User not found");

      // Validate old password or master pin
      const oldMatches =
        oldPassword === users[email].password ||
        oldPassword === MASTER_PIN;

      if (!oldMatches) throw new Error("Old password incorrect");

      if (newPassword.length < 6)
        throw new Error("New password must be at least 6 characters");

      // Save new password
      users[email].password = newPassword;
      localStorage.setItem("gr_users", JSON.stringify(users));

      // Update current user
      const updatedCU = { ...CU, password: newPassword };
      localStorage.setItem("currentUser", JSON.stringify(updatedCU));

      setPassMessage("Password updated successfully ✔");
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      setPassMessage(err.message || "Failed to change password");
    }
  };

  // ---------------------
  // UI RETURN
  // ---------------------
  
  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2">
        <div className="bg-white rounded-2xl w-[480px] shadow-2xl p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold text-red-700">Profile</h2>
            <button className="hover:bg-red-100 p-1 rounded" onClick={onClose}>
              <X className="text-red-700" size={22} />
            </button>
          </div>
          <p className="text-gray-600">No user logged in. Please login first.</p>
          <div className="mt-4 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-2xl w-[480px] shadow-2xl p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-red-700">Profile</h2>
          <button className="hover:bg-red-100 p-1 rounded" onClick={onClose}>
            <X className="text-red-700" size={22} />
          </button>
        </div>

        {/* Profile Picture Upload */}
        <div>
          <label className="text-sm font-medium">Profile Picture</label>
          <div className="mt-2 flex flex-col items-center">
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-2 border-red-300"
                />
                {editing && (
                  <label className="absolute bottom-0 right-0 bg-red-600 text-white p-2 rounded-full cursor-pointer hover:bg-red-700 transition">
                    <Camera size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePictureUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-300">
                {editing ? (
                  <label className="cursor-pointer hover:text-red-600 transition">
                    <Camera size={32} className="text-gray-400" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePictureUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <span className="text-gray-400 text-xs">No picture</span>
                )}
              </div>
            )}
            {editing && previewUrl && (
              <button
                onClick={() => {
                  setProfilePicture(null);
                  setPreviewUrl(null);
                  setForm({ ...form, profilePicture: null });
                }}
                className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
              >
                Remove picture
              </button>
            )}
          </div>
        </div>

        {/* Profile fields */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              className="w-full border rounded p-2 mt-1"
              disabled={!editing}
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="w-full border rounded p-2 mt-1 bg-gray-100"
              value={form.email || currentUser?.email || ""}
              disabled
            />
          </div>

          <div>
            <label className="text-sm font-medium">Hostel</label>
            <input
              className="w-full border rounded p-2 mt-1"
              disabled={!editing}
              value={form.hostel || ""}
              onChange={(e) => setForm({ ...form, hostel: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Close
            </button>

            {editing ? (
              <button
                onClick={handleSaveProfile}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Save
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {/* PASSWORD SECTION */}
        <div className="mt-6 border-t pt-4">
          <button
            className="flex justify-between items-center w-full p-2 border rounded hover:bg-red-50"
            onClick={() => setShowPasswordBox(!showPasswordBox)}
          >
            <span className="flex items-center gap-2">
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
            <div className="p-3 mt-3 bg-red-50 rounded-lg space-y-3">
              <div>
                <label className="text-sm">Old Password or Master PIN</label>
                <input
                  type="password"
                  className="w-full border rounded p-2 mt-1"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm">New Password</label>
                <input
                  type="password"
                  className="w-full border rounded p-2 mt-1"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              {passMessage && (
                <p className="text-sm font-medium text-red-700">{passMessage}</p>
              )}

              <button
                onClick={changePasswordForCurrentUser}
                className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
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
