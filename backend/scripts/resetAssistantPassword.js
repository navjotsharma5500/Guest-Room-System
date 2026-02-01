import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

// ✅ IMPORTANT: load env from backend root
dotenv.config({ path: "../.env" });

const USER_EMAIL = "shabnam.rani@thapar.edu";
const NEW_PASSWORD = "Test@12345";

const resetAssistantPassword = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    console.log("MONGO_URL =", process.env.MONGO_URL);

    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL is undefined. Check backend/.env");
    }

    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ MongoDB connected");

    const user = await User.findOne({ email: USER_EMAIL });

    if (!user) {
      console.log(`❌ User not found: ${USER_EMAIL}`);
      process.exit(0);
    }

    console.log("👤 User found:", {
      email: user.email,
      role: user.role,
    });

    // ✅ Assign plain password (schema will hash)
    user.password = NEW_PASSWORD;
    await user.save();

    console.log("🔐 Password reset successful");
    console.log("➡️ Email:", USER_EMAIL);
    console.log("➡️ New Password:", NEW_PASSWORD);

    process.exit(0);
  } catch (err) {
    console.error("❌ Password reset failed:", err.message);
    process.exit(1);
  }
};

resetAssistantPassword();
