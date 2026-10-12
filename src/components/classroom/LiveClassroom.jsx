import React, { useState } from 'react';
import { PenTool, Code, MessageSquare } from 'lucide-react';
import ClassroomHeader from './ClassroomHeader';
import Whiteboard from './Whiteboard';
import CodePlayground from './CodePlayground';
import SideDock from './SideDock';
import { useApp } from '../../context/AppContext';

export default function LiveClassroom() {
  const { setActiveTab, currentUser } = useApp();
  const [activeTabMobile, setActiveTabMobile] = useState('board');

  // Teacher Master Permissions State
  const [isStudentAllowed, setIsStudentAllowed] = useState(false); // Whiteboard draw permission
  const [isStudentCodeAllowed, setIsStudentCodeAllowed] = useState(false); // Code editing permission

  const handleEndSession = () => {
    if (confirm('Kya aap is live session ko end karke dashboard me wapas jana chahte hain?')) {
      setActiveTab(currentUser?.role === 'teacher' ? 'teacher' : 'student');
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-950 overflow-hidden">
      {/* 1. Header with Live Timer & Billing */}
      <ClassroomHeader
        subjectTitle="Mathematics & React Doubt Room"
        ratePerMin={5}
        onEndSession={handleEndSession}
      />

      {/* 2. Main Responsive Stage */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        
        {/* Workspace: Board or Code Editor */}
        <div className={`flex-1 flex flex-col h-full overflow-hidden relative min-h-0 ${
          activeTabMobile === 'chat' ? 'hidden lg:flex' : 'flex'
        }`}>
          {activeTabMobile === 'code' ? (
            <CodePlayground 
              isStudentCodeAllowed={isStudentCodeAllowed}
              setIsStudentCodeAllowed={setIsStudentCodeAllowed}
            />
          ) : (
            <Whiteboard 
              isStudentAllowed={isStudentAllowed}
              setIsStudentAllowed={setIsStudentAllowed}
            />
          )}
        </div>

        {/* SideDock */}
        <div className={`w-full lg:w-80 h-full flex flex-col min-h-0 ${
          activeTabMobile === 'chat' ? 'flex' : 'hidden lg:flex'
        }`}>
          <SideDock tutorName="Anant Patel" />
        </div>
      </div>

      {/* 3. Bottom Mobile Switcher Bar */}
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
    </div>
  );
}