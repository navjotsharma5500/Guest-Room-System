// utils/billGenerator.js - THAPAR INSTITUTE OFFICIAL BILL FORMAT - FIXED VERSION
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Bill from "../models/Bill.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Path to Thapar logo
const LOGO_PATH = path.join(process.cwd(), "assets", "thapar_logo.png");

// ✅ Generate unique bill number (daily sequence)
export const generateBillNumber = async () => {
  const date = new Date();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const count = await Bill.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });

  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const sequence = String(count + 1).padStart(4, "0");

  return `BILL-${year}${month}${day}-${sequence}`;
};

// Helper: Format date (DD/MM/YYYY)
const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper: Format date (DD Mon YYYY)
const formatDateLong = (date) => {
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, "0");
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

// Helper: Format time (HH:MM)
const formatTime = (date) => {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

// Helper: Calculate total days
const calculateDays = (from, to) => {
  const start = new Date(from);
  const end = new Date(to);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 1;
};

// Helper: Number to words (Indian system)
const numberToWords = (num) => {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  };

  if (num === 0) return "Zero";
  return convert(Math.floor(num));
};

// Main Bill Generator - FIXED VERSION
export const generateBill = async (booking, billData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
      });

      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Calculate values
      const totalDays = calculateDays(booking.from, booking.to);
      const totalAmount = billData.amountPaid || booking.amount || 0;
      const rentWithoutTax = totalAmount / 1.12;
      const perDayRate = rentWithoutTax / totalDays;
      const cgst = rentWithoutTax * 0.06;
      const sgst = rentWithoutTax * 0.06;

      // ============================================
      // HEADER SECTION WITH RED BORDER TOP
      // ============================================
      let yPos = 40;

      // Red top border (4px thick)
      doc.rect(40, yPos, 515, 4).fill("#dc2626");
      yPos += 14;

      // ✅ THAPAR LOGO - Proper aspect ratio
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, 46, yPos, { 
          fit: [50, 50],
          align: 'center',
          valign: 'center'
        });
      } else {
        // Fallback: Red gradient box with T
        doc.roundedRect(46, yPos, 50, 50, 8).fillAndStroke("#dc2626", "#991b1b");
        doc.fontSize(28).fillColor("#fff").font("Helvetica-Bold");
        doc.text("T", 56, yPos + 10, { width: 30, align: "center" });
      }

      // Institute Details
      doc.fontSize(20).fillColor("#991b1b").font("Helvetica-Bold");
      doc.text("THAPAR INSTITUTE", 110, yPos + 2);

      doc.fontSize(11).font("Helvetica-Bold").fillColor("#4b5563");
      doc.text("OF ENGINEERING & TECHNOLOGY", 110, yPos + 25);

      doc.fontSize(8).font("Helvetica").fillColor("#6b7280");
      doc.text("(Deemed to be University)", 110, yPos + 40);

      // Contact info
      doc.fontSize(9).fillColor("#4b5563");
      doc.text("Patiala, Punjab - 147001", 110, yPos + 55);

      doc.fontSize(7.5).fillColor("#6b7280");
      doc.text("GST NO: 03AAAA74247P1Z9 | TAN: PTLT10043F", 110, yPos + 68);

      // Right side - Bill details in red box - ✅ FIXED ALIGNMENT
      doc.roundedRect(450, yPos, 105, 60, 6).fillAndStroke("#fef2f2", "#fecaca");

      doc.fontSize(8).font("Helvetica-Bold").fillColor("#991b1b");
      doc.text("INVOICE", 455, yPos + 6, { width: 95, align: "center" });

      // ✅ FIXED: Smaller font for bill number to fit properly
      doc.fontSize(10).fillColor("#7f1d1d");
      doc.text(billData.billNumber || "BILL-0001", 455, yPos + 20, { width: 95, align: "center" });

      doc.fontSize(7).font("Helvetica").fillColor("#6b7280");
      doc.text(`Issue Date: ${formatDateLong(billData.paidAt || new Date())}`, 455, yPos + 38, { width: 95, align: "center" });

      yPos = 130;

      // Red gradient title bar
      const gradient = doc.linearGradient(40, yPos, 555, yPos);
      gradient.stop(0, '#dc2626').stop(1, '#991b1b');
      
      doc.rect(40, yPos, 515, 35).fill(gradient);

      doc.fontSize(14).font("Helvetica-Bold").fillColor("#fff");
      doc.text("HOSTEL GUEST ROOM INVOICE", 40, yPos + 10, { width: 515, align: "center" });

      yPos = 175;

      // ============================================
      // GUEST DETAILS SECTION
      // ============================================
      
      // Left column - Guest Details
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#991b1b");
      doc.text("GUEST DETAILS", 50, yPos);

      yPos += 16;

      doc.fontSize(8).font("Helvetica").fillColor("#6b7280");
      doc.text("Name:", 50, yPos);
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#1f2937");
      doc.text(booking.guest || "", 50, yPos + 10);

      yPos += 28;

      doc.fontSize(8).font("Helvetica").fillColor("#6b7280");
      doc.text("Address:", 50, yPos);
      doc.fontSize(8.5).font("Helvetica").fillColor("#374151");
      const address = `${booking.city || ""}${booking.state ? ", " + booking.state : ""}`;
      doc.text(address || "N/A", 50, yPos + 10);

      yPos += 28;

      // ID and Department in grid
      doc.fontSize(8).font("Helvetica").fillColor("#6b7280");
      doc.text("ID:", 50, yPos);
      doc.fontSize(8.5).font("Helvetica").fillColor("#374151");
      doc.text(booking.rollno || "N/A", 50, yPos + 10);

      doc.fontSize(8).font("Helvetica").fillColor("#6b7280");
      doc.text("Department:", 160, yPos);
      doc.fontSize(8.5).font("Helvetica").fillColor("#374151");
      doc.text(booking.department || "N/A", 160, yPos + 10);

      yPos += 28;

      // ✅ FIXED: Contact and Email with proper icons (not special characters)
      doc.fontSize(8).font("Helvetica").fillColor("#6b7280");
      doc.text("Contact: ", 50, yPos, { continued: true });
      doc.fillColor("#374151");
      doc.text(booking.contact || "");

      yPos += 12;
      doc.fillColor("#6b7280");
      doc.text("Email: ", 50, yPos, { continued: true });
      doc.fillColor("#374151");
      doc.text(booking.email || "");

      // Right column - Accommodation Details
      yPos = 191;

      doc.fontSize(10).font("Helvetica-Bold").fillColor("#991b1b");
      doc.text("ACCOMMODATION DETAILS", 320, yPos);

      yPos += 16;

      // ✅ FIXED: Hostel & Room in red box with smaller font to fit properly
      doc.roundedRect(320, yPos, 235, 40, 6).fillAndStroke("#fef2f2", "#fecaca");

      doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
      doc.text("Hostel & Room", 328, yPos + 6);

      // ✅ FIXED: Reduced font size to fit long hostel names
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#991b1b");
      doc.text(`${booking.hostel || "HOSTEL"} - Room ${booking.roomNo || ""}`, 328, yPos + 18, { width: 220 });

      yPos += 52;

      // Check-in and Check-out dates
      doc.roundedRect(320, yPos, 112, 35, 4).fillAndStroke("#f9fafb", "#e5e7eb");
      doc.roundedRect(443, yPos, 112, 35, 4).fillAndStroke("#f9fafb", "#e5e7eb");

      doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
      doc.text("Check In", 328, yPos + 6);
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#1f2937");
      doc.text(formatDateLong(booking.from), 328, yPos + 18);

      doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
      doc.text("Check Out", 451, yPos + 6);
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#1f2937");
      doc.text(formatDateLong(booking.to), 451, yPos + 18);

      yPos += 45;

      // Total stay
      doc.roundedRect(320, yPos, 235, 25, 4).fillAndStroke("#eff6ff", "#dbeafe");

      doc.fontSize(8).font("Helvetica").fillColor("#1e40af");
      doc.text(`Total Stay: ${totalDays} ${totalDays === 1 ? 'Day' : 'Days'}`, 320, yPos + 8, { width: 235, align: "center" });

      yPos = 340;

      // Border line
      doc.moveTo(40, yPos).lineTo(555, yPos).lineWidth(1).strokeColor("#e5e7eb").stroke();

      yPos += 15;

      // ============================================
      // BILLING TABLE
      // ============================================

      // Table header with red gradient
      const tableGradient = doc.linearGradient(40, yPos, 555, yPos);
      tableGradient.stop(0, '#991b1b').stop(1, '#dc2626');
      
      doc.roundedRect(40, yPos, 515, 28, 6).fill(tableGradient);

      doc.fontSize(9).font("Helvetica-Bold").fillColor("#fff");
      doc.text("Description", 48, yPos + 10, { width: 250 });
      doc.text("Rate per Day", 300, yPos + 10, { width: 80, align: "center" });
      doc.text("Days", 390, yPos + 10, { width: 60, align: "center" });
      doc.text("Amount", 460, yPos + 10, { width: 87, align: "right" });

      yPos += 28;

      // Table row
      doc.rect(40, yPos, 515, 40).strokeColor("#e5e7eb").stroke();

      doc.fontSize(9).font("Helvetica-Bold").fillColor("#1f2937");
      doc.text("Guest Room Accommodation", 48, yPos + 10);

      doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
      doc.text(`${booking.hostel || "HOSTEL"} - Room ${booking.roomNo || ""}`, 48, yPos + 24);

      // ✅ FIXED: Removed rupee symbol special character issue
      doc.fontSize(8.5).font("Helvetica").fillColor("#374151");
      doc.text(`Rs ${perDayRate.toFixed(2)}`, 300, yPos + 15, { width: 80, align: "center" });

      doc.fontSize(9).font("Helvetica-Bold").fillColor("#991b1b");
      doc.text(totalDays.toString(), 390, yPos + 15, { width: 60, align: "center" });

      doc.fontSize(9).font("Helvetica-Bold").fillColor("#1f2937");
      doc.text(`Rs ${rentWithoutTax.toFixed(2)}`, 460, yPos + 15, { width: 87, align: "right" });

      yPos += 50;

      // ============================================
      // TOTALS SECTION
      // ============================================

      const totalsX = 355;

      // Subtotal
      doc.fontSize(8.5).font("Helvetica").fillColor("#4b5563");
      doc.text("Subtotal", totalsX, yPos);
      doc.font("Helvetica-Bold");
      doc.text(`Rs ${rentWithoutTax.toFixed(2)}`, 460, yPos, { width: 87, align: "right" });

      doc.moveTo(totalsX, yPos + 12).lineTo(555, yPos + 12).strokeColor("#e5e7eb").stroke();
      yPos += 22;

      // CGST
      doc.fontSize(8).font("Helvetica").fillColor("#4b5563");
      doc.text("CGST (6%)", totalsX, yPos);
      doc.font("Helvetica");
      doc.text(`Rs ${cgst.toFixed(2)}`, 460, yPos, { width: 87, align: "right" });

      yPos += 16;

      // SGST
      doc.text("SGST (6%)", totalsX, yPos);
      doc.text(`Rs ${sgst.toFixed(2)}`, 460, yPos, { width: 87, align: "right" });

      doc.moveTo(totalsX, yPos + 12).lineTo(555, yPos + 12).strokeColor("#e5e7eb").stroke();
      yPos += 22;

      // ✅ FIXED: Total Due - amount properly aligned within box
      doc.roundedRect(totalsX, yPos - 5, 200, 28, 6).fillAndStroke("#fef2f2", "#fecaca");

      doc.fontSize(13).font("Helvetica-Bold").fillColor("#991b1b");
      doc.text("TOTAL DUE", totalsX + 10, yPos + 4);
      doc.fontSize(14);
      doc.text(`Rs ${totalAmount.toFixed(2)}`, 455, yPos + 3, { width: 92, align: "right" });

      yPos += 35;

      // Amount in words
      doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280").fillOpacity(1);
      doc.text(`Amount in words: `, totalsX, yPos, { continued: true });
      doc.font("Helvetica-Bold").fillColor("#374151");
      doc.text(`${numberToWords(Math.floor(totalAmount))} Rupees Only`);

      yPos += 20;

      // ============================================
      // PAYMENT TERMS & BANK DETAILS - ✅ FIXED ALIGNMENT
      // ============================================

      doc.moveTo(40, yPos).lineTo(555, yPos).lineWidth(1).strokeColor("#e5e7eb").stroke();
      yPos += 15;

      // Left - Payment Terms
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#991b1b");
      doc.text("PAYMENT TERMS", 50, yPos);

      // Right - Bank Details - ✅ FIXED: Same Y position as Payment Terms
      doc.text("BANK & PAYMENT DETAILS", 320, yPos);

      yPos += 16;

      // Payment terms list
      doc.fontSize(7.5).font("Helvetica").fillColor("#4b5563");
      const terms = [
        "Payment must be made within 3 days",
        "Quote invoice number when paying",
        "Late payments may incur charges",
        "Payments are non-refundable",
        "Contact caretaker for queries"
      ];

      let termsY = yPos;
      terms.forEach(term => {
        doc.text(`• ${term}`, 55, termsY, { width: 220 });
        termsY += 10;
      });

      // ✅ FIXED: Bigger box for Bank Details to fit Account Holder name
      doc.roundedRect(320, yPos, 235, 62, 6).fillAndStroke("#f9fafb", "#e5e7eb");

      yPos += 8;

      const bankDetails = [
        { label: "Account Holder:", value: "TIET" },
        { label: "Account Number:", value: "65181840370" },
        { label: "IFSC Code:", value: "SBIN0050244" },
        { label: "Bank Name:", value: "State Bank of India" }
      ];

      bankDetails.forEach(detail => {
        doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
        doc.text(detail.label, 328, yPos);
        
        doc.fontSize(7.5).font(
          detail.label.includes("Number") || detail.label.includes("IFSC") 
            ? "Courier-Bold" 
            : "Helvetica-Bold"
        ).fillColor("#1f2937");
        
        doc.text(detail.value, 420, yPos);
        yPos += 13;
      });

      yPos += 12;

      // ============================================
      // SIGNATURES
      // ============================================

      doc.moveTo(40, yPos).lineTo(555, yPos).lineWidth(1).strokeColor("#e5e7eb").stroke();
      yPos += 35;

      // Caretaker signature
      doc.moveTo(100, yPos).lineTo(220, yPos).lineWidth(1.5).strokeColor("#d1d5db").stroke();
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#374151");
      doc.text("Caretaker Signature & Stamp", 80, yPos + 8, { width: 160, align: "center" });

      // Warden signature
      doc.moveTo(375, yPos).lineTo(495, yPos).lineWidth(1.5).strokeColor("#d1d5db").stroke();
      doc.text("Warden Signature & Stamp", 355, yPos + 8, { width: 160, align: "center" });

      yPos += 30;

      // Footer
      doc.moveTo(40, yPos).lineTo(555, yPos).lineWidth(1).strokeColor("#e5e7eb").stroke();
      yPos += 10;

      doc.fontSize(6.5).font("Helvetica").fillColor("#9ca3af");
      doc.text("This is a computer-generated invoice and does not require a physical signature", 40, yPos, { width: 515, align: "center" });
      
      yPos += 9;
      doc.text("For queries: hostel.admin@thapar.edu | +91-175-2393779", 40, yPos, { width: 515, align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};