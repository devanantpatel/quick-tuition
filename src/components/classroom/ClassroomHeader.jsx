import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, LogOut, DollarSign } from 'lucide-react';

export default function ClassroomHeader({ subjectTitle, ratePerMin = 5, onEndSession }) {
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const freeSeconds = 10 * 60; // 10 minutes free trial
  const isFreeTrial = secondsElapsed < freeSeconds;

  // Format MM:SS
  const formatTime = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Billable minutes calculation (post 10 mins)
  const billableMinutes = isFreeTrial ? 0 : Math.ceil((secondsElapsed - freeSeconds) / 60);
  const currentCost = billableMinutes * ratePerMin;

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
      {/* Session Title */}
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <div>
          <h2 className="font-bold text-white text-sm md:text-base leading-tight">
            {subjectTitle || '1-on-1 Micro-Tutoring Room'}
          </h2>
          <span className="text-[11px] text-slate-400">Live Peer-to-Peer Session</span>
        </div>
      </div>

      {/* Center: Live Timer & Billing Status */}
      <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-4 py-1.5 rounded-xl font-mono text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>{formatTime(secondsElapsed)}</span>
        </div>

        <span className="text-slate-700">|</span>

        {isFreeTrial ? (
          <div className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Free Trial ({formatTime(freeSeconds - secondsElapsed)} left)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-amber-400 font-bold text-[11px]">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Paid: {billableMinutes}m • ₹{currentCost}</span>
          </div>
        )}
      </div>

      {/* Leave Room Button - passes secondsElapsed */}
      <button
        onClick={() => onEndSession(secondsElapsed)}
        className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-semibold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Leave Room</span>
      </button>
    </header>
  );
}