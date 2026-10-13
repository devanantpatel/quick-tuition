import React, { useState, useEffect } from 'react';
import { PenTool, Code, MessageSquare, Wifi, WifiOff } from 'lucide-react';
import ClassroomHeader from './ClassroomHeader';
import Whiteboard from './Whiteboard';
import CodePlayground from './CodePlayground';
import SideDock from './SideDock';
import SessionReceiptModal from './SessionReceiptModal';
import { useApp } from '../../context/AppContext';
import { useClassroomSync } from '../../hooks/useClassroomSync';

export default function LiveClassroom() {
  const { setActiveTab, currentUser } = useApp();
  const isTeacher = currentUser?.role === 'teacher';

  const [activeTabMobile, setActiveTabMobile] = useState('board');

  // Master Permissions
  const [isStudentAllowed, setIsStudentAllowed] = useState(false);
  const [isStudentCodeAllowed, setIsStudentCodeAllowed] = useState(false);

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false);
  const [finalSeconds, setFinalSeconds] = useState(0);

  // Realtime Supabase Channel
  const { isConnected, broadcast, registerListener } = useClassroomSync('demo_live_session_01');

  useEffect(() => {
    registerListener('host:permissions', (data) => {
      if (!isTeacher) {
        setIsStudentAllowed(data.isStudentAllowed);
        setIsStudentCodeAllowed(data.isStudentCodeAllowed);
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

  // Triggered when user clicks "Leave Room"
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
      {/* 1. Header with Live Timer */}
      <ClassroomHeader
        subjectTitle="Mathematics & React Doubt Room"
        ratePerMin={5}
        onEndSession={handleEndSession}
      />

      {/* Sync Status Banner */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-1 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-mono">
          {isConnected ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <Wifi className="w-3 h-3" /> Live Channel Synced
            </span>
          ) : (
            <span className="text-amber-400 flex items-center gap-1">
              <WifiOff className="w-3 h-3" /> Connecting Supabase Channel...
            </span>
          )}
        </div>
        <span className="text-slate-500 font-sans">
          Logged in as: <strong className="text-slate-300">{currentUser?.name || 'Guest'} ({currentUser?.role})</strong>
        </span>
      </div>

      {/* 2. Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        <div className={`flex-1 flex flex-col h-full overflow-hidden relative min-h-0 ${
          activeTabMobile === 'chat' ? 'hidden lg:flex' : 'flex'
        }`}>
          {activeTabMobile === 'code' ? (
            <CodePlayground 
              isStudentCodeAllowed={isStudentCodeAllowed}
              setIsStudentCodeAllowed={(val) => updatePermissions(isStudentAllowed, val)}
              broadcast={broadcast}
              registerListener={registerListener}
            />
          ) : (
            <Whiteboard 
              isStudentAllowed={isStudentAllowed}
              setIsStudentAllowed={(val) => updatePermissions(val, isStudentCodeAllowed)}
              broadcast={broadcast}
              registerListener={registerListener}
            />
          )}
        </div>

        {/* SideDock */}
        <div className={`w-full lg:w-80 h-full flex flex-col min-h-0 ${
          activeTabMobile === 'chat' ? 'flex' : 'hidden lg:flex'
        }`}>
          <SideDock 
            tutorName="Anant Patel"
            broadcast={broadcast}
            registerListener={registerListener}
          />
        </div>
      </div>

      {/* 3. Mobile Navigation Bar */}
      <nav className="lg:hidden bg-slate-900 border-t border-slate-800 px-3 py-2 flex items-center justify-around z-30 shrink-0">
        <button
          onClick={() => setActiveTabMobile('board')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition px-3 py-1 rounded-xl ${
            activeTabMobile === 'board' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>Whiteboard</span>
        </button>

        <button
          onClick={() => setActiveTabMobile('code')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition px-3 py-1 rounded-xl ${
            activeTabMobile === 'code' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Code Editor</span>
        </button>

        <button
          onClick={() => setActiveTabMobile('chat')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition px-3 py-1 rounded-xl ${
            activeTabMobile === 'chat' ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Video & Chat</span>
        </button>
      </nav>

      {/* Desktop Floating Switcher */}
      <div className="hidden lg:flex absolute bottom-5 left-1/2 -translate-x-1/2 z-20 gap-1 bg-slate-900/95 backdrop-blur border border-slate-800 p-1.5 rounded-2xl shadow-2xl">
        <button
          onClick={() => setActiveTabMobile('board')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTabMobile === 'board' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Digital Whiteboard</span>
        </button>

        <button
          onClick={() => setActiveTabMobile('code')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTabMobile === 'code' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Live Code Playground</span>
        </button>
      </div>

      {/* Post-Session Receipt & Rating Modal */}
      <SessionReceiptModal
        isOpen={showReceipt}
        totalSeconds={finalSeconds}
        ratePerMin={5}
        tutorName="Anant Patel"
        subjectTitle="Mathematics & React Doubt Room"
        userRole={currentUser?.role || 'student'}
        onCloseAndRedirect={handleRedirectToDashboard}
      />
    </div>
  );
}