import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: "guestroom",
    });

    console.log("🟢 MongoDB Connected Successfully");
  } catch (error) {
    console.error("🔴 MongoDB Connection Failed:", error.message);
    process.exit(1); // Stop server if DB fails
  }
};

export default connectDB;
