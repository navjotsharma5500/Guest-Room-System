import XLSX from "xlsx";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import Booking from "../models/Booking.js";
import Bill from "../models/Bill.js";
import ExtensionRequest from "../models/ExtensionRequest.js";
import Hostel from "../models/Hostel.js";
import User from "../models/User.js";
import VenueBooking from "../models/VenueBooking.js";
import masterTemplate from "../emails/templates/masterTemplate.js";
import { sendEmailAdvanced } from "../emails/sendEmail.js";

const REPORT_TIMEZONE = "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;
const LOGO_PATH = path.join(process.cwd(), "assets", "thapar_logo.png");

const PERIOD_META = {
  weekly: { label: "Weekly", filenamePrefix: "weekly" },
  monthly: { label: "Monthly", filenamePrefix: "monthly" },
  quarterly: { label: "Quarterly", filenamePrefix: "quarterly" },
  annual: { label: "Annual", filenamePrefix: "annual" },
};

const REPORT_TYPES = {
  guest_room: {
    key: "guest_room",
    title: "Guest Room",
    subjectPrefix: "Guest Room",
    emailTitle: "Guest Room Analytics Report",
    filenamePrefix: "guest-room",
  },
  venue_booking: {
    key: "venue_booking",
    title: "Venue Booking",
    subjectPrefix: "Venue Booking",
    emailTitle: "Venue Booking Analytics Report",
    filenamePrefix: "venue-booking",
  },
};

const toStartOfDay = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const addDays = (value, days) => new Date(toStartOfDay(value).getTime() + days * DAY_MS);

const inRange = (value, start, end) => {
  if (!value) return false;
  const date = new Date(value);
  return date >= start && date < end;
};

const dateOnlyValue = (value) => {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
};

const formatDateIST = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
};

const formatDateTimeIST = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const countBy = (items, keyFn) => {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item) || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
};

const sumBy = (items, valueFn) =>
  items.reduce((sum, item) => sum + Number(valueFn(item) || 0), 0);

const toRows = (counts, labelKey, valueKey) =>
  Object.entries(counts)
    .map(([label, value]) => ({ [labelKey]: label, [valueKey]: value }))
    .sort((a, b) => b[valueKey] - a[valueKey]);

const withFallbackRows = (rows, label = "No records") =>
  Array.isArray(rows) && rows.length > 0 ? rows : [{ Info: label }];

const appendSheet = (workbook, name, rows) => {
  const sheet = XLSX.utils.json_to_sheet(withFallbackRows(rows));
  XLSX.utils.book_append_sheet(workbook, sheet, name);
};

const getPeriodWindow = (periodKey, now = new Date()) => {
  const today = toStartOfDay(now);

  if (periodKey === "weekly") {
    return { start: addDays(today, -7), end: today };
  }
  if (periodKey === "monthly") {
    return {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 1),
    };
  }
  if (periodKey === "quarterly") {
    const currentQuarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
    const end = new Date(today.getFullYear(), currentQuarterStartMonth, 1);
    const start = new Date(end.getFullYear(), end.getMonth() - 3, 1);
    return { start, end };
  }
  if (periodKey === "annual") {
    return {
      start: new Date(today.getFullYear() - 1, 0, 1),
      end: new Date(today.getFullYear(), 0, 1),
    };
  }

  throw new Error(`Unsupported analytics period: ${periodKey}`);
};

const getAdminRecipients = async () => {
  const admins = await User.find({ role: "admin" }).select("email name").lean();
  const unique = new Map();

  for (const admin of admins) {
    const email = String(admin.email || "").trim().toLowerCase();
    if (!email) continue;
    if (!unique.has(email)) {
      unique.set(email, { email, name: admin.name || "Admin" });
    }
  }

  return Array.from(unique.values());
};

const createWorkbookBuffer = (sheetEntries) => {
  const workbook = XLSX.utils.book_new();
  for (const entry of sheetEntries) {
    appendSheet(workbook, entry.name, entry.rows);
  }
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
};

