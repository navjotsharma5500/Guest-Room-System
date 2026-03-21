import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, "../.env") });

const users = [
  {
    name: "Co-Warden 1",
    email: "cowarden@thapar.edu",
    password: "Admin@12345",
    role: "co_warden",
    permissions: { guestRoom: true, venue: false, night: false }
  },
  {
    name: "Co-Warden 2",
    email: "cowarden2@thapar.edu",
    password: "Admin@12345",
    role: "co_warden",
    permissions: { guestRoom: true, venue: false, night: false }
  },
  {
    name: "Adosa 2",
    email: "adosa2@thapar.edu",
    password: "Admin@12345",
    role: "adosa",
    permissions: { guestRoom: true, venue: false, night: false }
  },
];

const seedUsers = async () => {
  try {
    // Debug
    console.log("Loading .env from:", path.join(__dirname, "../.env"));
    
    // Check MONGO_URL or MONGO_URI
    const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI;

    if (!mongoUri) {
      console.error("MONGO_URL/MONGO_URI is not defined in .env");
      console.log("Current env vars:", Object.keys(process.env));
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected");

    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`User ${userData.email} already exists. Updating...`);
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        existingUser.password = hashedPassword;
        existingUser.role = userData.role;
        existingUser.name = userData.name;
        // ✅ Update permissions
        if (userData.permissions) {
          existingUser.permissions = userData.permissions;
        }
        await existingUser.save();
        console.log(`User ${userData.email} updated.`);
      } else {
        await User.create(userData);
        console.log(`User ${userData.email} created.`);
      }
    }

    console.log("Seeding completed.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  }
};

seedUsers();
