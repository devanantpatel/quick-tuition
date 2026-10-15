import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PenTool, Layers, MessageSquare, 
  Lock, Unlock, Code, FileText, LogOut, CheckCircle2, Clock, UserCheck, GripVertical
} from 'lucide-react';
import Whiteboard from './Whiteboard';
import CodePlayground from './CodePlayground';
import PresentationViewer from './PresentationViewer';
import SideDock from './SideDock';
import SessionReceiptModal from './SessionReceiptModal';
import { useApp } from '../../context/AppContext';
import { useClassroomSync } from '../../hooks/useClassroomSync';
import { saveSessionNotes } from '../../lib/db';

export default function LiveClassroom() {
  const { setActiveTab, currentUser, activeSession } = useApp();
  const isTeacher = currentUser?.role === 'teacher';
  const userRole = currentUser?.role || 'student';
  const userName = currentUser?.name || 'User';

  const roomId = activeSession?.id ? `session_${activeSession.id}` : 'live_room_default';
  const subjectTitle = activeSession?.subject || activeSession?.subject_title || 'Mathematics';
  const ratePerMin = activeSession?.rate ?? 5;
  const tutorName = activeSession?.teacherName || activeSession?.teacher_name || 'Verified Educator';

  const [activeMainTab, setActiveMainTab] = useState(() => {
    return localStorage.getItem(`${roomId}_mainTab`) || 'whiteboard';
  });
  const [otherSubTool, setOtherSubTool] = useState(() => {
    return localStorage.getItem(`${roomId}_subTool`) || 'code';
  });

  // Resizable Splitter State
  const [dockWidth, setDockWidth] = useState(380);
  const isDraggingRef = useRef(false);
  const containerRef = useRef(null);

  // Dual Lock System
  const [lockStudentView, setLockStudentView] = useState(true);
  const [isStudentAllowed, setIsStudentAllowed] = useState(false);
  const [isStudentCodeAllowed, setIsStudentCodeAllowed] = useState(false);
  
  const [showReceipt, setShowReceipt] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const { isConnected, broadcast, registerListener, peersInRoom } = useClassroomSync(
    roomId,
    userRole,
    userName
  );

  useEffect(() => {
    localStorage.setItem(`${roomId}_mainTab`, activeMainTab);
    localStorage.setItem(`${roomId}_subTool`, otherSubTool);
  }, [activeMainTab, otherSubTool, roomId]);

  const handleMouseDown = useCallback(() => {
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      const minW = 280;
      const maxW = containerRect.width * 0.75;
      if (newWidth >= minW && newWidth <= maxW) {
        setDockWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.dispatchEvent(new Event('resize'));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec) => {
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (!registerListener) return;

    if (!isTeacher && broadcast) {
      broadcast('room:request_state', {});
    }

    registerListener('classroom:sync_view', (data) => {
      if (!isTeacher && data) {
        if (data.mainTab && data.mainTab !== 'call_chat') setActiveMainTab(data.mainTab);
        if (data.subTool) setOtherSubTool(data.subTool);
        if (data.lockStudentView !== undefined) setLockStudentView(data.lockStudentView);
        if (data.isStudentAllowed !== undefined) setIsStudentAllowed(data.isStudentAllowed);
      }
    });

    registerListener('session:force_completed', () => {
      if (!isTeacher) setShowReceipt(true);
    });
  }, [registerListener, isTeacher, broadcast]);

  const handleMainTabChange = (tab) => {
    setActiveMainTab(tab);
    if (isTeacher && broadcast && tab !== 'call_chat') {
      broadcast('classroom:sync_view', {
        mainTab: tab,
        subTool: otherSubTool,
        lockStudentView,
        isStudentAllowed
      });
    }
  };

  const handleSubToolChange = (sub) => {
    setOtherSubTool(sub);
    if (isTeacher && broadcast) {
      broadcast('classroom:sync_view', {
        mainTab: activeMainTab,
        subTool: sub,
        lockStudentView,
        isStudentAllowed
      });
    }
  };

  const toggleScreenFollowLock = () => {
    const nextVal = !lockStudentView;
    setLockStudentView(nextVal);
    if (isTeacher && broadcast) {
      broadcast('classroom:sync_view', {
        mainTab: activeMainTab,
        subTool: otherSubTool,
        lockStudentView: nextVal,
        isStudentAllowed
      });
    }
  };

  const toggleStudentDrawLock = () => {
    const nextVal = !isStudentAllowed;
    setIsStudentAllowed(nextVal);
    if (isTeacher && broadcast) {
      broadcast('classroom:sync_view', {
        mainTab: activeMainTab,
        subTool: otherSubTool,
        lockStudentView,
        isStudentAllowed: nextVal
      });
    }
  };

  const handleEndSession = async () => {
    const confirmEnd = window.confirm('Are you sure you want to complete this class? All whiteboard notes and class records will be saved.');
    if (!confirmEnd) return;

    let multiPageNotesData = null;
    try {
      if (typeof window !== 'undefined' && window.__exportWhiteboardAllPages) {
        multiPageNotesData = await window.__exportWhiteboardAllPages();
      }
    } catch (e) {}

    const bookingId = activeSession?.id;
    if (bookingId) {
      try {
        await saveSessionNotes(bookingId, {
          whiteboardNotes: multiPageNotesData,
          codeNotes: '// Mentorship Session Completed Successfully'
        });
      } catch (err) {
        console.warn('Note save warning:', err);
      }
    }

    if (broadcast) {
      broadcast('session:force_completed', { elapsedSec: elapsedSeconds });
    }

    setShowReceipt(true);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-full bg-slate-950 overflow-hidden select-none">
      
      {/* 1. TOP HEADER */}
      <div className="w-full bg-slate-900 border-b border-slate-800 px-2.5 py-1 flex flex-col gap-1 shrink-0 z-30">
        <div className="flex items-center justify-between gap-1.5 text-xs overflow-x-auto w-full">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="font-bold text-white text-xs sm:text-sm tracking-wide">{subjectTitle}</h1>
            <span className="bg-slate-800 text-slate-300 font-mono text-[9px] px-1.5 py-0.5 rounded border border-slate-700 capitalize">
              Role: <strong>{userRole}</strong>
            </span>
            <span className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-semibold hidden sm:flex items-center gap-1">
              <UserCheck className="w-2.5 h-2.5" />
              <span>Student Connected</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs">
            <span className="bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-slate-300 flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3 text-indigo-400" /> {formatTimer(elapsedSeconds)}
            </span>
            <span className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded-lg text-[9px] hidden lg:inline">
              Trial: 09:02 free
            </span>
            <button
              onClick={() => setActiveTab(isTeacher ? 'teacher' : 'student')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg transition text-[11px] flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" /> Leave
            </button>
            {isTeacher && (
              <button
                onClick={handleEndSession}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-0.5 rounded-lg transition text-[11px] flex items-center gap-1 shadow-sm"
              >
                <CheckCircle2 className="w-3 h-3" /> Complete Class
              </button>
            )}
          </div>
        </div>

        {/* Dual Lock Bar */}
        <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-slate-800/80 w-full">
          {isTeacher ? (
            <>
              <button
                onClick={toggleScreenFollowLock}
                className={`flex-1 py-1 px-1.5 rounded-lg border text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition truncate ${
                  lockStudentView
                    ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300 shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {lockStudentView ? <Lock className="w-3 h-3 text-indigo-400 shrink-0" /> : <Unlock className="w-3 h-3 shrink-0" />}
                <span className="truncate">Screen Follow: {lockStudentView ? 'LOCKED' : 'FREE'}</span>
              </button>

              <button
                onClick={toggleStudentDrawLock}
                className={`flex-1 py-1 px-1.5 rounded-lg border text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition truncate ${
                  isStudentAllowed
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {isStudentAllowed ? <Unlock className="w-3 h-3 text-emerald-400 shrink-0" /> : <Lock className="w-3 h-3 shrink-0" />}
                <span className="truncate">Student Draw: {isStudentAllowed ? 'ALLOWED' : 'LOCKED'}</span>
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between gap-1">
              <div className={`flex-1 py-0.5 px-1.5 rounded-md border text-[10px] font-bold flex items-center justify-center gap-1 truncate ${
                lockStudentView
                  ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                {lockStudentView ? <Lock className="w-3 h-3 text-indigo-400 shrink-0" /> : <Unlock className="w-3 h-3 shrink-0" />}
                <span className="truncate">Screen Follow: {lockStudentView ? 'LOCKED' : 'FREE'}</span>
              </div>

              <div className={`flex-1 py-0.5 px-1.5 rounded-md border text-[10px] font-bold flex items-center justify-center gap-1 truncate ${
                isStudentAllowed
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}>
                {isStudentAllowed ? <Unlock className="w-3 h-3 text-emerald-400 shrink-0" /> : <Lock className="w-3 h-3 text-rose-400 shrink-0" />}
                <span className="truncate">Drawing: {isStudentAllowed ? 'ALLOWED' : 'LOCKED'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN WORKSPACE */}
      <div ref={containerRef} className="flex-1 flex w-full max-w-full overflow-hidden relative min-h-0">
        
        <div className={`h-full flex-col min-h-0 overflow-hidden relative flex-1 w-full max-w-full ${
          activeMainTab === 'call_chat' ? 'hidden md:flex' : 'flex'
        }`}>

          {/* TAB 1: WHITEBOARD (Permanent Mounted) */}
          <div className={`h-full w-full flex-col min-h-0 overflow-hidden relative ${
            activeMainTab === 'whiteboard' ? 'flex flex-1' : 'hidden'
          }`}>
            <Whiteboard 
              isStudentAllowed={isStudentAllowed}
              setIsStudentAllowed={setIsStudentAllowed}
              isTeacher={isTeacher}
              lockStudentView={lockStudentView}
              broadcast={broadcast}
              registerListener={registerListener}
            />
          </div>

          {/* TAB 2: OTHER HUB (Permanent Mounted, Never Destroyed on Switch) */}
          <div className={`h-full w-full flex-col min-h-0 overflow-hidden relative ${
            activeMainTab === 'other' ? 'flex flex-1' : 'hidden'
          }`}>
            <div className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between shrink-0 w-full">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
                <button
                  disabled={!isTeacher && lockStudentView}
                  onClick={() => handleSubToolChange('pdf')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    otherSubTool === 'pdf' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  <span>PDF Viewer</span>
                </button>

                <button
                  disabled={!isTeacher && lockStudentView}
                  onClick={() => handleSubToolChange('code')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    otherSubTool === 'code' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Code Playground</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                Active: <strong className="text-indigo-400">{otherSubTool === 'pdf' ? 'PDF Viewer' : 'Code Playground'}</strong>
              </span>
            </div>

            {/* BOTH COMPONENTS REMAIN MOUNTED SO STATE & IFRAME NEVER RESET */}
            <div className="flex-1 w-full h-full overflow-hidden relative min-h-0 bg-slate-950">
              <div className={`w-full h-full ${otherSubTool === 'pdf' ? 'block' : 'hidden'}`}>
                <PresentationViewer 
                  broadcast={broadcast}
                  registerListener={registerListener}
                  isTeacher={isTeacher}
                  currentUser={currentUser}
                />
              </div>

              <div className={`w-full h-full ${otherSubTool === 'code' ? 'block' : 'hidden'}`}>
                <CodePlayground 
                  isStudentCodeAllowed={isStudentCodeAllowed}
                  setIsStudentCodeAllowed={setIsStudentCodeAllowed}
                  broadcast={broadcast}
                  registerListener={registerListener}
                  currentUser={currentUser}
                  isTeacher={isTeacher}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Resizable Divider Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="hidden md:flex w-2 hover:w-2.5 cursor-col-resize bg-slate-950 border-x border-slate-800 hover:bg-indigo-600/40 hover:border-indigo-500/60 items-center justify-center transition-all z-20 group shrink-0"
          title="Drag to resize panels"
        >
          <GripVertical className="w-3 h-3 text-slate-600 group-hover:text-indigo-400" />
        </div>

        {/* Right Dock */}
        <div 
          className={`h-full flex-col min-h-0 border-l border-slate-800 bg-slate-900 shrink-0 w-full md:w-[var(--desktop-dock-w)] ${
            activeMainTab === 'call_chat' ? 'flex' : 'hidden md:flex'
          }`}
          style={{ '--desktop-dock-w': `${dockWidth}px` }}
        >
          <SideDock 
            tutorName={tutorName}
            broadcast={broadcast}
            registerListener={registerListener}
            peersInRoom={peersInRoom}
            isTeacher={isTeacher}
            currentUser={currentUser}
          />
        </div>

      </div>

      {/* 3. BOTTOM TAB NAVIGATION */}
      <div className="h-11 bg-slate-900 border-t border-slate-800 px-2 flex items-center justify-around shrink-0 z-40 w-full">
        <button
          disabled={!isTeacher && lockStudentView}
          onClick={() => handleMainTabChange('whiteboard')}
          className={`flex-1 max-w-[200px] py-1.5 mx-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            activeMainTab === 'whiteboard' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Whiteboard</span>
        </button>

        <button
          disabled={!isTeacher && lockStudentView}
          onClick={() => handleMainTabChange('other')}
          className={`flex-1 max-w-[200px] py-1.5 mx-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            activeMainTab === 'other' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Other</span>
        </button>

        <button
          onClick={() => handleMainTabChange('call_chat')}
          className={`md:hidden flex-1 max-w-[200px] py-1.5 mx-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            activeMainTab === 'call_chat' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Call & Chat</span>
        </button>
      </div>

      <SessionReceiptModal
        isOpen={showReceipt}
        totalSeconds={elapsedSeconds}
        ratePerMin={ratePerMin}
        tutorName={tutorName}
        subjectTitle={subjectTitle}
        userRole={currentUser?.role || 'student'}
        activeSession={activeSession}
        onCloseAndRedirect={() => {
          setShowReceipt(false);
          setActiveTab(isTeacher ? 'teacher' : 'student');
        }}
      />
    </div>
  );
}