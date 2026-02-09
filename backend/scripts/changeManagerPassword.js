import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const USERS = [
  {
    email: "guestroom.hostels@thapar.edu",
    role: "manager",
    newPassword: "Admin@12345", // <-- change if needed
  },
];

const changeUserPasswords = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ MongoDB connected");

    for (const entry of USERS) {
      const user = await User.findOne({ email: entry.email });

      if (!user) {
        console.log(`❌ User not found: ${entry.email}`);
        continue;
      }

      if (user.role !== entry.role) {
        console.log(
          `⚠️ Role mismatch for ${entry.email}. Expected: ${entry.role}, Found: ${user.role}`
        );
        continue;
      }

      // ✅ Plain password — schema pre-save hook hashes it
      user.password = entry.newPassword;
      await user.save();

      console.log(`🔐 Password updated for ${entry.role}: ${entry.email}`);
    }

    console.log("🎉 Password update completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error updating password:", err);
    process.exit(1);
  }
};

changeUserPasswords();
