import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createLog } from "../middleware/logMiddleware.js";

export const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,   // Comes from protect middleware
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load user details",
    });
  }
};

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// =============================
// LOGIN USER
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
        
    // Log login event
    createLog("login", user._id);

    // ==============================
    // FINAL CORRECT RESPONSE FORMAT
    // ==============================

    return res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedHostel: user.assignedHostel,
      },
      token: generateToken(user._id),  
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });  
  }
};

// =============================
// ADMIN: CREATE USER
// =============================
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, assignedHostel } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

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

// =============================
// GET LOGGED-IN USER PROFILE
// =============================
export const getProfile = async (req, res) => {
  res.json(req.user);
};
