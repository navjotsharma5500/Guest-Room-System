//controllers/extensionController.js
import ExtensionRequest from "../models/ExtensionRequest.js";
import Booking from "../models/Booking.js";
import Bill from "../models/Bill.js";
import User from "../models/User.js";
import { sendEmailAdvanced } from "../emails/sendEmail.js";
import extensionRequestTemplate from "../emails/templates/extensionRequest.js";
import extensionRejectedTemplate from "../emails/templates/extensionRejected.js";
import extensionApprovedTemplate from "../emails/templates/extensionApproved.js";
import { sendBookingEmails } from "./bookingController.js";
import { parseDateOnlyToUtcDate } from "../utils/billingDates.js";
import { asyncSendEmails } from "../utils/asyncEmail.js";
import { getRequiredExtensionApprovalLevel, getSystemSettings } from "../utils/systemSettings.js";

// ✅ NEW: Helper function to get hostel warden and caretaker emails
const getHostelStaffEmails = async (hostel) => {
    try {
        const staffEmails = [];
        
        // Find warden for this hostel
        const warden = await User.findOne({ role: "warden", hostel: hostel });
        if (warden && warden.email) {
            staffEmails.push(warden.email);
        }
        
        // Find caretaker for this hostel
        const caretaker = await User.findOne({ role: "caretaker", assignedHostel: hostel });
        if (caretaker && caretaker.email) {
            staffEmails.push(caretaker.email);
        }
        
        return staffEmails;
    } catch (error) {
        console.error("Error fetching hostel staff emails:", error);
        return [];
    }
};

// ✅ NEW: Helper function to get all stakeholder emails (warden, caretaker, guest room manager)
const getStakeholderEmails = async (hostel) => {
    try {
        const stakeholders = {
            wardenEmail: null,
            caretakerEmail: null,
            managerEmail: null
        };
        
        // Find warden for this hostel
        const warden = await User.findOne({ role: "warden", hostel: hostel });
        if (warden && warden.email) {
            stakeholders.wardenEmail = warden.email;
        }
        
        // Find caretaker for this hostel
        const caretaker = await User.findOne({ role: "caretaker", assignedHostel: hostel });
        if (caretaker && caretaker.email) {
            stakeholders.caretakerEmail = caretaker.email;
        }
        
        // Find guest room manager (system-level)
        const manager = await User.findOne({ role: "manager" });
        if (manager && manager.email) {
            stakeholders.managerEmail = manager.email;
        }
        
        return stakeholders;
    } catch (error) {
        console.error("Error fetching stakeholder emails:", error);
        return {
            wardenEmail: null,
            caretakerEmail: null,
            managerEmail: null
        };
    }
};

