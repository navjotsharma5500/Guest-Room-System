import PermissionSession from '../models/PermissionSession.js';
import NightStudent from '../models/NightStudent.js';
import ScanLog from '../models/ScanLog.js';

const getDayBounds = (dateValue = new Date()) => {
  const date = new Date(dateValue);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const getHourKey = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours();
};

const getPeakHour = (values = []) => {
  const counts = new Map();
  for (const value of values) {
    const hour = getHourKey(value);
    if (hour === null) continue;
    counts.set(hour, (counts.get(hour) || 0) + 1);
  }

  if (counts.size === 0) return null;

  let peakHour = null;
  let peakCount = -1;
  for (const [hour, count] of counts.entries()) {
    if (count > peakCount) {
      peakHour = hour;
      peakCount = count;
    }
  }

  return `${String(peakHour).padStart(2, '0')}:00`;
};

const sanitizeScan = (scan = null) => {
  if (!scan) return null;
  return {
    _id: scan._id,
    rollNo: scan.rollNo,
    scanType: scan.scanType,
    scanLocation: scan.scanLocation,
    scanTime: scan.scanTime,
    scannedByName: scan.scannedByName,
    result: scan.result,
    reason: scan.reason,
  };
};

export const getNightDashboard = async (req, res) => {
  try {
    const { start, end } = getDayBounds();
    const [totalStudents, todaySessions] = await Promise.all([
      NightStudent.countDocuments({ isActive: true }),
      PermissionSession.find({
        permissionStartDateTime: { $gte: start, $lte: end },
      }).select('studentId currentPhase'),
    ]);

    const phaseCounts = todaySessions.reduce((acc, session) => {
      const phase = session.currentPhase || 'UNKNOWN';
      acc[phase] = (acc[phase] || 0) + 1;
      return acc;
    }, {});

    const activePermissionsToday = todaySessions.length;
    const studentsAtVenue = phaseCounts.AT_VENUE || 0;
    const studentsReturning = phaseCounts.RETURNING_TO_HOSTEL || 0;
    const studentsOutsideHostel = (phaseCounts.GOING_TO_VENUE || 0) + studentsAtVenue + studentsReturning;
    const studentsInsideHostel = (phaseCounts.NOT_STARTED || 0) + (phaseCounts.COMPLETED || 0);
    const defaultersToday = phaseCounts.DEFAULTER || 0;

    res.status(200).json({
      totalStudents,
      studentsOutsideHostel,
      studentsInsideHostel,
      studentsAtVenue,
      studentsReturning,
      defaultersToday,
      activePermissionsToday,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getGateStatus = async (req, res) => {
  try {
    const lastHourStart = new Date(Date.now() - (60 * 60 * 1000));
    const [lastHourScans, latestScans] = await Promise.all([
      ScanLog.find({ scanTime: { $gte: lastHourStart } })
        .sort({ scanTime: -1 })
        .populate('scannedByUserId', 'name role'),
      ScanLog.find({})
        .sort({ scanTime: -1 })
        .limit(50)
        .populate('scannedByUserId', 'name role'),
    ]);

    const lastCaretakerScan = latestScans.find((scan) => (scan.scannedByUserId?.role || '').toLowerCase() === 'caretaker') || null;
    const lastGuardScan = latestScans.find((scan) => (scan.scannedByUserId?.role || '').toLowerCase() === 'guard') || null;

    const activeScannersMap = new Map();
    for (const scan of lastHourScans) {
      const scannerId = scan.scannedByUserId?._id?.toString();
      if (!scannerId) continue;
      if (!activeScannersMap.has(scannerId)) {
        activeScannersMap.set(scannerId, {
          userId: scannerId,
          name: scan.scannedByUserId.name || scan.scannedByName || 'Unknown',
          role: scan.scannedByUserId.role || '',
          lastScanTime: scan.scanTime,
        });
      }
    }

    res.status(200).json({
      lastCaretakerScan: sanitizeScan(lastCaretakerScan),
      lastGuardScan: sanitizeScan(lastGuardScan),
      scansLastHour: lastHourScans.length,
      activeScanners: [...activeScannersMap.values()],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getNightAnalytics = async (req, res) => {
  try {
    const { date } = req.query;
    const { start, end } = getDayBounds(date || new Date());

    const sessions = await PermissionSession.find({
      permissionStartDateTime: { $gte: start, $lte: end },
    }).select('hostelExitAt hostelArrivalAt defaulterReason currentPhase');

    const totalPermissions = sessions.length;
    const totalExited = sessions.filter((session) => !!session.hostelExitAt).length;
    const totalReturned = sessions.filter((session) => !!session.hostelArrivalAt).length;
    const lateReturns = sessions.filter((session) => session.defaulterReason === 'LATE_TO_HOSTEL').length;
    const defaulters = sessions.filter((session) => session.currentPhase === 'DEFAULTER').length;
    const peakExitHour = getPeakHour(sessions.map((session) => session.hostelExitAt).filter(Boolean));
    const peakReturnHour = getPeakHour(sessions.map((session) => session.hostelArrivalAt).filter(Boolean));

    res.status(200).json({
      totalPermissions,
      totalExited,
      totalReturned,
      lateReturns,
      defaulters,
      peakExitHour,
      peakReturnHour,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
