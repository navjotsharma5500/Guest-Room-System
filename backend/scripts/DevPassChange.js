import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";

// ✅ Resolve correct path
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const EMAIL = "cowarden_dev@thapar.edu";
const NEW_PASSWORD = "Admin@12345";

const changeSingleUserPassword = async () => {
  try {
    // ✅ Check env
    if (!process.env.MONGO_URL) {
      console.error("❌ MONGO_URL not found in .env");
      process.exit(1);
    }

    console.log("🔗 Connecting to MongoDB...");
    console.log(
      "📦 DB:",
      process.env.MONGO_URL.split("/").pop().split("?")[0]
    );

    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ MongoDB connected");

    // ✅ Find user
    const user = await User.findOne({ email: EMAIL });

    if (!user) {
      console.log(`❌ User not found: ${EMAIL}`);
      process.exit(0);
    }

    console.log(`👤 Found user: ${user.email} | Role: ${user.role}`);

    // 🔒 Ensure co_warden
    if (user.role !== "co_warden") {
      console.log("⚠️ Not a co_warden user. Skipping.");
      process.exit(0);
    }

    // ✅ Update password
    user.password = NEW_PASSWORD;
    await user.save();

    console.log("🔐 Password updated successfully");
    console.log(`✅ Updated: ${EMAIL}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
};

changeSingleUserPassword();