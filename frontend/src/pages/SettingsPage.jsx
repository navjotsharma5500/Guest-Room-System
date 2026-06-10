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
  Building2,
  ClipboardCheck,
  QrCode,
} from "lucide-react";
import { hasPermission } from "../utils/checkPermission";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL } from "../utils/apiConfig";
import useVenueConfig from "../hooks/useVenueConfig";
import SystemControlsPage from "./SystemControlsPage";
import CleaningChecklistManagement from "../components/Cleaning/CleaningChecklistManagement";
import SupportQRCodeManager from "../components/Support/SupportQRCodeManager";

export default function SettingsPage({
  theme,
  setTheme,
  notificationsEnabled,
  setNotificationsEnabled,
  screenSaverEnabled = true,
  setScreenSaverEnabled = () => {},
  setActiveTab,
  hostelData = {},
  setHostelData = () => {},
}) {
  const [toast, setToast] = useState(null);
  const [manageVenuesModal, setManageVenuesModal] = useState(false);
  const [systemControlsOpen, setSystemControlsOpen] = useState(false);
  const [cleaningChecklistOpen, setCleaningChecklistOpen] = useState(false);
  const [supportQrOpen, setSupportQrOpen] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [sectionDrafts, setSectionDrafts] = useState({});
  const [roomDrafts, setRoomDrafts] = useState({});
  const [venueActionKey, setVenueActionKey] = useState("");

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
  const canManageVenues = String(role || "").toLowerCase() === "admin";
  const {
    venueConfig,
    loading: venueConfigLoading,
    addTab,
    addSection,
    addRoom,
    toggleItem,
  } = useVenueConfig();

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

  const isVenueActionLoading = (key) => loading || venueActionKey === key;

  const handleAddVenueTab = async () => {
    const label = newTabName.trim();
    if (!label) {
      showToast("Enter tab name", "warning");
      return;
    }

    try {
      setVenueActionKey("add-tab");
      await addTab(label);
      setNewTabName("");
      showToast("Venue tab created", "success");
    } catch (error) {
      showToast(error.message || "Failed to create tab", "error");
    } finally {
      setVenueActionKey("");
    }
  };

  const handleAddVenueSection = async (mainTabId) => {
    const label = String(sectionDrafts[mainTabId] || "").trim();
    if (!label) {
      showToast("Enter section name", "warning");
      return;
    }

    try {
      setVenueActionKey(`section-${mainTabId}`);
      await addSection(mainTabId, label);
      setSectionDrafts((prev) => ({ ...prev, [mainTabId]: "" }));
      showToast("Venue section created", "success");
    } catch (error) {
      showToast(error.message || "Failed to create section", "error");
    } finally {
      setVenueActionKey("");
    }
  };

  const handleAddVenueRoom = async (sectionId) => {
    const name = String(roomDrafts[sectionId] || "").trim();
    if (!name) {
      showToast("Enter room name", "warning");
      return;
    }

    try {
      setVenueActionKey(`room-${sectionId}`);
      await addRoom(sectionId, name);
      setRoomDrafts((prev) => ({ ...prev, [sectionId]: "" }));
      showToast("Venue room created", "success");
    } catch (error) {
      showToast(error.message || "Failed to create room", "error");
    } finally {
      setVenueActionKey("");
    }
  };

  const handleToggleVenueItem = async (payload, actionKey) => {
    try {
      setVenueActionKey(actionKey);
      await toggleItem(payload);
      showToast("Venue updated", "success");
    } catch (error) {
      showToast(error.message || "Failed to update venue", "error");
    } finally {
      setVenueActionKey("");
    }
  };

  // --------------------------------------------------------------------
  // UI STARTS
  // --------------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`min-h-screen p-4 sm:p-6 md:p-10 ${
        theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-black"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3 sm:gap-0">
          <h1 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold ${theme === "dark" ? "text-red-400" : "text-red-700"} flex items-center gap-2 sm:gap-3`}>
            <Settings className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10" /> Settings
          </h1>

          <button
            onClick={() => setActiveTab("Home")}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg shadow whitespace-nowrap"
          >
            <ArrowLeft size={16} className="sm:w-5 sm:h-5" /> Back to Home
          </button>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {String(role || "").toLowerCase() === "admin" && (
            <motion.div
              whileHover={{ y: -4 }}
              className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md border ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-red-50 p-2">
                    <Settings className="text-red-600 w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-red-700">System Controls</h2>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Booking days, extension rules, email routing, users, and dashboard access
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSystemControlsOpen(true)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Open
                </button>
              </div>
            </motion.div>
          )}

          {/* ===================== THEME ===================== */}
          <motion.div
            whileHover={{ y: -4 }}
            className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md border ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-full flex-shrink-0">
                  <Sun className="text-red-600 w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-red-700">Theme</h2>
                  <p className="text-xs sm:text-sm text-gray-500">Light / Dark</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setTheme("light")}
                  className={`px-3 sm:px-4 py-2 text-sm rounded-lg font-medium ${
                    theme === "light"
                      ? "bg-red-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  Light
                </button>

                <button
                  onClick={() => setTheme("dark")}
                  className={`px-3 sm:px-4 py-2 text-sm rounded-lg font-medium ${
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

          {/* ===================== SCREEN SAVER ===================== */}
          <motion.div
            whileHover={{ y: -4 }}
            className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md border ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-full flex-shrink-0">
                  <Sun className="text-red-600 w-5 h-5" />
                </div>

                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-red-700">
                    Screen Saver
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Show animated screen saver when this user is idle.
                  </p>
                </div>
              </div>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={screenSaverEnabled}
                  onChange={(e) => {
                    setScreenSaverEnabled(e.target.checked);
                    showToast(
                      e.target.checked
                        ? "Screen saver enabled"
                        : "Screen saver disabled",
                      "info"
                    );
                  }}
                  className="hidden"
                />
                <span
                  className={`w-14 h-8 flex items-center rounded-full p-1 transition ${
                    screenSaverEnabled ? "bg-red-600" : "bg-gray-400"
                  }`}
                >
                  <span
                    className={`bg-white w-6 h-6 rounded-full shadow-md transform transition ${
                      screenSaverEnabled ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </span>
              </label>
            </div>
          </motion.div>

          {/* ===================== NOTIFICATIONS ===================== */}
          <motion.div
            whileHover={{ y: -4 }}
            className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md border ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-full flex-shrink-0">
                  <Bell className="text-red-600 w-5 h-5" />
                </div>

                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-red-700">
                    Notifications
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
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
              className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md border ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 rounded-full mt-1 flex-shrink-0">
                  <Users className="text-red-600 w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-red-700">
                    Role Management (Coming Soon)
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mb-3">
                    Configure Admin, Manager & Caretaker permissions.
                  </p>

                  <button
                    className="bg-gray-300 text-gray-700 px-3 sm:px-4 py-2 text-sm rounded-lg cursor-not-allowed"
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
              className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md border ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 rounded-full mt-1 flex-shrink-0">
                  <Database className="text-red-600 w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-red-700">
                    Cache & Data
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mb-4">
                    Clear local cached data & auto-fill records.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={handleClearStorage}
                      className="px-3 sm:px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 whitespace-nowrap"
                    >
                      Clear Cache
                    </button>

                    {canClearLastApproved && (
                      <button
                        onClick={handleClearLastApproved}
                        className="px-3 sm:px-4 py-2 text-sm bg-gray-200 rounded-lg hover:bg-gray-300 whitespace-nowrap"
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
              className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md border ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 rounded-full mt-1 flex-shrink-0">
                  <PlusCircle className="text-red-600 w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-red-700">
                    Manage Hostels
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mb-3">
                    Add, edit, delete hostels and rooms.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={openAddHostelModal}
                      className="bg-red-600 text-white px-3 sm:px-4 py-2 text-sm rounded-lg hover:bg-red-700 inline-flex gap-2 items-center justify-center sm:justify-start whitespace-nowrap"
                    >
                      <PlusCircle size={16} /> Add Hostel
                    </button>

                    <button
                      onClick={() => setManageHostelsModal(true)}
                      className="bg-white border border-red-300 text-red-700 px-3 sm:px-4 py-2 text-sm rounded-lg hover:bg-red-50 inline-flex gap-2 items-center justify-center sm:justify-start whitespace-nowrap"
                    >
                      <Edit3 size={16} /> Manage Hostels
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {canManageVenues && (
            <motion.div
              whileHover={{ y: -4 }}
              className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md border ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 rounded-full mt-1 flex-shrink-0">
                  <Building2 className="text-red-600 w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-red-700">
                    Manage Venues
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mb-3">
                    Configure venue tabs, sections, rooms and availability.
                  </p>

                  <button
                    onClick={() => setManageVenuesModal(true)}
                    className="bg-white border border-red-300 text-red-700 px-3 sm:px-4 py-2 text-sm rounded-lg hover:bg-red-50 inline-flex gap-2 items-center justify-center sm:justify-start whitespace-nowrap"
                  >
                    <Edit3 size={16} /> Manage Venues
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            whileHover={{ y: -4 }}
            className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md border ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 rounded-full mt-1 flex-shrink-0">
                <ClipboardCheck className="text-red-600 w-5 h-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-red-700">
                  Cleaning Checklist Management
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mb-3">
                  Manage universal and hostel-specific room cleaning checklist items.
                </p>

                <button
                  onClick={() => setCleaningChecklistOpen(true)}
                  className="bg-white border border-red-300 text-red-700 px-3 sm:px-4 py-2 text-sm rounded-lg hover:bg-red-50 inline-flex gap-2 items-center justify-center sm:justify-start whitespace-nowrap"
                >
                  <ClipboardCheck size={16} /> Manage Checklist
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md border ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 rounded-full mt-1 flex-shrink-0">
                <QrCode className="text-red-600 w-5 h-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-red-700">
                  Guest Support QR Codes
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mb-3">
                  Generate downloadable and printable QR/barcode support links for rooms.
                </p>

                <button
                  onClick={() => setSupportQrOpen(true)}
                  className="bg-white border border-red-300 text-red-700 px-3 sm:px-4 py-2 text-sm rounded-lg hover:bg-red-50 inline-flex gap-2 items-center justify-center sm:justify-start whitespace-nowrap"
                >
                  <QrCode size={16} /> Manage QR Codes
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* FOOTER */}
        <p className="mt-8 sm:mt-10 text-center text-gray-500 text-xs sm:text-sm">
          © {new Date().getFullYear()} Thapar Guest Room Portal
        </p>
      </div>

      {/* ------------------------------------------------------------------------------------------------ */}
      {/* ADD / EDIT HOSTEL MODAL */}
      {/* ------------------------------------------------------------------------------------------------ */}

      <AnimatePresence>
        {cleaningChecklistOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <div className="flex justify-between items-center px-6 py-4 border-b">
                <div>
                  <h2 className="text-xl font-bold text-red-700">
                    Cleaning Checklist Management
                  </h2>
                  <p className="text-sm text-gray-500">
                    Universal defaults plus caretaker-managed hostel items.
                  </p>
                </div>
                <button
                  onClick={() => setCleaningChecklistOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <X />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-90px)]">
                <CleaningChecklistManagement showToast={showToast} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {supportQrOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <div className="flex justify-between items-center px-6 py-4 border-b">
                <div>
                  <h2 className="text-xl font-bold text-red-700">Guest Support QR Codes</h2>
                  <p className="text-sm text-gray-500">Download or print room support QR codes.</p>
                </div>
                <button
                  onClick={() => setSupportQrOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <X />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-90px)]">
                <SupportQRCodeManager showToast={showToast} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {addHostelModal && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-4 sm:p-6 w-[95%] max-w-[520px] shadow-xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg sm:text-xl font-semibold text-red-700">
                  {editingKey ? "Edit Hostel" : "Add Hostel"}
                </h3>
                <button
                  onClick={() => setAddHostelModal(false)}
                  className="text-gray-500 hover:text-red-700 flex-shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              {/* FORM */}
              <label className="block text-xs sm:text-sm font-medium mb-1">
                Hostel Name
              </label>
              <input
                type="text"
                value={hostelName}
                onChange={(e) => setHostelName(e.target.value)}
                className="border rounded p-2 text-sm w-full mb-3"
                placeholder="e.g. Agira Hall (A)"
              />

              {/* ADD THIS NEW FIELD */}
              <label className="block text-xs sm:text-sm font-medium mb-1">
                Hostel Code
              </label>
              <input
                type="text"
                value={hostelCode}
                onChange={(e) => setHostelCode(e.target.value)}
                className="border rounded p-2 text-sm w-full mb-3"
                placeholder="e.g. AGI (auto-generated if empty)"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">
                    Number of Rooms
                  </label>
                  <input
                    type="number"
                    value={numRooms}
                    min="1"
                    max="50"
                    onChange={(e) => setNumRooms(Number(e.target.value))}
                    className="border rounded p-2 text-sm w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">
                    Room Type
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="border rounded p-2 text-sm w-full"
                  >
                    {roomTypeOptions.map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* EMAIL FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-3 sm:mt-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">
                    Caretaker Email
                  </label>
                  <input
                    type="email"
                    value={caretakerEmail}
                    onChange={(e) => setCaretakerEmail(e.target.value)}
                    className="border rounded p-2 text-sm w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">
                    Warden Email
                  </label>
                  <input
                    type="email"
                    value={wardenEmail}
                    onChange={(e) => setWardenEmail(e.target.value)}
                    className="border rounded p-2 text-sm w-full"
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

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-5 sm:mt-6">
                <button
                  onClick={() => setAddHostelModal(false)}
                  className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>

                <button
                  onClick={handleAddOrEditHostel}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
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
              className="bg-white rounded-2xl p-4 sm:p-6 w-[95%] max-w-[750px] shadow-xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg sm:text-xl font-semibold text-red-700 truncate">
                  Manage Hostels
                </h3>
                <button
                  onClick={() => setManageHostelsModal(false)}
                  className="text-gray-500 hover:text-red-700 flex-shrink-0"
                >
                  <X />
                </button>
              </div>

              <div className="space-y-2 sm:space-y-3 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                    <p className="mt-4 text-sm text-gray-500">Loading hostels...</p>
                  </div>
                ) : backendHostels.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No hostels found</p>
                  </div>
                ) : (
                  backendHostels
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((h) => (
                      <div
                        key={h._id}
                        className="p-3 sm:p-4 border rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4"
                      >
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm sm:text-base truncate">{h.name}</h4>
                          <div className="text-xs text-gray-500">
                            {h.rooms?.length} rooms •{" "}
                            {h.active ? "Active" : "Inactive"}
                          </div>
                          {h.caretakerEmail && (
                            <p className="text-xs truncate">Caretaker: {h.caretakerEmail}</p>
                          )}
                          {h.wardenEmail && (
                            <p className="text-xs truncate">Warden: {h.wardenEmail}</p>
                          )}
                        </div>

                        <div className="flex gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
                          <button
                            className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-50 border rounded hover:bg-blue-100 text-blue-700 whitespace-nowrap"
                            onClick={() => {
                              openRoomManagementModal(h);
                              setManageHostelsModal(false);
                            }}
                          >
                            <Users size={14} className="sm:w-4 sm:h-4" /> Rooms
                          </button>

                          <button
                            className="px-2 sm:px-3 py-1 bg-white border rounded hover:bg-red-50 text-red-700"
                            onClick={() => {
                              openEditHostelModal(h._id);
                              setManageHostelsModal(false);
                            }}
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            className="px-2 sm:px-3 py-1 bg-white border rounded hover:bg-red-50 text-red-700"
                            onClick={() => handleDeleteHostel(h._id, h.name)}
                          >
                            <Trash2 size={14} />
                          </button>

                          <label className="flex items-center cursor-pointer flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={h.active}
                              onChange={() => handleToggleActive(h)}
                              className="hidden"
                            />
                            <span
                              className={`w-10 sm:w-12 h-6 sm:h-7 flex items-center rounded-full p-1 transition ${
                                h.active ? "bg-green-500" : "bg-gray-400"
                              }`}
                            >
                              <span
                                className={`bg-white w-4 sm:w-5 h-4 sm:h-5 rounded-full shadow transform transition ${
                                  h.active ? "translate-x-4 sm:translate-x-5" : ""
                                }`}
                              />
                            </span>
                          </label>
                        </div>
                      </div>
                    ))
                )}
              </div>

              <div className="flex justify-end mt-4 sm:mt-5">
                <button
                  className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                  onClick={() => setManageHostelsModal(false)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {systemControlsOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="max-h-[95vh] w-full max-w-7xl overflow-y-auto"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              <SystemControlsPage theme={theme} onClose={() => setSystemControlsOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {manageVenuesModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-3 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl shadow-xl border ${
                theme === "dark"
                  ? "bg-gray-900 border-gray-700 text-gray-100"
                  : "bg-white border-gray-200 text-gray-900"
              }`}
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
            >
              <div className={`flex items-center justify-between px-4 sm:px-6 py-4 border-b ${
                theme === "dark" ? "border-gray-700" : "border-gray-200"
              }`}>
                <div>
                  <h3 className="text-lg sm:text-2xl font-semibold text-red-700">
                    Manage Venues
                  </h3>
                  <p className={`text-xs sm:text-sm mt-1 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>
                    Tabs, sections and rooms are managed here.
                  </p>
                </div>
                <button
                  onClick={() => setManageVenuesModal(false)}
                  className={`p-2 rounded-lg ${
                    theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-100"
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-88px)] space-y-4">
                <div className={`rounded-xl border p-4 ${
                  theme === "dark" ? "border-gray-700 bg-gray-800/60" : "border-gray-200 bg-gray-50"
                }`}>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={newTabName}
                      onChange={(e) => setNewTabName(e.target.value)}
                      placeholder="Enter Tab Name"
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                        theme === "dark"
                          ? "bg-gray-900 border-gray-700 text-gray-100"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                    <button
                      onClick={handleAddVenueTab}
                      disabled={isVenueActionLoading("add-tab")}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {isVenueActionLoading("add-tab") ? "Adding..." : "+ Add Tab"}
                    </button>
                  </div>
                </div>

                {venueConfigLoading && venueConfig.length === 0 ? (
                  <div className="text-center py-10 text-sm text-gray-500">Loading venues...</div>
                ) : venueConfig.length === 0 ? (
                  <div className="text-center py-10 text-sm text-gray-500">No venue tabs found.</div>
                ) : (
                  venueConfig.map((tab) => (
                    <div
                      key={tab.id}
                      className={`rounded-xl border ${
                        theme === "dark" ? "border-gray-700 bg-gray-800/60" : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className={`px-4 py-4 border-b ${
                        theme === "dark" ? "border-gray-700" : "border-gray-200"
                      }`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-base sm:text-lg font-semibold">{tab.label}</h4>
                            <p className={`text-xs sm:text-sm ${
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            }`}>
                              Main tab
                            </p>
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <span>{tab.enabled !== false ? "Enabled" : "Disabled"}</span>
                            <input
                              type="checkbox"
                              checked={tab.enabled !== false}
                              disabled={isVenueActionLoading(`toggle-tab-${tab.id}`)}
                              onChange={(e) =>
                                handleToggleVenueItem(
                                  { mainTabId: tab.id, enabled: e.target.checked },
                                  `toggle-tab-${tab.id}`
                                )
                              }
                            />
                          </label>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                          <input
                            type="text"
                            value={sectionDrafts[tab.id] || ""}
                            onChange={(e) =>
                              setSectionDrafts((prev) => ({ ...prev, [tab.id]: e.target.value }))
                            }
                            placeholder="Enter Section Name"
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                              theme === "dark"
                                ? "bg-gray-900 border-gray-700 text-gray-100"
                                : "bg-white border-gray-300 text-gray-900"
                            }`}
                          />
                          <button
                            onClick={() => handleAddVenueSection(tab.id)}
                            disabled={isVenueActionLoading(`section-${tab.id}`)}
                            className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                          >
                            {isVenueActionLoading(`section-${tab.id}`) ? "Adding..." : "+ Add Section"}
                          </button>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        {(tab.sections || []).length === 0 ? (
                          <div className={`text-sm ${
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>
                            No sections added yet.
                          </div>
                        ) : (
                          (tab.sections || []).map((section) => (
                            <div
                              key={section.id}
                              className={`rounded-lg border ${
                                theme === "dark" ? "border-gray-700 bg-gray-900/40" : "border-gray-200 bg-gray-50"
                              }`}
                            >
                              <div className={`px-4 py-3 border-b ${
                                theme === "dark" ? "border-gray-700" : "border-gray-200"
                              }`}>
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <h5 className="font-medium">{section.label}</h5>
                                    <p className={`text-xs ${
                                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                                    }`}>
                                      Section
                                    </p>
                                  </div>
                                  <label className="flex items-center gap-2 text-sm">
                                    <span>{section.enabled !== false ? "Enabled" : "Disabled"}</span>
                                    <input
                                      type="checkbox"
                                      checked={section.enabled !== false}
                                      disabled={isVenueActionLoading(`toggle-section-${section.id}`)}
                                      onChange={(e) =>
                                        handleToggleVenueItem(
                                          { sectionId: section.id, enabled: e.target.checked },
                                          `toggle-section-${section.id}`
                                        )
                                      }
                                    />
                                  </label>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                                  <input
                                    type="text"
                                    value={roomDrafts[section.id] || ""}
                                    onChange={(e) =>
                                      setRoomDrafts((prev) => ({ ...prev, [section.id]: e.target.value }))
                                    }
                                    placeholder="Enter Room Name"
                                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                                      theme === "dark"
                                        ? "bg-gray-900 border-gray-700 text-gray-100"
                                        : "bg-white border-gray-300 text-gray-900"
                                    }`}
                                  />
                                  <button
                                    onClick={() => handleAddVenueRoom(section.id)}
                                    disabled={isVenueActionLoading(`room-${section.id}`)}
                                    className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                                  >
                                    {isVenueActionLoading(`room-${section.id}`) ? "Adding..." : "+ Add Room"}
                                  </button>
                                </div>
                              </div>

                              <div className="p-4 space-y-2">
                                {(section.rooms || []).length === 0 ? (
                                  <div className={`text-sm ${
                                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                                  }`}>
                                    No rooms added yet.
                                  </div>
                                ) : (
                                  (section.rooms || []).map((room) => (
                                    <div
                                      key={room.id}
                                      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                                        theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
                                      }`}
                                    >
                                      <div>
                                        <div className="text-sm font-medium">{room.name}</div>
                                        <div className={`text-xs ${
                                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                                        }`}>
                                          Room
                                        </div>
                                      </div>
                                      <label className="flex items-center gap-2 text-sm">
                                        <span>{room.enabled !== false ? "Enabled" : "Disabled"}</span>
                                        <input
                                          type="checkbox"
                                          checked={room.enabled !== false}
                                          disabled={isVenueActionLoading(`toggle-room-${room.id}`)}
                                          onChange={(e) =>
                                            handleToggleVenueItem(
                                              { roomId: room.id, enabled: e.target.checked },
                                              `toggle-room-${room.id}`
                                            )
                                          }
                                        />
                                      </label>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
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
              className="bg-white rounded-2xl p-4 sm:p-6 w-[95%] max-w-[800px] shadow-xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="flex justify-between items-start gap-2 mb-4">
                <h3 className="text-lg sm:text-xl font-semibold text-red-700 flex-1 truncate">
                  {editingRoomIndex !== null ? "Edit Room" : "Manage Rooms"} –{" "}
                  <span className="truncate">{selectedHostelForRooms?.name || selectedHostelForRooms}</span>
                </h3>
                <button
                  onClick={() => {
                    setRoomManagementModal(false);
                    setEditingRoomIndex(null);
                  }}
                  className="text-gray-500 hover:text-red-700 flex-shrink-0"
                >
                  <X />
                </button>
              </div>

              {/* ROOM LIST */}
              {editingRoomIndex === null ? (
                <>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-4">
                    {selectedHostelForRooms?.rooms?.map(
                      (room, idx) => (
                        <div
                          key={idx}
                          className="p-3 sm:p-4 border rounded-lg bg-gray-50"
                        >
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm sm:text-base">{room.roomNo}</h4>
                              <p className="text-xs text-gray-500">
                                Type: {room.roomType}
                              </p>
                              {room.caretakerEmail && (
                                <p className="text-xs truncate">
                                  Caretaker: {room.caretakerEmail}
                                </p>
                              )}
                              {room.wardenEmail && (
                                <p className="text-xs truncate">
                                  Warden: {room.wardenEmail}
                                </p>
                              )}
                              <p className="text-xs">
                                {room.bookings?.length || 0} booking(s)
                              </p>
                            </div>

                            <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                              <button
                                onClick={() =>
                                  openEditRoomModal(
                                    selectedHostelForRooms,
                                    idx
                                  )
                                }
                                className="px-2 sm:px-3 py-1 border bg-blue-50 hover:bg-blue-100 rounded text-blue-700"
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
                                className="px-2 sm:px-3 py-1 border bg-red-50 hover:bg-red-100 rounded text-red-700"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 sm:gap-3">
                    <button
                      className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                      onClick={() => {
                        setRoomManagementModal(false);
                        setSelectedHostelForRooms(null);
                      }}
                    >
                      Close
                    </button>

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
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 inline-flex items-center justify-center sm:justify-start gap-2"
                    >
                      <PlusCircle size={16} /> Add Room
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* EDIT ROOM FORM */}
                  <div className="space-y-3 sm:space-y-4 mb-5 sm:mb-6">
                    <div>
                      <label className="text-xs sm:text-sm font-medium block mb-1">
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
                        className="border rounded p-2 text-sm w-full"
                      />
                    </div>

                    <div>
                      <label className="text-xs sm:text-sm font-medium block mb-1">
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
                        className="border rounded p-2 text-sm w-full"
                      >
                        <option value="">Select room type</option>
                        {roomTypeOptions.map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div className="border-t pt-3 sm:pt-4">
                      <h4 className="font-semibold text-sm mb-2">
                        Contact Information (Optional)
                      </h4>

                      <label className="text-xs sm:text-sm block mb-1">
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
                        className="border rounded p-2 text-sm w-full"
                      />

                      <label className="text-xs sm:text-sm block mt-2 sm:mt-3 mb-1">
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
                        className="border rounded p-2 text-sm w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                    <button
                      className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                      onClick={() => setEditingRoomIndex(null)}
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleSaveRoom}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
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
            className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 px-4 sm:px-5 py-2 sm:py-3 rounded-lg shadow-lg text-white flex gap-2 items-center text-sm ${
              toast.type === "success"
                ? "bg-green-600"
                : toast.type === "info"
                ? "bg-blue-600"
                : "bg-red-600"
            }`}
          >
            {toast.message}
            <button onClick={() => setToast(null)} className="flex-shrink-0">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
