import React from 'react';
import { DollarSign, Clock, Activity, MessageSquare } from 'lucide-react';

export default function TeacherMetrics({ coursesCount, pendingCount, payoutMethod, onOpenPayout }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Total Earnings
          </span>
          <button onClick={onOpenPayout} className="text-[10px] text-indigo-400 hover:underline">
            Payouts →
          </button>
        </div>
        <div className="text-lg md:text-xl font-bold text-emerald-400">₹840.00</div>
        <div className="text-[10px] text-slate-500">
          Method: <span className="text-slate-300 uppercase font-semibold">{payoutMethod}</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-indigo-400" /> Taught Minutes
        </span>
        <div className="text-lg md:text-xl font-bold text-white">105 mins</div>
        <div className="text-[10px] text-slate-500">First 10 mins free</div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-cyan-400" /> Active Subjects
        </span>
        <div className="text-lg md:text-xl font-bold text-white">{coursesCount}</div>
        <div className="text-[10px] text-slate-500">Live for bookings</div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" /> Pending Requests
        </span>
        <div className="text-lg md:text-xl font-bold text-amber-400">{pendingCount}</div>
        <div className="text-[10px] text-slate-500">Needs your review</div>
      </div>
    </div>
  );
}