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
  Settings,
} from "lucide-react";
import { hasPermission } from "../utils/checkPermission";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL } from "../utils/apiConfig";

export default function SettingsPage({
  theme,
  setTheme,
  notificationsEnabled,
  setNotificationsEnabled,
  setActiveTab,
  hostelData = {},
  setHostelData = () => {},
}) {
  const [toast, setToast] = useState(null);

  // AUTH USER
  const { currentUser } = useAuth();
  const [localUser, setLocalUser] = useState(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem("user");
      const l = localStorage.getItem("currentUser");
      const raw = s || l;
      if (raw) setLocalUser(JSON.parse(raw));
    } catch (err) {
      console.error("Failed to load user");
    }
  }, []);

  const user = currentUser || localUser;
  const role = user?.role || "caretaker";

  // PERMISSIONS
  const canManageHostels = hasPermission(user, "settings.manageHostels");
  const canClearCache = hasPermission(user, "settings.clearCache");
  const canClearLastApproved = hasPermission(user, "settings.clearLastApproved");
  const canManageRoles = hasPermission(user, "settings.manageRoles");

  // Sync settings
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
    localStorage.setItem(
      "notificationsEnabled",
      notificationsEnabled ? "true" : "false"
    );
  }, [theme, notificationsEnabled]);

  // Toast
  const showToast = (message, type = "success") => {
    if (!notificationsEnabled) return;
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  // CACHE HANDLERS
  const handleClearStorage = () => {
    if (window.confirm("Clear all cached data?")) {
      localStorage.clear();
      showToast("Cache cleared successfully!", "success");
    }
  };

  const handleClearLastApproved = () => {
    localStorage.removeItem("lastApprovedGuest");
    showToast("Last approved guest cleared!", "info");
  };

  // HOSTEL MANAGEMENT
  const [addHostelModal, setAddHostelModal] = useState(false);
  const [manageHostelsModal, setManageHostelsModal] = useState(false);
  const [roomManagementModal, setRoomManagementModal] = useState(false);

  const [editingKey, setEditingKey] = useState(null);
  const [hostelName, setHostelName] = useState("");
  const [hostelCode, setHostelCode] = useState("");
  const [numRooms, setNumRooms] = useState(1);
  const [roomType, setRoomType] = useState("2S AC");
  const [activeFlag, setActiveFlag] = useState(true);
  const [caretakerEmail, setCaretakerEmail] = useState("");
  const [wardenEmail, setWardenEmail] = useState("");

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

  // ============================================
  // BACKEND API INTEGRATION
  // ============================================
  const [loading, setLoading] = useState(false);
  const [backendHostels, setBackendHostels] = useState([]);

  const API_BASE = `${BACKEND_URL}/api/hostels`;
  
  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || sessionStorage.getItem("token")}`,
  });

  // Fetch hostels from backend
  const fetchHostelsFromBackend = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/all`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      
      if (data.success) {
        setBackendHostels(data.hostels || []);
        
        // Also update localStorage for backward compatibility
        const hostelObj = {};
        data.hostels.forEach(h => {
          hostelObj[h.name] = {
            _id: h._id,
            name: h.name,
            code: h.code,
            active: h.active,
            caretakerEmail: h.caretakerEmail,
            wardenEmail: h.wardenEmail,
            rooms: h.rooms || []
          };
        });
        localStorage.setItem("hostelData", JSON.stringify(hostelObj));
        if (typeof setHostelData === 'function') {
          setHostelData(hostelObj);
        }
        window.dispatchEvent(new Event("hostelDataUpdated"));
      }
    } catch (error) {
      console.error("Fetch hostels error:", error);
      showToast("Error loading hostels from server", "error");
    } finally {
      setLoading(false);
    }
  };

  // Load hostels on mount
  useEffect(() => {
    if (canManageHostels) {
      fetchHostelsFromBackend();
    }
  }, [canManageHostels]);

  // SAVE HOSTEL (API VERSION)
  const handleAddOrEditHostel = async () => {
    const name = hostelName.trim();
    const code = hostelCode || name.substring(0, 3).toUpperCase();
    
    if (!name) return showToast("Enter hostel name", "warning");
    if (!isValidEmail(caretakerEmail)) return showToast("Invalid caretaker email", "warning");
    if (!isValidEmail(wardenEmail)) return showToast("Invalid warden email", "warning");

    const count = Math.max(1, Math.min(50, Number(numRooms)));
    
    const rooms = Array.from({ length: count }, (_, i) => ({
      roomNo: `Guest Room ${i + 1}`,
      roomType,
    }));

    const payload = {
      name,
      code,
      caretakerEmail,
      wardenEmail,
      active: activeFlag,
      rooms,
    };

    try {
      setLoading(true);
      
      const existingHostel = backendHostels.find(h => h._id === editingKey);
      const url = existingHostel ? `${API_BASE}/${editingKey}` : API_BASE;
      const method = existingHostel ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        showToast(`Hostel "${name}" ${existingHostel ? "updated" : "created"} successfully`, "success");
        setAddHostelModal(false);
        await fetchHostelsFromBackend(); // Refresh list
      } else {
        showToast(data.message || "Failed to save hostel", "error");
      }
    } catch (error) {
      console.error("Save hostel error:", error);
      showToast("Error saving hostel to server", "error");
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email) =>
    !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // OPEN MODALS
  const openAddHostelModal = () => {
    setEditingKey(null);
    setHostelName("");
    setHostelCode("");
    setNumRooms(1);
    setRoomType("2S AC");
    setActiveFlag(true);
    setCaretakerEmail("");
    setWardenEmail("");
    setAddHostelModal(true);
  };

  const openEditHostelModal = (hostelId) => {
    const existing = backendHostels.find(h => h._id === hostelId);
    if (!existing) return;
    
    setEditingKey(existing._id);
    setHostelName(existing.name);
    setHostelCode(existing.code || "");
    setNumRooms(existing.rooms?.length || 1);
    setRoomType(existing.rooms?.[0]?.roomType || "2S AC");
    setActiveFlag(existing.active !== false);
    setCaretakerEmail(existing.caretakerEmail || "");
    setWardenEmail(existing.wardenEmail || "");
    setAddHostelModal(true);
  };

  // DELETE HOSTEL
  const handleDeleteHostel = async (hostelId, hostelName) => {
    if (!window.confirm(`Delete hostel "${hostelName}"? This cannot be undone.`)) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/${hostelId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        showToast("Hostel deleted successfully", "success");
        await fetchHostelsFromBackend();
      } else {
        showToast(data.message || "Failed to delete hostel", "error");
      }
    } catch (error) {
      console.error("Delete hostel error:", error);
      showToast("Error deleting hostel", "error");
    } finally {
      setLoading(false);
    }
  };

  // ACTIVATE / DEACTIVATE HOSTEL
  const handleToggleActive = async (hostel) => {
    try {
      setLoading(true);
      
      console.log("🔄 Toggling hostel active status:", hostel.name, "Current:", hostel.active);
      
      const response = await fetch(`${API_BASE}/${hostel._id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: hostel.name,
          code: hostel.code,
          caretakerEmail: hostel.caretakerEmail,
          wardenEmail: hostel.wardenEmail,
          rooms: hostel.rooms,
          active: !hostel.active,  // Toggle the status
        }),
      });

      console.log("📡 Response status:", response.status);

      const data = await response.json();
      console.log("📦 Response data:", data);

      if (data.success) {
        showToast(`Hostel ${data.hostel.active ? "activated" : "deactivated"}`, "info");
        await fetchHostelsFromBackend();
      } else {
        showToast(data.message || "Failed to update hostel status", "error");
      }
    } catch (error) {
      console.error("Toggle active error:", error);
      showToast("Error updating hostel", "error");
    } finally {
      setLoading(false);
    }
  };

  // ROOMS
  const openRoomManagementModal = (key) => {
    setSelectedHostelForRooms(key);
    setEditingRoomIndex(null);
    setEditRoomData({
      roomNo: "",
      roomType: "",
      caretakerEmail: "",
      wardenEmail: "",
    });
    setRoomManagementModal(true);
  };

  const openEditRoomModal = (hostel, index) => {
    const room = hostel.rooms[index];
    setSelectedHostelForRooms(hostel);
    setEditingRoomIndex(index);
    setEditRoomData({
      roomNo: room.roomNo,
      roomType: room.roomType,
      caretakerEmail: room.caretakerEmail || "",
      wardenEmail: room.wardenEmail || "",
    });
    setRoomManagementModal(true);
  };

  const handleSaveRoom = async () => {
    if (!editRoomData.roomNo.trim())
      return showToast("Room number is required", "warning");

    if (!isValidEmail(editRoomData.caretakerEmail))
      return showToast("Invalid caretaker email", "warning");

    if (!isValidEmail(editRoomData.wardenEmail))
      return showToast("Invalid warden email", "warning");

    const updatedRooms = [...selectedHostelForRooms.rooms];

    if (editingRoomIndex !== null && editingRoomIndex !== "new") {
      updatedRooms[editingRoomIndex] = {
        ...updatedRooms[editingRoomIndex],
        ...editRoomData,
      };
    } else {
      updatedRooms.push(editRoomData);
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/${selectedHostelForRooms._id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...selectedHostelForRooms,
          rooms: updatedRooms,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast(
          editingRoomIndex === "new" ? "Room added" : "Room updated",
          "success"
        );
        setRoomManagementModal(false);
        await fetchHostelsFromBackend();
      } else {
        showToast("Failed to save room", "error");
      }
    } catch (error) {
      console.error("Save room error:", error);
      showToast("Error saving room", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (hostel, index) => {
    if (!window.confirm("Delete this room?")) return;

    const updatedRooms = hostel.rooms.filter((_, i) => i !== index);

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/${hostel._id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...hostel,
          rooms: updatedRooms,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast("Room deleted", "success");
        await fetchHostelsFromBackend();
        setRoomManagementModal(false);
      } else {
        showToast("Failed to delete room", "error");
      }
    } catch (error) {
      console.error("Delete room error:", error);
      showToast("Error deleting room", "error");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------
  // UI STARTS
  // --------------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`min-h-screen p-6 md:p-10 ml-64 ${
        theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-black"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-4xl font-extrabold ${theme === "dark" ? "text-red-400" : "text-red-700"} flex items-center gap-3`}>
            <Settings className="w-10 h-10" /> Settings
          </h1>

          <button
            onClick={() => setActiveTab("Home")}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow"
          >
            <ArrowLeft size={18} /> Back to Home
          </button>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ===================== THEME ===================== */}
          <motion.div
            whileHover={{ y: -4 }}
            className={`p-6 rounded-2xl shadow-md border ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-full">
                  <Sun className="text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-red-700">Theme</h2>
                  <p className="text-sm text-gray-500">Light / Dark</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setTheme("light")}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    theme === "light"
                      ? "bg-red-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  Light
                </button>

                <button
                  onClick={() => setTheme("dark")}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    theme === "dark"
                      ? "bg-red-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>
          </motion.div>

          {/* ===================== NOTIFICATIONS ===================== */}
          <motion.div
            whileHover={{ y: -4 }}
            className={`p-6 rounded-2xl shadow-md border ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
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
                    Enable alerts for bookings & cancellations.
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

          {/* ===================== ROLE MANAGEMENT (COMING SOON) ===================== */}
          {canManageRoles && (
            <motion.div
              whileHover={{ y: -4 }}
              className={`p-6 rounded-2xl shadow-md border ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 rounded-full mt-1">
                  <Users className="text-red-600" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-red-700">
                    Role Management (Coming Soon)
                  </h2>
                  <p className="text-sm text-gray-500 mb-3">
                    Configure Admin, Manager & Caretaker permissions.
                  </p>

                  <button
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg cursor-not-allowed"
                    onClick={() =>
                      showToast(
                        "Role management will be available after backend integration.",
                        "info"
                      )
                    }
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================== CLEAR CACHE & CLEAR LAST APPROVED ===================== */}
          {canClearCache && (
            <motion.div
              whileHover={{ y: -4 }}
              className={`p-6 rounded-2xl shadow-md border ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
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
                    Clear local cached data & auto-fill records.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={handleClearStorage}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Clear Cache
                    </button>

                    {canClearLastApproved && (
                      <button
                        onClick={handleClearLastApproved}
                        className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                      >
                        Clear Last Approved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================== MANAGE HOSTELS (ADMIN ONLY) ===================== */}
          {canManageHostels && (
            <motion.div
              whileHover={{ y: -4 }}
              className={`p-6 rounded-2xl shadow-md border ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 rounded-full mt-1">
                  <PlusCircle className="text-red-600" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-red-700">
                    Manage Hostels
                  </h2>
                  <p className="text-sm text-gray-500 mb-3">
                    Add, edit, delete hostels and rooms.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={openAddHostelModal}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 inline-flex gap-2 items-center"
                    >
                      <PlusCircle size={16} /> Add Hostel
                    </button>

                    <button
                      onClick={() => setManageHostelsModal(true)}
                      className="bg-white border border-red-300 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 inline-flex gap-2 items-center"
                    >
                      <Edit3 size={16} /> Manage Hostels
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* FOOTER */}
        <p className="mt-10 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Thapar Guest Room Portal
        </p>
      </div>

      {/* ------------------------------------------------------------------------------------------------ */}
      {/* ADD / EDIT HOSTEL MODAL */}
      {/* ------------------------------------------------------------------------------------------------ */}

      <AnimatePresence>
        {addHostelModal && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-[520px] shadow-xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-red-700">
                  {editingKey ? "Edit Hostel" : "Add Hostel"}
                </h3>
                <button
                  onClick={() => setAddHostelModal(false)}
                  className="text-gray-500 hover:text-red-700"
                >
                  <X size={20} />
                </button>
              </div>

              {/* FORM */}
              <label className="block text-sm font-medium mb-1">
                Hostel Name
              </label>
              <input
                type="text"
                value={hostelName}
                onChange={(e) => setHostelName(e.target.value)}
                className="border rounded p-2 w-full mb-3"
                placeholder="e.g. Agira Hall (A)"
              />

              {/* ADD THIS NEW FIELD */}
              <label className="block text-sm font-medium mb-1">
                Hostel Code
              </label>
              <input
                type="text"
                value={hostelCode}
                onChange={(e) => setHostelCode(e.target.value)}
                className="border rounded p-2 w-full mb-3"
                placeholder="e.g. AGI (auto-generated if empty)"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Number of Rooms
                  </label>
                  <input
                    type="number"
                    value={numRooms}
                    min="1"
                    max="50"
                    onChange={(e) => setNumRooms(Number(e.target.value))}
                    className="border rounded p-2 w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Room Type
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="border rounded p-2 w-full"
                  >
                    {roomTypeOptions.map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* EMAIL FIELDS */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Caretaker Email
                  </label>
                  <input
                    type="email"
                    value={caretakerEmail}
                    onChange={(e) => setCaretakerEmail(e.target.value)}
                    className="border rounded p-2 w-full"
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
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-5">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeFlag}
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

                <span className="text-sm text-gray-600">
                  {activeFlag ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setAddHostelModal(false)}
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

      {/* ------------------------------------------------------------------------------------------------ */}
      {/* MANAGE HOSTELS MODAL */}
      {/* ------------------------------------------------------------------------------------------------ */}

      <AnimatePresence>
        {manageHostelsModal && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-[750px] shadow-xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-red-700">
                  Manage Hostels
                </h3>
                <button
                  onClick={() => setManageHostelsModal(false)}
                  className="text-gray-500 hover:text-red-700"
                >
                  <X />
                </button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading hostels...</p>
                  </div>
                ) : backendHostels.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No hostels found</p>
                  </div>
                ) : (
                  backendHostels
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((h) => (
                      <div
                        key={h._id}
                        className="p-4 border rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <h4 className="font-semibold">{h.name}</h4>
                          <div className="text-xs text-gray-500">
                            {h.rooms?.length} rooms •{" "}
                            {h.active ? "Active" : "Inactive"}
                          </div>
                          {h.caretakerEmail && (
                            <p className="text-xs">Caretaker: {h.caretakerEmail}</p>
                          )}
                          {h.wardenEmail && (
                            <p className="text-xs">Warden: {h.wardenEmail}</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            className="px-3 py-1 bg-blue-50 border rounded hover:bg-blue-100 text-blue-700"
                            onClick={() => {
                              openRoomManagementModal(h);
                              setManageHostelsModal(false);
                            }}
                          >
                            <Users size={16} /> Rooms
                          </button>

                          <button
                            className="px-3 py-1 bg-white border rounded hover:bg-red-50 text-red-700"
                            onClick={() => {
                              openEditHostelModal(h._id);
                              setManageHostelsModal(false);
                            }}
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            className="px-3 py-1 bg-white border rounded hover:bg-red-50 text-red-700"
                            onClick={() => handleDeleteHostel(h._id, h.name)}
                          >
                            <Trash2 size={16} />
                          </button>

                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={h.active}
                              onChange={() => handleToggleActive(h)}
                              className="hidden"
                            />
                            <span
                              className={`w-12 h-7 flex items-center rounded-full p-1 transition ${
                                h.active ? "bg-green-500" : "bg-gray-400"
                              }`}
                            >
                              <span
                                className={`bg-white w-5 h-5 rounded-full shadow transform transition ${
                                  h.active ? "translate-x-5" : ""
                                }`}
                              />
                            </span>
                          </label>
                        </div>
                      </div>
                    ))
                )}
              </div>

              <div className="flex justify-end mt-5">
                <button
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  onClick={() => setManageHostelsModal(false)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------------------------------------ */}
      {/* ROOM MANAGEMENT MODAL */}
      {/* ------------------------------------------------------------------------------------------------ */}

      <AnimatePresence>
        {roomManagementModal && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-[800px] shadow-xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-red-700">
                  {editingRoomIndex !== null ? "Edit Room" : "Manage Rooms"} –{" "}
                  {selectedHostelForRooms}
                </h3>
                <button
                  onClick={() => {
                    setRoomManagementModal(false);
                    setEditingRoomIndex(null);
                  }}
                  className="text-gray-500 hover:text-red-700"
                >
                  <X />
                </button>
              </div>

              {/* ROOM LIST */}
              {editingRoomIndex === null ? (
                <>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-4">
                    {hostelData[selectedHostelForRooms].rooms.map(
                      (room, idx) => (
                        <div
                          key={idx}
                          className="p-4 border rounded-lg bg-gray-50"
                        >
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-semibold">{room.roomNo}</h4>
                              <p className="text-xs text-gray-500">
                                Type: {room.roomType}
                              </p>
                              {room.caretakerEmail && (
                                <p className="text-xs">
                                  Caretaker: {room.caretakerEmail}
                                </p>
                              )}
                              {room.wardenEmail && (
                                <p className="text-xs">
                                  Warden: {room.wardenEmail}
                                </p>
                              )}
                              <p className="text-xs">
                                {room.bookings?.length} booking(s)
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  openEditRoomModal(
                                    selectedHostelForRooms,
                                    idx
                                  )
                                }
                                className="px-3 py-1 border bg-blue-50 hover:bg-blue-100 rounded text-blue-700"
                              >
                                <Edit3 size={14} />
                              </button>

                              <button
                                onClick={() =>
                                  handleDeleteRoom(
                                    selectedHostelForRooms,
                                    idx
                                  )
                                }
                                className="px-3 py-1 border bg-red-50 hover:bg-red-100 rounded text-red-700"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="flex justify-between">
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
                      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                      onClick={() => {
                        setRoomManagementModal(false);
                        setSelectedHostelForRooms(null);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* EDIT ROOM FORM */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-sm font-medium block mb-1">
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
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-1">
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
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2">
                        Contact Information (Optional)
                      </h4>

                      <label className="text-sm block mb-1">
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
                      />

                      <label className="text-sm block mt-3 mb-1">
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
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                      onClick={() => setEditingRoomIndex(null)}
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

      {/* ------------------------------------------------------------------------------------------------ */}
      {/* TOAST */}
      {/* ------------------------------------------------------------------------------------------------ */}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 px-5 py-3 rounded-lg shadow-lg text-white flex gap-2 items-center ${
              toast.type === "success"
                ? "bg-green-600"
                : toast.type === "info"
                ? "bg-blue-600"
                : "bg-red-600"
            }`}
          >
            {toast.message}
            <button onClick={() => setToast(null)}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
