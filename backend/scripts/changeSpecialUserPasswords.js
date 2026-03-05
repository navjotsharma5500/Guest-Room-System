import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

// ✅ Users to update
const USERS_TO_UPDATE = [
  {
    email: "adosa2@thapar.edu",
    newPassword: "Adosa2@12345",
    role: "adosa",
  },
  {
    email: "cowarden@thapar.edu",
    newPassword: "Cowarden@12345",
    role: "co_warden",
  },
  {
    email: "cowarden2@thapar.edu",
    newPassword: "Cowarden2@12345",
    role: "co_warden",
  },
];

const changePasswords = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ MongoDB connected");

    for (const userData of USERS_TO_UPDATE) {
      const user = await User.findOne({ email: userData.email });

      if (!user) {
        console.log(`❌ User not found: ${userData.email}`);
        continue;
      }

      // 🔐 Role verification
      if (user.role !== userData.role) {
        console.log(
          `⚠️ Role mismatch for ${userData.email} (Expected: ${userData.role}, Found: ${user.role})`
        );
        continue;
      }

      // ✅ Set plain password (your schema should hash automatically)
      user.password = userData.newPassword;
      await user.save();

      console.log(`🔐 Password updated for ${userData.role}: ${userData.email}`);
    }

    console.log("🎉 Password update process completed");
    process.exit(0);

  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
};

changePasswords();