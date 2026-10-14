import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, LogOut, IndianRupee, AlertCircle, Users, Video } from 'lucide-react';

export default function ClassroomHeader({ 
  subjectTitle, 
  ratePerMin = 5, 
  onEndSession,
  peersInRoom = [],
  currentUserRole = 'student',
  onSwitchToGoogleMeet
}) {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const freeSeconds = 10 * 60;
  const isFreeTrial = secondsElapsed < freeSeconds;

  const formatTime = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const billableMinutes = isFreeTrial ? 0 : Math.ceil((secondsElapsed - freeSeconds) / 60);
  const currentCost = billableMinutes * ratePerMin;

  // Check peer presence
  const otherRole = currentUserRole === 'teacher' ? 'student' : 'teacher';
  const isPeerOnline = peersInRoom.some((p) => p.role === otherRole);

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    if (onEndSession) {
      onEndSession(secondsElapsed);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
      
      {/* 1. Left: Subject & Peer Live Indicator */}
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

      {/* 2. Center: Timer & Running Billing Meter */}
      <div className="flex items-center gap-2.5 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-xl font-mono text-xs shadow-inner">
        <div className="flex items-center gap-1.5 text-slate-200">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold">{formatTime(secondsElapsed)}</span>
        </div>

        <span className="text-slate-800">|</span>

        {isFreeTrial ? (
          <div className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Trial: {formatTime(freeSeconds - secondsElapsed)} free</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-amber-400 font-bold text-[11px]">
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Running: {billableMinutes}m • ₹{currentCost}</span>
          </div>
        )}
      </div>

      {/* 3. Right: Google Meet Option & Leave Room */}
      <div className="flex items-center gap-2">
        {onSwitchToGoogleMeet && (
          <button
            onClick={onSwitchToGoogleMeet}
            className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition"
            title="Switch to Google Meet if WebRTC video has slow network"
          >
            <Video className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Google Meet Call</span>
          </button>
        )}

        <button
          onClick={() => setShowExitConfirm(true)}
          className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Leave Room</span>
        </button>
      </div>

      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-950/60 border border-rose-500/40 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-white text-base">Leave Session?</h3>
              <p className="text-xs text-slate-400 mt-1">
                You can rejoin this room anytime from your dashboard as long as the session is still active.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl transition"
              >
                Stay
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-lg shadow-rose-600/30"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}