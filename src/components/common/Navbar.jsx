import React from 'react';
import { Sparkles, LogOut, User, Video, GraduationCap, BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Navbar() {
  const { currentUser, logout, openAuthModal, activeTab, setActiveTab } = useApp();

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab(currentUser ? (currentUser.role === 'teacher' ? 'teacher' : 'student') : 'landing')}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            Q
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white">Quick<span className="text-indigo-400">Tuition</span></span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
              1-on-1 Micro-Mentoring
            </span>
          </div>
        </div>

        {/* Right Section: Auth or User Menu */}
        <div className="flex items-center gap-3">
          {!currentUser ? (
            <>
              <button 
                onClick={() => openAuthModal('student')}
                className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-xl transition"
              >
                Log In
              </button>
              <button 
                onClick={() => openAuthModal('teacher')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-indigo-600/20"
              >
                Become a Tutor
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              {/* Role Indicator Badge */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl">
                <div className="w-7 h-7 rounded-xl bg-indigo-600/20 text-indigo-300 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-white leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    {currentUser.role === 'teacher' ? (
                      <span className="text-emerald-400 font-medium">Tutor Account</span>
                    ) : (
                      <span className="text-indigo-400 font-medium">Student Account</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-xl border border-slate-800 transition"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}