import React, { useState } from 'react';
import { 
  Clock, ShieldCheck, LogOut, IndianRupee, PauseCircle, PlayCircle, 
  StopCircle, FileText, User, GraduationCap, RefreshCw, AlertCircle, XCircle
} from 'lucide-react';

export default function ClassroomHeader({ 
  subjectTitle = 'Mathematics',
  topicTitle = 'Class Session',
  ratePerMin = 5, 
  onEndSession,
  onLeaveOnly,
  onStartSession,
  sessionStatus = 'idle',
  elapsedSeconds = 0,
  studentStopRequested = false,
  onRequestStopSession,
  onCancelRequestStop,
  peersInRoom = [],
  currentUserRole = 'student',
  currentUserName = 'User',
  peerUserName,
  peerActionState = null,
  isPeerInAnotherRoom = false,
  onOpenReceiptModal
}) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [refreshFlashMessage, setRefreshFlashMessage] = useState(null);

  const isTeacher = currentUserRole === 'teacher';
  const otherRole = isTeacher ? 'student' : 'teacher';
  
  // Real Peer Name Resolution
  const matchedPeer = (peersInRoom || []).find((p) => p && p.role === otherRole);
  const activePeerName = matchedPeer?.name || peerUserName || (isTeacher ? 'Student' : 'Teacher');

  const isPeerOnline = (peersInRoom || []).some((p) => p && p.role === otherRole);
  const isBothConnected = isPeerOnline;

  // 5 Minutes Free Trial
  const freeSeconds = 5 * 60;
  const isFreeTrial = elapsedSeconds < freeSeconds;
  const remainingFreeSeconds = Math.max(0, freeSeconds - elapsedSeconds);

  const formatTime = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const billableMinutes = isFreeTrial ? 0 : Math.ceil((elapsedSeconds - freeSeconds) / 60);
  const currentCost = billableMinutes * ratePerMin;

  const getRealTimeStatusMessage = () => {
    if (isPeerInAnotherRoom) return `${activePeerName} is in another session`;
    
    if (!isPeerOnline) {
      return `${activePeerName} disconnected (Timer Paused)`;
    }

    if (sessionStatus === 'paused') {
      return `Session Paused (Reconnecting...)`;
    }

    if (peerActionState?.action === 'typing' || peerActionState?.isTyping) {
      return `${activePeerName} is typing in chat...`;
    }
    if (peerActionState?.action === 'drawing' || peerActionState?.action === 'writing') {
      const toolUsed = peerActionState?.tool ? peerActionState.tool.toUpperCase() : 'PEN';
      return `${activePeerName} is writing (${toolUsed})`;
    }
    if (peerActionState?.action === 'erasing') {
      return `${activePeerName} is using eraser`;
    }
    if (peerActionState?.action === 'cleared_board') {
      return `${activePeerName} cleared the board`;
    }
    if (peerActionState?.action === 'page_change') {
      return `${activePeerName} turned to Page ${peerActionState.page || 1}`;
    }

    if (sessionStatus === 'active') {
      return isTeacher 
        ? `${activePeerName} is actively learning` 
        : `${activePeerName} is actively teaching`;
    }

    return `${activePeerName} is in room (Ready)`;
  };

  const currentDisplayStatus = getRealTimeStatusMessage();

  const handleRefreshClick = () => {
    const verifiedLocation = isPeerOnline ? currentDisplayStatus : `${activePeerName} offline`;
    setRefreshFlashMessage(verifiedLocation);
    setTimeout(() => setRefreshFlashMessage(null), 2500);
  };

  const handleStopClassSubmit = () => {
    setShowStopConfirm(false);
    if (onEndSession) {
      onEndSession(elapsedSeconds, currentCost);
    }
  };

  const isPaused = sessionStatus === 'paused' || (sessionStatus === 'active' && !isBothConnected);

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex flex-col md:flex-row items-center justify-between gap-2 shrink-0 select-none w-full z-30">
        
        {/* SECTION 1: SUBJECT & PEER STATUS */}
        <div className="flex items-center justify-between md:justify-start gap-2.5 w-full md:w-auto min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                isPeerOnline ? (isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse') : 'bg-rose-500'
              }`} />
              <h1 className="font-extrabold text-white text-xs sm:text-sm leading-tight truncate tracking-wide">
                {subjectTitle}
              </h1>
            </div>
            <span className="text-[10px] font-medium text-slate-400 truncate pl-3.5">
              {topicTitle}
            </span>
          </div>

          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] shadow-sm transition-all shrink-0 ${
            !isPeerOnline 
              ? 'border-rose-500/40 bg-rose-950/50 text-rose-300' 
              : (isPaused ? 'border-amber-500/40 bg-amber-950/50 text-amber-300' : 'border-slate-700 bg-slate-950/80 text-slate-200')
          }`}>
            <div className="w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
              {isTeacher ? (
                <User className="w-3 h-3 text-indigo-400" title="Student" />
              ) : (
                <GraduationCap className="w-3 h-3 text-emerald-400" title="Teacher" />
              )}
            </div>

            <span className="font-medium text-[10px] sm:text-[11px] truncate max-w-[150px] sm:max-w-[240px]">
              {refreshFlashMessage || currentDisplayStatus}
            </span>

            <button
              onClick={handleRefreshClick}
              className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
              title="Refresh status"
            >
              <RefreshCw className="w-2.5 h-2.5 text-indigo-400 active:rotate-180 transition-transform" />
            </button>
          </div>
        </div>

        {/* SECTION 2: TIMER METRICS & STATE ACTION BUTTONS */}
        <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto shrink-0 border-t md:border-t-0 border-slate-800/80 pt-1 md:pt-0">
          
          {/* Symbol Timer & Billing Meter */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl font-mono text-xs shadow-inner shrink-0">
            <div className="flex items-center gap-1 text-slate-200">
              <Clock className={`w-3.5 h-3.5 ${sessionStatus === 'active' && !isPaused ? 'text-indigo-400 animate-pulse' : 'text-amber-400'}`} />
              <span className="font-bold text-[11px] sm:text-xs">{formatTime(elapsedSeconds)}</span>
              {isPaused && sessionStatus !== 'idle' && sessionStatus !== 'ended' && (
                <span className="text-[10px] text-amber-400 flex items-center gap-0.5" title="Timer Paused">
                  <PauseCircle className="w-3 h-3" />
                </span>
              )}
            </div>

            <span className="text-slate-800">|</span>

            {isFreeTrial ? (
              <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]" title="Free Trial Countdown">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{formatTime(remainingFreeSeconds)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-amber-400 font-bold text-[11px]" title="Billing Metric">
                <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
                <span>{ratePerMin} × {billableMinutes}m = ₹{currentCost}</span>
              </div>
            )}
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0">

            {/* TEACHER WORKFLOW */}
            {isTeacher && (
              <>
                {sessionStatus === 'idle' && (
                  <button
                    disabled={!isBothConnected}
                    onClick={onStartSession}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition shadow-sm ${
                      isBothConnected 
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-indigo-600/30' 
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                    title={!isBothConnected ? "Waiting for student to connect" : "Start the class"}
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Start Class</span>
                  </button>
                )}

                {sessionStatus !== 'idle' && sessionStatus !== 'ended' && (
                  <>
                    {isPaused ? (
                      <div className="bg-amber-950/70 border border-amber-500/50 text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-not-allowed">
                        <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Paused</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowStopConfirm(true)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition shadow-sm ${
                          studentStopRequested 
                            ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse' 
                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                        }`}
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                        <span>{studentStopRequested ? "Student: Stop" : "Stop Class"}</span>
                      </button>
                    )}
                  </>
                )}

                {sessionStatus === 'ended' && (
                  <button
                    onClick={onOpenReceiptModal}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition shadow-emerald-600/30"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Bill & Receipt</span>
                  </button>
                )}
              </>
            )}

            {/* STUDENT WORKFLOW */}
            {!isTeacher && (
              <>
                {sessionStatus === 'active' && (
                  <>
                    {studentStopRequested ? (
                      <button
                        onClick={onCancelRequestStop}
                        className="bg-amber-950/80 hover:bg-amber-900 border border-amber-500/60 text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition shadow"
                        title="Cancel stop request"
                      >
                        <XCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Cancel Request</span>
                      </button>
                    ) : (
                      <button
                        onClick={onRequestStopSession}
                        className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Request to Stop</span>
                      </button>
                    )}
                  </>
                )}

                {isPaused && sessionStatus !== 'idle' && sessionStatus !== 'ended' && (
                  <div className="bg-amber-950/70 border border-amber-500/50 text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Paused</span>
                  </div>
                )}

                {sessionStatus === 'ended' && (
                  <button
                    onClick={onOpenReceiptModal}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition shadow-emerald-600/30"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Pay & Receipt</span>
                  </button>
                )}
              </>
            )}

            {/* EXIT ROOM BUTTON PLACED AT THE VERY LAST POSITION */}
            <button
              onClick={() => setShowExitConfirm(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition ml-1"
              title="Leave room temporarily"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>

          </div>
        </div>
      </header>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 text-center">
            <h3 className="font-bold text-white text-base">Exit Classroom?</h3>
            <p className="text-xs text-slate-400">
              The classroom remains open. You can jump back in anytime from your dashboard.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2 rounded-xl"
              >
                Stay
              </button>
              <button
                onClick={() => { setShowExitConfirm(false); onLeaveOnly(); }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2 rounded-xl"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stop Class Modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 text-center">
            <div className="w-10 h-10 bg-rose-950/60 border border-rose-500/40 text-rose-400 rounded-xl flex items-center justify-center mx-auto">
              <StopCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Stop Session & Bill?</h3>
            <p className="text-xs text-slate-400">
              Timer will freeze, whiteboard notes will be saved, and payment invoice will be generated.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2 rounded-xl"
              >
                Resume
              </button>
              <button
                onClick={handleStopClassSubmit}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2 rounded-xl shadow-lg shadow-rose-600/30"
              >
                Stop & Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}