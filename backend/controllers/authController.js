// controllers/authController.js
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createLog } from "../middleware/logMiddleware.js";

// ==================================================
// LOGOUT USER
// ==================================================
export const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

// ==================================================
// LOGIN USER
// ==================================================
export const loginUser = async (req, res) => {
  try {
    console.log("📩 LOGIN HIT");
    console.log("📧 Email:", req.body.email);
    console.log("🌍 Origin:", req.headers.origin);

    const user = await User.findOne({ email: req.body.email });
    console.log("👤 User found:", !!user);

    if (!user) {
      console.log("❌ Email not found");
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    console.log("Password match:", isMatch);

    if (!isMatch) {
      console.log("❌ Wrong password");
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    console.log("✅ Login successful");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      token: token, // 🔥 Also return token in response so frontend can store it
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,

        // ⭐ FIX: guarantee sidebar always receives assignedHostel
        assignedHostel: user.assignedHostel || user.hostel || null,
      },
    });

  } catch (error) {
    console.error("🔥 LOGIN ERROR:", error);
    console.error("🔥 Stack trace:", error.stack);
    return res.status(500).json({ 
      success: false, 
      message: "Server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// ==================================================
// CREATE USER
// ==================================================
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, assignedHostel } = req.body;

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "User already exists" });

    const newUser = await User.create({
      name,
      email,
      password,
      role,
      assignedHostel: (role === "caretaker" || role === "warden") ? assignedHostel : null,
    });

    createLog("user_created", req.user?._id, { newUser: newUser._id });

    res.json({ message: "User created", user: newUser });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================================================
// GET PROFILE
// ==================================================
export const getProfile = async (req, res) => {
  res.json(req.user);
};

// ==================================================
// UPDATE PROFILE
// ==================================================
export const updateProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const { name, hostel, profilePicture } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update fields if provided
    if (name !== undefined) user.name = name;
    if (hostel !== undefined) {
      // For caretakers, update assignedHostel; for others, update hostel
      if (user.role === "caretaker" || user.role === "warden") {
        user.assignedHostel = hostel;
      } else {
        user.hostel = hostel;
      }
    }
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        assignedHostel: user.assignedHostel || user.hostel || null,
        hostel: user.hostel || user.assignedHostel || null,
      },
    });

  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ==================================================
// GET LOGGED-IN USER (Cookie Auth)
// ==================================================
export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const user = await User.findById(req.user._id).select(
      "name email role assignedHostel hostel profilePicture"
    );

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,

        // ⭐ FIX: unify hostel field for sidebar
        assignedHostel: user.assignedHostel || user.hostel || null,
      },
    });

  } catch (error) {
    console.error("GET ME ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