export const createExtensionRequest = async (req, res) => {
    try {
        const settings = await getSystemSettings();
        const {
            bookingId,
            requestedCheckout,
            remarks,
            paymentData,
            extensionAttachments,
            attachments,
            paymentAttachments
        } = req.body;
        
        if (!bookingId || !requestedCheckout) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

        const oldCheckout = parseDateOnlyToUtcDate(booking.to);
        const newCheckout = parseDateOnlyToUtcDate(requestedCheckout);
        
        // ✅ Check: Can only request extension UNTIL the checkout date (not after)
        const toDateOnly = (d) => {
            const dt = new Date(d);
            return Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate());
        };
        const nowDateOnly = toDateOnly(new Date());
        const checkoutDateOnly = toDateOnly(oldCheckout);
        
        if (nowDateOnly > checkoutDateOnly) {
            return res.status(400).json({ success: false, message: "Cannot submit extension request after checkout date has passed" });
        }
        
        if (newCheckout <= oldCheckout) {
            return res.status(400).json({ success: false, message: "New checkout date must be after current checkout date" });
        }

        // ✅ FIX: Date-only diff — strips the time component so IST/UTC offset never
        // inflates the count.  10 Mar → 11 Mar = exactly 1 day regardless of whether
        // booking.to is stored as midnight UTC or 18:30 UTC (midnight IST).
        const daysExtended = Math.round((toDateOnly(newCheckout) - toDateOnly(oldCheckout)) / 86400000);

        const totalStayDays = Math.max(1, Math.round((toDateOnly(newCheckout) - toDateOnly(booking.from)) / 86400000));
        const maxExtensionRequestDays = Number(settings?.extensionRules?.maxExtensionRequestDays || 30);

        if (daysExtended > maxExtensionRequestDays) {
            return res.status(400).json({
                success: false,
                message: `Extension request cannot exceed ${maxExtensionRequestDays} day(s)`
            });
        }

        const requiredApprovalLevel = getRequiredExtensionApprovalLevel(totalStayDays, settings);

        if (requiredApprovalLevel === "direct") {
            return res.status(400).json({
                success: false,
                message: "This stay is within caretaker authority. Use Direct Extension instead.",
            });
        }

        if (requiredApprovalLevel === "not_allowed") {
            return res.status(400).json({
                success: false,
                message: `Extension request exceeds the maximum allowed total stay of ${settings?.extensionRules?.adminLevelDays || 30} day(s)`,
            });
        }

        // ✅ FIX: Extract all payment fields so they are saved as top-level fields
        // on ExtensionRequest and correctly displayed in ApprovalPage.
        const extensionPaymentType        = paymentData?.extensionPaymentType        || "Paid";
        const extensionAmount             = Number(paymentData?.extensionAmount)      || 0;
        const extensionPaymentRemarks     = paymentData?.extensionPaymentRemarks      || "";
        const extensionPaymentAttachments = Array.isArray(paymentData?.extensionPaymentAttachments)
            ? paymentData.extensionPaymentAttachments
            : Array.isArray(paymentAttachments)
            ? paymentAttachments
            : [];

        const resolvedExtensionAttachments = Array.isArray(extensionAttachments)
            ? extensionAttachments
            : Array.isArray(attachments)
            ? attachments
            : Array.isArray(paymentData?.extensionAttachments)
            ? paymentData.extensionAttachments
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
            extensionAttachments: resolvedExtensionAttachments,
            paymentData: paymentData || {},
        });

        const approverEmails = (
            await User.find({
                role: requiredApprovalLevel,
                email: { $exists: true, $ne: "" },
                $or: [{ isActive: { $exists: false } }, { isActive: true }]
            }).select("email").lean()
        ).map((user) => user.email).filter(Boolean);
        const roleName = requiredApprovalLevel === "co_warden" 
            ? "Co-Warden" 
            : requiredApprovalLevel === "adosa" 
            ? "Dean of Student Affairs (ADOSA)" 
            : "Dean of Student Affairs (DoSA)";
        
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

        const response = res.status(201).json({ success: true, message: "Extension request submitted successfully", extensionRequest });

        asyncSendEmails(() => sendEmailAdvanced({
            to: approverEmails,
            subject: "New Extension Approval Request",
            html: emailHtml
        }));

        return response;

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
        
        const bookingStatusFilter = status === "pending"
            ? { status: { $nin: ["cancelled", "checked_out"] } }
            : undefined;

        const requests = await ExtensionRequest.find(query)
            .populate({
                path: "bookingId",
                select: "guest roomNo contact email rollno department gender purpose status",
                match: bookingStatusFilter
            })
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });

        const filteredRequests = bookingStatusFilter
            ? requests.filter((request) => request.bookingId !== null)
            : requests;
            
        res.json({ success: true, requests: filteredRequests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const approveExtensionRequest = async (req, res) => {
    try {
        const settings = await getSystemSettings();
        const { id } = req.params;
        const { approvedCheckout, approvedAmount } = req.body;
        
        const request = await ExtensionRequest.findById(id).populate("bookingId");
        if (!request) return res.status(404).json({ success: false, message: "Request not found" });
        
        if (request.status !== "pending") {
            return res.status(400).json({ success: false, message: "Request is not pending" });
        }
        
        const userRole = req.user.role;
        const totalStayDays = Math.max(1, Math.round((new Date(request.requestedCheckout) - new Date(request.bookingId?.from || request.oldCheckout)) / (1000 * 3600 * 24)));
        const requiredLevel = getRequiredExtensionApprovalLevel(totalStayDays, settings);

        if (!["admin", "adosa", "co_warden"].includes(userRole)) {
            return res.status(403).json({ success: false, message: "Permission denied" });
        }

        if (requiredLevel === "not_allowed") {
            return res.status(400).json({ success: false, message: "This request exceeds configured extension approval limits" });
        }

        if (userRole !== "admin" && userRole !== requiredLevel) {
            return res.status(403).json({ success: false, message: `This request requires ${requiredLevel} approval` });
        }
        
        request.status = "approved";
        request.approvedAmount = Number(approvedAmount) || 0;
        await request.save();
        
        const booking = await Booking.findById(request.bookingId?._id || request.bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        if (booking.status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Cannot approve extension. Booking is already cancelled."
            });
        }

        if (booking.status === "checked_out") {
            return res.status(400).json({
                success: false,
                message: "Cannot approve extension. Booking already checked out."
            });
        }

        const oldToDate = booking.to;
        
        const finalCheckout = approvedCheckout
            ? parseDateOnlyToUtcDate(approvedCheckout)
            : parseDateOnlyToUtcDate(request.requestedCheckout);
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

        console.log("📝 Extension history saved:", {
            bookingId: booking._id,
            oldCheckout: oldToDate,
            newCheckout: finalCheckout,
            approvedAmount: request.approvedAmount,
            extensionHistoryLength: booking.extensionHistory.length,
            latestEntry: booking.extensionHistory[booking.extensionHistory.length - 1]
        });

        if (Array.isArray(request.extensionAttachments) && request.extensionAttachments.length > 0) {
            booking.extensionAttachments = [
                ...(booking.extensionAttachments || []),
                ...request.extensionAttachments
            ];
        }

        if (Array.isArray(request.extensionPaymentAttachments) && request.extensionPaymentAttachments.length > 0) {
            booking.extensionPaymentAttachments = [
                ...(booking.extensionPaymentAttachments || []),
                ...request.extensionPaymentAttachments
            ];
        }
        
        if (request.approvedAmount > 0) {
             booking.totalAmount = (booking.totalAmount || 0) + Number(request.approvedAmount);
             booking.balanceAmount = (booking.balanceAmount || 0) + Number(request.approvedAmount);
             if (booking.balanceAmount > 0 && booking.paymentStatus === "PAID") {
                 booking.paymentStatus = "PARTIALLY_PAID"; 
             }
        }
        
        await booking.save();
        
        const response = res.json({ success: true, message: "Extension approved", request });

        asyncSendEmails(async () => {
            sendBookingEmails(booking, "extended");
            
            const stakeholders = await getStakeholderEmails(booking.hostel);
            const ccEmails = [];
            if (stakeholders.wardenEmail) ccEmails.push(stakeholders.wardenEmail);
            if (stakeholders.caretakerEmail) ccEmails.push(stakeholders.caretakerEmail);
            if (stakeholders.managerEmail) ccEmails.push(stakeholders.managerEmail);
            const uniqueCcEmails = [...new Set(ccEmails)];
            
            const approvalEmailHtml = extensionApprovedTemplate({
                guestName: booking.guest,
                hostel: booking.hostel,
                roomNo: booking.roomNo,
                newCheckout: finalCheckout,
                approvedAmount: request.approvedAmount
            });
            
            return sendEmailAdvanced({
                to: booking.email,
                cc: uniqueCcEmails,
                subject: "Extension Request Approved",
                html: approvalEmailHtml
            });
        });

        return response;

    } catch (error) {
        console.error("Approve Extension Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const rejectExtensionRequest = async (req, res) => {
    try {
        const settings = await getSystemSettings();
        const { id } = req.params;
        const { reason } = req.body;
        
        const request = await ExtensionRequest.findById(id).populate("bookingId");
        if (!request) return res.status(404).json({ success: false, message: "Request not found" });
        
        if (request.status !== "pending") {
             return res.status(400).json({ success: false, message: "Request is not pending" });
        }
        
        const userRole = req.user.role;
        const totalStayDays = Math.max(1, Math.round((new Date(request.requestedCheckout) - new Date(request.bookingId?.from || request.oldCheckout)) / (1000 * 3600 * 24)));
        const requiredLevel = getRequiredExtensionApprovalLevel(totalStayDays, settings);

        if (!["admin", "adosa", "co_warden"].includes(userRole)) {
            return res.status(403).json({ success: false, message: "Permission denied" });
        }

        if (userRole !== "admin" && userRole !== requiredLevel) {
            return res.status(403).json({ success: false, message: `This request requires ${requiredLevel} approval` });
        }
        
        request.status = "rejected";
        request.rejectionReason = reason;
        
        await request.save();
        
        // ✅ Get all stakeholder emails (warden, caretaker, guest room manager)
        const stakeholders = await getStakeholderEmails(request.hostel);
        
        // Build CC list - include warden, caretaker, and manager
        const ccEmails = [];
        if (stakeholders.wardenEmail) ccEmails.push(stakeholders.wardenEmail);
        if (stakeholders.caretakerEmail) ccEmails.push(stakeholders.caretakerEmail);
        if (stakeholders.managerEmail) ccEmails.push(stakeholders.managerEmail);
        
        // Remove duplicates
        const uniqueCcEmails = [...new Set(ccEmails)];
        
        const emailHtml = extensionRejectedTemplate({
            guestName: request.bookingId.guest,
            hostel: request.bookingId.hostel,
            roomNo: request.bookingId.roomNo,
            oldCheckout: request.oldCheckout,
            requestedCheckout: request.requestedCheckout,
            reason: reason
        });

        const response = res.json({ success: true, message: "Extension rejected", request });

        asyncSendEmails(() => sendEmailAdvanced({
            to: request.bookingId.email,
            cc: uniqueCcEmails,
            subject: "Extension Request Rejected",
            html: emailHtml
        }));

        return response;
    } catch (error) {
        console.error("Reject Extension Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
