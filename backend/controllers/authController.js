// controllers/authController.js
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createLog } from "../middleware/logMiddleware.js";

// ==================================================
// GET LOGGED-IN USER (cookie session)
// ==================================================
export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        hostel: req.user.assignedHostel || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load user details",
    });
  }
};

// ==================================================
// LOGIN USER (COOKIE BASED)
// ==================================================
export const loginUser = async (req, res) => {
  console.log("🟦 LOGIN HIT");
  console.log("📩 Body:", req.body);
  console.log("➡️ Checking:", email);
  console.log("🍪 Cookie SENT to browser");

  try {
    const { email, password } = req.body;

    console.log("👉 Checking user:", email);

    // 1️⃣ Find user
    const foundUser = await User.findOne({ email });
    console.log("🔍 User found:", foundUser ? "YES" : "NO");

    if (!foundUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2️⃣ Validate password
    const match = await foundUser.matchPassword(password);
    console.log("🔑 Password match:", match ? "YES" : "NO");

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    // 3️⃣ Create JWT token
    const token = jwt.sign({ id: foundUser._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    console.log("🎫 Token generated:", token ? "YES" : "NO");

    // 4️⃣ Set HttpOnly Cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    console.log("🍪 Cookie set:", req.cookies?.token ? "YES" : "UNKNOWN (client browser)");

    // 5️⃣ Success
    console.log("✅ LOGIN SUCCESS");
    return res.json({
      success: true,
      user: {
        _id: foundUser._id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        assignedHostel: foundUser.assignedHostel,
      },
    });

  } catch (err) {
    console.log("❌ LOGIN ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ==================================================
// CREATE USER (Admin only)
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
      assignedHostel: role === "caretaker" ? assignedHostel : null,
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
