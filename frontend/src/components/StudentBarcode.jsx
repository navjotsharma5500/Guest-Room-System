import React from "react";
import Barcode from "react-barcode";

export default function StudentBarcode({ value }) {
  if (!value) return null;

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md px-4 py-3 bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-center">
          <Barcode
            value={value}
            format="CODE128"
            width={2}
            height={120}
            displayValue={false}
            background="#ffffff"
            lineColor="#020617"
            margin={0}
          />
        </div>
      </div>
    </div>
  );
}

