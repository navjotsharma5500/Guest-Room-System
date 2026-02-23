// backend/routes/nightPermissionRoutes.js
// Matching VenueBookingRoutes.js pattern: ES modules, protect middleware, role checks
import express from 'express';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import * as studentCtrl from '../controllers/nightStudentController.js';
import * as listCtrl    from '../controllers/permissionListController.js';
import * as scanCtrl    from '../controllers/scanController.js';
import NightStudent      from '../models/NightStudent.js';
import NightPermissionList from '../models/NightPermissionList.js';
import { getSettings }   from '../models/NightSystemSettings.js';
import NightSystemSettings from '../models/NightSystemSettings.js';
import { getSocketIO }   from '../utils/socket.js';

const router = express.Router();

// Multer in-memory for Excel upload (same pattern as existing upload.js)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Role helpers (matching venueAccessPolicy pattern) ─────────────────────────

const isAdosaOrAdmin = (role) => ['adosa', 'admin'].includes((role || '').toLowerCase());
const isPresidentOrAbove = (role) => ['president', 'adosa', 'admin'].includes((role || '').toLowerCase());
const isGenSecOrAbove = (role) => ['gen_sec', 'president', 'adosa', 'admin'].includes((role || '').toLowerCase());
const canScan = (role) => ['caretaker', 'guard', 'adosa', 'admin'].includes((role || '').toLowerCase());

const requireAdosa = (req, res, next) => {
  if (!isAdosaOrAdmin(req.user?.role)) {
    return res.status(403).json({ message: 'ADOSA or Admin access required' });
  }
  next();
};

const requireGenSec = (req, res, next) => {
  if (!isGenSecOrAbove(req.user?.role)) {
    return res.status(403).json({ message: 'Gen Sec access or above required' });
  }
  next();
};

const requireScanRole = (req, res, next) => {
  if (!canScan(req.user?.role)) {
    return res.status(403).json({ message: 'Scan role required: CARETAKER, GUARD, ADOSA, or ADMIN' });
  }
  next();
};

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', system: 'night-permissions', timestamp: new Date().toISOString() });
});

// ── STUDENTS ──────────────────────────────────────────────────────────────────

router.get('/students', protect, studentCtrl.getAllStudents);
router.get('/students/:rollNo', protect, studentCtrl.getStudentByRollNo);
router.post('/students', protect, requireAdosa, studentCtrl.upsertStudent);
router.post('/students/upload-excel', protect, requireAdosa, upload.single('file'), studentCtrl.uploadStudentsExcel);

// ── PERMISSION LISTS ──────────────────────────────────────────────────────────

router.get('/lists', protect, listCtrl.getLists);
router.get('/lists/review', protect, listCtrl.getListsForReview);
router.get('/lists/:listId', protect, listCtrl.getListById);
router.post('/lists', protect, requireGenSec, listCtrl.createList);
router.post('/lists/:listId/send', protect, requireGenSec, listCtrl.sendListForward);
router.post('/lists/:listId/approve', protect, requireAdosa, listCtrl.approveStudents);
router.post('/lists/:listId/reject', protect, requireAdosa, listCtrl.rejectStudents);
router.patch('/lists/:listId/cancel', protect, requireAdosa, listCtrl.cancelList);

// ── SCAN ──────────────────────────────────────────────────────────────────────

router.post('/scan', protect, requireScanRole, scanCtrl.processScan);
router.get('/scan/logs', protect, scanCtrl.getScanLogs);

// ── DEFAULTERS ────────────────────────────────────────────────────────────────

router.get('/defaulters', protect, async (req, res) => {
  try {
    const defaulters = await NightStudent.find({ isDefaulter: true }).sort({ defaulterCount: -1 });
    res.status(200).json(defaulters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/defaulters/:studentId/rollback', protect, requireAdosa, async (req, res) => {
  try {
    const { reason } = req.body;
    const student = await NightStudent.findByIdAndUpdate(
      req.params.studentId,
      {
        isDefaulter: false, defaulterBlocked: false, defaulterCount: 0,
        rolledBackBy: req.user._id, rolledBackAt: new Date(), rollbackReason: reason || '',
      },
      { new: true }
    );
    if (!student) return res.status(404).json({ message: 'Student not found' });

    try {
      const io = getSocketIO();
      io.to('night-permissions').emit('np:defaulter-rollback', { studentId: student._id, rollNo: student.rollNo, rolledBackBy: req.user.name });
    } catch (_) {}

    res.status(200).json({ message: 'Defaulter rolled back', student });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── SETTINGS ──────────────────────────────────────────────────────────────────

router.get('/settings', protect, async (req, res) => {
  try {
    const settings = await getSettings();
    res.status(200).json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/settings', protect, requireAdosa, async (req, res) => {
  try {
    const settings = await getSettings();
    const allowed = ['defaultToVenueTimerMinutes', 'defaultToHostelTimerMinutes', 'defaulterStrikeLimit', 'lastApplyAllowedTime'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) settings[key] = req.body[key];
    }
    settings.updatedBy = req.user._id;
    settings.updatedAt = new Date();
    await settings.save();
    res.status(200).json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── CALENDAR ──────────────────────────────────────────────────────────────────

router.get('/calendar', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const query = { status: { $in: ['APPROVED', 'PENDING_ADOSA', 'PENDING_PRESIDENT', 'DRAFT'] } };
    if (from) query.startDateTime = { $gte: new Date(from) };
    if (to)   query.endDateTime   = { ...(query.endDateTime || {}), $lte: new Date(to) };
    const lists = await NightPermissionList.find(query).sort({ startDateTime: 1 });
    res.status(200).json(lists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── REPORTS CSV ───────────────────────────────────────────────────────────────

router.get('/reports/download', protect, requireAdosa, async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const query = {};
    if (fromDate) query.startDateTime = { $gte: new Date(fromDate) };
    if (toDate)   query.endDateTime   = { ...(query.endDateTime || {}), $lte: new Date(toDate) };

    const lists = await NightPermissionList.find(query);
    const rows  = [['Roll No', 'Name', 'Society', 'Venue', 'Start', 'End', 'Student Status', 'Defaulter']];

    for (const list of lists) {
      for (const s of list.students) {
        const studentDoc = await NightStudent.findOne({ rollNo: s.rollNo });
        rows.push([
          s.rollNo, s.name, list.societyName, list.venueName,
          list.startDateTime?.toISOString() ?? '',
          list.endDateTime?.toISOString()   ?? '',
          s.status,
          studentDoc?.isDefaulter ? 'YES' : 'NO',
        ]);
      }
    }

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="night-permissions-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── MANUAL CRON TRIGGER (Admin) ───────────────────────────────────────────────

router.post('/admin/run-timeout-check', protect, requireAdosa, async (req, res) => {
  try {
    const { runNightPermissionTimeoutCheck } = await import('../utils/nightPermissionCron.js');
    const io     = (() => { try { return getSocketIO(); } catch (_) { return null; } })();
    const result = await runNightPermissionTimeoutCheck(io);
    res.status(200).json({ message: 'Timeout check complete', result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
