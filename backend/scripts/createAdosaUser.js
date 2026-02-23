// backend/scripts/createAdosaUser.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

// 👇 explicitly load backend/.env
dotenv.config({ path: "./backend/.env" });

const createUser = async () => {
  try {
    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL is missing in .env");
    }

    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ MongoDB connected");

    const email = "adosa3@thapar.edu";

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("⚠️ User already exists:", email);
      process.exit(0);
    }

    await User.create({
      name: "ADosa",
      email,
      password: "Admin@12345",
      role: "adosa",
      isActive: true,
    });

    console.log("🎉 User created successfully:", email);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating user:", err.message);
    process.exit(1);
  }
};

createUser();