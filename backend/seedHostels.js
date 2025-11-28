// seedHostels.js
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Hostel from "./models/Hostel.js";

dotenv.config();

const __dirname = path.resolve();

// CONNECT MONGO
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB connected for seeding");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const seedHostels = async () => {
  await connectDB();

  try {
    const filePath = path.join(__dirname, "hostelData.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const hostelsJson = JSON.parse(raw);

    // Clear existing hostels
    await Hostel.deleteMany({});
    console.log("Old hostel data cleared");

    const formatted = Object.entries(hostelsJson).map(([key, val]) => {
      const code = key.match(/\((.*?)\)/)?.[1] || "";

      return {
        name: key,
        code,
        caretakerEmail: val.caretakerEmail,
        wardenEmail: val.wardenEmail,
        rooms: val.rooms
      };
    });

    await Hostel.insertMany(formatted);
    console.log("Hostel data imported successfully!");
    process.exit();

  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
};

seedHostels();
