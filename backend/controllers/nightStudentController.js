// backend/controllers/nightStudentController.js
// Excel column mapping confirmed from ResidentsList__59_.xlsx (0-indexed after header row):
//   idx 1  → rollNo     | idx 4  → name    | idx 5  → hostel (Building_name)
//   idx 7  → roomNo     | idx 9  → contact | idx 11 → email
//   idx 15 → gender     | idx 19 → activeStatus | idx 25 → course | idx 26 → branch
import xlsx from 'xlsx';
import NightStudent from '../models/NightStudent.js';

// ── helpers ──────────────────────────────────────────────────────────────────

const normalizeRollNo = (raw) => String(raw ?? '').trim().toUpperCase();

const normalizeContact = (raw) => {
  const s = String(raw ?? '').replace(/\s+/g, '');
  if (s.startsWith('+91') && s.length === 13) return s.slice(3);
  return s.replace(/^\+/, '');
};

const buildProfileImageUrl = (rollNo) => {
  const base   = (process.env.IMAGEKIT_URL_ENDPOINT  ?? '').replace(/\/$/, '');
  const folder = (process.env.IMAGEKIT_STUDENT_FOLDER ?? '/students');
  return base ? `${base}${folder}/${rollNo}` : '';
};

// ── GET /api/night/students ───────────────────────────────────────────────────

export const getAllStudents = async (req, res) => {
  try {
    const { search, isDefaulter, hostel, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      const r = { $regex: search.trim(), $options: 'i' };
      query.$or = [{ rollNo: r }, { name: r }, { email: r }];
    }
    if (isDefaulter !== undefined) query.isDefaulter = isDefaulter === 'true';
    if (hostel) query.hostel = hostel;

    const skip = (Number(page) - 1) * Number(limit);
    const [students, total] = await Promise.all([
      NightStudent.find(query).sort({ rollNo: 1 }).skip(skip).limit(Number(limit)),
      NightStudent.countDocuments(query),
    ]);

    res.status(200).json({ students, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('❌ getAllStudents error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/night/students/:rollNo ──────────────────────────────────────────

export const getStudentByRollNo = async (req, res) => {
  try {
    const rollNo  = normalizeRollNo(req.params.rollNo);
    const student = await NightStudent.findOne({ rollNo });
    if (!student) return res.status(404).json({ message: `Student ${rollNo} not found` });
    res.status(200).json(student);
  } catch (err) {
    console.error('❌ getStudentByRollNo error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/night/students ─────────────────────────────────────────────────

export const upsertStudent = async (req, res) => {
  try {
    const { rollNo, ...data } = req.body;
    if (!rollNo) return res.status(400).json({ message: 'rollNo required' });

    const normalized = normalizeRollNo(rollNo);
    const student = await NightStudent.findOneAndUpdate(
      { rollNo: normalized },
      {
        $set: { rollNo: normalized, ...data },
        $setOnInsert: { isDefaulter: false, defaulterCount: 0, defaulterBlocked: false },
      },
      { upsert: true, new: true }
    );
    res.status(200).json(student);
  } catch (err) {
    console.error('❌ upsertStudent error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/night/students/upload-excel ─────────────────────────────────────
// Accepts: multipart/form-data, field = "file"

export const uploadStudentsExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Excel file required (field: file)' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });

    if (rows.length < 2) return res.status(400).json({ message: 'Excel file has no data rows' });

    const dataRows = rows.slice(1);
    let inserted = 0, updated = 0, skipped = 0;
    const errors  = [];

    const BATCH = 500;
    for (let b = 0; b < dataRows.length; b += BATCH) {
      const ops = [];

      for (const row of dataRows.slice(b, b + BATCH)) {
        try {
          const rollNo = normalizeRollNo(row[1]);
          const email  = String(row[11] ?? '').trim().toLowerCase();
          if (!rollNo || !email) { skipped++; continue; }

          ops.push({
            updateOne: {
              filter: { rollNo },
              update: {
                $set: {
                  rollNo,
                  name:          String(row[4]  ?? '').trim(),
                  hostel:        String(row[5]  ?? '').trim(),
                  roomNo:        String(row[7]  ?? '').trim(),
                  contact:       normalizeContact(row[9]),
                  email,
                  gender:        String(row[15] ?? '').trim().toUpperCase(),
                  activeStatus:  String(row[19] ?? 'Active').trim(),
                  course:        String(row[25] ?? '').trim(),
                  branch:        String(row[26] ?? '').trim(),
                  profileImageUrl: buildProfileImageUrl(rollNo),
                },
                $setOnInsert: {
                  isDefaulter: false,
                  defaulterCount: 0,
                  defaulterBlocked: false,
                },
              },
              upsert: true,
            },
          });
        } catch (rowErr) {
          errors.push({ row: b + dataRows.slice(b).indexOf(row) + 2, error: rowErr.message });
        }
      }

      if (ops.length) {
        const result = await NightStudent.bulkWrite(ops, { ordered: false });
        inserted += result.upsertedCount;
        updated  += result.modifiedCount;
      }
    }

    res.status(200).json({
      message: 'Upload complete',
      total: dataRows.length,
      inserted,
      updated,
      skipped,
      errors: errors.slice(0, 20),
    });
  } catch (err) {
    console.error('❌ uploadStudentsExcel error:', err);
    res.status(500).json({ message: err.message });
  }
};
