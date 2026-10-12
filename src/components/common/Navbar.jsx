import React from 'react';
import { BookOpen, LogOut, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Navbar() {
  const { currentUser, logout, setActiveTab, setAuthMode, setAuthModalOpen } = useApp();

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 md:px-8 py-3.5 flex items-center justify-between">
      {/* Logo */}
      <div 
        onClick={() => setActiveTab('landing')} 
        className="flex items-center gap-2.5 font-bold text-lg md:text-xl text-indigo-400 cursor-pointer select-none"
      >
        <div className="bg-indigo-600/20 p-2 rounded-xl border border-indigo-500/30 text-indigo-400">
          <BookOpen className="w-5 h-5" />
        </div>
        <span className="tracking-tight text-white">Quick<span className="text-indigo-400">Tuition</span></span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {currentUser ? (
          <div className="flex items-center gap-2.5 bg-slate-950 border border-slate-800 py-1.5 px-3 rounded-xl text-xs">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold uppercase">
              {currentUser.name ? currentUser.name.charAt(0) : <User className="w-3.5 h-3.5" />}
            </div>
            <div className="hidden sm:block text-left">
              <span className="font-semibold text-white block leading-none">{currentUser.name}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">{currentUser.role}</span>
            </div>
            <button 
              onClick={logout}
              className="text-slate-400 hover:text-rose-400 ml-1 p-1 transition"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
              className="text-slate-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
            >
              Log In
            </button>
            <button 
              onClick={() => { setAuthMode('signup'); setAuthModalOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md shadow-indigo-600/25 transition"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </header>
  );
}