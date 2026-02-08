//PaymentSection.jsx
import React from "react";
import { Download, Building2, Receipt, AlertCircle } from "lucide-react";
import { BACKEND_URL } from "../../utils/apiConfig";

const API = BACKEND_URL;

export default function PaymentSection({ b, theme, onPay }) {
  const paymentType = b.paymentType || "Free";
  const paymentResponsibility = b.paymentResponsibility || "GUEST";
  const isDepartmentPayment = paymentResponsibility === "DEPARTMENT";

  // ✅ FIX: Calculate REAL total including extension amount
  const baseAmount = Number(b.totalAmount || 0);
  const extensionAmount = Number(b.extensionAmount || 0);
  const realTotalAmount = baseAmount + extensionAmount;
  
  const paidAmount = Number(b.paidAmount || 0);
  const discount = Number(b.discount || 0);
  
  // ✅ FIX: Calculate REAL balance
  const realBalanceAmount = realTotalAmount - paidAmount - discount;
  
  // ✅ FIX: Determine REAL payment status
  let realPaymentStatus;
  if (realBalanceAmount <= 0) {
    realPaymentStatus = "PAID";
  } else if (paidAmount > 0) {
    realPaymentStatus = "PARTIALLY_PAID";
  } else {
    realPaymentStatus = "UNPAID";
  }

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
              ? `Paid ${realTotalAmount ? `(₹${realTotalAmount})` : ""}`
              : paymentType === "Free"
              ? `Free ${
                  b.remarks || b.freeRemarks
                    ? `- Remarks: ${b.remarks || b.freeRemarks}`
                    : ""
                }`
              : paymentType}
          </p>

          {/* Make Payment Button - Only for non-department regular payments */}
          {!isDepartmentPayment && realBalanceAmount > 0 && (
            <button
              onClick={onPay}
              className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg
                        hover:bg-green-700 transition font-medium flex items-center gap-2"
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
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {realPaymentStatus === "PAID" && "✅ Fully Paid"}
            {realPaymentStatus === "PARTIALLY_PAID" &&
              `⚡ Partial (₹${paidAmount} / ₹${realTotalAmount})`}
            {realPaymentStatus === "UNPAID" && "⏳ Unpaid"}
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
                  ₹{realTotalAmount.toLocaleString()}
                </p>
                {extensionAmount > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    (Base: ₹{baseAmount} + Ext: ₹{extensionAmount})
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
                Guest has checked out. Payment can be processed when the department provides funds.
              </p>
            </div>
          </div>
        )}

        {/* ========================================
            REGULAR PAYMENT BREAKDOWN (Non-Department)
        ======================================== */}
        {!isDepartmentPayment && realBalanceAmount > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-blue-700 font-medium">Total Amount</p>
                <p className="text-blue-900 font-bold text-lg">
                  ₹{realTotalAmount}
                </p>
                {extensionAmount > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    Base: ₹{baseAmount}<br />
                    Extension: ₹{extensionAmount}
                  </p>
                )}
              </div>

              <div>
                <p className="text-green-700 font-medium">Paid So Far</p>
                <p className="text-green-900 font-bold text-lg">
                  ₹{paidAmount}
                </p>
              </div>

              <div>
                <p className="text-red-700 font-medium">Balance Due</p>
                <p className="text-red-900 font-bold text-lg">
                  ₹{realBalanceAmount}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================
            FULLY PAID INDICATOR
        ======================================== */}
        {realBalanceAmount <= 0 && (
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
                  {extensionAmount > 0 && ` | Extension: ₹${extensionAmount.toLocaleString()}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}