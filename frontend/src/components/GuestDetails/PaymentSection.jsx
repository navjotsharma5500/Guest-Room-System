//PaymentSection.jsx - ULTIMATE FIX v2
import React from "react";
import { Download, Building2, Receipt, AlertCircle } from "lucide-react";
import { BACKEND_URL } from "../../utils/apiConfig";

const API = BACKEND_URL;

export default function PaymentSection({ b, theme, onPay }) {
  const paymentType = b.paymentType || "Free";
  const paymentResponsibility = b.paymentResponsibility || "GUEST";
  const isDepartmentPayment = paymentResponsibility === "DEPARTMENT";

  // ✅ CRITICAL FIX: Read directly from booking object
  // The backend ALWAYS keeps these fields updated correctly
  const totalAmount = Number(b.totalAmount || 0);
  const paidAmount = Number(b.paidAmount || 0);
  const discount = Number(b.discount || 0);
  const extensionAmount = Number(b.extensionAmount || 0);
  
  // ✅ Calculate balance (backend should have this, but we calculate as backup)
  const backendBalance = Number(b.balanceAmount);
  const calculatedBalance = totalAmount - paidAmount - discount;
  
  // Use the MAXIMUM to ensure we never hide the button incorrectly
  const realBalanceAmount = Math.max(0, 
    isNaN(backendBalance) ? calculatedBalance : backendBalance,
    calculatedBalance
  );
  
  // ✅ Determine REAL payment status
  let realPaymentStatus;
  if (realBalanceAmount <= 0 && totalAmount > 0) {
    realPaymentStatus = "PAID";
  } else if (paidAmount > 0 && realBalanceAmount > 0) {
    realPaymentStatus = "PARTIALLY_PAID";
  } else if (realBalanceAmount > 0) {
    realPaymentStatus = "UNPAID";
  } else {
    realPaymentStatus = "UNPAID";
  }

  // ✅ Debug logging
  console.log("💰 PaymentSection Render:", {
    bookingId: b._id || b.id,
    totalAmount,
    paidAmount,
    discount,
    extensionAmount,
    backendBalance: b.balanceAmount,
    calculatedBalance,
    realBalanceAmount,
    realPaymentStatus,
    showButton: !isDepartmentPayment && realBalanceAmount > 0
  });

  return (
    <div
      className={`p-6 border-b ${
        theme === "dark" ? "border-gray-700" : "border-gray-200"
      }`}
    >
      <div className="col-span-2">
        <p
          className={`font-medium mb-1 ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Payment
        </p>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Payment Text */}
          <p
            className={`font-semibold text-lg ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            {paymentType === "Paid"
              ? `Paid ${totalAmount ? `(₹${totalAmount.toLocaleString()})` : ""}`
              : paymentType === "Free"
              ? `Free ${
                  b.remarks || b.freeRemarks
                    ? `- Remarks: ${b.remarks || b.freeRemarks}`
                    : ""
                }`
              : paymentType}
          </p>

          {/* ✅ CRITICAL: Make Payment Button - Show when balance > 0 */}
          {!isDepartmentPayment && realBalanceAmount > 0 && (
            <button
              onClick={onPay}
              className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg
                        hover:bg-green-700 transition font-medium flex items-center gap-2 shadow-md"
            >
              <Receipt size={16} />
              Make Payment
            </button>
          )}

          {/* Payment Status Badge */}
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              realPaymentStatus === "PAID"
                ? "bg-green-100 text-green-700"
                : realPaymentStatus === "PARTIALLY_PAID"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {realPaymentStatus === "PAID" && "✅ Fully Paid"}
            {realPaymentStatus === "PARTIALLY_PAID" &&
              `⚡ Partial (₹${paidAmount.toLocaleString()} / ₹${totalAmount.toLocaleString()})`}
            {realPaymentStatus === "UNPAID" && `⏳ Unpaid (₹${realBalanceAmount.toLocaleString()} due)`}
          </span>
        </div>

        {/* ========================================
            DEPARTMENT PAYMENT PENDING CARD
        ======================================== */}
        {isDepartmentPayment && realBalanceAmount > 0 && (
          <div className="mt-4 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-400 rounded-xl p-5 shadow-md">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-orange-900 mb-1">
                  🏢 Department Payment Pending
                </h3>
                <p className="text-sm text-orange-700">
                  This payment will be made by the department
                </p>
              </div>
            </div>

            {/* Payment Details Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white/70 rounded-lg p-3 border border-orange-200">
                <p className="text-xs text-orange-700 font-medium mb-1">Total Amount</p>
                <p className="text-lg font-bold text-orange-900">
                  ₹{totalAmount.toLocaleString()}
                </p>
                {extensionAmount > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    (Includes ext: ₹{extensionAmount.toLocaleString()})
                  </p>
                )}
              </div>

              <div className="bg-white/70 rounded-lg p-3 border border-green-200">
                <p className="text-xs text-green-700 font-medium mb-1">Paid So Far</p>
                <p className="text-lg font-bold text-green-900">
                  ₹{paidAmount.toLocaleString()}
                </p>
              </div>

              <div className="bg-white/70 rounded-lg p-3 border border-red-200">
                <p className="text-xs text-red-700 font-medium mb-1">Balance Due</p>
                <p className="text-lg font-bold text-red-900">
                  ₹{realBalanceAmount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Remarks if any */}
            {b.paymentRemarks && (
              <div className="bg-white/50 rounded-lg p-3 border border-orange-200 mb-4">
                <p className="text-xs text-orange-700 font-medium mb-1">Remarks</p>
                <p className="text-sm text-gray-700">{b.paymentRemarks}</p>
              </div>
            )}

            {/* Pay Now Button */}
            <button
              onClick={onPay}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 
                        rounded-lg hover:from-orange-700 hover:to-red-700 transition font-bold 
                        shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Receipt className="w-5 h-5" />
              Pay Now (Department)
            </button>

            {/* Info Footer */}
            <div className="mt-3 flex items-start gap-2 text-xs text-orange-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Payment can be processed when the department provides funds.
              </p>
            </div>
          </div>
        )}

        {/* ========================================
            REGULAR PAYMENT BREAKDOWN (Non-Department)
        ======================================== */}
        {!isDepartmentPayment && realBalanceAmount > 0 && (
          <div className="mt-3 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-blue-700 font-medium mb-1">Total Amount</p>
                <p className="text-blue-900 font-bold text-lg">
                  ₹{totalAmount.toLocaleString()}
                </p>
                {extensionAmount > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    Includes extension: ₹{extensionAmount.toLocaleString()}
                  </p>
                )}
              </div>

              <div>
                <p className="text-green-700 font-medium mb-1">Paid So Far</p>
                <p className="text-green-900 font-bold text-lg">
                  ₹{paidAmount.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-red-700 font-medium mb-1">Balance Due</p>
                <p className="text-red-900 font-bold text-lg">
                  ₹{realBalanceAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================
            FULLY PAID INDICATOR
        ======================================== */}
        {realBalanceAmount <= 0 && totalAmount > 0 && (
          <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-full">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-green-900 font-bold text-lg">✅ Payment Complete</p>
                <p className="text-sm text-green-700">
                  Total Paid: ₹{paidAmount.toLocaleString()}
                  {discount > 0 && ` | Discount: ₹${discount.toLocaleString()}`}
                  {extensionAmount > 0 && ` | Total: ₹${totalAmount.toLocaleString()}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}