const createPdfBuffer = ({ reportType, periodMeta, rangeStart, rangeEnd, summaryBlocks, chartSections }) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
      });

      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const pageWidth = 515;
      let y = 40;

      doc.rect(40, y, pageWidth, 5).fill("#0f4c81");
      y += 14;

      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, 46, y, { fit: [55, 55] });
      }

      const headerTextX = 110;
      const headerTextWidth = 395;
      const instituteTitle = "THAPAR INSTITUTE OF ENGINEERING & TECHNOLOGY";

      doc.font("Helvetica-Bold").fontSize(17).fillColor("#0f4c81");
      const instituteTitleHeight = doc.heightOfString(instituteTitle, {
        width: headerTextWidth,
        align: "left",
      });
      doc.text(instituteTitle, headerTextX, y + 4, {
        width: headerTextWidth,
        align: "left",
      });

      let headerMetaY = y + 4 + instituteTitleHeight + 6;
      doc.font("Helvetica").fontSize(9).fillColor("#6b7280");
      doc.text("Patiala, Punjab • Analytics Report", headerTextX, headerMetaY, {
        width: headerTextWidth,
        align: "left",
      });

      headerMetaY += 14;
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#374151");
      doc.text(`${reportType.title} Dashboard`, headerTextX, headerMetaY, {
        width: headerTextWidth,
        align: "left",
      });

      y = Math.max(120, headerMetaY + 30);

      doc.roundedRect(40, y, pageWidth, 32, 8).fill("#1b74c9");
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14);
      doc.text(
        `${periodMeta.label} ${reportType.title} Analytics`,
        40,
        y + 9,
        { width: pageWidth, align: "center" }
      );
      y += 46;

      doc.roundedRect(40, y, pageWidth, 42, 8).fillAndStroke("#f8fafc", "#dbeafe");
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10);
      doc.text(`Report Window: ${formatDateIST(rangeStart)} to ${formatDateIST(addDays(rangeEnd, -1))}`, 52, y + 10);
      doc.font("Helvetica").fontSize(9).fillColor("#374151");
      doc.text(`Generated: ${formatDateTimeIST(new Date())}`, 52, y + 24);
      y += 58;

      const ensurePageSpace = (needed = 120) => {
        if (y + needed < 760) return;
        doc.addPage();
        y = 40;
      };

      for (const section of summaryBlocks) {
        ensurePageSpace(110);
        doc.fillColor("#0f4c81").font("Helvetica-Bold").fontSize(12);
        doc.text(section.title, 40, y);
        y += 18;

        doc.roundedRect(40, y, pageWidth, Math.max(36, section.items.length * 18 + 14), 8)
          .fillAndStroke("#ffffff", "#e5e7eb");

        let rowY = y + 10;
        for (const item of section.items) {
          doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
          doc.text(item.label, 54, rowY, { width: 300 });
          doc.font("Helvetica-Bold").fillColor("#111827");
          doc.text(String(item.value), 360, rowY, { width: 175, align: "right" });
          rowY += 16;
        }

        y += Math.max(36, section.items.length * 18 + 14) + 16;
      }

      for (const chart of chartSections) {
        ensurePageSpace(170);
        doc.fillColor("#0f4c81").font("Helvetica-Bold").fontSize(12);
        doc.text(chart.title, 40, y);
        y += 16;

        doc.roundedRect(40, y, pageWidth, 120, 8).fillAndStroke("#ffffff", "#e5e7eb");

        const chartData = chart.rows.slice(0, 8);
        if (chart.variant === "bar") {
          const max = Math.max(...chartData.map((row) => Number(row.value || 0)), 1);
          let barY = y + 16;
          for (const row of chartData) {
            const barWidth = ((Number(row.value || 0) / max) * 260);
            doc.font("Helvetica").fontSize(8).fillColor("#374151");
            doc.text(row.label, 54, barY + 3, { width: 130 });
            doc.roundedRect(190, barY, barWidth, 10, 4).fill("#1b74c9");
            doc.font("Helvetica-Bold").fillColor("#111827");
            doc.text(String(row.value), 460, barY + 2, { width: 70, align: "right" });
            barY += 14;
          }
        } else if (chart.variant === "line") {
          const max = Math.max(...chartData.map((row) => Number(row.value || 0)), 1);
          const min = Math.min(...chartData.map((row) => Number(row.value || 0)), 0);
          const stepX = chartData.length > 1 ? 360 / (chartData.length - 1) : 360;
          const points = chartData.map((row, index) => {
            const normalized = max === min ? 0.5 : (Number(row.value || 0) - min) / (max - min);
            return {
              x: 110 + index * stepX,
              y: y + 100 - normalized * 70,
              label: row.label,
              value: row.value,
            };
          });

          doc.moveTo(90, y + 100).lineTo(470, y + 100).strokeColor("#d1d5db").stroke();
          doc.moveTo(90, y + 20).lineTo(90, y + 100).strokeColor("#d1d5db").stroke();
          doc.strokeColor("#2563eb").lineWidth(2);
          points.forEach((point, index) => {
            if (index === 0) doc.moveTo(point.x, point.y);
            else doc.lineTo(point.x, point.y);
          });
          doc.stroke();

          points.forEach((point) => {
            doc.circle(point.x, point.y, 3).fill("#1b74c9");
            doc.font("Helvetica").fontSize(7).fillColor("#374151");
            doc.text(String(point.label), point.x - 20, y + 104, { width: 40, align: "center" });
            doc.text(String(point.value), point.x - 20, point.y - 14, { width: 40, align: "center" });
          });
        } else {
          const total = chartData.reduce((sum, row) => sum + Number(row.value || 0), 0) || 1;
          const centerX = 180;
          const centerY = y + 60;
          let startAngle = 0;
          const palette = ["#1b74c9", "#0f4c81", "#60a5fa", "#10b981", "#f59e0b", "#ef4444"];

          chartData.forEach((row, index) => {
            const value = Number(row.value || 0);
            const slice = (value / total) * Math.PI * 2;
            doc.moveTo(centerX, centerY);
            doc.fillColor(palette[index % palette.length]);
            doc.arc(centerX, centerY, 42, startAngle, startAngle + slice).lineTo(centerX, centerY).fill();
            startAngle += slice;
          });

          let legendY = y + 18;
          chartData.forEach((row, index) => {
            doc.rect(300, legendY, 10, 10).fill(palette[index % palette.length]);
            doc.font("Helvetica").fontSize(8).fillColor("#374151");
            doc.text(`${row.label}: ${row.value}`, 318, legendY + 1, { width: 190 });
            legendY += 14;
          });
        }

        y += 136;
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });

