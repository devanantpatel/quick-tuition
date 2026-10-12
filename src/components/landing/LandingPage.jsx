import React, { useState } from 'react';
import { Clock, Monitor, Code, Sparkles, Calculator, ArrowRight, Zap, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function LandingPage() {
  const { setAuthMode, setAuthModalOpen } = useApp();

  // Dynamic Calculator States (From ₹0 to higher rates)
  const [calcMinutes, setCalcMinutes] = useState(25);
  const [ratePerMin, setRatePerMin] = useState(5); // can be set to 0 for free mentors
  const freeMins = 10;

  // Calculation Logic
  const billableMins = Math.max(0, calcMinutes - freeMins);
  const totalCost = ratePerMin === 0 ? 0 : billableMins * ratePerMin;

  const handleOpenAuth = (role) => {
    setAuthMode('signup');
    setAuthModalOpen(true);
  };

  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-20 w-full">
      {/* 1. Hero Section */}
      <section className="text-center space-y-6 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>From ₹0 / min • First 10 Mins 100% Free Trial</span>
        </div>

        <h1 className="text-3xl md:text-6xl font-black tracking-tight text-white leading-tight">
          Master <span className="text-indigo-400">Maths</span> & <span className="text-emerald-400">Code</span> Doubt-by-Doubt.
        </h1>

        <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
          No monthly contracts or long pre-recorded lectures. Connect with an expert for 10, 20 or 30 minutes, solve your problem live, and pay strictly per minute.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <button 
            onClick={() => handleOpenAuth('student')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 transition text-xs md:text-sm flex items-center justify-center gap-2"
          >
            Find a Tutor (10m Free) <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleOpenAuth('teacher')}
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold px-6 py-3.5 rounded-xl border border-slate-800 transition text-xs md:text-sm"
          >
            Become a Teacher
          </button>
        </div>
      </section>

      {/* 2. How It Works */}
      <section className="space-y-8">
        <div className="text-center space-y-1">
          <h2 className="text-xl md:text-2xl font-bold text-white">How Quick Tuition Works</h2>
          <p className="text-slate-400 text-xs">Direct problem solving with transparent micro-billing</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">STEP 01</span>
            <h3 className="font-semibold text-white text-base">Select Topic or Problem</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Choose from existing curriculum or type your custom doubt if it is not on the list.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">STEP 02</span>
            <h3 className="font-semibold text-white text-base">First 10 Mins Free</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Join digital whiteboard & code room. No charges for the initial 10-minute trial session.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">STEP 03</span>
            <h3 className="font-semibold text-white text-base">Per-Minute Rate (From ₹0)</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Volunteer mentors offer ₹0/min, while advanced mentors set modest rates. Pay only for post-trial minutes.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Upgraded Dynamic Cost Estimator */}
      <section className="p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 max-w-2xl mx-auto space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Calculator className="w-4 h-4" />
            <span>Interactive Cost Calculator</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Free 10 Min Trial Included
          </span>
        </div>

        {/* Duration Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300">Session Duration:</span>
            <span className="text-white font-mono font-bold text-sm">{calcMinutes} Minutes</span>
          </div>
          <input 
            type="range" 
            min="10" 
            max="60" 
            step="5"
            value={calcMinutes}
            onChange={(e) => setCalcMinutes(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>10 min (Free Trial)</span>
            <span>30 min</span>
            <span>60 min</span>
          </div>
        </div>

        {/* Rate per Min Slider (Starting from 0) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300">Tutor Rate per Minute:</span>
            <span className={`font-mono font-bold text-sm ${ratePerMin === 0 ? 'text-emerald-400' : 'text-indigo-400'}`}>
              {ratePerMin === 0 ? '₹0 / min (Free Tutor)' : `₹${ratePerMin} / min`}
            </span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="15" 
            step="1"
            value={ratePerMin}
            onChange={(e) => setRatePerMin(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>₹0 (Volunteer/Community)</span>
            <span>₹7</span>
            <span>₹15</span>
          </div>
        </div>

        {/* Output breakdown */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 text-xs border-t border-slate-800">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-0.5 text-center">
            <span className="text-slate-500 text-[11px] block">Free Time</span>
            <span className="font-bold text-emerald-400 text-sm">10 Mins (₹0)</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-0.5 text-center">
            <span className="text-slate-500 text-[11px] block">Billable Time</span>
            <span className="font-bold text-slate-200 text-sm">{billableMins} Mins</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-indigo-950/60 bg-indigo-950/20 space-y-0.5 text-center">
            <span className="text-indigo-300 text-[11px] block">Total Estimate</span>
            <span className="font-bold text-indigo-400 text-base">₹{totalCost}</span>
          </div>
        </div>
      </section>

      {/* 4. Core Features */}
      <section className="grid sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white">Zero Wasted Money</h3>
          <p className="text-slate-400 text-xs leading-relaxed">Pay strictly for minutes taught without expensive upfront packages.</p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Monitor className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white">Digital Whiteboard</h3>
          <p className="text-slate-400 text-xs leading-relaxed">Solve calculus proofs and geometrical curves with live canvas sync.</p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Code className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white">Live Code Debugging</h3>
          <p className="text-slate-400 text-xs leading-relaxed">Debug bugs, React code, and logic side-by-side with screen share.</p>
        </div>
      </section>
    </main>
  );
}