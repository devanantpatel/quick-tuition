import React, { useState, useEffect } from 'react';
import { PenTool, Code, MessageSquare, Wifi, WifiOff, Columns, Presentation } from 'lucide-react';
import ClassroomHeader from './ClassroomHeader';
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
  const subjectTitle = activeSession?.subject || activeSession?.subject_title || 'Live 1-on-1 Mentorship';
  const ratePerMin = activeSession?.rate ?? 5;
  const tutorName = activeSession?.teacherName || activeSession?.teacher_name || 'Verified Educator';

  // Workspace View: 'board' | 'code' | 'presentation' | 'split' | 'chat'
  const [workspaceMode, setWorkspaceMode] = useState('board');

  // Master Permissions
  const [isStudentAllowed, setIsStudentAllowed] = useState(false);
  const [isStudentCodeAllowed, setIsStudentCodeAllowed] = useState(false);

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false);
  const [finalSeconds, setFinalSeconds] = useState(0);

  // Realtime Supabase Channel
  const { isConnected, broadcast, registerListener, peersInRoom } = useClassroomSync(
    roomId,
    userRole,
    userName
  );

  useEffect(() => {
    registerListener('host:permissions', (data) => {
      if (!isTeacher) {
        setIsStudentAllowed(Boolean(data.isStudentAllowed));
        setIsStudentCodeAllowed(Boolean(data.isStudentCodeAllowed));
      }
    });

    registerListener('host:view_mode', (data) => {
      if (!isTeacher && data.mode) {
        setWorkspaceMode(data.mode);
      }
    });

    registerListener('session:force_completed', (data) => {
      if (!isTeacher) {
        setFinalSeconds(data.elapsedSec || 0);
        setShowReceipt(true);
      }
    });
  }, [isTeacher, registerListener]);

  const updatePermissions = (boardAllowed, codeAllowed) => {
    setIsStudentAllowed(boardAllowed);
    setIsStudentCodeAllowed(codeAllowed);
    broadcast('host:permissions', {
      isStudentAllowed: boardAllowed,
      isStudentCodeAllowed: codeAllowed,
    });
  };

  const handleModeChange = (mode) => {
    setWorkspaceMode(mode);
    if (isTeacher) {
      broadcast('host:view_mode', { mode });
    }
  };

  // Leave room temporary (no receipt)
  const handleLeaveOnly = () => {
    setActiveTab(isTeacher ? 'teacher' : 'student');
  };

  // Final Complete Session
  const handleEndSession = async (elapsedSec = 0) => {
    setFinalSeconds(elapsedSec);

    let whiteboardData = null;
    try {
      const canvases = document.querySelectorAll('canvas');
      for (let c of canvases) {
        if (c.width > 300 && c.height > 300) {
          whiteboardData = c.toDataURL('image/jpeg', 0.6);
          break;
        }
      }
    } catch (e) {
      console.warn('Canvas capture error:', e);
    }

    const bookingId = activeSession?.id;
    if (bookingId && whiteboardData) {
      try {
        await saveSessionNotes(bookingId, {
          whiteboardNotes: whiteboardData,
          codeNotes: '// Session Notes Completed'
        });
      } catch (err) {
        console.error('saveSessionNotes error:', err);
      }
    }

    if (broadcast) {
      broadcast('session:force_completed', { elapsedSec });
    }

    setShowReceipt(true);
  };

  const handleRedirectToDashboard = () => {
    setShowReceipt(false);
    setActiveTab(isTeacher ? 'teacher' : 'student');
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-950 overflow-hidden relative">
      {/* 1. Header with Live Timer, Presence & Session Meta */}
      <ClassroomHeader
        subjectTitle={subjectTitle}
        ratePerMin={ratePerMin}
        onEndSession={handleEndSession}
        onLeaveOnly={handleLeaveOnly}
        peersInRoom={peersInRoom}
        currentUserRole={userRole}
      />

      {/* Sync Status Banner */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-1.5 flex items-center justify-between text-[11px] shrink-0">
        <div className="flex items-center gap-2 font-mono">
          {isConnected ? (
            <span className="text-emerald-400 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5" /> Channel: Connected ({roomId})
            </span>
          ) : (
            <span className="text-amber-400 flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5 animate-pulse" /> Connecting Channel...
            </span>
          )}
        </div>
        <div className="text-slate-400 font-sans text-xs">
          Role: <strong className="text-white capitalize">{currentUser?.role || 'Guest'}</strong>
        </div>
      </div>

      {/* 2. Main Persistent Simultaneous Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0 pb-16 lg:pb-0">
        
        <div className={`flex-1 flex flex-col h-full overflow-hidden relative min-h-0 ${
          workspaceMode === 'chat' ? 'hidden lg:flex' : 'flex'
        }`}>

          {/* PERSISTENT WHITEBOARD */}
          <div className={`h-full flex-col min-h-0 overflow-hidden relative ${
            workspaceMode === 'board' || workspaceMode === 'split' ? 'flex flex-1' : 'hidden'
          }`}>
            <Whiteboard 
              isStudentAllowed={isStudentAllowed}
              setIsStudentAllowed={(val) => updatePermissions(val, isStudentCodeAllowed)}
              broadcast={broadcast}
              registerListener={registerListener}
            />
          </div>

          {/* PERSISTENT CODE PLAYGROUND */}
          <div className={`h-full flex-col min-h-0 overflow-hidden relative ${
            workspaceMode === 'code' || workspaceMode === 'split' ? 'flex flex-1' : 'hidden'
          }`}>
            <CodePlayground 
              isStudentCodeAllowed={isStudentCodeAllowed}
              setIsStudentCodeAllowed={(val) => updatePermissions(isStudentAllowed, val)}
              broadcast={broadcast}
              registerListener={registerListener}
            />
          </div>

          {/* PERSISTENT PRESENTATION & ANNOTATION VIEWER */}
          <div className={`h-full flex-col min-h-0 overflow-hidden relative ${
            workspaceMode === 'presentation' ? 'flex flex-1' : 'hidden'
          }`}>
            <PresentationViewer 
              broadcast={broadcast}
              registerListener={registerListener}
              isTeacher={isTeacher}
            />
          </div>

        </div>

        {/* 3. SideDock with Video Call & Chat */}
        <div className={`w-full lg:w-80 xl:w-96 h-full flex flex-col min-h-0 border-l border-slate-800/80 bg-slate-900 ${
          workspaceMode === 'chat' ? 'flex flex-1' : 'hidden lg:flex'
        }`}>
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

      {/* 4. RESPONSIVE FLOATING WORKSPACE CONTROLLER (Mobile + Desktop Both Fixed) */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 sm:gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl shadow-2xl max-w-[96vw] overflow-x-auto">
        <button
          onClick={() => handleModeChange('board')}
          className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
            workspaceMode === 'board' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Whiteboard</span>
        </button>

        <button
          onClick={() => handleModeChange('code')}
          className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
            workspaceMode === 'code' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Code Editor</span>
        </button>

        <button
          onClick={() => handleModeChange('presentation')}
          className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
            workspaceMode === 'presentation' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Presentation className="w-3.5 h-3.5" />
          <span>Slides</span>
        </button>

        <button
          onClick={() => handleModeChange('split')}
          className={`hidden md:flex px-3 py-1.5 rounded-xl text-xs font-semibold items-center gap-1.5 transition shrink-0 ${
            workspaceMode === 'split' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Columns className="w-3.5 h-3.5" />
          <span>Split</span>
        </button>

        {/* Mobile View Video/Chat Switcher Tab */}
        <button
          onClick={() => handleModeChange('chat')}
          className={`lg:hidden px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition shrink-0 ${
            workspaceMode === 'chat' ? 'bg-amber-600 text-white shadow-md' : 'text-amber-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Call & Chat</span>
        </button>
      </div>

      {/* 5. Post-Session Receipt Modal */}
      <SessionReceiptModal
        isOpen={showReceipt}
        totalSeconds={finalSeconds}
        ratePerMin={ratePerMin}
        tutorName={tutorName}
        subjectTitle={subjectTitle}
        userRole={currentUser?.role || 'student'}
        activeSession={activeSession}
        onCloseAndRedirect={handleRedirectToDashboard}
      />
    </div>
  );
}