const buildGuestRoomEmailHtml = ({ periodMeta, rangeStart, rangeEnd, summary, workbookName, pdfName }) => {
  const content = `
    <div style="text-align:left;">
      <p style="margin:0 0 16px;">Please find attached the <strong>${periodMeta.label.toLowerCase()}</strong> Guest Room analytics pack for Thapar Institute of Engineering &amp; Technology.</p>

      <div style="background:#f8fafc;border:1px solid #dbeafe;border-radius:12px;padding:16px 18px;margin-bottom:18px;">
        <div style="font-size:15px;font-weight:700;color:#0f4c81;margin-bottom:8px;">Reporting Window</div>
        <div><strong>From:</strong> ${formatDateIST(rangeStart)}</div>
        <div><strong>To:</strong> ${formatDateIST(addDays(rangeEnd, -1))}</div>
      </div>

      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;margin-bottom:16px;">
        <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:10px;">Operational Highlights</div>
        <ul style="margin:0;padding-left:18px;">
          <li><strong>Bookings created:</strong> ${summary.bookingsCreated}</li>
          <li><strong>Total guests accommodated:</strong> ${summary.guestsCounted}</li>
          <li><strong>Check-ins / Check-outs:</strong> ${summary.checkInsOccurred} / ${summary.checkOutsOccurred}</li>
          <li><strong>Cancellations / No-shows:</strong> ${summary.cancellationsOccurred} / ${summary.noShowsOccurred}</li>
          <li><strong>Direct extensions / Approved extensions:</strong> ${summary.directExtensionsUsed} / ${summary.approvedExtensions}</li>
          <li><strong>Blocked rooms snapshot:</strong> ${summary.blockedRoomsNow}</li>
        </ul>
      </div>

      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;margin-bottom:16px;">
        <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:10px;">Financial Highlights</div>
        <ul style="margin:0;padding-left:18px;">
          <li><strong>Total billed:</strong> ${formatCurrency(summary.totalBilled)}</li>
          <li><strong>Total collected:</strong> ${formatCurrency(summary.totalCollected)}</li>
          <li><strong>Total outstanding:</strong> ${formatCurrency(summary.totalOutstanding)}</li>
          <li><strong>Total discount / waiver impact:</strong> ${formatCurrency(summary.totalDiscount)}</li>
          <li><strong>Current defaulters:</strong> ${summary.currentDefaulters} guest(s), ${formatCurrency(summary.currentDefaulterOutstanding)} pending</li>
        </ul>
      </div>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px 16px;color:#1e3a8a;">
        Attachments included:
        <ul style="margin:8px 0 0 18px;padding:0;">
          <li><strong>${workbookName}</strong> — detailed Excel workbook with booking, payment, hostel, guest-count, extension, defaulter, and blocked-room sheets</li>
          <li><strong>${pdfName}</strong> — branded PDF summary with charts and operational highlights</li>
        </ul>
      </div>
    </div>
  `;

  return masterTemplate({
    title: `${periodMeta.label} Guest Room Analytics`,
    content,
    skipDefaultButton: true,
  });
};

const buildVenueEmailHtml = ({ periodMeta, rangeStart, rangeEnd, summary, workbookName, pdfName }) => {
  const content = `
    <div style="text-align:left;">
      <p style="margin:0 0 16px;">Please find attached the <strong>${periodMeta.label.toLowerCase()}</strong> Venue Booking analytics pack for Thapar Institute of Engineering &amp; Technology.</p>

      <div style="background:#f8fafc;border:1px solid #dbeafe;border-radius:12px;padding:16px 18px;margin-bottom:18px;">
        <div style="font-size:15px;font-weight:700;color:#0f4c81;margin-bottom:8px;">Reporting Window</div>
        <div><strong>From:</strong> ${formatDateIST(rangeStart)}</div>
        <div><strong>To:</strong> ${formatDateIST(addDays(rangeEnd, -1))}</div>
      </div>

      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;margin-bottom:16px;">
        <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:10px;">Operational Highlights</div>
        <ul style="margin:0;padding-left:18px;">
          <li><strong>Bookings created:</strong> ${summary.bookingsCreated}</li>
          <li><strong>Active / Completed / Cancelled:</strong> ${summary.activeBookings} / ${summary.completedBookings} / ${summary.cancelledBookings}</li>
          <li><strong>Extensions processed:</strong> ${summary.extensionsOccurred}</li>
          <li><strong>Unique halls / rooms used:</strong> ${summary.uniqueHallsUsed} / ${summary.uniqueRoomsUsed}</li>
          <li><strong>Unique societies / departments:</strong> ${summary.uniqueSocieties} / ${summary.uniqueDepartments}</li>
          <li><strong>Most booked venue:</strong> ${summary.mostBookedVenue || "—"}</li>
          <li><strong>Longest event:</strong> ${summary.longestEventName || "—"} (${summary.longestEventDurationHours || 0} hrs)</li>
        </ul>
      </div>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px 16px;color:#1e3a8a;">
        Attachments included:
        <ul style="margin:8px 0 0 18px;padding:0;">
          <li><strong>${workbookName}</strong> — detailed Excel workbook with venue, department, society, event, extension, longest-event, and most-booked-venue analytics</li>
          <li><strong>${pdfName}</strong> — branded PDF summary with charts and venue booking highlights</li>
        </ul>
      </div>
    </div>
  `;

  return masterTemplate({
    title: `${periodMeta.label} Venue Booking Analytics`,
    content,
    skipDefaultButton: true,
  });
};

const fetchGuestRoomReportData = async (start, end) => {
  const [
    createdBookings,
    eventBookings,
    bills,
    extensionRequests,
    defaultersSnapshot,
    hostelsWithBlocks,
    allBookings,
  ] = await Promise.all([
    Booking.find({
      createdAt: { $gte: start, $lt: end },
    }).lean(),
    Booking.find({
      $or: [
        { actualCheckInDate: { $gte: start, $lt: end } },
        { checkedOutAt: { $gte: start, $lt: end } },
        { cancelDate: { $gte: start, $lt: end } },
        { noShowMarkedAt: { $gte: start, $lt: end } },
        { "directExtension.createdAt": { $gte: start, $lt: end } },
        { "extensionHistory.createdAt": { $gte: start, $lt: end } },
        { "extensionHistory.extendedAt": { $gte: start, $lt: end } },
      ],
    }).lean(),
    Bill.find({
      createdAt: { $gte: start, $lt: end },
    }).lean(),
    ExtensionRequest.find({
      createdAt: { $gte: start, $lt: end },
    }).lean(),
    Booking.find({
      paymentType: { $ne: "Free" },
      paymentResponsibility: { $ne: "DEPARTMENT" },
      status: { $in: ["checked_in", "checked_out"] },
      balanceAmount: { $gt: 0 },
    }).lean(),
    Hostel.find({ "rooms.isBlocked": true }).lean(),
    Booking.find({}).lean(),
  ]);

  const blockedRoomsSnapshot = [];
  for (const hostel of hostelsWithBlocks) {
    for (const room of hostel.rooms || []) {
      if (!room.isBlocked) continue;
      blockedRoomsSnapshot.push({
        hostel: hostel.name,
        roomNo: room.roomNo,
        roomType: room.roomType || "Guest Room",
        blockedTill: room.blockedTill,
        blockRemarks: room.blockRemarks || "",
        blockedAt: room.blockedAt,
        blockedBy: room.blockedBy ? String(room.blockedBy) : "",
      });
    }
  }

  return {
    createdBookings,
    eventBookings,
    bills,
    extensionRequests,
    defaultersSnapshot,
    blockedRoomsSnapshot,
    allBookings,
  };
};

