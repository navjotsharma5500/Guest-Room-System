// seedUsers.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import bcrypt from "bcryptjs";

console.log("========== SEED SCRIPT STARTED ==========");

// Load .env
dotenv.config();
console.log("Loaded .env file");

// Check MONGO_URI
if (!process.env.MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI is missing from .env file!");
  process.exit(1);
} else {
  console.log("✔ MONGO_URI found");
}

// Connect to MongoDB
async function connectDB() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✔ Connected to MongoDB successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:");
    console.error(err);
    process.exit(1);
  }
}

// User seed data
const seedUsers = [
  {
    name: "Admin",
    email: "navjot.sharma@thapar.edu",
    password: "Admin@12345",
    role: "admin",
    assignedHostel: null,
  },
  {
    name: "Harpreet Virdi",
    email: "harpreet.virdi@thapar.edu",
    password: "Manager@12345",
    role: "manager",
    assignedHostel: null,
  },
  {
    name: "Agira Caretaker",
    email: "caretaker.agira@thapar.edu",
    password: "Test@12345",
    role: "caretaker",
    assignedHostel: "Agira Hall (A)",
  },
  {
    name: "Amritam Caretaker",
    email: "caretaker.amritam@thapar.edu",
    password: "Test@12345",
    role: "caretaker",
    assignedHostel: "Amritam Hall (B)",
  },
  {
    name: "Prithvi Caretaker",
    email: "caretaker.prithvi@thapar.edu",
    password: "Test@12345",
    role: "caretaker",
    assignedHostel: "Prithvi Hall (C)",
  },
  {
    name: "Neeram Caretaker",
    email: "caretaker.neeram@thapar.edu",
    password: "Test@12345",
    role: "caretaker",
    assignedHostel: "Neeram Hall (D)",
  },
  {
    name: "Vyan Caretaker",
    email: "caretaker.vyan@thapar.edu",
    password: "Test@12345",
    role: "caretaker",
    assignedHostel: "Vyan Hall (H)",
  },
  {
    name: "Ira Caretaker",
    email: "caretaker.ira@thapar.edu",
    password: "Test@12345",
    role: "caretaker",
    assignedHostel: "Ira Hall (I)",
  },
];

async function run() {
  await connectDB();

  try {
    console.log("Clearing old user records...");
    await User.deleteMany({});
    console.log("✔ Old users removed");

    console.log("Hashing passwords...");
    for (let usr of seedUsers) {
      console.log(`Hashing password for ${usr.email}`);
      usr.password = await bcrypt.hash(usr.password, 10);
    }

    console.log("Inserting new users...");
    const inserted = await User.insertMany(seedUsers);

    console.log("✔ Inserted Users:");
    inserted.forEach((u) =>
      console.log(`   → ${u.email} (${u.role}) [Hostel: ${u.assignedHostel}]`)
    );

    console.log("========== SEED SCRIPT FINISHED SUCCESSFULLY ==========");
    process.exit(0);
  } catch (err) {
    console.error("❌ ERROR DURING SEEDING:");
    console.error(err);
    process.exit(1);
  }
}

run();
