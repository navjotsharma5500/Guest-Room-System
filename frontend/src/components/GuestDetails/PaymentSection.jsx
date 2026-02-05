//PaymentSection.jsx
import React from "react";
import { Download } from "lucide-react";
import { BACKEND_URL } from "../../utils/apiConfig";

const API = BACKEND_URL;

export default function PaymentSection({ b, theme, onPay }) {
  const paymentType = b.paymentType || "Free";
  const amount = Number(b.amount || b.totalAmount || 0);
  const paymentStatus = b.paymentStatus || "UNPAID";

  return (
  <div
    className={`p-4 sm:p-6 border-b ${
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        {/* Payment Text */}
        <p
          className={`font-semibold text-base sm:text-lg ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          {paymentType === "Paid"
            ? `Paid ${amount ? `(₹${amount})` : ""}`
            : paymentType === "Free"
            ? `Free ${
                b.remarks || b.freeRemarks
                  ? `- Remarks: ${b.remarks || b.freeRemarks}`
                  : ""
              }`
            : paymentType}
        </p>

        {/* Make Payment Button */}
        {Number(b.totalAmount || b.amount || 0) > 0 &&
          (b.paymentStatus ?? "UNPAID") !== "PAID" && (
            <button
              onClick={onPay}
              className="w-full sm:w-auto sm:ml-auto px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
            >
              Make Payment
            </button>
          )}

        {/* Payment Status Badge */}
        {b.paymentStatus && (
          <span
            className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
              b.paymentStatus === "PAID"
                ? "bg-green-100 text-green-700"
                : b.paymentStatus === "PARTIALLY_PAID"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {b.paymentStatus === "PAID" && "✓ Fully Paid"}
            {b.paymentStatus === "PARTIALLY_PAID" &&
              `⚡ Partial (₹${b.paidAmount || 0} / ₹${
                b.totalAmount || 0
              })`}
            {b.paymentStatus === "UNPAID" && "⏳ Unpaid"}
          </span>
        )}
      </div>

      {/* Payment Breakdown */}
      {b.paymentStatus !== "PAID" && b.totalAmount > 0 && (
        <div className="mt-3 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div>
              <p className="text-blue-700 font-medium">Total Amount</p>
              <p className="text-blue-900 font-bold text-base sm:text-lg">
                ₹{b.totalAmount || 0}
              </p>
            </div>

            <div>
              <p className="text-green-700 font-medium">Paid So Far</p>
              <p className="text-green-900 font-bold text-lg">
                ₹{b.paidAmount || 0}
              </p>
            </div>

            <div>
              <p className="text-red-700 font-medium">Balance Due</p>
              <p className="text-red-900 font-bold text-lg">
                ₹{b.balanceAmount ?? b.totalAmount ?? 0}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