const fetchVenueReportData = async (start, end) => {
  const [createdBookings, allBookings, extensionBookings] = await Promise.all([
    VenueBooking.find({ createdAt: { $gte: start, $lt: end } }).lean(),
    VenueBooking.find({}).lean(),
    VenueBooking.find({ "extensionHistory.extendedAt": { $gte: start, $lt: end } }).lean(),
  ]);

  return { createdBookings, allBookings, extensionBookings };
};

const extractGuestExtensions = (bookings, start, end) => {
  const rows = [];
  for (const booking of bookings) {
    if (booking.directExtension?.used && inRange(booking.directExtension.createdAt, start, end)) {
      rows.push({
        Type: "DIRECT_EXTENSION",
        Guest: booking.guest,
        Hostel: booking.hostel,
        Room: booking.roomNo,
        OldCheckout: formatDateIST(booking.directExtension.oldCheckout),
        NewCheckout: formatDateIST(booking.directExtension.newCheckout),
        PaymentType: booking.directExtension.paymentType || "—",
        Amount: Number(booking.directExtension.amount || 0),
        Remarks: booking.directExtension.remarks || "",
        CreatedAt: formatDateTimeIST(booking.directExtension.createdAt),
      });
    }

    for (const extension of booking.extensionHistory || []) {
      const extensionAt = extension.createdAt || extension.extendedAt;
      if (!inRange(extensionAt, start, end)) continue;
      rows.push({
        Type: extension.type || "APPROVED_EXTENSION",
        Guest: booking.guest,
        Hostel: booking.hostel,
        Room: booking.roomNo,
        OldCheckout: formatDateIST(extension.oldCheckout || extension.oldTo),
        NewCheckout: formatDateIST(extension.newCheckout || extension.newTo),
        PaymentType: extension.paymentType || "—",
        Amount: Number(extension.amount || extension.approvedAmount || 0),
        Remarks: extension.remarks || "",
        CreatedAt: formatDateTimeIST(extensionAt),
      });
    }
  }
  return rows.sort((a, b) => String(b.CreatedAt).localeCompare(String(a.CreatedAt)));
};

const extractVenueExtensions = (bookings, start, end) => {
  const rows = [];
  for (const booking of bookings) {
    for (const extension of booking.extensionHistory || []) {
      if (!inRange(extension.extendedAt, start, end)) continue;
      rows.push({
        Hall: booking.hall,
        Room: booking.roomNo,
        Event: booking.eventName,
        Society: booking.societyName || "—",
        OriginalCheckoutDate: extension.originalCheckOutDate || "—",
        OriginalCheckoutTime: extension.originalCheckOutTime || "—",
        NewCheckoutDate: extension.newCheckOutDate || "—",
        NewCheckoutTime: extension.newCheckOutTime || "—",
        Remarks: extension.remarks || "",
        ExtendedAt: formatDateTimeIST(extension.extendedAt),
      });
    }
  }
  return rows.sort((a, b) => String(b.ExtendedAt).localeCompare(String(a.ExtendedAt)));
};

