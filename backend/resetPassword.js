import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

dotenv.config();

if (!process.env.MONGO_URL) {
  console.error("❌ Missing MONGO_URL");
  process.exit(1);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✔ Connected to MongoDB");

  const email = "navjot.sharma@thapar.edu";
  const plainPassword = "Admin@12345";

  const user = await User.findOne({ email });
  if (!user) {
    console.error("❌ User not found");
    process.exit(1);
  }

  user.password = await bcrypt.hash(plainPassword, 10);
  await user.save();

  console.log("✔ Password reset completed");
  mongoose.disconnect();
}

run();
