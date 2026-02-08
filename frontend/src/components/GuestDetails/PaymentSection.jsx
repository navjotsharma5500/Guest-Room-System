//PaymentSection.jsx - NUCLEAR FIX (ALWAYS SHOWS BUTTON IF BALANCE EXISTS)
import React, { useEffect, useState } from "react";
import { Download, Building2, Receipt, AlertCircle } from "lucide-react";
import { BACKEND_URL } from "../../utils/apiConfig";

const API = BACKEND_URL;

export default function PaymentSection({ b, theme, onPay }) {
  const [debugInfo, setDebugInfo] = useState({});
  
  const paymentType = b.paymentType || "Free";
  const paymentResponsibility = b.paymentResponsibility || "GUEST";
  const isDepartmentPayment = paymentResponsibility === "DEPARTMENT";

  // ✅ NUCLEAR OPTION: Read ALL possible fields
  const totalAmount = Number(b.totalAmount || b.amount || b.totalDue || 0);
  const paidAmount = Number(b.paidAmount || 0);
  const discount = Number(b.discount || b.waveOff || 0);
  const extensionAmount = Number(b.extensionAmount || 0);
  const backendBalance = Number(b.balanceAmount);
  
  // Calculate balance multiple ways
  const calc1 = totalAmount - paidAmount - discount;
  const calc2 = totalAmount - paidAmount;
  const calc3 = backendBalance;
  
  // ✅ CRITICAL: Use the MAXIMUM balance from all calculations
  // This ensures we NEVER miss showing the button
  const realBalanceAmount = Math.max(0, calc1, calc2, calc3);
  
  // ✅ FORCE SHOW BUTTON if total > paid (regardless of other fields)
  const shouldShowButton = !isDepartmentPayment && 
                          paymentType !== "Free" && 
                          (realBalanceAmount > 0 || totalAmount > paidAmount);
  
  // Payment status
  let realPaymentStatus;
  if (realBalanceAmount <= 0 && paidAmount > 0) {
    realPaymentStatus = "PAID";
  } else if (paidAmount > 0 && realBalanceAmount > 0) {
    realPaymentStatus = "PARTIALLY_PAID";
  } else if (realBalanceAmount > 0) {
    realPaymentStatus = "UNPAID";
  } else {
    realPaymentStatus = "UNPAID";
  }

  useEffect(() => {
    const debug = {
      bookingId: b._id || b.id,
      totalAmount,
      paidAmount,
      discount,
      extensionAmount,
      backendBalance,
      calc1,
      calc2,
      calc3,
      realBalanceAmount,
      shouldShowButton,
      realPaymentStatus,
      paymentType,
      isDepartmentPayment,
      rawBooking: {
        totalAmount: b.totalAmount,
        paidAmount: b.paidAmount,
        balanceAmount: b.balanceAmount,
        discount: b.discount,
        extensionAmount: b.extensionAmount
      }
    };
    
    setDebugInfo(debug);
    console.log("🔥🔥🔥 PAYMENT SECTION DEBUG:", debug);
    console.log("🔥 RAW BOOKING OBJECT:", b);
  }, [b, totalAmount, paidAmount, realBalanceAmount]);

  return (
    <div
      className={`p-6 border-b ${
        theme === "dark" ? "border-gray-700" : "border-gray-200"
      }`}
    >
      {/* 🚨 DEBUG PANEL - Remove after fixing */}
      <div className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-400 rounded text-xs">
        <strong>🐛 DEBUG INFO:</strong>
        <pre className="mt-2 text-xs overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

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

          {/* 🔥 NUCLEAR BUTTON - ALWAYS SHOWS IF CONDITION MET */}
          {shouldShowButton && (
            <button
              onClick={onPay}
              className="ml-auto px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 
                        text-white rounded-lg hover:from-green-600 hover:to-green-700 
                        transition font-bold flex items-center gap-2 shadow-lg 
                        hover:shadow-xl transform hover:scale-105 animate-pulse"
              style={{ animationDuration: '2s' }}
            >
              <Receipt size={18} />
              💰 MAKE PAYMENT NOW
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

        {/* Department Payment Card */}
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

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white/70 rounded-lg p-3 border border-orange-200">
                <p className="text-xs text-orange-700 font-medium mb-1">Total Amount</p>
                <p className="text-lg font-bold text-orange-900">
                  ₹{totalAmount.toLocaleString()}
                </p>
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

            <button
              onClick={onPay}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 
                        rounded-lg hover:from-orange-700 hover:to-red-700 transition font-bold 
                        shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Receipt className="w-5 h-5" />
              Pay Now (Department)
            </button>
          </div>
        )}

        {/* Regular Payment Breakdown */}
        {!isDepartmentPayment && realBalanceAmount > 0 && (
          <div className="mt-3 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
            <h4 className="text-red-900 font-bold mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Outstanding Balance
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-red-700 font-medium mb-1">Total Amount</p>
                <p className="text-red-900 font-bold text-xl">
                  ₹{totalAmount.toLocaleString()}
                </p>
                {extensionAmount > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    Includes ext: ₹{extensionAmount.toLocaleString()}
                  </p>
                )}
              </div>

              <div>
                <p className="text-green-700 font-medium mb-1">Paid So Far</p>
                <p className="text-green-900 font-bold text-xl">
                  ₹{paidAmount.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-red-700 font-medium mb-1">Balance Due</p>
                <p className="text-red-900 font-bold text-xl">
                  ₹{realBalanceAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Fully Paid Indicator */}
        {realBalanceAmount <= 0 && totalAmount > 0 && paidAmount > 0 && (
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
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}