const buildGuestRoomReportPackage = async (periodKey) => {
  const periodMeta = PERIOD_META[periodKey];
  if (!periodMeta) throw new Error(`Unsupported analytics period: ${periodKey}`);

  const { start, end } = getPeriodWindow(periodKey, new Date());
  const generatedAt = new Date();
  const {
    createdBookings,
    eventBookings,
    bills,
    extensionRequests,
    defaultersSnapshot,
    blockedRoomsSnapshot,
    allBookings,
  } = await fetchGuestRoomReportData(start, end);

  const statusCounts = countBy(createdBookings, (booking) => booking.status || "unknown");
  const approvalStatusCounts = countBy(createdBookings, (booking) => booking.approvalStatus || "auto_approved");
  const paymentTypeCounts = countBy(createdBookings, (booking) => booking.paymentType || "unknown");
  const paymentStatusCounts = countBy(createdBookings, (booking) => booking.paymentStatus || "UNPAID");
  const hostelCounts = countBy(createdBookings, (booking) => booking.hostel || "Unknown");
  const departmentCounts = countBy(createdBookings, (booking) => booking.department || "Unknown");

  const guestCountByHostel = {};
  const revenueByHostel = {};
  const transactionsByMode = {};

  createdBookings.forEach((booking) => {
    const hostel = booking.hostel || "Unknown";
    guestCountByHostel[hostel] = (guestCountByHostel[hostel] || 0) + Number(booking.numGuests || 1);
    revenueByHostel[hostel] = (revenueByHostel[hostel] || 0) + Number(booking.paidAmount || 0);
    const mode = booking.paymentMode || "UNSPECIFIED";
    transactionsByMode[mode] = (transactionsByMode[mode] || 0) + 1;
  });

  const checkInsOccurred = eventBookings.filter((booking) => inRange(booking.actualCheckInDate, start, end)).length;
  const checkOutsOccurred = eventBookings.filter((booking) => inRange(booking.checkedOutAt || booking.actualCheckoutDate, start, end)).length;
  const cancellationsOccurred = eventBookings.filter((booking) => inRange(booking.cancelDate, start, end)).length;
  const noShowsOccurred = eventBookings.filter((booking) => inRange(booking.noShowMarkedAt, start, end)).length;
  const directExtensionsUsed = eventBookings.filter((booking) => booking.directExtension?.used && inRange(booking.directExtension.createdAt, start, end)).length;

  let approvedExtensions = 0;
  for (const booking of eventBookings) {
    for (const extension of booking.extensionHistory || []) {
      const extensionAt = extension.createdAt || extension.extendedAt;
      if (extension.type === "APPROVED_EXTENSION" && inRange(extensionAt, start, end)) approvedExtensions += 1;
    }
  }

  const summary = {
    bookingsCreated: createdBookings.length,
    guestsCounted: sumBy(createdBookings, (booking) => booking.numGuests || 1),
    freeBookings: createdBookings.filter((booking) => booking.paymentType === "Free").length,
    paidBookings: createdBookings.filter((booking) => booking.paymentType === "Paid").length,
    totalBilled: sumBy(createdBookings, (booking) => booking.totalAmount || 0),
    totalCollected: sumBy(createdBookings, (booking) => booking.paidAmount || 0),
    totalOutstanding: sumBy(createdBookings, (booking) => booking.balanceAmount || 0),
    totalDiscount: sumBy(createdBookings, (booking) => booking.discount || 0),
    checkInsOccurred,
    checkOutsOccurred,
    cancellationsOccurred,
    noShowsOccurred,
    directExtensionsUsed,
    approvedExtensions,
    extensionRequestsCreated: extensionRequests.length,
    extensionRequestsPending: extensionRequests.filter((request) => request.status === "pending").length,
    extensionRequestsApproved: extensionRequests.filter((request) => request.status === "approved").length,
    extensionRequestsRejected: extensionRequests.filter((request) => request.status === "rejected").length,
    currentDefaulters: defaultersSnapshot.length,
    currentDefaulterOutstanding: sumBy(defaultersSnapshot, (booking) => booking.balanceAmount || 0),
    blockedRoomsNow: blockedRoomsSnapshot.length,
    billsRaised: bills.length,
    billAmountRaised: sumBy(bills, (bill) => bill.amountPaid || 0),
  };

  const guestExtensions = extractGuestExtensions(eventBookings, start, end);

  const guestBookingRows = createdBookings.map((b) => ({
    Name: b.guest || "",
    "RollNo/EmpID": b.rollno || "",
    Hostel: b.hostel || "",
    "Room No.": b.roomNo || "",
    Contact: b.contact || "",
    Email: b.email || "",
    Department: b.department || "",
    Gender: b.gender || "",
    "Check in Date": dateOnlyValue(b.from),
    "Check in Time": b.checkInTime || "",
    "Check out Date": dateOnlyValue(b.to),
    "Check out time": b.checkOutTime || "",
    "Total Guest": b.numGuests || 0,
    "Male Count": b.males || 0,
    "Female Count": b.females || 0,
    State: b.state || "",
    City: b.city || "",
    Reference: b.reference || "",
    Purpose: b.purpose || "",
    "Reported Status": b.reportedStatus || "pending",
    "Reported At": dateOnlyValue(b.reportedAt),
    "Payment Type": b.paymentType || "",
    Discount: Number(b.discount || 0),
    "Paid Amount": Number(b.paidAmount || 0),
    "Payment Mode": b.paymentMode || "",
    "Payment Date": dateOnlyValue(b.transactionDate),
    "Transaction ID": b.transactionId || "",
    "Payment Remarks": b.paymentRemarks || "",
    "Free Remarks": b.freeRemarks || b.remarks || "",
    "Extension Date": dateOnlyValue(b.extensionDate),
    "Extension Remarks": b.extendRemarks || "",
    "Cancel Date": dateOnlyValue(b.cancelDate),
    "Cancel Remarks": b.cancelRemarks || "",
    Status: b.status || "",
    "Address Proof Attachments": (b.files || []).join(" | "),
    "Approval Documents": (b.approvalDocuments || []).join(" | "),
    "Payment Attachments": (b.paymentAttachments || []).join(" | "),
    "Extension Attachments": (b.extensionAttachments || []).join(" | "),
    Comments: b.comments || "",
  }));

  const billRows = bills.map((bill) => ({
    BillNumber: bill.billNumber || "",
    BillType: bill.billType || "PAYMENT",
    Guest: bill.guestName || "",
    Email: bill.guestEmail || "",
    Contact: bill.guestContact || "",
    Hostel: bill.hostel || "",
    Room: bill.roomNo || "",
    Department: bill.department || "",
    "Stay From": dateOnlyValue(bill.from),
    "Stay To": dateOnlyValue(bill.to),
    "Payment Type": bill.paymentType || "",
    "Payment Method": bill.paymentMethod || "",
    "Transaction ID": bill.transactionId || "",
    "Total Amount": Number(bill.totalAmount || 0),
    "Amount Paid": Number(bill.amountPaid || 0),
    "Balance Before": Number(bill.balanceBeforePayment || 0),
    "Balance After": Number(bill.balanceAfterPayment || 0),
    Remarks: bill.remarks || "",
    Status: bill.status || "active",
    "Created At": formatDateTimeIST(bill.createdAt),
  }));

  const extensionRequestRows = extensionRequests.map((request) => ({
    RequestId: String(request._id),
    BookingId: String(request.bookingId || ""),
    Hostel: request.hostel || "",
    Status: request.status || "",
    "Approval Level": request.requiredApprovalLevel || "",
    "Old Checkout": dateOnlyValue(request.oldCheckout),
    "Requested Checkout": dateOnlyValue(request.requestedCheckout),
    "Created At": formatDateTimeIST(request.createdAt),
  }));

  const defaulterRows = defaultersSnapshot.map((booking) => ({
    Guest: booking.guest,
    Email: booking.email,
    Contact: booking.contact,
    Hostel: booking.hostel,
    Room: booking.roomNo,
    Status: booking.status,
    "Checkout Date": dateOnlyValue(booking.to),
    "Total Amount": Number(booking.totalAmount || 0),
    "Paid Amount": Number(booking.paidAmount || 0),
    "Balance Amount": Number(booking.balanceAmount || 0),
    "Payment Status": booking.paymentStatus || "",
  }));

  const blockedRoomRows = blockedRoomsSnapshot.map((room) => ({
    Hostel: room.hostel,
    "Room No.": room.roomNo,
    "Room Type": room.roomType || "Guest Room",
    "Blocked Till": dateOnlyValue(room.blockedTill),
    "Block Remarks": room.blockRemarks || "",
    "Blocked At": formatDateTimeIST(room.blockedAt),
    "Blocked By": room.blockedBy || "",
  }));

  const workbookBuffer = createWorkbookBuffer([
    {
      name: "Summary",
      rows: [
        ...Object.entries(summary).map(([metric, value]) => ({ Metric: metric, Value: value })),
      ],
    },
    { name: "Hostel Wise Bookings", rows: toRows(hostelCounts, "Hostel", "Bookings") },
    { name: "Hostel Wise Revenue", rows: toRows(revenueByHostel, "Hostel", "Revenue") },
    { name: "Hostel Wise Guests", rows: toRows(guestCountByHostel, "Hostel", "GuestCount") },
    { name: "Department Wise", rows: toRows(departmentCounts, "Department", "Bookings") },
    { name: "Status Distribution", rows: toRows(statusCounts, "Status", "Count") },
    { name: "Approval Distribution", rows: toRows(approvalStatusCounts, "ApprovalStatus", "Count") },
    { name: "Payment Type Distribution", rows: toRows(paymentTypeCounts, "PaymentType", "Count") },
    { name: "Payment Status Distribution", rows: toRows(paymentStatusCounts, "PaymentStatus", "Count") },
    { name: "Payment Transactions", rows: toRows(transactionsByMode, "PaymentMode", "Transactions") },
    { name: "Bookings Detail", rows: guestBookingRows },
    { name: "Bills Detail", rows: billRows },
    { name: "Extensions Detail", rows: guestExtensions },
    { name: "Extension Requests", rows: extensionRequestRows },
    { name: "Defaulters Snapshot", rows: defaulterRows },
    { name: "Blocked Rooms", rows: blockedRoomRows },
  ]);

  const summaryBlocks = [
    {
      title: "Operational Summary",
      items: [
        { label: "Bookings created", value: summary.bookingsCreated },
        { label: "Guests accommodated", value: summary.guestsCounted },
        { label: "Check-ins", value: summary.checkInsOccurred },
        { label: "Check-outs", value: summary.checkOutsOccurred },
        { label: "Cancellations", value: summary.cancellationsOccurred },
        { label: "No-shows", value: summary.noShowsOccurred },
        { label: "Direct extensions", value: summary.directExtensionsUsed },
        { label: "Approved extensions", value: summary.approvedExtensions },
      ],
    },
    {
      title: "Financial Summary",
      items: [
        { label: "Total billed", value: formatCurrency(summary.totalBilled) },
        { label: "Total collected", value: formatCurrency(summary.totalCollected) },
        { label: "Outstanding", value: formatCurrency(summary.totalOutstanding) },
        { label: "Discount / waiver", value: formatCurrency(summary.totalDiscount) },
        { label: "Current defaulters", value: `${summary.currentDefaulters} guest(s)` },
        { label: "Current defaulter amount", value: formatCurrency(summary.currentDefaulterOutstanding) },
      ],
    },
  ];

  const chartSections = [
    {
      title: "Hostel Wise Booking Volume",
      variant: "bar",
      rows: toRows(hostelCounts, "Hostel", "Bookings").map((row) => ({ label: row.Hostel, value: row.Bookings })),
    },
    {
      title: "Hostel Wise Revenue",
      variant: "bar",
      rows: toRows(revenueByHostel, "Hostel", "Revenue").map((row) => ({ label: row.Hostel, value: row.Revenue })),
    },
    {
      title: "Status Split",
      variant: "pie",
      rows: toRows(statusCounts, "Status", "Count").map((row) => ({ label: row.Status, value: row.Count })),
    },
    {
      title: "Payment Collection Trend by Created Date",
      variant: "line",
      rows: toRows(
        countBy(createdBookings, (booking) => dateOnlyValue(booking.createdAt)),
        "Date",
        "Bookings"
      ).map((row) => ({ label: row.Date, value: row.Bookings })),
    },
  ];

  const pdfBuffer = await createPdfBuffer({
    reportType: REPORT_TYPES.guest_room,
    periodMeta,
    rangeStart: start,
    rangeEnd: end,
    summaryBlocks,
    chartSections,
  });

  const workbookName = `${REPORT_TYPES.guest_room.filenamePrefix}-${periodMeta.filenamePrefix}-${dateOnlyValue(start)}-to-${dateOnlyValue(addDays(end, -1))}.xlsx`;
  const pdfName = `${REPORT_TYPES.guest_room.filenamePrefix}-${periodMeta.filenamePrefix}-${dateOnlyValue(start)}-to-${dateOnlyValue(addDays(end, -1))}.pdf`;

  return {
    type: REPORT_TYPES.guest_room.key,
    periodKey,
    periodMeta,
    rangeStart: start,
    rangeEnd: end,
    generatedAt,
    workbookBuffer,
    pdfBuffer,
    workbookName,
    pdfName,
    subject: `[${periodMeta.label} Analytics] Guest Room Report (${formatDateIST(start)} - ${formatDateIST(addDays(end, -1))})`,
    html: buildGuestRoomEmailHtml({
      periodMeta,
      rangeStart: start,
      rangeEnd: end,
      summary,
      workbookName,
      pdfName,
    }),
    summary,
  };
};

