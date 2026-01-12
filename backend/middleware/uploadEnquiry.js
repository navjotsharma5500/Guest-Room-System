import multer from "multer";
import path from "path";
import fs from "fs";

// =====================================================
// Ensure upload folder exists
// =====================================================
const uploadPath = "uploads/enquiry";

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// =====================================================
// Multer: disk storage
// =====================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

// =====================================================
// ACCEPT ALL FILE TYPES — do NOT block uploads
// (your backend already supports ANY attachment)
// =====================================================
const fileFilter = (req, file, cb) => {
  cb(null, true); // allow every file type
};

// =====================================================
// Multer instance
// =====================================================
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // Allow up to 20MB per file
  },
});

// =====================================================
// EXPORT HANDLER
// Accept up to 5 files
// =====================================================
export const uploadEnquiryFiles = upload.array("attachments", 5);
