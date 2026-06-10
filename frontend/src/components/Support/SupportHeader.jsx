import React from "react";

export default function SupportHeader({ googleUser, onLogout }) {
  return (
    <header className="bg-white border-b sticky top-0 z-20">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-red-600 font-black">TIET Guest Support</p>
          <h1 className="text-xl font-black text-slate-900">Room Help Desk</h1>
        </div>
        {googleUser && (
          <button onClick={onLogout} className="flex items-center gap-2 rounded-full border px-3 py-1.5 bg-slate-50">
            {googleUser.picture && <img src={googleUser.picture} alt="" className="w-7 h-7 rounded-full" />}
            <span className="text-xs font-bold text-slate-700">Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
