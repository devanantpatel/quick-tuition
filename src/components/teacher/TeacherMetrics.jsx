import React from 'react';
import { Clock, IndianRupee, QrCode, CreditCard, ChevronRight } from 'lucide-react';

export default function TeacherMetrics({ 
  taughtMinutes = 0, 
  totalEarnings = 0, 
  payoutMethod = 'upi', 
  onOpenPayout 
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 1. Taught Minutes */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3.5 shadow-sm">
        <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium block">Total Taught</span>
          <span className="text-xl font-bold text-white font-mono">
            {taughtMinutes} <span className="text-xs text-slate-500 font-normal">mins</span>
          </span>
        </div>
      </div>

      {/* 2. Total Earnings */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3.5 shadow-sm">
        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <IndianRupee className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium block">Total Earnings</span>
          <span className="text-xl font-bold text-emerald-400 font-mono">
            ₹{Number(totalEarnings).toFixed(2)}
          </span>
        </div>
      </div>

      {/* 3. Payout Settings Card (Clickable) */}
      <div 
        onClick={onOpenPayout}
        className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 flex items-center justify-between cursor-pointer transition shadow-sm group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center justify-center shrink-0 group-hover:border-indigo-500/40 group-hover:text-indigo-400 transition">
            {payoutMethod === 'upi' ? <QrCode className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Payout Method</span>
            <span className="text-xs font-bold text-white capitalize flex items-center gap-1.5">
              <span>{payoutMethod === 'upi' ? 'UPI / QR Code' : 'Bank Gateway'}</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-normal">Active</span>
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition" />
      </div>
    </div>
  );
}