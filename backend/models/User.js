import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "manager", "caretaker"],
      required: true,
    },
    assignedHostel: { type: mongoose.Schema.Types.ObjectId, ref: "Hostel", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// =====================================
// HASH PASSWORD BEFORE SAVE
// =====================================
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// =====================================
// COMPARE PASSWORD DURING LOGIN
// =====================================
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
