// backend/scripts/resetDDAssistantPasswordV2.js
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

const resetDDAssistantPasswordV2 = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    
    if (!process.env.MONGO_URL) {
      throw new Error("❌ MONGO_URL not found in .env");
    }

    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ MongoDB connected");

    const email = "Queries_studentaffairs@thapar.edu";
    const newPassword = "Test@12345";

    // Find the user
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log("❌ User not found with email:", email);
      process.exit(1);
    }

    console.log("\n👤 Found user:");
    console.log("  ID:", user._id.toString());
    console.log("  Name:", user.name);
    console.log("  Email:", user.email);
    console.log("  Role:", user.role);

    // Generate hash with salt rounds = 10 (same as bcryptjs default)
    console.log("\n🔨 Generating password hash...");
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log("Hash generated (first 30 chars):", hashedPassword.substring(0, 30));

    // Update using findOneAndUpdate to ensure proper save
    await User.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { new: true }
    );

    console.log("✅ Password hash saved to database");

    // Verify the update
    console.log("\n🔍 Verifying password update...");
    const updatedUser = await User.findOne({ email });
    const isMatch = await bcrypt.compare(newPassword, updatedUser.password);

    if (isMatch) {
      console.log("✅ VERIFICATION SUCCESSFUL!");
      console.log("🎉 Password has been reset successfully");
      console.log("\n📧 Login credentials:");
      console.log("  Email:", email);
      console.log("  Password:", newPassword);
      console.log("\n⚠️  Remember to change this password after first login!");
    } else {
      console.log("❌ VERIFICATION FAILED - Something went wrong");
      console.log("Please check your User model and bcrypt configuration");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to reset password:", error);
    process.exit(1);
  }
};

resetDDAssistantPasswordV2();