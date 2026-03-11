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

const isRolePhaseAllowed = (role, phase, scanLocation) => {
  const normalizedRole = String(role || '').toLowerCase();
  if (['admin', 'adosa'].includes(normalizedRole)) return true;
  if (normalizedRole === 'caretaker') {
    return phase === 'NOT_STARTED' && scanLocation === 'HOSTEL';
  }
  if (normalizedRole === 'guard') {
    return phase === 'AT_VENUE' && scanLocation === 'VENUE';
  }
  return false;
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

const buildPermissionDetails = (session = null) => {
  if (!session) return null;
  const start = session.permissionStartDateTime ? new Date(session.permissionStartDateTime) : null;
  const end = session.permissionEndDateTime ? new Date(session.permissionEndDateTime) : null;
  return {
    permissionListId: session.permissionListId || null,
    venueName: session.venueName || '',
    venueHall: session.venueHall || '',
    permissionStartDateTime: start || null,
    permissionEndDateTime: end || null,
    sessionDate: start ? start.toISOString().slice(0, 10) : null,
    allowedFromTime: start ? start.toTimeString().slice(0, 5) : null,
    allowedToTime: end ? end.toTimeString().slice(0, 5) : null,
    allowedToVenueMinutes: session.allowedToVenueMinutes ?? null,
    allowedToHostelMinutes: session.allowedToHostelMinutes ?? null,
    hostelExitAt: session.hostelExitAt || null,
    venueArrivalAt: session.venueArrivalAt || null,
    venueExitAt: session.venueExitAt || null,
    hostelArrivalAt: session.hostelArrivalAt || null,
    deadlineToVenue: session.deadlineToVenue || null,
    deadlineToHostel: session.deadlineToHostel || null,
  };
};

const buildScanResponse = ({
  result,
  message = '',
  reason = '',
  student = null,
  session = null,
  extra = {},
}) => ({
  result,
  message,
  reason,
  studentName: student?.name || '',
  rollNo: student?.rollNo || '',
  photoURL: student?.profileImageUrl || '',
  sessionPhase: session?.currentPhase || null,
  permissionDetails: buildPermissionDetails(session),
  student: student
    ? {
        name: student.name,
        rollNo: student.rollNo,
        profileImageUrl: student.profileImageUrl,
        hostel: student.hostel,
        defaulterCount: student.defaulterCount,
      }
    : null,
  session: session
    ? {
        currentPhase: session.currentPhase,
        deadlineToVenue: session.deadlineToVenue || null,
        deadlineToHostel: session.deadlineToHostel || null,
      }
    : null,
  ...extra,
});

const buildInvalidScanResponse = ({ student = null, session = null }) => buildScanResponse({
  result: 'INVALID',
  reason: 'Invalid scan location.',
  student,
  session,
});

const getRecentScanLog = async (rollNo, now) =>
  ScanLog.findOne({
    rollNo,
    scanTime: { $gte: new Date(now.getTime() - 5000) },
  }).sort({ scanTime: -1 });

const parseDailyCutoff = (timeValue, now = new Date()) => {
  const match = String(timeValue || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const cutoff = new Date(now);
  cutoff.setHours(hours, minutes, 0, 0);
  return cutoff;
};

const isWithinSessionWindow = (session, now) => (
  now >= session.permissionStartDateTime && now <= session.permissionEndDateTime
);

const getTodayBounds = (now = new Date()) => {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
};

const pickTodaySession = async (studentId, now) => {
  const { startOfDay, endOfDay } = getTodayBounds(now);
  const sessions = await PermissionSession.find({
    studentId,
    permissionStartDateTime: { $gte: startOfDay, $lte: endOfDay },
    currentPhase: { $nin: ['COMPLETED', 'DEFAULTER'] },
  }).sort({ permissionStartDateTime: 1, createdAt: 1 });

  const activeWindowSession = sessions.find((session) => isWithinSessionWindow(session, now));
  if (activeWindowSession) {
    return { session: activeWindowSession, sessions };
  }

  return {
    session: sessions[0] || null,
    sessions,
  };
};

const resolveScanIdentity = async ({ rollNo, now }) => {
  const normalRoll = String(rollNo || '').trim().toUpperCase();
  if (!normalRoll) {
    return { error: { code: 'MISSING_ROLL', message: 'rollNo and scanLocation are required' } };
  }

  const student = await NightStudent.findOne({ rollNo: normalRoll });
  if (!student) {
    return { error: { code: 'STUDENT_NOT_FOUND', message: 'Student not found', rollNo: normalRoll } };
  }

  const { session } = await pickTodaySession(student._id, now);
  return { student, session, rollNo: normalRoll };
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

const resolveScanCutoff = ({ scannerRole, currentPhase, settings, now }) => {
  const role = String(scannerRole || '').toLowerCase();

  if (role === 'caretaker' && currentPhase === 'NOT_STARTED') {
    const cutoffAt = parseDailyCutoff(settings.lastScanTimeCaretaker, now);
    if (!cutoffAt) return null;
    return {
      cutoffAt,
      cutoffLabel: settings.lastScanTimeCaretaker,
      violationReason: 'CARETAKER_SCAN_CUTOFF_EXCEEDED',
      userMessage: `Caretaker scan cutoff exceeded for today (${settings.lastScanTimeCaretaker}).`,
    };
  }

  if (role === 'guard' && ['GOING_TO_VENUE', 'AT_VENUE'].includes(currentPhase)) {
    const cutoffAt = parseDailyCutoff(settings.lastScanTimeGuard, now);
    if (!cutoffAt) return null;
    return {
      cutoffAt,
      cutoffLabel: settings.lastScanTimeGuard,
      violationReason: 'GUARD_SCAN_CUTOFF_EXCEEDED',
      userMessage: `Guard scan cutoff exceeded for today (${settings.lastScanTimeGuard}).`,
    };
  }

  return null;
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
      ...buildScanResponse({
        result: 'INVALID',
        reason: `${scanner.role} is not allowed to scan at ${scanLocation}. CARETAKER → HOSTEL only, GUARD → VENUE only.`,
      }),
    });
  }

  try {
    const settings = await getSettings();
    const identity = await resolveScanIdentity({ rollNo, now });

    if (identity.error?.code === 'STUDENT_NOT_FOUND') {
      await logScan({
        rollNo: identity.error.rollNo, studentId: null,
        scanType: inferScanType('NOT_STARTED', scanLocation),
        scannedByUserId: scanner._id, scannedByName: scanner.name || '',
        scanLocation, scanTime: now, result: 'INVALID', reason: 'Student not found',
      });
      return res.status(200).json({
        ...buildScanResponse({
          result: 'INVALID',
          reason: 'Student not found',
        }),
        rollNo: identity.error.rollNo,
      });
    }

    if (identity.error) {
      return res.status(200).json(buildScanResponse({
        result: identity.error.code === 'REUSED_QR' ? 'INVALID' : 'INVALID',
        reason: identity.error.message,
      }));
    }

    const { student, session } = identity;

    if (student.defaulterBlocked) {
      await logScan({
        rollNo: student.rollNo, studentId: student._id,
        scanType: inferScanType('DEFAULTER', scanLocation),
        scannedByUserId: scanner._id, scannedByName: scanner.name || '',
        scanLocation, scanTime: now, result: 'DEFAULTER', reason: 'Student is permanently blocked',
      });
      return res.status(200).json(buildScanResponse({
        result: 'DEFAULTER',
        reason: 'Student is permanently blocked. Contact ADOSA for rollback.',
        student,
      }));
    }

    const recentScan = await getRecentScanLog(student.rollNo, now);
    if (recentScan) {
      return res.status(200).json(buildScanResponse({
        result: 'IGNORED',
        message: 'Duplicate scan ignored.',
        reason: 'Same student was scanned in the last 5 seconds',
        student,
        session,
      }));
    }

    if (!session) {
      await logScan({
        rollNo: student.rollNo, studentId: student._id,
        permissionSessionId: null,
        scanType: inferScanType('NONE', scanLocation),
        scannedByUserId: scanner._id, scannedByName: scanner.name || '',
        scanLocation, scanTime: now, result: 'INVALID', reason: 'No permission for today.',
      });
      return res.status(200).json(buildScanResponse({
        result: 'INVALID',
        reason: 'No permission for today.',
        student,
      }));
    }

    if (!isWithinSessionWindow(session, now)) {
      return res.status(200).json(buildScanResponse({
        result: 'INVALID',
        reason: 'Current time is outside the allowed window for today.',
        student,
        session,
      }));
    }

    const { currentPhase } = session;
    const scanType = inferScanType(currentPhase, scanLocation);
    if (!isRolePhaseAllowed(scanner.role, currentPhase, scanLocation)) {
      await logScan({
        rollNo: student.rollNo,
        studentId: student._id,
        permissionSessionId: session._id,
        scanType,
        scannedByUserId: scanner._id,
        scannedByName: scanner.name || '',
        scanLocation,
        scanTime: now,
        result: 'INVALID',
        reason: 'Invalid scan location.',
      });
      return res.status(403).json(buildInvalidScanResponse({ student, session }));
    }
    const cutoffRule = resolveScanCutoff({
      scannerRole: scanner.role,
      currentPhase,
      settings,
      now,
    });

    if (cutoffRule && now > cutoffRule.cutoffAt) {
      await markDefaulter(student, session, cutoffRule.violationReason);
      await logScan({
        rollNo: student.rollNo,
        studentId: student._id,
        permissionSessionId: session._id,
        scanType,
        scannedByUserId: scanner._id,
        scannedByName: scanner.name || '',
        scanLocation,
        scanTime: now,
        result: 'DEFAULTER',
        reason: cutoffRule.userMessage,
      });

      return res.status(200).json(buildScanResponse({
        result: 'DEFAULTER',
        reason: cutoffRule.userMessage,
        student,
        session,
      }));
    }

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
      emitSafe('np:scan-log', {
        rollNo: student.rollNo,
        scanType: 'HOSTEL_EXIT',
        scanLocation,
        scanTime: now,
        result: 'VALID',
        scannedByName: scanner.name || '',
      }, 'night-permissions');

      return res.status(200).json(buildScanResponse({
        result: 'VALID',
        message: `Hostel exit recorded. Must reach ${session.venueName} by ${new Date(session.deadlineToVenue).toLocaleTimeString('en-IN')}.`,
        student,
        session,
      }));
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
        return res.status(200).json(buildScanResponse({
          result: 'DEFAULTER',
          reason: 'Arrived late to venue. Marked defaulter.',
          student,
          session,
        }));
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

      return res.status(200).json(buildScanResponse({
        result: 'VALID',
        message: 'Venue entry recorded.',
        student,
        session,
      }));
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
      emitSafe('np:scan-log', {
        rollNo: student.rollNo,
        scanType: 'VENUE_EXIT',
        scanLocation,
        scanTime: now,
        result: 'VALID',
        scannedByName: scanner.name || '',
      }, 'night-permissions');

      return res.status(200).json(buildScanResponse({
        result: 'VALID',
        message: `Venue exit recorded. Must return to hostel by ${new Date(session.deadlineToHostel).toLocaleTimeString('en-IN')}.`,
        student,
        session,
      }));
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
        return res.status(200).json(buildScanResponse({
          result: 'DEFAULTER',
          reason: 'Returned late to hostel. Marked defaulter.',
          student,
          session,
        }));
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

      return res.status(200).json(buildScanResponse({
        result: 'VALID',
        message: '✅ Safe return confirmed. Permission cycle complete.',
        student,
        session,
      }));
    }

    // ── Invalid combination ───────────────────────────────────────────────
    await logScan({
      rollNo: student.rollNo, studentId: student._id,
      permissionSessionId: session._id, scanType,
      scannedByUserId: scanner._id, scannedByName: scanner.name || '',
      scanLocation, scanTime: now, result: 'INVALID',
      reason: `Invalid: phase=${currentPhase}, location=${scanLocation}`,
    });

    return res.status(200).json(buildScanResponse({
      result: 'INVALID',
      reason: `Cannot scan at ${scanLocation} when phase is ${currentPhase}`,
      student,
      session,
    }));

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
