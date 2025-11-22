import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { createLog } from "../middleware/logMiddleware.js";

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

    // If password is being updated — hash it
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    user = await User.findByIdAndUpdate(id, updates, { new: true }).select("-password");

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

    await User.findByIdAndDelete(id);

    createLog("user_deleted", req.user._id, { userId: id });

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
