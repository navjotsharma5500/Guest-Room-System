//controllers/extensionController.js
import ExtensionRequest from "../models/ExtensionRequest.js";
import Booking from "../models/Booking.js";
import Bill from "../models/Bill.js";
import { sendEmailAdvanced } from "../emails/sendEmail.js";
import extensionRequestTemplate from "../emails/templates/extensionRequest.js";
import extensionRejectedTemplate from "../emails/templates/extensionRejected.js";
import extensionApprovedTemplate from "../emails/templates/extensionApproved.js";
import { sendBookingEmails } from "./bookingController.js";

const CO_WARDEN_EMAILS = ["cowarden@thapar.edu", "cowarden2@thapar.edu"];
// ✅ UPDATE: Extensions > 2 days go to adosa2@thapar.edu
const ADOSA_EMAILS = ["adosa2@thapar.edu"];

export const createExtensionRequest = async (req, res) => {
    try {
        const { bookingId, requestedCheckout, remarks, paymentData } = req.body;
        
        if (!bookingId || !requestedCheckout) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

        const oldCheckout = new Date(booking.to);
        const newCheckout = new Date(requestedCheckout);
        
        if (newCheckout <= oldCheckout) {
            return res.status(400).json({ success: false, message: "New checkout date must be after current checkout date" });
        }

        // ✅ FIX: Date-only diff — strips the time component so IST/UTC offset never
        // inflates the count.  10 Mar → 11 Mar = exactly 1 day regardless of whether
        // booking.to is stored as midnight UTC or 18:30 UTC (midnight IST).
        const toDateOnly = (d) => {
            const dt = new Date(d);
            return Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate());
        };
        const daysExtended = Math.round((toDateOnly(newCheckout) - toDateOnly(oldCheckout)) / 86400000);

        let requiredApprovalLevel = "adosa";
        if (daysExtended <= 2) {
            requiredApprovalLevel = "co_warden";
        }

        // ✅ FIX: Extract all payment fields so they are saved as top-level fields
        // on ExtensionRequest and correctly displayed in ApprovalPage.
        const extensionPaymentType        = paymentData?.extensionPaymentType        || "Paid";
        const extensionAmount             = Number(paymentData?.extensionAmount)      || 0;
        const extensionPaymentRemarks     = paymentData?.extensionPaymentRemarks      || "";
        const extensionPaymentAttachments = Array.isArray(paymentData?.extensionPaymentAttachments)
            ? paymentData.extensionPaymentAttachments
            : [];

        const extensionRequest = await ExtensionRequest.create({
            bookingId,
            oldCheckout,
            requestedCheckout: newCheckout,
            remarks: remarks || "",
            hostel: booking.hostel,
            requiredApprovalLevel,
            createdBy: req.user?._id,
            status: "pending",
            // ✅ Top-level payment fields for easy ApprovalPage display
            extensionPaymentType,
            extensionAmount,
            extensionPaymentRemarks,
            extensionPaymentAttachments,
            paymentData: paymentData || {},
        });

        const approverEmails = requiredApprovalLevel === "co_warden" ? CO_WARDEN_EMAILS : ADOSA_EMAILS;
        const roleName = requiredApprovalLevel === "co_warden" ? "Co-Warden" : "Dean of Student Affairs (ADOSA)";
        
        const emailHtml = extensionRequestTemplate({
            roleName: roleName,
            guestName: booking.guest,
            hostel: booking.hostel,
            roomNo: booking.roomNo,
            oldCheckout: oldCheckout,
            requestedCheckout: newCheckout,
            daysExtended: daysExtended,
            remarks: remarks
        });

        try {
            await sendEmailAdvanced({
                to: approverEmails,
                subject: "New Extension Approval Request",
                html: emailHtml
            });
        } catch (emailError) {
            console.error("Failed to send extension request email:", emailError);
        }

        res.status(201).json({ success: true, message: "Extension request submitted successfully", extensionRequest });

    } catch (error) {
        console.error("Create Extension Request Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllExtensionRequests = async (req, res) => {
    try {
        const { status } = req.query;
        const query = {};
        if (status) query.status = status;
        
        if (req.user.role === "caretaker" || req.user.role === "warden") {
            if (req.user.assignedHostel) {
                query.hostel = req.user.assignedHostel;
            } else if (req.user.hostel) {
                 query.hostel = req.user.hostel;
            }
        }
        
        const requests = await ExtensionRequest.find(query)
            .populate("bookingId", "guest roomNo contact email")
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });
            
        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const approveExtensionRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { approvedCheckout, approvedAmount } = req.body;
        
        const request = await ExtensionRequest.findById(id).populate("bookingId");
        if (!request) return res.status(404).json({ success: false, message: "Request not found" });
        
        if (request.status !== "pending") {
            return res.status(400).json({ success: false, message: "Request is not pending" });
        }
        
        const userRole = req.user.role;
        const days = Math.ceil((new Date(request.requestedCheckout) - new Date(request.oldCheckout)) / (1000 * 3600 * 24));
        
        if (userRole === "admin") {
            // Allowed
        } else if (userRole === "adosa") {
             if (days <= 2) return res.status(403).json({ success: false, message: "ADOSA can only approve > 2 days" });
        } else if (userRole === "co_warden") {
             if (days > 2) return res.status(403).json({ success: false, message: "Co-Warden can only approve <= 2 days" });
        } else {
            return res.status(403).json({ success: false, message: "Permission denied" });
        }
        
        request.status = "approved";
        request.approvedAmount = Number(approvedAmount) || 0;
        await request.save();
        
        const booking = request.bookingId;
        const oldToDate = booking.to;
        
        const finalCheckout = approvedCheckout ? new Date(approvedCheckout) : request.requestedCheckout;
        booking.to = finalCheckout;
        
        if (!booking.extensionHistory) booking.extensionHistory = [];
        booking.extensionHistory.push({
            extendedAt: new Date(),
            extendedBy: req.user._id,
            oldTo: oldToDate,
            newTo: finalCheckout,
            remarks: request.remarks,
            approvedAmount: request.approvedAmount
        });
        
        if (request.approvedAmount > 0) {
             booking.totalAmount = (booking.totalAmount || 0) + Number(request.approvedAmount);
             booking.balanceAmount = (booking.balanceAmount || 0) + Number(request.approvedAmount);
             if (booking.balanceAmount > 0 && booking.paymentStatus === "PAID") {
                 booking.paymentStatus = "PARTIALLY_PAID"; 
             }
        }
        
        await booking.save();
        
        try {
            await sendBookingEmails(booking, "extended");
            
            // Send specific approval email to guest
            const approvalEmailHtml = extensionApprovedTemplate({
                guestName: booking.guest,
                hostel: booking.hostel,
                roomNo: booking.roomNo,
                newCheckout: finalCheckout,
                approvedAmount: request.approvedAmount
            });
            
            await sendEmailAdvanced({
                to: booking.email,
                subject: "Extension Request Approved",
                html: approvalEmailHtml
            });
            
        } catch (emailError) {
            console.error("Failed to send extension approval email:", emailError);
        }
        
        res.json({ success: true, message: "Extension approved", request });

    } catch (error) {
        console.error("Approve Extension Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const rejectExtensionRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        const request = await ExtensionRequest.findById(id).populate("bookingId");
        if (!request) return res.status(404).json({ success: false, message: "Request not found" });
        
        if (request.status !== "pending") {
             return res.status(400).json({ success: false, message: "Request is not pending" });
        }
        
        request.status = "rejected";
        request.rejectionReason = reason;
        
        await request.save();
        
        const emailHtml = extensionRejectedTemplate({
            guestName: request.bookingId.guest,
            hostel: request.bookingId.hostel,
            roomNo: request.bookingId.roomNo,
            oldCheckout: request.oldCheckout,
            requestedCheckout: request.requestedCheckout,
            reason: reason
        });

        try {
            await sendEmailAdvanced({
                to: request.bookingId.email,
                subject: "Extension Request Rejected",
                html: emailHtml
            });
        } catch (emailError) {
             console.error("Failed to send extension rejection email:", emailError);
        }
        
        res.json({ success: true, message: "Extension rejected", request });
    } catch (error) {
        console.error("Reject Extension Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};