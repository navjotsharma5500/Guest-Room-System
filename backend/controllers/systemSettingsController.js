import { createAuditEvent } from "../middleware/logMiddleware.js";
import { getSystemSettings, updateSystemSettings } from "../utils/systemSettings.js";

export const getSettings = async (_req, res) => {
  try {
    const settings = await getSystemSettings({ fresh: true });
    res.json({ success: true, settings });
  } catch (error) {
    console.error("❌ Failed to load system settings:", error);
    res.status(500).json({ success: false, message: "Failed to load system settings" });
  }
};

export const getPublicSettings = async (_req, res) => {
  try {
    const settings = await getSystemSettings({ fresh: true });
    res.json({
      success: true,
      settings: {
        bookingDays: settings.bookingDays,
        extensionRules: settings.extensionRules,
        operations: settings.operations || {
          enableBroadcastCenter: true,
          enableCleaningWorkflow: true,
          enableGuestSupportPortal: true,
          enableGuestFlagging: true,
        },
        flagRules: settings.flagRules || {
          yellowThreshold: 3,
          orangeThreshold: 2,
          redThreshold: 1,
        },
        cleaning: settings.cleaning || {
          enableCleaningChecklist: true,
          enableCleaningRequests: false,
        },
        support: settings.support || {
          enableMedicalRequests: true,
          enableMaintenanceRequests: true,
          enableSosAlerts: true,
        },
        dashboardRegistry: settings.dashboardRegistry || [],
      },
    });
  } catch (error) {
    console.error("❌ Failed to load public system settings:", error);
    res.status(500).json({ success: false, message: "Failed to load system settings" });
  }
};

export const updateSettings = async (req, res) => {
  try {
    // Cross-section validation must occur after partial updates are merged
    // with persisted settings — updateSystemSettings() merges req.body with
    // the current DB document and validates the merged result internally.
    const settings = await updateSystemSettings(req.body || {}, req.user?._id || null);
    void createAuditEvent(req, { module: "SYSTEM_SETTINGS", action: "SYSTEM_SETTINGS_UPDATED", functionName: "updateSettings" });
    res.json({ success: true, settings });
  } catch (error) {
    console.error("❌ Failed to update system settings:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to update system settings" });
  }
};

export const getDashboards = async (_req, res) => {
  try {
    const settings = await getSystemSettings({ fresh: true });
    res.json({ success: true, dashboards: settings.dashboardRegistry || [] });
  } catch (error) {
    console.error("❌ Failed to load dashboard registry:", error);
    res.status(500).json({ success: false, message: "Failed to load dashboard registry" });
  }
};

export const updateDashboards = async (req, res) => {
  try {
    const settings = await updateSystemSettings(
      { dashboardRegistry: req.body?.dashboardRegistry || [] },
      req.user?._id || null
    );
    void createAuditEvent(req, { module: "SYSTEM_SETTINGS", action: "DASHBOARD_REGISTRY_UPDATED", functionName: "updateDashboards" });
    res.json({ success: true, dashboards: settings.dashboardRegistry || [] });
  } catch (error) {
    console.error("❌ Failed to update dashboard registry:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to update dashboard registry" });
  }
};
