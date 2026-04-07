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

const CO_WARDEN_EMAILS = ["cowarden@thapar.edu", "cowarden2@thapar.edu"];
// ✅ UPDATE: Extensions > 2 days go to adosa2@thapar.edu
const ADOSA_EMAILS = ["adosa2@thapar.edu"];

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

export const createExtensionRequest = async (req, res) => {
    try {
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
            .populate("bookingId", "guest roomNo contact email rollno department gender purpose")
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
        
        try {
            await sendBookingEmails(booking, "extended");
            
            // ✅ Get hostel staff emails (warden and caretaker)
            const staffEmails = await getHostelStaffEmails(booking.hostel);
            
            // Send specific approval email to guest
            const approvalEmailHtml = extensionApprovedTemplate({
                guestName: booking.guest,
                hostel: booking.hostel,
                roomNo: booking.roomNo,
                newCheckout: finalCheckout,
                approvedAmount: request.approvedAmount
            });
            
            // ✅ Send to guest
            await sendEmailAdvanced({
                to: booking.email,
                subject: "Extension Request Approved",
                html: approvalEmailHtml
            });
            
            // ✅ Send to hostel warden and caretaker (if available)
            if (staffEmails.length > 0) {
                const staffNotificationHtml = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2 style="color: #27ae60;">Extension Request Approved</h2>
                        <p>An extension request has been <strong>approved</strong> for:</p>
                        <ul>
                            <li><strong>Guest:</strong> ${booking.guest}</li>
                            <li><strong>Room:</strong> ${booking.roomNo}</li>
                            <li><strong>Original Checkout:</strong> ${new Date(oldToDate).toLocaleDateString('en-IN')}</li>
                            <li><strong>New Checkout:</strong> ${new Date(finalCheckout).toLocaleDateString('en-IN')}</li>
                            <li><strong>Approved Amount:</strong> ₹${request.approvedAmount || 0}</li>
                        </ul>
                        <p style="margin-top: 20px; color: #666;">Please ensure the room status is updated accordingly.</p>
                    </div>
                `;
                
                try {
                    await sendEmailAdvanced({
                        to: staffEmails,
                        subject: `[FYI] Extension Approved - ${booking.hostel} Room ${booking.roomNo}`,
                        html: staffNotificationHtml
                    });
                } catch (staffEmailError) {
                    console.warn("Failed to send extension approval notification to hostel staff:", staffEmailError);
                }
            }
            
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
        
        // ✅ Get hostel staff emails (warden and caretaker)
        const staffEmails = await getHostelStaffEmails(request.hostel);
        
        const emailHtml = extensionRejectedTemplate({
            guestName: request.bookingId.guest,
            hostel: request.bookingId.hostel,
            roomNo: request.bookingId.roomNo,
            oldCheckout: request.oldCheckout,
            requestedCheckout: request.requestedCheckout,
            reason: reason
        });

        try {
            // ✅ Send to guest
            await sendEmailAdvanced({
                to: request.bookingId.email,
                subject: "Extension Request Rejected",
                html: emailHtml
            });
            
            // ✅ Send to hostel warden and caretaker (if available)
            if (staffEmails.length > 0) {
                const staffNotificationHtml = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2 style="color: #e74c3c;">Extension Request Rejected</h2>
                        <p>An extension request has been <strong>rejected</strong> for:</p>
                        <ul>
                            <li><strong>Guest:</strong> ${request.bookingId.guest}</li>
                            <li><strong>Room:</strong> ${request.bookingId.roomNo}</li>
                            <li><strong>Original Checkout:</strong> ${new Date(request.oldCheckout).toLocaleDateString('en-IN')}</li>
                            <li><strong>Requested Checkout:</strong> ${new Date(request.requestedCheckout).toLocaleDateString('en-IN')}</li>
                            <li><strong>Rejection Reason:</strong> ${reason}</li>
                        </ul>
                        <p style="margin-top: 20px; color: #666;">The guest has been notified accordingly.</p>
                    </div>
                `;
                
                try {
                    await sendEmailAdvanced({
                        to: staffEmails,
                        subject: `[FYI] Extension Rejected - ${request.hostel} Room ${request.bookingId.roomNo}`,
                        html: staffNotificationHtml
                    });
                } catch (staffEmailError) {
                    console.warn("Failed to send extension rejection notification to hostel staff:", staffEmailError);
                }
            }
            
        } catch (emailError) {
             console.error("Failed to send extension rejection email:", emailError);
        }
        
        res.json({ success: true, message: "Extension rejected", request });
    } catch (error) {
        console.error("Reject Extension Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
