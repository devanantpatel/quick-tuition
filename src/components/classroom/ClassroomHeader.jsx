import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, LogOut, IndianRupee, AlertCircle, PauseCircle, CheckCircle } from 'lucide-react';

export default function ClassroomHeader({ 
  subjectTitle, 
  ratePerMin = 5, 
  onEndSession,
  onLeaveOnly,
  peersInRoom = [],
  currentUserRole = 'student'
}) {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const isTeacher = currentUserRole === 'teacher';
  const otherRole = isTeacher ? 'student' : 'teacher';
  const isPeerOnline = peersInRoom.some((p) => p.role === otherRole);
  const isBothConnected = isPeerOnline;

  useEffect(() => {
    let timer = null;
    if (isBothConnected) {
      timer = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isBothConnected]);

  const freeSeconds = 10 * 60;
  const isFreeTrial = secondsElapsed < freeSeconds;

  const formatTime = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const billableMinutes = isFreeTrial ? 0 : Math.ceil((secondsElapsed - freeSeconds) / 60);
  const currentCost = billableMinutes * ratePerMin;

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
      
      {/* 1. Left: Subject & Peer Status */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isPeerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
        <div className="min-w-0">
          <h2 className="font-bold text-white text-xs md:text-sm leading-tight truncate">
            {subjectTitle || '1-on-1 Mentorship Classroom'}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full border ${
              isPeerOnline 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {isPeerOnline 
                ? `${otherRole === 'teacher' ? 'Educator' : 'Student'} Connected` 
                : `${otherRole === 'teacher' ? 'Educator' : 'Student'} Left (Waiting...)`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Center: Two-Way Presence Timer */}
      <div className="flex items-center gap-2.5 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-xl font-mono text-xs shadow-inner">
        <div className="flex items-center gap-1.5 text-slate-200">
          <Clock className={`w-3.5 h-3.5 ${isBothConnected ? 'text-indigo-400' : 'text-amber-400'}`} />
          <span className="font-semibold">{formatTime(secondsElapsed)}</span>
          {!isBothConnected && (
            <span className="text-[10px] text-amber-400 flex items-center gap-0.5" title="Timer paused">
              <PauseCircle className="w-3 h-3" /> Paused
            </span>
          )}
        </div>

        <span className="text-slate-800">|</span>

        {isFreeTrial ? (
          <div className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Trial: {formatTime(Math.max(0, freeSeconds - secondsElapsed))} free</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-amber-400 font-bold text-[11px]">
            <IndianRupee className="w-3.5 h-3.5" />
            <span>{billableMinutes}m • ₹{currentCost}</span>
          </div>
        )}
      </div>

      {/* 3. Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Temporary Exit: Direct without summary */}
        <button
          onClick={() => setShowExitConfirm(true)}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition"
          title="Return to dashboard. You can rejoin anytime."
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Leave Room</span>
        </button>

        {/* Final End: Only this triggers summary and billing */}
        {isTeacher ? (
          <button
            onClick={() => setShowCompleteConfirm(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Complete Class</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (window.confirm('Request educator to finish class & generate invoice?')) {
                onEndSession(secondsElapsed);
              }
            }}
            className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition"
          >
            <span>Finish Class</span>
          </button>
        )}
      </div>

      {/* Leave Room Dialog (NO SUMMARY, JUST GO BACK) */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <h3 className="font-bold text-white text-base">Leave Classroom Temporarily?</h3>
            <p className="text-xs text-slate-400">
              Your room will remain active. You can jump back in anytime from your dashboard.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl"
              >
                Stay
              </button>
              <button
                onClick={() => { setShowExitConfirm(false); onLeaveOnly(); }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2.5 rounded-xl"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Class Dialog (TRIGGERS FINAL INVOICE & NOTES) */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Finalize & Complete Class?</h3>
            <p className="text-xs text-slate-400">
              This will end the session, save notes to both dashboards, and generate the student invoice.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCompleteConfirm(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl"
              >
                Resume Class
              </button>
              <button
                onClick={() => { setShowCompleteConfirm(false); onEndSession(secondsElapsed); }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-xl shadow-lg shadow-emerald-600/30"
              >
                End & Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}