import jwt from "jsonwebtoken";
import NightStudent from "../models/NightStudent.js";

export const protectSocietyNightStudent = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded?.type !== "society_night_student" || !decoded?.studentId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }

    const student = await NightStudent.findById(decoded.studentId);
    if (!student || !student.isActive) {
      return res.status(401).json({ success: false, message: "Student not found." });
    }

    req.societyNightStudent = student;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Token invalid" });
  }
};
