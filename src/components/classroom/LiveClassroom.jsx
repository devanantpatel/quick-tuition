import React, { useState, useEffect } from 'react';
import { PenTool, Code, MessageSquare, Wifi, WifiOff, Columns } from 'lucide-react';
import ClassroomHeader from './ClassroomHeader';
import Whiteboard from './Whiteboard';
import CodePlayground from './CodePlayground';
import SideDock from './SideDock';
import SessionReceiptModal from './SessionReceiptModal';
import { useApp } from '../../context/AppContext';
import { useClassroomSync } from '../../hooks/useClassroomSync';

export default function LiveClassroom() {
  const { setActiveTab, currentUser, activeSession } = useApp();
  const isTeacher = currentUser?.role === 'teacher';
  const userRole = currentUser?.role || 'student';
  const userName = currentUser?.name || 'User';

  // Dynamic Room Identifier (links teacher & student to the same session channel)
  const roomId = activeSession?.id ? `session_${activeSession.id}` : 'live_room_default';
  const subjectTitle = activeSession?.subject || activeSession?.subject_title || 'Live 1-on-1 Mentorship';
  const ratePerMin = activeSession?.rate ?? 5;
  const tutorName = activeSession?.teacherName || activeSession?.teacher_name || 'Verified Educator';

  // Workspace View: 'board' | 'code' | 'split' | 'chat'
  const [workspaceMode, setWorkspaceMode] = useState('board');

  // Master Permissions
  const [isStudentAllowed, setIsStudentAllowed] = useState(false);
  const [isStudentCodeAllowed, setIsStudentCodeAllowed] = useState(false);

  // Call Mode State: 'custom' (in-app WebRTC) | 'meet' (Google Meet embedded/linked)
  const [callMode, setCallMode] = useState('custom');
  const [googleMeetUrl, setGoogleMeetUrl] = useState('');

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false);
  const [finalSeconds, setFinalSeconds] = useState(0);

  // Realtime Supabase Channel with Presence
  const { isConnected, broadcast, registerListener, peersInRoom } = useClassroomSync(
    roomId,
    userRole,
    userName
  );

  useEffect(() => {
    // 1. Host Permissions Listener
    registerListener('host:permissions', (data) => {
      if (!isTeacher) {
        setIsStudentAllowed(Boolean(data.isStudentAllowed));
        setIsStudentCodeAllowed(Boolean(data.isStudentCodeAllowed));
      }
    });

    // 2. View Mode Remote Sync
    registerListener('host:view_mode', (data) => {
      if (!isTeacher && data.mode) {
        setWorkspaceMode(data.mode);
      }
    });

    // 3. Call Mode (In-App vs Google Meet) Remote Sync
    registerListener('call:mode_changed', (data) => {
      if (data?.mode) {
        setCallMode(data.mode);
        if (data.meetUrl) {
          setGoogleMeetUrl(data.meetUrl);
        }
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

  // Switch between In-App Video & Google Meet (keeps exact same sidebar UI)
  const handleToggleCallMode = (newMode, newMeetUrl = '') => {
    setCallMode(newMode);
    if (newMeetUrl) setGoogleMeetUrl(newMeetUrl);

    broadcast('call:mode_changed', {
      mode: newMode,
      meetUrl: newMeetUrl || googleMeetUrl,
    });
  };

  // Triggered when user clicks "Leave Room" or "End Session"
  const handleEndSession = (elapsedSec = 0) => {
    setFinalSeconds(elapsedSec);
    setShowReceipt(true);
  };

  // Triggered when user completes the receipt modal
  const handleRedirectToDashboard = () => {
    setShowReceipt(false);
    setActiveTab(isTeacher ? 'teacher' : 'student');
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-950 overflow-hidden">
      {/* 1. Header with Live Timer, Presence & Session Meta */}
      <ClassroomHeader
        subjectTitle={subjectTitle}
        ratePerMin={ratePerMin}
        onEndSession={handleEndSession}
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
              <WifiOff className="w-3.5 h-3.5 animate-pulse" /> Connecting Supabase Channel...
            </span>
          )}
        </div>
        <div className="text-slate-400 font-sans text-xs">
          Role: <strong className="text-white capitalize">{currentUser?.role || 'Guest'}</strong> ({currentUser?.name || 'User'})
        </div>
      </div>

      {/* 2. Main Simultaneous Workspace (Unchanged layout) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        
        {/* Workspace Canvas / Editor Area */}
        <div className={`flex-1 flex flex-col h-full overflow-hidden relative min-h-0 ${
          workspaceMode === 'chat' ? 'hidden lg:flex' : 'flex'
        }`}>

          {/* SPLIT MODE: Simultaneous Side-by-Side */}
          {workspaceMode === 'split' && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 h-full w-full divide-y md:divide-y-0 md:divide-x divide-slate-800 min-h-0 overflow-hidden">
              <div className="h-full flex flex-col min-h-0 overflow-hidden relative">
                <Whiteboard 
                  isStudentAllowed={isStudentAllowed}
                  setIsStudentAllowed={(val) => updatePermissions(val, isStudentCodeAllowed)}
                  broadcast={broadcast}
                  registerListener={registerListener}
                />
              </div>
              <div className="h-full flex flex-col min-h-0 overflow-hidden relative">
                <CodePlayground 
                  isStudentCodeAllowed={isStudentCodeAllowed}
                  setIsStudentCodeAllowed={(val) => updatePermissions(isStudentAllowed, val)}
                  broadcast={broadcast}
                  registerListener={registerListener}
                />
              </div>
            </div>
          )}

          {/* SINGLE MODE: Whiteboard */}
          {workspaceMode === 'board' && (
            <Whiteboard 
              isStudentAllowed={isStudentAllowed}
              setIsStudentAllowed={(val) => updatePermissions(val, isStudentCodeAllowed)}
              broadcast={broadcast}
              registerListener={registerListener}
            />
          )}

          {/* SINGLE MODE: Code Playground */}
          {workspaceMode === 'code' && (
            <CodePlayground 
              isStudentCodeAllowed={isStudentCodeAllowed}
              setIsStudentCodeAllowed={(val) => updatePermissions(isStudentAllowed, val)}
              broadcast={broadcast}
              registerListener={registerListener}
            />
          )}
        </div>

        {/* 3. SideDock (Real-Time Video Call & Chat, exactly in same sidebar position) */}
        <div className={`w-full lg:w-80 xl:w-96 h-full flex flex-col min-h-0 border-l border-slate-800/80 bg-slate-900 ${
          workspaceMode === 'chat' ? 'flex' : 'hidden lg:flex'
        }`}>
          <SideDock 
            tutorName={tutorName}
            broadcast={broadcast}
            registerListener={registerListener}
            peersInRoom={peersInRoom}
            callMode={callMode}
            googleMeetUrl={googleMeetUrl}
            isTeacher={isTeacher}
            onToggleCallMode={handleToggleCallMode}
          />
        </div>
      </div>

      {/* 4. Desktop Floating Mode Controller (Unchanged) */}
      <div className="hidden lg:flex absolute bottom-5 left-1/2 -translate-x-1/2 z-30 gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl shadow-2xl">
        <button
          onClick={() => handleModeChange('board')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
            workspaceMode === 'board' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Whiteboard</span>
        </button>

        <button
          onClick={() => handleModeChange('code')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
            workspaceMode === 'code' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Code Editor</span>
        </button>

        <button
          onClick={() => handleModeChange('split')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
            workspaceMode === 'split' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Simultaneous side-by-side Whiteboard & Code"
        >
          <Columns className="w-3.5 h-3.5" />
          <span>Split Screen</span>
        </button>
      </div>

      {/* 5. Mobile Navigation Bar (Unchanged) */}
      <nav className="lg:hidden bg-slate-900 border-t border-slate-800 px-3 py-2 flex items-center justify-around z-30 shrink-0">
        <button
          onClick={() => setWorkspaceMode('board')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition px-3 py-1 rounded-xl ${
            workspaceMode === 'board' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>Whiteboard</span>
        </button>

        <button
          onClick={() => setWorkspaceMode('code')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition px-3 py-1 rounded-xl ${
            workspaceMode === 'code' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Code Editor</span>
        </button>

        <button
          onClick={() => setWorkspaceMode('chat')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition px-3 py-1 rounded-xl ${
            workspaceMode === 'chat' ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Video & Chat</span>
        </button>
      </nav>

      {/* 6. Post-Session Receipt Modal */}
      <SessionReceiptModal
        isOpen={showReceipt}
        totalSeconds={finalSeconds}
        ratePerMin={ratePerMin}
        tutorName={tutorName}
        subjectTitle={subjectTitle}
        userRole={currentUser?.role || 'student'}
        onCloseAndRedirect={handleRedirectToDashboard}
      />
    </div>
  );
}