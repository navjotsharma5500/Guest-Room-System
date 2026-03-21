import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: { type: String, required: true, unique: true },

  password: { type: String, required: true },

  role: {
    type: String,
    enum: ["admin", "adosa", "manager", "Warden", "caretaker", "assistant", "dd_assistant", "guard", "gen_sec", "president", "student", "co_warden"],
    default: "caretaker",
  },

  assignedHostel: { type: String, default: null }, // caretaker only
  hostel: { type: String, default: null },
  rollNo: { type: String, default: null, uppercase: true, trim: true }, // for students/society heads
  societies: [{ type: String }], // for president/gen_sec roles
  profilePicture: { type: String, default: null },

  // ✅ Scalable Permissions System
  permissions: {
    guestRoom: { type: Boolean, default: false },
    venue: { type: Boolean, default: false },
    night: { type: Boolean, default: false }
  }
});

// Hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare passwords
userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

export default mongoose.model("User", userSchema);