import React, { useState, useEffect } from 'react';
import { LogOut, Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NAVBAR_QUOTES } from '../../data/navbarQuotes';

export default function Navbar() {
  const { currentUser, logout, openAuthModal, setActiveTab } = useApp();
  const [quoteIndex, setQuoteIndex] = useState(0);
  
  // High-fidelity multi-stage animation tracking state
  // Animations alternate between: 'fade', 'slide', 'scale', 'neon-pulse'
  const [animationClass, setAnimationClass] = useState('opacity-100 scale-100 blur-0 translate-y-0');
  const [pulseGlowing, setPulseGlowing] = useState(false);

  // Advanced cycle logic
  useEffect(() => {
    if (!NAVBAR_QUOTES || NAVBAR_QUOTES.length === 0) return;

    const interval = setInterval(() => {
      // Step 1: Trigger out animation (Slide down + Blur)
      setAnimationClass('opacity-0 -translate-y-2 scale-95 blur-md transition-all duration-500 ease-in');
      setPulseGlowing(true);

      setTimeout(() => {
        // Step 2: Swap the content while hidden
        setQuoteIndex((prev) => (prev + 1) % NAVBAR_QUOTES.length);
        
        // Setup initial position for enter animation (Slide down from top with small scale)
        setAnimationClass('opacity-0 translate-y-2 scale-95 blur-sm');
        
        // Step 3: Trigger in animation (Ease out with Spring-like settling feel)
        setTimeout(() => {
          setAnimationClass('opacity-100 translate-y-0 scale-100 blur-0 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)');
          setPulseGlowing(false);
        }, 50);

      }, 550); // Pause momentarily for swap
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const currentQuote = NAVBAR_QUOTES[quoteIndex] || { text: '1-on-1 Micro-Mentoring', tag: 'Tip' };

  return (
    <nav className="border-b border-slate-800 bg-slate-950/85 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        
        {/* Left Section: Brand Logo */}
        <div 
          onClick={() => setActiveTab(currentUser ? (currentUser.role === 'teacher' ? 'teacher' : 'student') : 'landing')}
          className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            Q
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">
            Quick<span className="text-indigo-400">Tuition</span>
          </span>
        </div>

        {/* Center Section: Ticker with Slide, Blur & Glow Animation */}
        <div className="hidden md:flex flex-1 items-center justify-center px-4 max-w-xl mx-auto overflow-hidden">
          <div 
            className={`flex items-center gap-3.5 bg-slate-900/90 border px-4 py-2 rounded-full shadow-inner transform ${animationClass} ${
              pulseGlowing ? 'border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'border-slate-800/80 shadow-black/40'
            }`}
          >
            {/* Dynamic Label Badges based on fact types */}
            <span className="text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 px-2.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 shadow-sm uppercase tracking-wider">
              <Sparkles className="w-2.5 h-2.5 text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} />
              <span>{currentQuote.tag}</span>
            </span>

            {/* Glowing typography for formulas or standard text facts */}
            <span 
              className="text-xs font-mono text-slate-300 truncate max-w-[340px] sm:max-w-md select-none tracking-wide"
              style={{
                textShadow: currentQuote.tag === 'Math' || currentQuote.tag === 'Calculus' || currentQuote.tag === 'Algebra' 
                  ? '0 0 8px rgba(129, 140, 248, 0.25)' 
                  : 'none'
              }}
            >
              {currentQuote.text}
            </span>
          </div>
        </div>

        {/* Right Section: Single access trigger buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {!currentUser ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => openAuthModal('login')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5 active:scale-95 duration-100"
              >
                <span>Join / Login</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-90" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* User Avatar & Role */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl shadow">
                <div className="w-7 h-7 rounded-xl bg-indigo-600/20 text-indigo-300 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-white leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {currentUser.role === 'teacher' ? (
                      <span className="text-emerald-400 font-medium">Tutor</span>
                    ) : (
                      <span className="text-indigo-400 font-medium">Student</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-xl border border-slate-800 transition active:scale-95 duration-100"
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