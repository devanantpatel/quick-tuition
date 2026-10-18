import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PenTool, MessageSquare, Lock, Unlock, GripVertical
} from 'lucide-react';
import ClassroomHeader from './ClassroomHeader';
import Whiteboard from './Whiteboard';
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
  const topicTitle = activeSession?.topic || activeSession?.topic_title || 'Quadratic Equations & Roots Analysis';
  const ratePerMin = activeSession?.rate ?? 5;
  const tutorName = activeSession?.teacherName || activeSession?.teacher_name || 'Verified Educator';

  // Mobile View Switcher: 'whiteboard' | 'call_chat'
  const [mobileView, setMobileView] = useState('whiteboard');

  // Peer Live Action State (for dynamic header sentence)
  const [peerActionState, setPeerActionState] = useState({
    action: 'idle',
    tab: 'whiteboard',
    page: 1
  });

  // Resizable Splitter State
  const [dockWidth, setDockWidth] = useState(380);
  const isDraggingRef = useRef(false);
  const containerRef = useRef(null);

  // Dual Lock System
  const [lockStudentView, setLockStudentView] = useState(true);
  const [isStudentAllowed, setIsStudentAllowed] = useState(false);
  
  // Master Session State: 'idle' | 'active' | 'paused' | 'ended'
  const [sessionStatus, setSessionStatus] = useState('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [studentStopRequested, setStudentStopRequested] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const { isConnected, broadcast, registerListener, peersInRoom } = useClassroomSync(
    roomId,
    userRole,
    userName
  );

  const otherRole = isTeacher ? 'student' : 'teacher';
  const isPeerOnline = peersInRoom.some((p) => p.role === otherRole);
  const isBothConnected = isPeerOnline;

  // Auto-Lock to Receipt if session was previously completed or payment pending
  useEffect(() => {
    if (activeSession?.status === 'completed' || activeSession?.payment_status === 'review_pending') {
      setSessionStatus('ended');
      if (activeSession?.actual_connected_seconds) {
        setElapsedSeconds(activeSession.actual_connected_seconds);
      }
      setShowReceipt(true);
    }
  }, [activeSession]);

  // Resizable Dock Mouse Dragging
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

  // MASTER TIMER ENGINE (Teacher acts as the single source of truth)
  useEffect(() => {
    let timer = null;
    const shouldRun = sessionStatus === 'active' && isBothConnected;

    if (shouldRun) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => {
          const nextSec = prev + 1;
          // Teacher heartbeats the exact seconds to student
          if (isTeacher && broadcast && nextSec % 2 === 0) {
            broadcast('session:time_sync', { elapsedSec: nextSec });
          }
          return nextSec;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sessionStatus, isBothConnected, isTeacher, broadcast]);

  // DISCONNECT AUTO-PAUSE & RECONNECT RESUME LOGIC
  useEffect(() => {
    if (sessionStatus === 'active' && !isBothConnected) {
      setSessionStatus('paused');
      if (broadcast) {
        broadcast('session:status_sync', { status: 'paused' });
      }
    } else if (sessionStatus === 'paused' && isBothConnected) {
      setSessionStatus('active');
      if (broadcast) {
        broadcast('session:status_sync', { status: 'active', elapsedSec: elapsedSeconds });
      }
    }
  }, [isBothConnected, sessionStatus, broadcast, elapsedSeconds]);

  // Sync Listeners: Classroom View Lock, Peer Actions, Timing, and Session Lifecycle
  useEffect(() => {
    if (!registerListener) return;

    if (!isTeacher && broadcast) {
      broadcast('room:request_state', {});
    }

    // Initial state request by late-joining student
    registerListener('room:request_state', () => {
      if (isTeacher && broadcast) {
        broadcast('classroom:sync_view', {
          lockStudentView,
          isStudentAllowed
        });
        broadcast('session:status_sync', {
          status: sessionStatus,
          elapsedSec: elapsedSeconds
        });
      }
    });

    registerListener('classroom:sync_view', (data) => {
      if (!isTeacher && data) {
        if (data.lockStudentView !== undefined) setLockStudentView(data.lockStudentView);
        if (data.isStudentAllowed !== undefined) setIsStudentAllowed(data.isStudentAllowed);
      }
    });

    // Realtime Whiteboard & Chat status sync for ClassroomHeader
    registerListener('peer:action_update', (data) => {
      if (data && data.senderRole !== userRole) {
        setPeerActionState({
          action: data.action || 'idle',
          tab: data.tab || 'whiteboard',
          page: data.page || 1,
          tool: data.tool || null
        });
      }
    });

    // Session Status Sync (Start / Pause / Resume)
    registerListener('session:status_sync', (data) => {
      if (data?.status) {
        setSessionStatus(data.status);
      }
      if (data?.elapsedSec !== undefined && !isTeacher) {
        setElapsedSeconds(data.elapsedSec);
      }
    });

    // Time Heartbeat from Teacher to Student
    registerListener('session:time_sync', (data) => {
      if (!isTeacher && data?.elapsedSec !== undefined) {
        setElapsedSeconds(data.elapsedSec);
      }
    });

    // Student Request to Stop notification
    registerListener('session:request_stop', (data) => {
      if (isTeacher && data?.requested !== undefined) {
        setStudentStopRequested(data.requested);
      }
    });

    // Final Complete Class Triggered
    registerListener('session:force_completed', (data) => {
      if (data?.elapsedSec !== undefined) {
        setElapsedSeconds(data.elapsedSec);
      }
      setSessionStatus('ended');
      setShowReceipt(true);
    });
  }, [registerListener, isTeacher, broadcast, userRole, lockStudentView, isStudentAllowed, sessionStatus, elapsedSeconds]);

  // Mobile View Switcher & Broadcast
  const handleMobileViewChange = (view) => {
    setMobileView(view);
    if (broadcast) {
      broadcast('peer:action_update', {
        senderRole: userRole,
        action: 'idle',
        tab: view
      });
    }
  };

  // Teacher Locks
  const toggleScreenFollowLock = () => {
    const nextVal = !lockStudentView;
    setLockStudentView(nextVal);
    if (isTeacher && broadcast) {
      broadcast('classroom:sync_view', {
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
        lockStudentView,
        isStudentAllowed: nextVal
      });
    }
  };

  // Teacher Starts Class
  const handleStartSession = () => {
    if (!isBothConnected) return;
    setSessionStatus('active');
    if (broadcast) {
      broadcast('session:status_sync', { status: 'active', elapsedSec: elapsedSeconds });
    }
  };

  // Student Requests Stop
  const handleRequestStopSession = () => {
    setStudentStopRequested(true);
    if (broadcast) {
      broadcast('session:request_stop', { requested: true });
    }
  };

  // Final Session End (Teacher stops and finalizes invoice)
  const handleEndSession = async (finalSeconds) => {
    const recordedTime = typeof finalSeconds === 'number' ? finalSeconds : elapsedSeconds;
    setElapsedSeconds(recordedTime);
    setSessionStatus('ended');

    let multiPageNotesData = null;
    try {
      if (typeof window !== 'undefined' && window.__exportWhiteboardAllPages) {
        multiPageNotesData = await window.__exportWhiteboardAllPages();
      }
    } catch (e) {
      console.warn('Whiteboard export warning:', e);
    }

    const bookingId = activeSession?.id;
    if (bookingId) {
      try {
        await saveSessionNotes(bookingId, {
          whiteboardNotes: multiPageNotesData,
          sessionSummary: 'Classroom Whiteboard Session Completed Successfully'
        });
      } catch (err) {
        console.warn('Note save warning:', err);
      }
    }

    if (broadcast) {
      broadcast('session:force_completed', { elapsedSec: recordedTime });
    }

    setShowReceipt(true);
  };

  const handleLeaveOnly = () => {
    setActiveTab(isTeacher ? 'teacher' : 'student');
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-full bg-slate-950 overflow-hidden select-none">
      
      {/* 1. TOP HEADER (STATUS, PURE SYMBOL TIMER & ACTION FLOW) */}
      <ClassroomHeader
        subjectTitle={subjectTitle}
        topicTitle={topicTitle}
        ratePerMin={ratePerMin}
        onEndSession={handleEndSession}
        onLeaveOnly={handleLeaveOnly}
        onStartSession={handleStartSession}
        sessionStatus={sessionStatus}
        elapsedSeconds={elapsedSeconds}
        studentStopRequested={studentStopRequested}
        onRequestStopSession={handleRequestStopSession}
        peersInRoom={peersInRoom}
        currentUserRole={userRole}
        currentUserName={userName}
peerUserName={
  isTeacher 
    ? (peersInRoom.find(p => p.role === 'student')?.name || activeSession?.student_name || 'Student') 
    : (peersInRoom.find(p => p.role === 'teacher')?.name || tutorName || activeSession?.teacher_name || 'Teacher')
}        peerActionState={peerActionState}
        onOpenReceiptModal={() => setShowReceipt(true)}
      />

      {/* 2. DUAL LOCK SYSTEM BAR */}
      <div className="w-full bg-slate-900 border-b border-slate-800 px-3 py-1 flex items-center justify-between gap-1.5 shrink-0 z-20">
        {isTeacher ? (
          <>
            <button
              onClick={toggleScreenFollowLock}
              className={`flex-1 py-1 px-2 rounded-lg border text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition truncate ${
                lockStudentView
                  ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300 shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {lockStudentView ? <Lock className="w-3 h-3 text-indigo-400 shrink-0" /> : <Unlock className="w-3 h-3 shrink-0 text-slate-400" />}
              <span className="truncate">Screen Follow: {lockStudentView ? 'LOCKED' : 'FREE'}</span>
            </button>

            <button
              onClick={toggleStudentDrawLock}
              className={`flex-1 py-1 px-2 rounded-lg border text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition truncate ${
                isStudentAllowed
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {isStudentAllowed ? <Unlock className="w-3 h-3 text-emerald-400 shrink-0" /> : <Lock className="w-3 h-3 shrink-0 text-slate-400" />}
              <span className="truncate">Student Draw: {isStudentAllowed ? 'ALLOWED' : 'LOCKED'}</span>
            </button>
          </>
        ) : (
          <div className="w-full flex items-center justify-between gap-1.5">
            <div className={`flex-1 py-1 px-2 rounded-md border text-[10px] font-bold flex items-center justify-center gap-1.5 truncate ${
              lockStudentView
                ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              {lockStudentView ? <Lock className="w-3 h-3 text-indigo-400 shrink-0" /> : <Unlock className="w-3 h-3 shrink-0 text-slate-400" />}
              <span className="truncate">Screen Follow: {lockStudentView ? 'LOCKED' : 'FREE'}</span>
            </div>

            <div className={`flex-1 py-1 px-2 rounded-md border text-[10px] font-bold flex items-center justify-center gap-1.5 truncate ${
              isStudentAllowed
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}>
              {isStudentAllowed ? <Unlock className="w-3 h-3 text-emerald-400 shrink-0" /> : <Lock className="w-3 h-3 shrink-0 text-rose-400" />}
              <span className="truncate">Drawing: {isStudentAllowed ? 'ALLOWED' : 'LOCKED'}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. MAIN WORKSPACE: WHITEBOARD + RESIZABLE SIDEDOCK */}
      <div ref={containerRef} className="flex-1 flex w-full max-w-full overflow-hidden relative min-h-0">
        
        {/* Full Interactive Whiteboard Area */}
        <div className={`h-full flex-col min-h-0 overflow-hidden relative flex-1 w-full max-w-full ${
          mobileView === 'call_chat' ? 'hidden md:flex' : 'flex'
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

        {/* Resizable Divider Handle (Desktop) */}
        <div
          onMouseDown={handleMouseDown}
          className="hidden md:flex w-2 hover:w-2.5 cursor-col-resize bg-slate-950 border-x border-slate-800 hover:bg-indigo-600/40 hover:border-indigo-500/60 items-center justify-center transition-all z-20 group shrink-0"
          title="Drag to resize dock"
        >
          <GripVertical className="w-3 h-3 text-slate-600 group-hover:text-indigo-400" />
        </div>

        {/* Right SideDock: Video & Live Chat */}
        <div 
          className={`h-full flex-col min-h-0 border-l border-slate-800 bg-slate-900 shrink-0 w-full md:w-[var(--desktop-dock-w)] ${
            mobileView === 'call_chat' ? 'flex' : 'hidden md:flex'
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

      {/* 4. MOBILE BOTTOM TOGGLE */}
      <div className="md:hidden h-10 bg-slate-900 border-t border-slate-800 px-3 flex items-center justify-around shrink-0 z-40 w-full">
        <button
          onClick={() => handleMobileViewChange('whiteboard')}
          className={`flex-1 py-1.5 mx-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            mobileView === 'whiteboard' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Whiteboard</span>
        </button>

        <button
          onClick={() => handleMobileViewChange('call_chat')}
          className={`flex-1 py-1.5 mx-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            mobileView === 'call_chat' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Call & Chat</span>
        </button>
      </div>

      {/* 5. SESSION RECEIPT MODAL */}
      <SessionReceiptModal
        isOpen={showReceipt}
        totalSeconds={elapsedSeconds}
        ratePerMin={ratePerMin}
        tutorName={tutorName}
        subjectTitle={subjectTitle}
        userRole={currentUser?.role || 'student'}
        activeSession={activeSession}
        currentUser={currentUser}
        onCloseAndRedirect={() => {
          setShowReceipt(false);
          setActiveTab(isTeacher ? 'teacher' : 'student');
        }}
      />
    </div>
  );
}