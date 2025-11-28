// controllers/authController.js
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createLog } from "../middleware/logMiddleware.js";

// ==================================================
// GENERATE JWT (used for cookie)
// ==================================================
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// ==================================================
// GET LOGGED-IN USER (for AuthContext)
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

// =============================
// LOGIN USER (COOKIE BASED)
// =============================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const match = await user.matchPassword(password);

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    // 🔥 Set HttpOnly Cookie (THE MAIN FIX)
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,          // true only on HTTPS
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // Response
    return res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedHostel: user.assignedHostel,
      }
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
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

    const user = await User.create({
      name,
      email,
      password,
      role,
      assignedHostel: role === "caretaker" ? assignedHostel : null,
    });

    createLog("user_created", req.user._id, { newUser: user._id });

    res.json({ message: "User created", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================================================
// PROFILE (not used by frontend but OK)
// ==================================================
export const getProfile = async (req, res) => {
  res.json(req.user);
};
