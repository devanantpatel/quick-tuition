import React, { useState, useEffect } from 'react';
import { PenTool, Layers, MessageSquare, Wifi, WifiOff, Lock, Unlock, Code, FileText } from 'lucide-react';
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

  // 3 Core Tabs: 'whiteboard' | 'other' | 'call_chat'
  const [activeMainTab, setActiveMainTab] = useState('whiteboard');

  // 'Other' Hub Sub-tools: 'presentation' (PDF/PPT) | 'code' (Code Playground)
  const [otherSubTool, setOtherSubTool] = useState('presentation');

  // Teacher Screen Lock Sync
  const [lockStudentView, setLockStudentView] = useState(true);

  // Permissions & State
  const [isStudentAllowed, setIsStudentAllowed] = useState(false);
  const [isStudentCodeAllowed, setIsStudentCodeAllowed] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [finalSeconds, setFinalSeconds] = useState(0);

  const { isConnected, broadcast, registerListener, peersInRoom } = useClassroomSync(
    roomId,
    userRole,
    userName
  );

  // Student Sync Listener
  useEffect(() => {
    if (!registerListener) return;

    registerListener('classroom:sync_view', (data) => {
      if (!isTeacher && data) {
        if (data.mainTab) setActiveMainTab(data.mainTab);
        if (data.subTool) setOtherSubTool(data.subTool);
        if (data.lockStudentView !== undefined) setLockStudentView(data.lockStudentView);
      }
    });

    registerListener('session:force_completed', (data) => {
      if (!isTeacher) {
        setFinalSeconds(data.elapsedSec || 0);
        setShowReceipt(true);
      }
    });
  }, [registerListener, isTeacher]);

  const handleMainTabChange = (tab) => {
    setActiveMainTab(tab);
    if (isTeacher && broadcast) {
      broadcast('classroom:sync_view', {
        mainTab: tab,
        subTool: otherSubTool,
        lockStudentView
      });
    }
  };

  const handleSubToolChange = (sub) => {
    setOtherSubTool(sub);
    if (isTeacher && broadcast) {
      broadcast('classroom:sync_view', {
        mainTab: activeMainTab,
        subTool: sub,
        lockStudentView
      });
    }
  };

  const toggleLockView = () => {
    const nextLock = !lockStudentView;
    setLockStudentView(nextLock);
    if (isTeacher && broadcast) {
      broadcast('classroom:sync_view', {
        mainTab: activeMainTab,
        subTool: otherSubTool,
        lockStudentView: nextLock
      });
    }
  };

  const handleLeaveOnly = () => {
    setActiveTab(isTeacher ? 'teacher' : 'student');
  };

  const handleEndSession = async (elapsedSec = 0) => {
    setFinalSeconds(elapsedSec);

    // 1. Export All Whiteboard Pages to a Single Multi-Page PDF Document
    let multiPageNotesData = null;
    try {
      if (typeof window !== 'undefined' && window.__exportWhiteboardAllPages) {
        multiPageNotesData = await window.__exportWhiteboardAllPages();
      } else {
        const canvases = document.querySelectorAll('canvas');
        for (let c of canvases) {
          if (c.width > 300 && c.height > 300) {
            multiPageNotesData = c.toDataURL('image/jpeg', 0.6);
            break;
          }
        }
      }
    } catch (e) {
      console.warn('Whiteboard Multi-page PDF Export failed:', e);
    }

    // 2. Persist to Supabase Database
    const bookingId = activeSession?.id;
    if (bookingId && multiPageNotesData) {
      try {
        await saveSessionNotes(bookingId, {
          whiteboardNotes: multiPageNotesData,
          codeNotes: '// Complete Mentorship Session Notes'
        });
        console.log('Multi-page session notes saved successfully for booking:', bookingId);
      } catch (err) {
        console.error('saveSessionNotes error:', err);
      }
    }

    if (broadcast) {
      broadcast('session:force_completed', { elapsedSec });
    }

    setShowReceipt(true);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-950 overflow-hidden relative">
      
      {/* 1. Header with presence timer */}
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
              <Wifi className="w-3.5 h-3.5" /> Room Active ({roomId})
            </span>
          ) : (
            <span className="text-amber-400 flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5 animate-pulse" /> Reconnecting...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isTeacher ? (
            <button
              onClick={toggleLockView}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition ${
                lockStudentView
                  ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {lockStudentView ? <Lock className="w-3 h-3 text-indigo-400" /> : <Unlock className="w-3 h-3" />}
              <span>{lockStudentView ? 'Student View: Locked' : 'Student Free-View'}</span>
            </button>
          ) : lockStudentView ? (
            <span className="text-[10px] text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Following Teacher Screen
            </span>
          ) : null}

          <span className="text-slate-400 text-xs">
            Role: <strong className="text-white capitalize">{userRole}</strong>
          </span>
        </div>
      </div>

      {/* 2. Workspace Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0 pb-16 lg:pb-0">
        
        {/* Main Stage (Whiteboard or Other Hub) */}
        <div className={`flex-1 flex flex-col h-full overflow-hidden relative min-h-0 ${
          activeMainTab === 'call_chat' ? 'hidden lg:flex' : 'flex'
        }`}>

          {/* TAB 1: WHITEBOARD */}
          <div className={`h-full flex-col min-h-0 overflow-hidden relative ${
            activeMainTab === 'whiteboard' ? 'flex flex-1' : 'hidden'
          }`}>
            <Whiteboard 
              isStudentAllowed={isStudentAllowed}
              setIsStudentAllowed={setIsStudentAllowed}
              broadcast={broadcast}
              registerListener={registerListener}
            />
          </div>

          {/* TAB 2: OTHER HUB (PDF/PPT & Code Playground Only) */}
          <div className={`h-full flex-col min-h-0 overflow-hidden relative ${
            activeMainTab === 'other' ? 'flex flex-1' : 'hidden'
          }`}>
            
            {/* Sub-Switch Bar inside 'Other' tab */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  disabled={!isTeacher && lockStudentView}
                  onClick={() => handleSubToolChange('presentation')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    otherSubTool === 'presentation' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF / PPT Presentation</span>
                </button>

                <button
                  disabled={!isTeacher && lockStudentView}
                  onClick={() => handleSubToolChange('code')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    otherSubTool === 'code' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Code Playground</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                Selected: <strong className="text-indigo-400">{otherSubTool === 'presentation' ? 'PDF / PPT' : 'Code Playground'}</strong>
              </span>
            </div>

            {/* Sub-Components Viewport */}
            <div className="flex-1 w-full h-full overflow-hidden relative min-h-0">
              {otherSubTool === 'presentation' ? (
                <PresentationViewer 
                  broadcast={broadcast}
                  registerListener={registerListener}
                  isTeacher={isTeacher}
                />
              ) : (
                <CodePlayground 
                  isStudentCodeAllowed={isStudentCodeAllowed}
                  setIsStudentCodeAllowed={setIsStudentCodeAllowed}
                  broadcast={broadcast}
                  registerListener={registerListener}
                />
              )}
            </div>
          </div>

        </div>

        {/* TAB 3 / SIDEDOCK: VIDEO CALL & CHAT */}
        <div className={`w-full lg:w-80 xl:w-96 h-full flex flex-col min-h-0 border-l border-slate-800/80 bg-slate-900 ${
          activeMainTab === 'call_chat' ? 'flex flex-1' : 'hidden lg:flex'
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

      {/* 3. BOTTOM FIXED 3-TAB SWITCHER */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl shadow-2xl">
        
        {/* Tab 1: Whiteboard */}
        <button
          disabled={!isTeacher && lockStudentView}
          onClick={() => handleMainTabChange('whiteboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${
            activeMainTab === 'whiteboard'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>Whiteboard</span>
        </button>

        {/* Tab 2: Other Hub (PDF/PPT & Code) */}
        <button
          disabled={!isTeacher && lockStudentView}
          onClick={() => handleMainTabChange('other')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${
            activeMainTab === 'other'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Other</span>
        </button>

        {/* Tab 3: Call & Chat (Mobile View Toggle) */}
        <button
          onClick={() => handleMainTabChange('call_chat')}
          className={`lg:hidden px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeMainTab === 'call_chat'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'text-amber-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Call & Chat</span>
        </button>
      </div>

      {/* 4. Session Receipt Modal */}
      <SessionReceiptModal
        isOpen={showReceipt}
        totalSeconds={finalSeconds}
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