const eventDurationHours = (booking) => {
  try {
    const start = new Date(`${booking.checkInDate}T${booking.checkInTime || "00:00"}`);
    const end = new Date(`${booking.checkOutDate}T${booking.checkOutTime || "00:00"}`);
    return Math.max(0, Math.round(((end - start) / (1000 * 60 * 60)) * 10) / 10);
  } catch {
    return 0;
  }
};

const buildVenueReportPackage = async (periodKey) => {
  const periodMeta = PERIOD_META[periodKey];
  if (!periodMeta) throw new Error(`Unsupported analytics period: ${periodKey}`);

  const { start, end } = getPeriodWindow(periodKey, new Date());
  const generatedAt = new Date();
  const { createdBookings, allBookings, extensionBookings } = await fetchVenueReportData(start, end);

  const statusCounts = countBy(createdBookings, (booking) => booking.status || "booked");
  const hallCounts = countBy(createdBookings, (booking) => booking.hall || "Unknown");
  const roomCounts = countBy(createdBookings, (booking) => `${booking.hall || "Unknown"} / ${booking.roomNo || "—"}`);
  const societyCounts = countBy(createdBookings, (booking) => booking.societyName || "Unknown");
  const departmentCounts = countBy(createdBookings, (booking) => booking.department || "Unknown");
  const eventCounts = countBy(createdBookings, (booking) => booking.eventName || "Unknown");

  let extensionsOccurred = 0;
  for (const booking of extensionBookings) {
    for (const extension of booking.extensionHistory || []) {
      if (inRange(extension.extendedAt, start, end)) extensionsOccurred += 1;
    }
  }

  const longestEvent = createdBookings
    .map((booking) => ({ booking, hours: eventDurationHours(booking) }))
    .sort((a, b) => b.hours - a.hours)[0];

  const mostBookedVenueRow = toRows(hallCounts, "Venue", "Bookings")[0];

  const summary = {
    bookingsCreated: createdBookings.length,
    activeBookings: createdBookings.filter((booking) => ["booked", "checked_in"].includes(booking.status)).length,
    completedBookings: createdBookings.filter((booking) => booking.status === "completed").length,
    cancelledBookings: createdBookings.filter((booking) => booking.status === "cancelled").length,
    noShowBookings: createdBookings.filter((booking) => booking.status === "no_show").length,
    uniqueHallsUsed: new Set(createdBookings.map((booking) => booking.hall).filter(Boolean)).size,
    uniqueRoomsUsed: new Set(createdBookings.map((booking) => `${booking.hall}__${booking.roomNo}`).filter(Boolean)).size,
    uniqueSocieties: new Set(createdBookings.map((booking) => booking.societyName).filter(Boolean)).size,
    uniqueDepartments: new Set(createdBookings.map((booking) => booking.department).filter(Boolean)).size,
    extensionsOccurred,
    cancellationEvents: createdBookings.filter((booking) => inRange(booking.cancelledAt, start, end)).length,
    mostBookedVenue: mostBookedVenueRow?.Venue || "—",
    mostBookedVenueCount: mostBookedVenueRow?.Bookings || 0,
    longestEventName: longestEvent?.booking?.eventName || "—",
    longestEventDurationHours: longestEvent?.hours || 0,
  };

  const extensionRows = extractVenueExtensions(extensionBookings, start, end);
  const longestEventRows = createdBookings
    .map((booking) => ({
      Hall: booking.hall || "",
      Room: booking.roomNo || "",
      Event: booking.eventName || "",
      Society: booking.societyName || "",
      Department: booking.department || "",
      DurationHours: eventDurationHours(booking),
      "Check In": `${booking.checkInDate || ""} ${booking.checkInTime || ""}`.trim(),
      "Check Out": `${booking.checkOutDate || ""} ${booking.checkOutTime || ""}`.trim(),
    }))
    .sort((a, b) => b.DurationHours - a.DurationHours);

  const venueBookingRows = createdBookings.map((b) => ({
    Name: b.name || "",
    Email: b.email || "",
    "Contact Number": b.contact || "",
    Department: b.department || "",
    Venue: b.hall || "",
    Room: b.roomNo || "",
    "Society / Club Name": b.societyName || "",
    "Society Email": b.societyEmail || "",
    "President Email": b.presidentEmail || "",
    "Event Name": b.eventName || "",
    "Event Description": (b.description || "").replace(/\n/g, " "),
    Purpose: (b.purpose || "").replace(/\n/g, " "),
    "Start Date": b.checkInDate || "",
    "Start Time": b.checkInTime || "",
    "End Date": b.checkOutDate || "",
    "End Time": b.checkOutTime || "",
    Status: b.status || "",
  }));

  const workbookBuffer = createWorkbookBuffer([
    { name: "Summary", rows: Object.entries(summary).map(([metric, value]) => ({ Metric: metric, Value: value })) },
    { name: "Venue Wise Bookings", rows: toRows(hallCounts, "Venue", "Bookings") },
    { name: "Room Wise Bookings", rows: toRows(roomCounts, "VenueRoom", "Bookings") },
    { name: "Department Wise Bookings", rows: toRows(departmentCounts, "Department", "Bookings") },
    { name: "Society Wise Bookings", rows: toRows(societyCounts, "Society", "Bookings") },
    { name: "Event Wise Bookings", rows: toRows(eventCounts, "Event", "Bookings") },
    { name: "Longest Events", rows: longestEventRows },
    { name: "Venue Booking Details", rows: venueBookingRows },
    { name: "Venue Extensions", rows: extensionRows },
  ]);

  const summaryBlocks = [
    {
      title: "Venue Booking Summary",
      items: [
        { label: "Bookings created", value: summary.bookingsCreated },
        { label: "Active bookings", value: summary.activeBookings },
        { label: "Completed bookings", value: summary.completedBookings },
        { label: "Cancelled bookings", value: summary.cancelledBookings },
        { label: "Extensions processed", value: summary.extensionsOccurred },
        { label: "Unique halls used", value: summary.uniqueHallsUsed },
        { label: "Unique rooms used", value: summary.uniqueRoomsUsed },
      ],
    },
    {
      title: "Engagement Summary",
      items: [
        { label: "Unique societies", value: summary.uniqueSocieties },
        { label: "Unique departments", value: summary.uniqueDepartments },
        { label: "Most booked venue", value: `${summary.mostBookedVenue} (${summary.mostBookedVenueCount})` },
        { label: "Longest event", value: `${summary.longestEventName} (${summary.longestEventDurationHours} hrs)` },
      ],
    },
  ];

  const chartSections = [
    {
      title: "Most Booked Venues",
      variant: "bar",
      rows: toRows(hallCounts, "Venue", "Bookings").map((row) => ({ label: row.Venue, value: row.Bookings })),
    },
    {
      title: "Department Wise Booking Share",
      variant: "pie",
      rows: toRows(departmentCounts, "Department", "Bookings").map((row) => ({ label: row.Department, value: row.Bookings })),
    },
    {
      title: "Society Wise Booking Share",
      variant: "pie",
      rows: toRows(societyCounts, "Society", "Bookings").map((row) => ({ label: row.Society, value: row.Bookings })),
    },
    {
      title: "Booking Creation Trend",
      variant: "line",
      rows: toRows(countBy(createdBookings, (booking) => booking.checkInDate || "Unknown"), "Date", "Bookings")
        .map((row) => ({ label: row.Date, value: row.Bookings })),
    },
  ];

  const pdfBuffer = await createPdfBuffer({
    reportType: REPORT_TYPES.venue_booking,
    periodMeta,
    rangeStart: start,
    rangeEnd: end,
    summaryBlocks,
    chartSections,
  });

  const workbookName = `${REPORT_TYPES.venue_booking.filenamePrefix}-${periodMeta.filenamePrefix}-${dateOnlyValue(start)}-to-${dateOnlyValue(addDays(end, -1))}.xlsx`;
  const pdfName = `${REPORT_TYPES.venue_booking.filenamePrefix}-${periodMeta.filenamePrefix}-${dateOnlyValue(start)}-to-${dateOnlyValue(addDays(end, -1))}.pdf`;

  return {
    type: REPORT_TYPES.venue_booking.key,
    periodKey,
    periodMeta,
    rangeStart: start,
    rangeEnd: end,
    generatedAt,
    workbookBuffer,
    pdfBuffer,
    workbookName,
    pdfName,
    subject: `[${periodMeta.label} Analytics] Venue Booking Report (${formatDateIST(start)} - ${formatDateIST(addDays(end, -1))})`,
    html: buildVenueEmailHtml({
      periodMeta,
      rangeStart: start,
      rangeEnd: end,
      summary,
      workbookName,
      pdfName,
    }),
    summary,
  };
};

