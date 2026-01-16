import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const fixUsers = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ MongoDB connected");

    const caretakers = await User.find({
      role: "caretaker",
      assignedHostel: { $ne: null },
    });

    let fixedCount = 0;

    for (const user of caretakers) {
      if (!user.hostel || user.hostel !== user.assignedHostel) {
        user.hostel = user.assignedHostel;
        await user.save();
        fixedCount++;
        console.log(`✅ Fixed user: ${user.email}`);
      }
    }

    console.log(`🎉 Upgrade completed. Fixed ${fixedCount} users.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Fix failed:", err);
    process.exit(1);
  }
};

fixUsers();
