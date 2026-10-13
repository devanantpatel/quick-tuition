import React from 'react';
import { DollarSign, Clock, QrCode } from 'lucide-react';

export default function TeacherMetrics({ 
  taughtMinutes = 120, 
  totalEarnings = 450, 
  payoutMethod = 'upi', 
  onOpenPayout 
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Earnings */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Earnings</span>
          <div className="text-xl font-bold text-emerald-400">₹{totalEarnings.toFixed(2)}</div>
        </div>
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
          <DollarSign className="w-5 h-5" />
        </div>
      </div>

      {/* Taught Minutes */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Taught Minutes</span>
          <div className="text-xl font-bold text-indigo-400">{taughtMinutes} mins</div>
        </div>
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* Payout Quick Action */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Settlement Method</span>
          <div className="text-sm font-bold text-white capitalize">{payoutMethod === 'upi' ? 'Direct UPI (0% Fee)' : 'Bank Gateway'}</div>
        </div>
        <button 
          onClick={onOpenPayout}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl border border-slate-700 transition"
          title="Configure Payout"
        >
          <QrCode className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}