// backend/controllers/nightStudentController.js
//
// Supports TWO Excel formats:
//
// FORMAT A — Thapar ResidentsList bulk export (auto-detected by column count ≥ 20)
//   idx 1=rollNo  idx 4=name  idx 5=hostel  idx 7=roomNo
//   idx 9=contact  idx 11=email  idx 15=gender
//   idx 19=activeStatus  idx 25=course  idx 26=branch
//
// FORMAT B — Simple custom Excel (header row required, any column order)
//   Required headers: rollNo, email
//   Optional headers: name, hostel, roomNo, contact, gender, course, branch, activeStatus
//   Column names are case-insensitive and trimmed

import xlsx from 'xlsx';
import NightStudent from '../models/NightStudent.js';

// ── helpers ────────────────────────────────────────────────────────────────────

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

// Detect if a header row looks like the Thapar bulk export
// (has ≥20 columns and column index 1 looks like a roll number header)
const isThaparFormat = (headerRow) => {
  if (!headerRow || headerRow.length < 20) return false;
  const col1 = String(headerRow[1] ?? '').trim().toLowerCase();
  return col1.includes('roll') || col1.includes('enrollment') || col1 === '';
};

// Map header names to indices for simple format
const buildHeaderMap = (headerRow) => {
  const map = {};
  headerRow.forEach((cell, idx) => {
    const key = String(cell ?? '').trim().toLowerCase().replace(/[\s_]/g, '');
    map[key] = idx;
  });
  return map;
};

// ── GET /api/night/students ────────────────────────────────────────────────────

export const getAllStudents = async (req, res) => {
  try {
    const { search, isDefaulter, hostel, isActive, page = 1, limit = 50 } = req.query;
    const query = {};

    // By default, show only active students unless explicitly asked
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    } else {
      query.isActive = true;
    }

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

// ── GET /api/night/students/:rollNo ───────────────────────────────────────────

export const getStudentByRollNo = async (req, res) => {
  try {
    const rollNo  = normalizeRollNo(req.params.rollNo);
    const student = await NightStudent.findOne({ rollNo, isActive: true });
    if (!student) return res.status(404).json({ message: `Active student ${rollNo} not found` });
    res.status(200).json(student);
  } catch (err) {
    console.error('❌ getStudentByRollNo error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/night/students/search ───────────────────────────────────────────
export const searchStudents = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(200).json([]);

    const r = { $regex: query.trim(), $options: 'i' };
    const students = await NightStudent.find({
      isActive: true,
      $or: [{ rollNo: r }, { name: r }]
    }).limit(10).select('rollNo name hostel roomNo');

    res.status(200).json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/night/students/template ─────────────────────────────────────────
export const downloadStudentTemplate = async (req, res) => {
  try {
    const headers = ['rollNo', 'email', 'name', 'hostel', 'roomNo', 'branch'];
    const sampleRows = [
      headers,
      ['102303851', 'student1@thapar.edu', 'Student One', 'J Hall', 'A-101', 'Computer Engineering'],
      ['102303852', 'student2@thapar.edu', 'Student Two', 'K Hall', 'B-204', 'Electronics Engineering'],
    ];

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet(sampleRows);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'NightStudentsTemplate');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="night-students-template.xlsx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.status(200).send(buffer);
  } catch (err) {
    console.error('❌ downloadStudentTemplate error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/night/students ──────────────────────────────────────────────────

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

// ── DELETE /api/night/students/:studentId ─────────────────────────────────────
export const deleteStudent = async (req, res) => {
  try {
    const student = await NightStudent.findByIdAndUpdate(
      req.params.studentId,
      { isActive: false },
      { new: true }
    );
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.status(200).json({ success: true, message: 'Student deactivated' });
  } catch (err) {
    console.error('❌ deleteStudent error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/night/students/upload-excel ─────────────────────────────────────

export const uploadStudentsExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Excel file required (field: file)' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });

    if (rows.length < 2) return res.status(400).json({ message: 'Excel file has no data rows' });

    const headerRow = rows[0];
    const dataRows  = rows.slice(1);

    const useThapar = isThaparFormat(headerRow);
    const headerMap = useThapar ? null : buildHeaderMap(headerRow);

    let inserted = 0, updated = 0, skipped = 0;
    const errors = [];

    const BATCH = 500;
    for (let b = 0; b < dataRows.length; b += BATCH) {
      const ops = [];

      for (const row of dataRows.slice(b, b + BATCH)) {
        try {
          let rollNo, name, hostel, roomNo, contact, email, gender, activeStatus, course, branch, role;

          if (useThapar) {
            // ── FORMAT A: Thapar bulk export ──
            rollNo      = normalizeRollNo(row[1]);
            name        = String(row[4]  ?? '').trim();
            hostel      = String(row[5]  ?? '').trim(); // Optional
            roomNo      = String(row[7]  ?? '').trim(); // Optional
            contact     = normalizeContact(row[9]);
            email       = String(row[11] ?? '').trim().toLowerCase();
            gender      = String(row[15] ?? '').trim().toUpperCase();
            activeStatus = String(row[19] ?? 'Active').trim();
            course      = String(row[25] ?? '').trim(); // Optional
            branch      = String(row[26] ?? '').trim(); // Optional
            role        = ''; // Thapar format doesn't have role
          } else {
            // ── FORMAT B: Simple custom Excel ──
            const g = (key) => {
              const idx = headerMap[key];
              return idx !== undefined ? String(row[idx] ?? '').trim() : '';
            };
            rollNo      = normalizeRollNo(g('rollno') || g('roll_no') || g('enrollmentno') || g('enrollment'));
            name        = g('name') || g('studentname') || g('fullname');
            hostel      = g('hostel') || g('hostelname') || g('building') || g('buildingname');
            roomNo      = g('roomno') || g('room') || g('roomnumber');
            contact     = normalizeContact(g('contact') || g('phone') || g('mobile') || g('contactno'));
            email       = (g('email') || g('emailid')).toLowerCase();
            gender      = (g('gender') || g('sex')).toUpperCase();
            activeStatus = g('activestatus') || g('status') || 'Active';
            course      = g('course') || g('program');
            branch      = g('branch') || g('department') || g('dept');
            role        = g('role'); // Treat role as optional
          }

          if (!rollNo || !email) { skipped++; continue; }

          // Ensure role defaults to 'student' if missing
          const resolvedRole = role ? role.toLowerCase() : 'student';

          ops.push({
            updateOne: {
              filter: { rollNo },
              update: {
                $set: {
                  rollNo, name, hostel, roomNo, contact, email,
                  gender, activeStatus, course, branch,
                  role: resolvedRole, // Save resolved role
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
      format: useThapar ? 'Thapar bulk export' : 'Custom Excel',
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
