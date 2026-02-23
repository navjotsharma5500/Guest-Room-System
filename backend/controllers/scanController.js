// backend/controllers/scanController.js
// Scan Role Matrix:
//   CARETAKER → HOSTEL scans ONLY
//   GUARD     → VENUE  scans ONLY
//   adosa / admin → both (override)
// Backend enforces this - frontend location toggle is UX only.
import { getSocketIO } from '../utils/socket.js';
import PermissionSession from '../models/PermissionSession.js';
import NightStudent from '../models/NightStudent.js';
import ScanLog from '../models/ScanLog.js';
import { getSettings } from '../models/NightSystemSettings.js';

// ── Role → allowed location ───────────────────────────────────────────────────

const ROLE_LOCATION_MAP = {
  caretaker: 'HOSTEL',
  guard:     'VENUE',
  adosa:     null,
  admin:     null,
};

const isLocationAllowed = (role, scanLocation) => {
  const allowed = ROLE_LOCATION_MAP[(role || '').toLowerCase()];
  if (allowed === null || allowed === undefined) return true;
  return allowed === scanLocation;
};

const inferScanType = (phase, location) => {
  if (phase === 'NOT_STARTED'         && location === 'HOSTEL') return 'HOSTEL_EXIT';
  if (phase === 'GOING_TO_VENUE'      && location === 'VENUE')  return 'VENUE_ENTRY';
  if (phase === 'AT_VENUE'            && location === 'VENUE')  return 'VENUE_EXIT';
  if (phase === 'RETURNING_TO_HOSTEL' && location === 'HOSTEL') return 'HOSTEL_ENTRY';
  return location === 'HOSTEL' ? 'HOSTEL_EXIT' : 'VENUE_ENTRY';
};

const logScan = async (data) => {
  try { await ScanLog.create(data); } catch (_) {}
};

const emitSafe = (event, payload, room) => {
  try {
    const io = getSocketIO();
    if (room) io.to(room).emit(event, payload);
    else io.emit(event, payload);
  } catch (_) {}
};

const markDefaulter = async (student, session, reason) => {
  session.isDefaulter     = true;
  session.defaulterReason = reason;
  session.currentPhase    = 'DEFAULTER';
  await session.save();

  const updated = await NightStudent.findByIdAndUpdate(
    student._id,
    { $inc: { defaulterCount: 1 }, isDefaulter: true },
    { new: true }
  );

  const settings = await getSettings();
  if (updated && updated.defaulterCount >= settings.defaulterStrikeLimit) {
    await NightStudent.findByIdAndUpdate(student._id, { defaulterBlocked: true });
  }

  emitSafe('np:student-defaulter', {
    studentId: student._id, rollNo: student.rollNo,
    reason, phase: 'DEFAULTER', source: 'scan',
  }, 'night-permissions');
};

// ── POST /api/night/scan ──────────────────────────────────────────────────────

