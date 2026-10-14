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

  // Receipt Modal State (Only for Final Complete)
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

    // Remote Session Ended by Teacher
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

  // 1. Temporary Exit: Directly return to Dashboard without modal
  const handleLeaveOnly = () => {
    setActiveTab(isTeacher ? 'teacher' : 'student');
  };

  // 2. Final Complete Session: Capture Notes, broadcast to student, and open Receipt
  const handleEndSession = async (elapsedSec = 0) => {
    setFinalSeconds(elapsedSec);

    // Capture Whiteboard Snapshot
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

    // Persist to Supabase Database
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

    // Tell student that session is completed
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
    <div className="flex flex-col h-[100dvh] w-full bg-slate-950 overflow-hidden">
      {/* Header */}
      <ClassroomHeader
        subjectTitle={subjectTitle}
        ratePerMin={ratePerMin}
        onEndSession={handleEndSession}
        onLeaveOnly={handleLeaveOnly}
        peersInRoom={peersInRoom}
        currentUserRole={userRole}
      />

      {/* Sync Status Banner */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-1.5 flex items-center justify-between text-[11px]">
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

      {/* Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        <div className={`flex-1 flex flex-col h-full overflow-hidden relative min-h-0 ${
          workspaceMode === 'chat' ? 'hidden lg:flex' : 'flex'
        }`}>

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

        {/* SideDock */}
        <div className={`w-full lg:w-80 xl:w-96 h-full flex flex-col min-h-0 border-l border-slate-800/80 bg-slate-900 ${
          workspaceMode === 'chat' ? 'flex' : 'hidden lg:flex'
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

      {/* Floating Bottom Mode Switcher */}
      <div className="hidden lg:flex absolute bottom-5 left-1/2 -translate-x-1/2 z-30 gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl shadow-2xl">
        <button
          onClick={() => handleModeChange('board')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
            workspaceMode === 'board' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Whiteboard</span>
        </button>

        <button
          onClick={() => handleModeChange('code')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
            workspaceMode === 'code' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Code Editor</span>
        </button>

        <button
          onClick={() => handleModeChange('presentation')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
            workspaceMode === 'presentation' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Presentation className="w-3.5 h-3.5" />
          <span>Slides</span>
        </button>

        <button
          onClick={() => handleModeChange('split')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
            workspaceMode === 'split' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Columns className="w-3.5 h-3.5" />
          <span>Split Screen</span>
        </button>
      </div>

      {/* Final Receipt Modal */}
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