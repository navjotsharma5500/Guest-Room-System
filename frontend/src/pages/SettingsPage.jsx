// src/pages/SettingsPage.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Sun,
  Database,
  Users,
  ArrowLeft,
  X,
  PlusCircle,
  Edit3,
  Trash2,
} from "lucide-react";

export default function SettingsPage({
  theme,
  setTheme,
  notificationsEnabled,
  setNotificationsEnabled,
  setActiveTab,
  hostelData = {},
  setHostelData,
}) {
  const [toast, setToast] = useState(null);

  // 🔐 Get current logged-in user (from Login)
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem("user");
      const l = localStorage.getItem("currentUser");
      const raw = s || l;
      if (raw) {
        setCurrentUser(JSON.parse(raw));
      }
    } catch (err) {
      console.error("Failed to read currentUser", err);
    }
  }, []);

  const role = currentUser?.role || "caretaker";

  // keep theme & notifications synced
  useEffect(() => {
    if (typeof theme === "string") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      localStorage.setItem("theme", theme);
    }
    localStorage.setItem(
      "notificationsEnabled",
      notificationsEnabled ? "true" : "false"
    );
  }, [theme, notificationsEnabled]);

  // ✅ reusable toast trigger - only show if notifications enabled
  const showToast = (message, type = "success") => {
    if (notificationsEnabled) {
      setToast({ message, type });
      setTimeout(() => setToast(null), 2500);
    }
  };

  // ========== BASIC SETTINGS HANDLERS ==========

  const handleClearStorage = () => {
    const confirmed = window?.confirm?.(
      "Are you sure you want to clear all local data? This will reset your preferences and cached hostel data."
    );
    if (confirmed) {
      localStorage.clear();
      showToast("Cache cleared successfully!", "success");
    }
  };

  const handleClearLastApproved = () => {
    localStorage.removeItem("lastApprovedGuest");
    showToast("Last approved guest record cleared!", "info");
  };

  // ========== MANAGE HOSTELS STATE & HELPERS (ADMIN ONLY) ==========

  const [addHostelModal, setAddHostelModal] = useState(false);
  const [manageHostelsModal, setManageHostelsModal] = useState(false);

  const [editingKey, setEditingKey] = useState(null); // null => add, otherwise key
  const [hostelName, setHostelName] = useState("");
  const [numRooms, setNumRooms] = useState(1);
  const [roomType, setRoomType] = useState("2S AC");
  const [activeFlag, setActiveFlag] = useState(true);
  const [caretakerEmail, setCaretakerEmail] = useState("");
  const [wardenEmail, setWardenEmail] = useState("");

  const [roomManagementModal, setRoomManagementModal] = useState(false);
  const [selectedHostelForRooms, setSelectedHostelForRooms] = useState(null);
  const [editingRoomIndex, setEditingRoomIndex] = useState(null);
  const [editRoomData, setEditRoomData] = useState({
    roomNo: "",
    roomType: "",
    caretakerEmail: "",
    wardenEmail: "",
  });

  const roomTypeOptions = [
    "1S AC",
    "1S Non AC",
    "1S WAT AC",
    "2S AC",
    "2S Non AC",
    "2S WAT AC",
    "2S WST AC",
    "3S AC",
    "3S Non AC",
    "4S AC",
    "4S Non AC",
  ];

  const isValidEmail = (email) => {
    if (!email) return true; // optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const persistHostelData = (next) => {
    try {
      localStorage.setItem("hostelData", JSON.stringify(next));
    } catch (err) {
      console.error("Failed to persist hostelData", err);
    }
    if (setHostelData) setHostelData(next);
    window.dispatchEvent(new Event("hostelDataUpdated"));
  };

  const openAddHostelModal = () => {
    setEditingKey(null);
    setHostelName("");
    setNumRooms(1);
    setRoomType("2S AC");
    setActiveFlag(true);
    setCaretakerEmail("");
    setWardenEmail("");
    setAddHostelModal(true);
  };

  const openEditHostelModal = (key) => {
    const existing = (hostelData || {})[key];
    if (!existing) return;
    setEditingKey(key);
    setHostelName(key);
    setNumRooms((existing.rooms || []).length || 1);
    setRoomType(
      (existing.rooms &&
        existing.rooms[0] &&
        existing.rooms[0].roomType) ||
        "2S AC"
    );
    setActiveFlag(existing.active !== false);
    setCaretakerEmail(existing.caretakerEmail || "");
    setWardenEmail(existing.wardenEmail || "");
    setAddHostelModal(true);
  };

  const handleAddOrEditHostel = () => {
    const name = (hostelName || "").trim();
    if (!name) {
      showToast("Please enter a hostel name.", "warning");
      return;
    }

    if (!isValidEmail(caretakerEmail)) {
      showToast("Please enter a valid caretaker email.", "warning");
      return;
    }
    if (!isValidEmail(wardenEmail)) {
      showToast("Please enter a valid warden email.", "warning");
      return;
    }

    const count = Number(numRooms) > 0 ? Math.min(50, Number(numRooms)) : 1;

    const copy = structuredClone(hostelData || {});

    if (!editingKey) {
      // add
      if (copy[name]) {
        showToast("A hostel with that name already exists.", "warning");
        return;
      }
      const newHostel = {
        name,
        active: !!activeFlag,
        caretakerEmail: caretakerEmail.trim(),
        wardenEmail: wardenEmail.trim(),
        rooms: Array.from({ length: count }, (_, i) => ({
          roomNo: `Guest Room ${i + 1}`,
          roomType,
          bookings: [],
        })),
      };
      copy[name] = newHostel;
      persistHostelData(copy);
      showToast(`Hostel "${name}" added with ${count} room(s).`, "success");
      setAddHostelModal(false);
      return;
    }

    // edit
    const prevKey = editingKey;
    if (!copy[prevKey]) {
      showToast("Original hostel not found.", "error");
      setAddHostelModal(false);
      return;
    }

    if (name !== prevKey && copy[name]) {
      showToast("Another hostel with the new name already exists.", "warning");
      return;
    }

    const prev = copy[prevKey];
    const existingRooms = prev.rooms || [];
    let newRooms = [];

    if (count === existingRooms.length) {
      newRooms = existingRooms.map((r) => ({
        ...r,
        roomType,
      }));
    } else if (count > existingRooms.length) {
      newRooms = existingRooms.map((r) => ({ ...r, roomType }));
      for (let i = existingRooms.length; i < count; i++) {
        newRooms.push({
          roomNo: `Guest Room ${i + 1}`,
          roomType,
          bookings: [],
        });
      }
    } else {
      const roomsToRemove = existingRooms.slice(count);
      const hasBookings = roomsToRemove.some(
        (r) => (r.bookings || []).length > 0
      );
      if (hasBookings) {
        const confirmed = window.confirm(
          "Some rooms you are about to remove contain bookings. Removing them will delete those bookings. Proceed?"
        );
        if (!confirmed) return;
      }
      newRooms = existingRooms.slice(0, count).map((r) => ({ ...r, roomType }));
    }

    const updatedHostel = {
      name,
      active: !!activeFlag,
      caretakerEmail: caretakerEmail.trim(),
      wardenEmail: wardenEmail.trim(),
      rooms: newRooms,
    };

    if (name !== prevKey) {
      delete copy[prevKey];
      copy[name] = updatedHostel;
    } else {
      copy[prevKey] = updatedHostel;
    }

    persistHostelData(copy);
    showToast(`Hostel "${name}" updated.`, "success");
    setAddHostelModal(false);
    setEditingKey(null);
  };

  const handleDeleteHostel = (key) => {
    const confirmed = window.confirm(
      `Permanently delete "${key}"? This will remove rooms & bookings.`
    );
    if (!confirmed) return;
    const copy = structuredClone(hostelData || {});
    delete copy[key];
    persistHostelData(copy);
    showToast(`Hostel "${key}" deleted.`, "success");
  };

  const handleToggleActive = (key) => {
    const copy = structuredClone(hostelData || {});
    const item = copy[key];
    if (!item) return;
    item.active = !item.active;
    copy[key] = item;
    persistHostelData(copy);
    showToast(
      `${item.active ? "Activated" : "Deactivated"} "${key}".`,
      "info"
    );
  };

  const sortedHostelKeys = () =>
    Object.keys(hostelData || {}).sort((a, b) => a.localeCompare(b));

  const openRoomManagementModal = (hostelKey) => {
    setSelectedHostelForRooms(hostelKey);
    setEditingRoomIndex(null);
    setEditRoomData({
      roomNo: "",
      roomType: "",
      caretakerEmail: "",
      wardenEmail: "",
    });
    setRoomManagementModal(true);
  };

  const openEditRoomModal = (hostelKey, roomIndex) => {
    setSelectedHostelForRooms(hostelKey);
    const hostel = hostelData[hostelKey];
    const room = hostel.rooms[roomIndex];
    setEditingRoomIndex(roomIndex);
    setEditRoomData({
      roomNo: room.roomNo || "",
      roomType: room.roomType || "",
      caretakerEmail: room.caretakerEmail || "",
      wardenEmail: room.wardenEmail || "",
    });
    setRoomManagementModal(true);
  };

  const handleSaveRoom = () => {
    if (!editRoomData.roomNo.trim()) {
      showToast("Room number cannot be empty.", "warning");
      return;
    }

    if (!isValidEmail(editRoomData.caretakerEmail)) {
      showToast("Invalid caretaker email format.", "warning");
      return;
    }

    if (!isValidEmail(editRoomData.wardenEmail)) {
      showToast("Invalid warden email format.", "warning");
      return;
    }

    const copy = structuredClone(hostelData || {});
    const hostel = copy[selectedHostelForRooms];

    if (!hostel) {
      showToast("Hostel not found.", "error");
      return;
    }

    if (editingRoomIndex !== null) {
      hostel.rooms[editingRoomIndex] = {
        ...hostel.rooms[editingRoomIndex],
        roomNo: editRoomData.roomNo,
        roomType: editRoomData.roomType,
        caretakerEmail: editRoomData.caretakerEmail,
        wardenEmail: editRoomData.wardenEmail,
      };
      showToast("Room updated successfully.", "success");
    } else {
      hostel.rooms.push({
        roomNo: editRoomData.roomNo,
        roomType: editRoomData.roomType,
        caretakerEmail: editRoomData.caretakerEmail,
        wardenEmail: editRoomData.wardenEmail,
        bookings: [],
      });
      showToast("Room added successfully.", "success");
    }

    persistHostelData(copy);
    setRoomManagementModal(false);
    setEditingRoomIndex(null);
    setEditRoomData({
      roomNo: "",
      roomType: "",
      caretakerEmail: "",
      wardenEmail: "",
    });
  };

  const handleDeleteRoom = (hostelKey, roomIndex) => {
    const hostel = hostelData[hostelKey];
    const roomNo = hostel.rooms[roomIndex].roomNo;
    const confirmed = window.confirm(
      `Delete "${roomNo}"? This will remove the room and any associated bookings.`
    );
    if (!confirmed) return;

    const copy = structuredClone(hostelData || {});
    copy[hostelKey].rooms.splice(roomIndex, 1);
    persistHostelData(copy);
    showToast(`Room "${roomNo}" deleted.`, "success");
  };

  // ========== RENDER UI ==========

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4 }}
      className={`min-h-screen p-6 md:p-10 ml-64 ${
        theme === "dark"
          ? "bg-gray-900 text-gray-100"
          : "bg-gray-50 text-gray-900"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1
            className={`text-4xl font-extrabold ${
              theme === "dark" ? "text-red-400" : "text-red-700"
            }`}
          >
            ⚙️ Settings
          </h1>
          <button
            onClick={() => setActiveTab("Home")}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* THEME */}
          <motion.div
            className={`p-6 rounded-2xl shadow-md border transition ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-full">
                  <Sun className="text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-red-700">Theme</h2>
                  <p className="text-sm text-gray-500">
                    Switch between Light & Dark mode.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTheme("light");
                    showToast("Switched to Light Mode", "info");
                  }}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    theme === "light"
                      ? "bg-red-600 text-white"
                      : "bg-gray-200 text-black hover:bg-gray-300"
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => {
                    setTheme("dark");
                    showToast("Switched to Dark Mode", "info");
                  }}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    theme === "dark"
                      ? "bg-red-600 text-white"
                      : "bg-gray-200 text-black hover:bg-gray-300"
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>
          </motion.div>

          {/* NOTIFICATIONS */}
          <motion.div
            className={`p-6 rounded-2xl shadow-md border transition ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-full">
                  <Bell className="text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-red-700">
                    Notifications
                  </h2>
                  <p className="text-sm text-gray-500">
                    Enable alerts for new bookings, cancellations, and
                    approvals.
                  </p>
                </div>
              </div>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => {
                    setNotificationsEnabled(e.target.checked);
                    showToast(
                      e.target.checked
                        ? "Notifications enabled"
                        : "Notifications disabled",
                      "info"
                    );
                  }}
                  className="hidden"
                />
                <span
                  className={`w-14 h-8 flex items-center rounded-full p-1 transition ${
                    notificationsEnabled ? "bg-green-500" : "bg-gray-400"
                  }`}
                >
                  <span
                    className={`bg-white w-6 h-6 rounded-full shadow transform transition ${
                      notificationsEnabled ? "translate-x-6" : ""
                    }`}
                  />
                </span>
              </label>
            </div>
          </motion.div>

          {/* ROLE MANAGEMENT (COMING SOON) – ADMIN & MANAGER */}
          {(role === "admin" || role === "manager") && (
            <motion.div
              className={`p-6 rounded-2xl shadow-md border transition ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
              whileHover={{ y: -4 }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 rounded-full mt-1">
                  <Users className="text-red-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-red-700">
                    Role Management
                  </h2>
                  <p className="text-sm text-gray-500 mb-3">
                    Assign permissions to Admin, Manager and Caretaker
                    accounts. This feature will be enabled after server
                    integration.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      showToast(
                        "Role Management will be available soon (after server integration).",
                        "info"
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg cursor-not-allowed"
                  >
                    Role Management (Coming Soon)
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* CACHE & DATA – ADMIN & MANAGER ONLY */}
          {(role === "admin" || role === "manager") && (
            <motion.div
              className={`p-6 rounded-2xl shadow-md border transition ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
              whileHover={{ y: -4 }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 rounded-full mt-1">
                  <Database className="text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-red-700">
                    Cache & Data
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Manage locally stored data for performance and debugging.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleClearStorage}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow"
                    >
                      Clear Cache
                    </button>
                    <button
                      onClick={handleClearLastApproved}
                      className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300"
                    >
                      Clear Last Approved
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* MANAGE HOSTELS – ADMIN ONLY */}
          {role === "admin" && (
            <motion.div
              className={`p-6 rounded-2xl shadow-md border transition ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
              whileHover={{ y: -4 }}
            >
              <div className="flex items-start gap-3 justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-50 rounded-full mt-1">
                    <PlusCircle className="text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-red-700">
                      Manage Hostels
                    </h2>
                    <p className="text-sm text-gray-500 mb-3">
                      Create, edit, deactivate or remove hostels from the
                      portal.
                    </p>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={openAddHostelModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow"
                      >
                        <PlusCircle /> Add Hostel
                      </button>

                      <button
                        onClick={() => setManageHostelsModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 shadow"
                      >
                        <Edit3 /> Manage Hostels
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="mt-10 text-sm text-gray-500 text-center">
          © {new Date().getFullYear()} Thapar Guest Room Portal · All rights
          reserved
        </div>
      </div>

      {/* ---------------- Add/Edit Hostel Modal ---------------- */}
      <AnimatePresence>
        {addHostelModal && role === "admin" && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-[520px] shadow-xl"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-red-700">
                  {editingKey ? "Edit Hostel" : "Add Hostel"}
                </h3>
                <button
                  className="text-gray-500 hover:text-red-700"
                  onClick={() => {
                    setAddHostelModal(false);
                    setEditingKey(null);
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <label className="block text-sm font-medium mb-1">
                Hostel Name
              </label>
              <input
                type="text"
                value={hostelName}
                onChange={(e) => setHostelName(e.target.value)}
                className="border rounded p-2 w-full mb-3"
                placeholder="e.g. New Hostel (Z)"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Number of Guest Rooms
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={numRooms}
                    onChange={(e) =>
                      setNumRooms(Number(e.target.value) || 1)
                    }
                    className="border rounded p-2 w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Type of Guest Room
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="border rounded p-2 w-full"
                  >
                    {roomTypeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Caretaker Email
                  </label>
                  <input
                    type="email"
                    value={caretakerEmail}
                    onChange={(e) => setCaretakerEmail(e.target.value)}
                    className="border rounded p-2 w-full"
                    placeholder="caretaker@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Warden Email
                  </label>
                  <input
                    type="email"
                    value={wardenEmail}
                    onChange={(e) => setWardenEmail(e.target.value)}
                    className="border rounded p-2 w-full"
                    placeholder="warden@example.com"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!activeFlag}
                    onChange={(e) => setActiveFlag(e.target.checked)}
                    className="hidden"
                  />
                  <span
                    className={`w-14 h-8 flex items-center rounded-full p-1 transition ${
                      activeFlag ? "bg-green-500" : "bg-gray-400"
                    }`}
                  >
                    <span
                      className={`bg-white w-6 h-6 rounded-full shadow transform transition ${
                        activeFlag ? "translate-x-6" : ""
                      }`}
                    />
                  </span>
                </label>
                <div className="text-sm text-gray-600">
                  {activeFlag
                    ? "Active (visible on dashboards)"
                    : "Inactive (hidden from dashboards)"}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => {
                    setAddHostelModal(false);
                    setEditingKey(null);
                  }}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddOrEditHostel}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  {editingKey ? "Save Changes" : "Create Hostel"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- Manage Hostels Modal ---------------- */}
      <AnimatePresence>
        {manageHostelsModal && role === "admin" && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-[720px] max-w-[95%] shadow-xl"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-red-700">
                  Manage Hostels
                </h3>
                <button
                  className="text-gray-500 hover:text-red-700"
                  onClick={() => setManageHostelsModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {sortedHostelKeys().length === 0 && (
                  <p className="text-sm text-gray-500">
                    No hostels configured yet.
                  </p>
                )}
                {sortedHostelKeys().map((key) => {
                  const h = hostelData[key] || {};
                  return (
                    <div
                      key={key}
                      className="p-3 border rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">
                            {key}
                          </h4>
                          <div className="text-xs text-gray-500 mt-1">
                            {(h.rooms || []).length} room(s) •{" "}
                            {h.active === false ? "Inactive" : "Active"}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {h.caretakerEmail && (
                              <div>📧 Caretaker: {h.caretakerEmail}</div>
                            )}
                            {h.wardenEmail && (
                              <div>📧 Warden: {h.wardenEmail}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          title="Manage rooms"
                          onClick={() => {
                            openRoomManagementModal(key);
                            setManageHostelsModal(false);
                          }}
                          className="px-3 py-1 bg-white border rounded hover:bg-blue-50 text-blue-700 inline-flex items-center gap-2"
                        >
                          <Users size={16} /> Manage Rooms
                        </button>

                        <button
                          title="Edit hostel"
                          onClick={() => {
                            openEditHostelModal(key);
                            setManageHostelsModal(false);
                          }}
                          className="px-3 py-1 bg-white border rounded hover:bg-red-50 text-red-700 inline-flex items-center gap-2"
                        >
                          <Edit3 />
                        </button>

                        <button
                          title="Delete hostel"
                          onClick={() => handleDeleteHostel(key)}
                          className="px-3 py-1 bg-white border rounded hover:bg-red-50 text-red-700 inline-flex items-center gap-2"
                        >
                          <Trash2 />
                        </button>

                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={h.active !== false}
                            onChange={() => handleToggleActive(key)}
                            className="hidden"
                          />
                          <span
                            className={`w-12 h-7 flex items-center rounded-full p-1 transition ${
                              h.active !== false
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`bg-white w-5 h-5 rounded-full shadow transform transition ${
                                h.active !== false ? "translate-x-5" : ""
                              }`}
                            />
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setManageHostelsModal(false)}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- Room Management Modal ---------------- */}
      <AnimatePresence>
        {roomManagementModal && selectedHostelForRooms && role === "admin" && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-[800px] max-w-[95%] shadow-xl"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-red-700">
                  {editingRoomIndex !== null ? "Edit Room" : "Manage Rooms"} –{" "}
                  {selectedHostelForRooms}
                </h3>
                <button
                  className="text-gray-500 hover:text-red-700"
                  onClick={() => {
                    setRoomManagementModal(false);
                    setEditingRoomIndex(null);
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {editingRoomIndex === null ? (
                <>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-4">
                    {hostelData[selectedHostelForRooms]?.rooms?.length ===
                      0 && (
                      <p className="text-sm text-gray-500">
                        No rooms in this hostel.
                      </p>
                    )}
                    {hostelData[selectedHostelForRooms]?.rooms?.map(
                      (room, idx) => (
                        <div
                          key={idx}
                          className="p-4 border rounded-lg bg-gray-50"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                {room.roomNo}
                              </h4>
                              <div className="text-xs text-gray-600 mt-1 space-y-1">
                                <div>Type: {room.roomType}</div>
                                {room.caretakerEmail && (
                                  <div>Caretaker: {room.caretakerEmail}</div>
                                )}
                                {room.wardenEmail && (
                                  <div>Warden: {room.wardenEmail}</div>
                                )}
                                <div>
                                  {(room.bookings || []).length} booking(s)
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() =>
                                  openEditRoomModal(
                                    selectedHostelForRooms,
                                    idx
                                  )
                                }
                                className="px-3 py-1 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 text-blue-700 inline-flex items-center gap-1"
                              >
                                <Edit3 size={14} /> Edit
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteRoom(
                                    selectedHostelForRooms,
                                    idx
                                  )
                                }
                                className="px-3 py-1 bg-red-50 border border-red-200 rounded hover:bg-red-100 text-red-700 inline-flex items-center gap-1"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="flex justify-between gap-3">
                    <button
                      onClick={() => {
                        setEditingRoomIndex("new");
                        setEditRoomData({
                          roomNo: "",
                          roomType: "",
                          caretakerEmail: "",
                          wardenEmail: "",
                        });
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 inline-flex items-center gap-2"
                    >
                      <PlusCircle size={16} /> Add Room
                    </button>
                    <button
                      onClick={() => {
                        setRoomManagementModal(false);
                        setSelectedHostelForRooms(null);
                      }}
                      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Room Number *
                      </label>
                      <input
                        type="text"
                        value={editRoomData.roomNo}
                        onChange={(e) =>
                          setEditRoomData({
                            ...editRoomData,
                            roomNo: e.target.value,
                          })
                        }
                        className="border rounded p-2 w-full"
                        placeholder="e.g. Guest Room 1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Room Type *
                      </label>
                      <select
                        value={editRoomData.roomType}
                        onChange={(e) =>
                          setEditRoomData({
                            ...editRoomData,
                            roomType: e.target.value,
                          })
                        }
                        className="border rounded p-2 w-full"
                      >
                        <option value="">Select room type</option>
                        {roomTypeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-700 mb-3">
                        Contact Information (Optional)
                      </h4>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Caretaker Email
                        </label>
                        <input
                          type="email"
                          value={editRoomData.caretakerEmail}
                          onChange={(e) =>
                            setEditRoomData({
                              ...editRoomData,
                              caretakerEmail: e.target.value,
                            })
                          }
                          className="border rounded p-2 w-full"
                          placeholder="caretaker@example.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Optional - Enter a valid email address if available
                        </p>
                      </div>

                      <div className="mt-3">
                        <label className="block text-sm font-medium mb-1">
                          Warden Email
                        </label>
                        <input
                          type="email"
                          value={editRoomData.wardenEmail}
                          onChange={(e) =>
                            setEditRoomData({
                              ...editRoomData,
                              wardenEmail: e.target.value,
                            })
                          }
                          className="border rounded p-2 w-full"
                          placeholder="warden@example.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Optional - Enter a valid email address if available
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setEditingRoomIndex(null);
                        setEditRoomData({
                          roomNo: "",
                          roomType: "",
                          caretakerEmail: "",
                          wardenEmail: "",
                        });
                      }}
                      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRoom}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      {editingRoomIndex === "new"
                        ? "Add Room"
                        : "Save Changes"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className={`fixed bottom-6 right-6 px-5 py-3 rounded-lg shadow-lg text-white font-medium flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-green-600"
                : toast.type === "info"
                ? "bg-blue-600"
                : "bg-red-600"
            }`}
          >
            {toast.type === "success" ? "✅" : "ℹ️"} {toast.message}
            <button
              onClick={() => setToast(null)}
              className="ml-2 opacity-80 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
