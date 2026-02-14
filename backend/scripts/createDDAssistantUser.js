// backend/scripts/createDDAssistantUser.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const createDDAssistantUser = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    console.log("MONGO_URL =", process.env.MONGO_URL);

    if (!process.env.MONGO_URL) {
      throw new Error("❌ MONGO_URL not found in .env");
    }

    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ MongoDB connected");

    const email = "Queries_studentaffairs@thapar.edu";
    const password = "Test@12345"; // change after first login

    // Prevent duplicate user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("⚠️ User already exists:", email);
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: "Alka",
      email,
      password: hashedPassword,
      role: "dd_assistant",   // ✅ CANONICAL ROLE
      assignedHostel: null,   // ❌ not used for venue
      hostel: null,           // ❌ not used for venue
      isActive: true,
    });

    console.log("🎉 DD Assistant user created successfully:");
    console.log({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to create DD Assistant user:", error);
    process.exit(1);
  }
};

createDDAssistantUser();