export const processScan = async (req, res) => {
  const { rollNo, scanLocation } = req.body;
  const scanner = req.user;
  const now     = new Date();

  if (!rollNo || !scanLocation) {
    return res.status(400).json({ message: 'rollNo and scanLocation are required' });
  }
  if (!['HOSTEL', 'VENUE'].includes(scanLocation)) {
    return res.status(400).json({ message: 'scanLocation must be HOSTEL or VENUE' });
  }

  // Role enforcement
  if (!isLocationAllowed(scanner.role, scanLocation)) {
    await logScan({
      rollNo: String(rollNo).toUpperCase(), studentId: null,
      scanType: scanLocation === 'HOSTEL' ? 'HOSTEL_EXIT' : 'VENUE_ENTRY',
      scannedByUserId: scanner._id, scannedByName: scanner.name || '',
      scanLocation, scanTime: now, result: 'INVALID',
      reason: `Role ${scanner.role} cannot scan at ${scanLocation}`,
    });
    return res.status(403).json({
      result: 'INVALID',
      reason: `${scanner.role} is not allowed to scan at ${scanLocation}. CARETAKER → HOSTEL only, GUARD → VENUE only.`,
    });
  }

  try {
    const normalRoll = String(rollNo).trim().toUpperCase();
    const student    = await NightStudent.findOne({ rollNo: normalRoll });

    if (!student) {
      await logScan({
        rollNo: normalRoll, studentId: null,
        scanType: inferScanType('NOT_STARTED', scanLocation),
        scannedByUserId: scanner._id, scannedByName: scanner.name || '',
        scanLocation, scanTime: now, result: 'INVALID', reason: 'Student not found',
      });
      return res.status(200).json({ result: 'INVALID', reason: 'Student not found', rollNo: normalRoll });
    }

    if (student.defaulterBlocked) {
      await logScan({
        rollNo: student.rollNo, studentId: student._id,
        scanType: inferScanType('DEFAULTER', scanLocation),
        scannedByUserId: scanner._id, scannedByName: scanner.name || '',
        scanLocation, scanTime: now, result: 'DEFAULTER', reason: 'Student is permanently blocked',
      });
      return res.status(200).json({
        result: 'DEFAULTER',
        reason: 'Student is permanently blocked. Contact ADOSA for rollback.',
        student: { name: student.name, rollNo: student.rollNo, profileImageUrl: student.profileImageUrl, defaulterCount: student.defaulterCount },
      });
    }

    const session = await PermissionSession.findOne({
      studentId: student._id,
      currentPhase: { $nin: ['COMPLETED', 'DEFAULTER'] },
    }).sort({ createdAt: -1 });

    if (!session) {
      await logScan({
        rollNo: student.rollNo, studentId: student._id,
        scanType: inferScanType('NONE', scanLocation),
        scannedByUserId: scanner._id, scannedByName: scanner.name || '',
        scanLocation, scanTime: now, result: 'INVALID', reason: 'No active permission',
      });
      return res.status(200).json({
        result: 'INVALID', reason: 'No active night permission for this student',
        student: { name: student.name, rollNo: student.rollNo, profileImageUrl: student.profileImageUrl },
      });
    }

    if (now < session.permissionStartDateTime && session.currentPhase === 'NOT_STARTED') {
      return res.status(200).json({ result: 'INVALID', reason: 'Permission window has not started yet' });
    }

    const { currentPhase } = session;
    const scanType = inferScanType(currentPhase, scanLocation);

    // ── Phase 1: Hostel Exit ──────────────────────────────────────────────
    if (currentPhase === 'NOT_STARTED' && scanLocation === 'HOSTEL') {
      session.hostelExitAt  = now;
      session.currentPhase  = 'GOING_TO_VENUE';
      session.deadlineToVenue = new Date(now.getTime() + session.allowedToVenueMinutes * 60_000);
      await session.save();

      await logScan({
        rollNo: student.rollNo, studentId: student._id,
        permissionSessionId: session._id, scanType: 'HOSTEL_EXIT',
        scannedByUserId: scanner._id, scannedByName: scanner.name || '',
        scanLocation, scanTime: now, result: 'VALID',
      });

      emitSafe('np:session-started', {
        studentId: student._id, sessionId: session._id, deadlineToVenue: session.deadlineToVenue,
      }, 'night-permissions');

      return res.status(200).json({
        result: 'VALID',
        message: `Hostel exit recorded. Must reach ${session.venueName} by ${new Date(session.deadlineToVenue).toLocaleTimeString('en-IN')}.`,
        student: { name: student.name, rollNo: student.rollNo, profileImageUrl: student.profileImageUrl, hostel: student.hostel },
        session: { currentPhase: 'GOING_TO_VENUE', deadlineToVenue: session.deadlineToVenue },
      });
    }

    // ── Phase 2: Venue Entry ──────────────────────────────────────────────
    if (currentPhase === 'GOING_TO_VENUE' && scanLocation === 'VENUE') {
      if (now > session.deadlineToVenue) {
        await markDefaulter(student, session, 'LATE_TO_VENUE');
        await logScan({
          rollNo: student.rollNo, studentId: student._id,
          permissionSessionId: session._id, scanType: 'VENUE_ENTRY',
          scannedByUserId: scanner._id, scannedByName: scanner.name || '',
          scanLocation, scanTime: now, result: 'DEFAULTER', reason: 'Arrived late to venue',
        });
        return res.status(200).json({
          result: 'DEFAULTER', reason: 'Arrived late to venue. Marked defaulter.',
          student: { name: student.name, rollNo: student.rollNo, profileImageUrl: student.profileImageUrl },
        });
      }

      session.venueArrivalAt = now;
      session.currentPhase   = 'AT_VENUE';
      await session.save();

      await logScan({
        rollNo: student.rollNo, studentId: student._id,
        permissionSessionId: session._id, scanType: 'VENUE_ENTRY',
        scannedByUserId: scanner._id, scannedByName: scanner.name || '',
        scanLocation, scanTime: now, result: 'VALID',
      });

      emitSafe('np:venue-arrived', { studentId: student._id, sessionId: session._id }, 'night-permissions');

      return res.status(200).json({
        result: 'VALID', message: 'Venue entry recorded.',
        student: { name: student.name, rollNo: student.rollNo, profileImageUrl: student.profileImageUrl },
        session: { currentPhase: 'AT_VENUE' },
      });
    }

    // ── Phase 3: Venue Exit ───────────────────────────────────────────────
    if (currentPhase === 'AT_VENUE' && scanLocation === 'VENUE') {
      session.venueExitAt     = now;
      session.currentPhase    = 'RETURNING_TO_HOSTEL';
      session.deadlineToHostel = new Date(now.getTime() + session.allowedToHostelMinutes * 60_000);
      await session.save();

      await logScan({
        rollNo: student.rollNo, studentId: student._id,
        permissionSessionId: session._id, scanType: 'VENUE_EXIT',
        scannedByUserId: scanner._id, scannedByName: scanner.name || '',
        scanLocation, scanTime: now, result: 'VALID',
      });

      emitSafe('np:venue-exited', {
        studentId: student._id, sessionId: session._id, deadlineToHostel: session.deadlineToHostel,
      }, 'night-permissions');

      return res.status(200).json({
        result: 'VALID',
        message: `Venue exit recorded. Must return to hostel by ${new Date(session.deadlineToHostel).toLocaleTimeString('en-IN')}.`,
        student: { name: student.name, rollNo: student.rollNo, profileImageUrl: student.profileImageUrl },
        session: { currentPhase: 'RETURNING_TO_HOSTEL', deadlineToHostel: session.deadlineToHostel },
      });
    }

    // ── Phase 4: Hostel Entry ─────────────────────────────────────────────
    if (currentPhase === 'RETURNING_TO_HOSTEL' && scanLocation === 'HOSTEL') {
      if (now > session.deadlineToHostel) {
        await markDefaulter(student, session, 'LATE_TO_HOSTEL');
        await logScan({
          rollNo: student.rollNo, studentId: student._id,
          permissionSessionId: session._id, scanType: 'HOSTEL_ENTRY',
          scannedByUserId: scanner._id, scannedByName: scanner.name || '',
          scanLocation, scanTime: now, result: 'DEFAULTER', reason: 'Returned late to hostel',
        });
        return res.status(200).json({
          result: 'DEFAULTER', reason: 'Returned late to hostel. Marked defaulter.',
          student: { name: student.name, rollNo: student.rollNo, profileImageUrl: student.profileImageUrl },
        });
      }

      session.hostelArrivalAt = now;
      session.currentPhase    = 'COMPLETED';
      await session.save();

      await logScan({
        rollNo: student.rollNo, studentId: student._id,
        permissionSessionId: session._id, scanType: 'HOSTEL_ENTRY',
        scannedByUserId: scanner._id, scannedByName: scanner.name || '',
        scanLocation, scanTime: now, result: 'VALID',
      });

      emitSafe('np:session-completed', { studentId: student._id, sessionId: session._id }, 'night-permissions');

      return res.status(200).json({
        result: 'VALID', message: '✅ Safe return confirmed. Permission cycle complete.',
        student: { name: student.name, rollNo: student.rollNo, profileImageUrl: student.profileImageUrl },
        session: { currentPhase: 'COMPLETED' },
      });
    }

    // ── Invalid combination ───────────────────────────────────────────────
    await logScan({
      rollNo: student.rollNo, studentId: student._id,
      permissionSessionId: session._id, scanType,
      scannedByUserId: scanner._id, scannedByName: scanner.name || '',
      scanLocation, scanTime: now, result: 'INVALID',
      reason: `Invalid: phase=${currentPhase}, location=${scanLocation}`,
    });

    return res.status(200).json({
      result: 'INVALID',
      reason: `Cannot scan at ${scanLocation} when phase is ${currentPhase}`,
      student: { name: student.name, rollNo: student.rollNo, profileImageUrl: student.profileImageUrl },
      session: { currentPhase },
    });

  } catch (err) {
    console.error('❌ processScan error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/night/scan/logs ──────────────────────────────────────────────────

export const getScanLogs = async (req, res) => {
  try {
    const { rollNo, date, result, limit = 100 } = req.query;
    const query = {};
    if (rollNo)  query.rollNo = String(rollNo).toUpperCase();
    if (result)  query.result = result;
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end   = new Date(date); end.setHours(23, 59, 59, 999);
      query.scanTime = { $gte: start, $lte: end };
    }

    const logs = await ScanLog.find(query)
      .sort({ scanTime: -1 })
      .limit(Math.min(Number(limit), 500));

    res.status(200).json(logs);
  } catch (err) {
    console.error('❌ getScanLogs error:', err);
    res.status(500).json({ message: err.message });
  }
};