export const buildScheduledAnalyticsReportPackage = async (periodKey, reportType = "guest_room") => {
  if (reportType === REPORT_TYPES.guest_room.key) {
    return buildGuestRoomReportPackage(periodKey);
  }
  if (reportType === REPORT_TYPES.venue_booking.key) {
    return buildVenueReportPackage(periodKey);
  }
  throw new Error(`Unsupported report type: ${reportType}`);
};

const sendReportPackage = async (reportPackage, targetRecipients) => {
  if (targetRecipients.length === 0) {
    return { sent: false, reason: "no_admin_recipients" };
  }

  const [primaryRecipient, ...bccRecipients] = targetRecipients;

  const sent = await sendEmailAdvanced({
    to: primaryRecipient,
    bcc: bccRecipients,
    subject: reportPackage.subject,
    html: reportPackage.html,
    priority: "high",
    attachments: [
      {
        filename: reportPackage.workbookName,
        content: reportPackage.workbookBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      {
        filename: reportPackage.pdfName,
        content: reportPackage.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  return {
    sent,
    type: reportPackage.type,
    subject: reportPackage.subject,
    recipients: targetRecipients,
    workbookName: reportPackage.workbookName,
    pdfName: reportPackage.pdfName,
    summary: reportPackage.summary,
  };
};

export const sendScheduledAnalyticsReport = async (periodKey, options = {}) => {
  const recipients = await getAdminRecipients();
  const targetRecipients =
    Array.isArray(options.overrideRecipients) && options.overrideRecipients.length > 0
      ? options.overrideRecipients
      : recipients.map((recipient) => recipient.email);

  const reportTypes = Array.isArray(options.reportTypes) && options.reportTypes.length > 0
    ? options.reportTypes
    : [REPORT_TYPES.guest_room.key, REPORT_TYPES.venue_booking.key];

  const results = [];

  for (const reportType of reportTypes) {
    const reportPackage = await buildScheduledAnalyticsReportPackage(periodKey, reportType);
    console.log(`📊 Building ${reportPackage.type} ${periodKey} analytics report`, {
      start: reportPackage.rangeStart.toISOString(),
      end: reportPackage.rangeEnd.toISOString(),
      recipients: targetRecipients,
    });
    results.push(await sendReportPackage(reportPackage, targetRecipients));
  }

  return {
    sent: results.every((result) => result.sent),
    results,
  };
};
