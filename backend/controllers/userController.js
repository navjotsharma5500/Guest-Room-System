import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { createLog } from "../middleware/logMiddleware.js";
import { getFallbackDashboardAccess } from "../utils/dashboardAccess.js";

const normalizeUserPayload = (payload = {}, existingUser = null) => {
  const role = payload.role || existingUser?.role || "caretaker";
  const fallbackAccess = getFallbackDashboardAccess({
    ...existingUser?.toObject?.(),
    ...existingUser,
    ...payload,
    role,
  });

  const permissions = {
    guestRoom: Boolean(payload.permissions?.guestRoom ?? existingUser?.permissions?.guestRoom),
    venue: Boolean(payload.permissions?.venue ?? existingUser?.permissions?.venue),
    night: Boolean(payload.permissions?.night ?? existingUser?.permissions?.night),
  };

  return {
    name: payload.name ?? existingUser?.name,
    email: payload.email ? String(payload.email).trim().toLowerCase() : existingUser?.email,
    role,
    assignedHostel: payload.assignedHostel ?? existingUser?.assignedHostel ?? null,
    hostel: payload.hostel ?? existingUser?.hostel ?? null,
    rollNo: payload.rollNo ?? existingUser?.rollNo ?? null,
    societies: Array.isArray(payload.societies) ? payload.societies : existingUser?.societies ?? [],
    profilePicture: payload.profilePicture ?? existingUser?.profilePicture ?? null,
    isActive: payload.isActive ?? existingUser?.isActive ?? true,
    permissions,
    dashboardAccess: {
      dashboards:
        Array.isArray(payload.dashboardAccess?.dashboards) &&
        payload.dashboardAccess.dashboards.length > 0
          ? payload.dashboardAccess.dashboards
          : existingUser?.dashboardAccess?.dashboards?.length
          ? existingUser.dashboardAccess.dashboards
          : fallbackAccess.dashboards,
      defaultDashboard:
        payload.dashboardAccess?.defaultDashboard !== undefined
          ? payload.dashboardAccess.defaultDashboard
          : existingUser?.dashboardAccess?.defaultDashboard ?? fallbackAccess.defaultDashboard,
      skipSelectorWhenSingle:
        payload.dashboardAccess?.skipSelectorWhenSingle !== undefined
          ? Boolean(payload.dashboardAccess.skipSelectorWhenSingle)
          : existingUser?.dashboardAccess?.skipSelectorWhenSingle ?? true,
    },
  };
};

export const createUser = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const normalizedPayload = normalizeUserPayload(req.body);
    const existingUser = await User.findOne({ email: normalizedPayload.email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      ...normalizedPayload,
      password,
    });

    createLog("user_created", req.user?._id, { userId: user._id });

    res.status(201).json({
      message: "User created successfully",
      user: await User.findById(user._id).select("-password"),
    });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ message: err.message || "Failed to create user" });
  }
};

// GET ALL USERS
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE USER
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    let user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const updates = req.body;
    const normalizedPayload = normalizeUserPayload(updates, user);

    // If password is being updated â€” hash it
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    user = await User.findByIdAndUpdate(
      id,
      {
        ...normalizedPayload,
        ...(updates.password ? { password: updates.password } : {}),
      },
      { new: true }
    ).select("-password");

    createLog("user_updated", req.user._id, { userId: id });

    res.json({ message: "User updated successfully", user });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE USER
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await User.findByIdAndUpdate(id, { isActive: false });

    createLog("user_deleted", req.user._id, { userId: id });

    res.json({ message: "User deactivated successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CHANGE PASSWORD (CURRENT LOGGED-IN USER)
export const changePasswordForCurrentUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Old and new password are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    user.password = newPassword; // will auto-hash via pre-save hook
    await user.save();

    createLog("password_changed", userId, {});

    res.json({ success: true, message: "Password updated successfully" });

  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Failed to update password" });
  }
};
