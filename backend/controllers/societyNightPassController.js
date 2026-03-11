import jwt from "jsonwebtoken";
import NightStudent from "../models/NightStudent.js";
import SocietyNightRequest from "../models/SocietyNightRequest.js";

const THAPAR_DOMAIN = "@thapar.edu";

const issueStudentToken = (student) =>
  jwt.sign(
    {
      type: "society_night_student",
      studentId: String(student._id),
      email: student.email,
      role: "student",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const normalizeStudent = (student) => ({
  id: String(student._id),
  name: student.name,
  email: student.email,
  rollNo: student.rollNo,
  branch: student.branch || "",
  year: student.course || "",
  role: "student",
});

const resolveGoogleEmail = async ({ token, accessToken }) => {
  if (token) {
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const googleData = await googleRes.json();
    if (googleData.error || !googleData.email) {
      throw new Error("Invalid Google Token");
    }
    return googleData.email;
  }

  if (accessToken) {
    const googleRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const googleData = await googleRes.json();
    if (!googleRes.ok || !googleData?.email) {
      throw new Error("Invalid Google Token");
    }
    return googleData.email;
  }

  throw new Error("No token provided");
};

export const societyNightGoogleLogin = async (req, res) => {
  try {
    const email = (await resolveGoogleEmail(req.body || {})).toLowerCase().trim();

    if (!email.endsWith(THAPAR_DOMAIN)) {
      return res.status(403).json({
        success: false,
        message: "Only @thapar.edu emails are allowed.",
      });
    }

    const student = await NightStudent.findOne({
      email: { $regex: new RegExp(`^${email}$`, "i") },
      isActive: true,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Your email is not registered in our system.",
      });
    }

    const authToken = issueStudentToken(student);

    return res.json({
      success: true,
      token: authToken,
      student: normalizeStudent(student),
      redirectTo: "/society-night-pass/dashboard",
    });
  } catch (error) {
    const message = error.message === "No token provided" ? error.message : "Google login failed.";
    return res.status(400).json({ success: false, message });
  }
};

export const getSocietyNightMe = async (req, res) => {
  return res.json({
    success: true,
    student: normalizeStudent(req.societyNightStudent),
  });
};

export const listSocietyNightRequests = async (req, res) => {
  const requests = await SocietyNightRequest.find({
    student_id: req.societyNightStudent._id,
  }).sort({ created_at: -1 });

  return res.json({ success: true, requests });
};

export const createSocietyNightRequest = async (req, res) => {
  try {
    const {
      society_name,
      purpose,
      location,
      event_date,
      start_time,
      end_date,
      end_time,
      notes,
    } = req.body || {};

    if (
      !society_name?.trim() ||
      !purpose?.trim() ||
      !location?.trim() ||
      !event_date?.trim() ||
      !start_time?.trim() ||
      !end_date?.trim() ||
      !end_time?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    const created = await SocietyNightRequest.create({
      student_id: req.societyNightStudent._id,
      student_email: req.societyNightStudent.email,
      society_name: society_name.trim(),
      purpose: purpose.trim(),
      location: location.trim(),
      event_date: event_date.trim(),
      start_time: start_time.trim(),
      end_date: end_date.trim(),
      end_time: end_time.trim(),
      notes: notes?.trim() || "",
      status: "PENDING",
    });

    return res.status(201).json({
      success: true,
      request: created,
      message: "Permission request submitted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to submit permission request.",
    });
  }
};
