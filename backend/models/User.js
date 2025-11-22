import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // admin / manager / caretaker
    role: { type: String, enum: ["admin", "manager", "caretaker"], required: true },

    // caretaker assigned hostel
    assignedHostel: { type: String, default: null },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare passwords
userSchema.methods.matchPassword = async function (enteredPass) {
  return await bcrypt.compare(enteredPass, this.password);
};

export default mongoose.model("User", userSchema);
