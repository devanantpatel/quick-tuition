import React, { useState, useRef, useEffect } from 'react';
import { 
  RotateCcw, ArrowRight, User, GraduationCap, 
  Star, ChevronDown, ChevronUp, Send, CheckCircle2, 
  MessageSquare
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function LandingPage() {
  const { openAuthModal } = useApp();

  // Canvas & Tools State
  const canvasRef = useRef(null);
  const [activeTool, setActiveTool] = useState('chalk'); // 'chalk' | 'duster'
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [isDefaultMessageVisible, setIsDefaultMessageVisible] = useState(true);

  // How to use tab ('student' | 'teacher')
  const [howTab, setHowTab] = useState('student');

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  // Suggestion Form State
  const [sugName, setSugName] = useState('');
  const [sugEmail, setSugEmail] = useState('');
  const [sugMessage, setSugMessage] = useState('');
  const [sugSent, setSugSent] = useState(false);

  // Draw Line 1 on Canvas
  const drawDefaultMessage = (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);

    // Subtle Board Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Line 1: Made for Students & Teachers
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 4;
    ctx.fillText('Made for Students & Teachers', width / 2, height / 2 - 16);
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setupCanvas = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      if (isDefaultMessageVisible) {
        drawDefaultMessage(ctx, canvas.width, canvas.height);
      }
    };

    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [isDefaultMessageVisible]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Selecting chalk auto-clears the default text
  const handleSelectChalk = () => {
    setActiveTool('chalk');
    if (isDefaultMessageVisible) {
      setIsDefaultMessageVisible(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const startDrawing = (e) => {
    if (isDefaultMessageVisible) {
      setIsDefaultMessageVisible(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    const pos = getCoordinates(e);
    setIsDrawing(true);
    setLastPos(pos);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getCoordinates(e);

    ctx.save();
    if (activeTool === 'chalk') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.75)';
      ctx.shadowBlur = 2;

      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      for (let i = 0; i < 2; i++) {
        const offsetX = (Math.random() - 0.5) * 6;
        const offsetY = (Math.random() - 0.5) * 6;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(pos.x + offsetX, pos.y + offsetY, 1, 1);
      }
    } else {
      // Duster / Eraser
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();

    setLastPos(pos);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClearBoard = () => {
    setIsDefaultMessageVisible(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleResetBoard = () => {
    setIsDefaultMessageVisible(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawDefaultMessage(ctx, canvas.width, canvas.height);
  };

  const handleSuggestionSubmit = (e) => {
    e.preventDefault();
    if (!sugMessage.trim()) return;
    setSugSent(true);
    setSugName('');
    setSugEmail('');
    setSugMessage('');
    setTimeout(() => setSugSent(false), 4500);
  };

  const faqs = [
    {
      q: 'How does the 5-Minute Free Trial work?',
      a: 'Whenever a student enters a live session, the first 5 minutes are 100% free with a live countdown timer. If your doubt is resolved or you leave before 5 minutes, ₹0 applies.'
    },
    {
      q: 'Does 100% of the payment go directly to the teacher?',
      a: 'Yes! QuickTuition takes 0% platform commission. The student pays directly to the teacher\'s personal UPI ID or QR code upon session completion.'
    },
    {
      q: 'What if someone disconnects during the class?',
      a: 'Our smart anti-cheat billing engine instantly freezes the billing timer the moment peer connection drops. The timer only ticks when both teacher and student are live together.'
    },
    {
      q: 'Are multi-page whiteboard notes saved?',
      a: 'Yes, every stroke across all whiteboard pages is automatically saved and archived for your revision after the session ends.'
    }
  ];

  return (
    <div className="flex-1 w-full flex flex-col justify-between selection:bg-indigo-600 selection:text-white space-y-20 pb-16">
      
      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14 w-full grid lg:grid-cols-12 gap-10 items-center">
        
        {/* Left: Platform Goal & Action Buttons */}
        <div className="lg:col-span-6 space-y-6 text-center lg:text-left z-10">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Our Goal: Instant Resolution For Every Single Doubt</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.12]">
            Instant 1-on-1{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400">
              Live Micro-Tuition
            </span>{' '}
            For Every Problem.
          </h1>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
            Our mission is to free students from expensive monthly subscriptions and pre-recorded lectures. 
            Whenever you are stuck on a difficult proof or question, connect for 10 or 20 minutes with a verified tutor, 
            solve it live on an interactive board, and enjoy <strong>5 Minutes Free Trial</strong> with transparent per-minute UPI payments.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
            <button
              onClick={() => openAuthModal('student')}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3.5 rounded-2xl shadow-xl shadow-indigo-600/30 transition text-sm flex items-center justify-center gap-2 group active:scale-95"
            >
              <User className="w-4 h-4 text-indigo-200" />
              <span>Register as Student</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => openAuthModal('teacher')}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-emerald-300 hover:text-emerald-200 font-bold px-6 py-3.5 rounded-2xl transition text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95"
            >
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span>Register as Teacher</span>
            </button>
          </div>

          <div className="pt-6 grid grid-cols-3 gap-3 border-t border-slate-800 max-w-md mx-auto lg:mx-0 font-mono">
            <div className="space-y-0.5">
              <span className="font-black text-white text-base sm:text-lg">5 Mins</span>
              <p className="text-[11px] text-slate-400 font-sans">100% Free Trial</p>
            </div>
            <div className="space-y-0.5">
              <span className="font-black text-emerald-400 text-base sm:text-lg">0% Cut</span>
              <p className="text-[11px] text-slate-400 font-sans">Direct UPI to Tutor</p>
            </div>
            <div className="space-y-0.5">
              <span className="font-black text-indigo-400 text-base sm:text-lg">Auto-Pause</span>
              <p className="text-[11px] text-slate-400 font-sans">Anti-Cheat Timer</p>
            </div>
          </div>

        </div>

        {/* Right: 3D Interactive Chalkboard Canvas */}
        <div className="lg:col-span-6 relative flex flex-col items-center select-none">
          
          {/* Top Post Struts */}
          <div className="w-[85%] flex justify-between px-6 pointer-events-none -mb-3 z-10">
            <div 
              className="w-4 h-5 rounded-t-md shadow-md"
              style={{ background: 'linear-gradient(to right, #92400e, #d97706, #78350f)' }}
            />
            <div 
              className="w-4 h-5 rounded-t-md shadow-md"
              style={{ background: 'linear-gradient(to right, #78350f, #d97706, #92400e)' }}
            />
          </div>

          {/* Wooden Frame */}
          <div 
            className="w-full max-w-lg rounded-[26px] p-3.5 sm:p-4 shadow-[0_25px_60px_rgba(0,0,0,0.95)] relative z-20 group"
            style={{
              background: 'linear-gradient(135deg, #78350f 0%, #b45309 30%, #582103 60%, #b45309 85%, #78350f 100%)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.95), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -4px 8px rgba(0,0,0,0.85)'
            }}
          >

            {/* Slate Surface with Custom Chalk/Duster Cursor */}
            <div 
              className="w-full h-[320px] sm:h-[380px] rounded-2xl relative overflow-hidden border border-emerald-950/80 shadow-[inset_0_4px_22px_rgba(0,0,0,0.95)] flex items-center justify-center"
              style={{
                backgroundColor: '#1b3a2b',
                backgroundImage: 'radial-gradient(ellipse at 50% 35%, rgba(38, 77, 58, 0.9) 0%, rgba(13, 33, 24, 0.98) 100%)',
                cursor: activeTool === 'chalk' 
                  ? 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><text y="20" font-size="20">✏️</text></svg>\') 2 20, crosshair'
                  : 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><text y="20" font-size="20">🧽</text></svg>\') 10 10, pointer'
              }}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full block touch-none"
              />

              {/* Line 2 on Default Message: with Love ❤️ by Developer (Non-highlighted subtle link) */}
              {isDefaultMessageVisible && (
                <div className="absolute top-[55%] text-center pointer-events-auto">
                  <span className="text-[15px] font-mono font-bold text-emerald-300/90 tracking-wide">
                    with Love ❤️ by{' '}
                    <a
                      href="https://github.com/devanantpatel"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-200/90 hover:text-white underline decoration-emerald-400/40 underline-offset-2 transition font-mono"
                      title="Developer GitHub Profile"
                    >
                      Developer
                    </a>
                  </span>
                </div>
              )}

              {/* Board Control Tools */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-emerald-500/30 shadow-lg z-30">
                
                {/* Chalk Selection */}
                <button
                  type="button"
                  onClick={handleSelectChalk}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                    activeTool === 'chalk'
                      ? 'bg-white text-slate-900 shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Write with Chalk"
                >
                  <span className="text-xs">✏️</span>
                  <span>Chalk</span>
                </button>

                {/* Duster Selection */}
                <button
                  type="button"
                  onClick={() => setActiveTool('duster')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                    activeTool === 'duster'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Erase with Duster"
                >
                  <span className="text-xs">🧽</span>
                  <span>Duster</span>
                </button>

                <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                {/* Clear Board Text Button */}
                <button
                  type="button"
                  onClick={handleClearBoard}
                  className="px-2 py-1 rounded-lg text-xs font-mono text-slate-300 hover:text-rose-400 hover:bg-slate-900 transition"
                  title="Clear Board"
                >
                  Clear Board
                </button>

                {/* Reset Symbol Button */}
                <button
                  type="button"
                  onClick={handleResetBoard}
                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-900 transition"
                  title="Reset Default Message"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="absolute bottom-2.5 left-3 pointer-events-none text-[10px] font-mono text-emerald-300/60 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur border border-emerald-500/20">
                ✏️ Draw or write on the chalkboard with your cursor / finger
              </div>
            </div>

            {/* Tray */}
            <div 
              className="w-[92%] mx-auto mt-2 h-4 rounded-b-lg border-t border-amber-950/80 shadow-md flex items-center justify-between px-5 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, #78350f, #92400e)' }}
            >
              <div className="w-8 h-1.5 rounded-full bg-white shadow opacity-90 -rotate-1" />
              <div className="w-12 h-2.5 rounded bg-amber-950 border border-amber-700 flex items-center justify-center">
                <span className="text-[7px] font-mono text-amber-200/70 scale-75 font-bold">ERASER</span>
              </div>
              <div className="flex gap-1">
                <div className="w-4 h-1.5 rounded-full bg-emerald-300 shadow opacity-90" />
                <div className="w-4 h-1.5 rounded-full bg-sky-300 shadow opacity-90" />
              </div>
            </div>

          </div>

          {/* Easel Tripod Legs */}
          <div className="w-full max-w-lg flex justify-between px-10 sm:px-16 -mt-1 pointer-events-none relative z-10">
            <div 
              className="w-3.5 sm:w-4 h-12 sm:h-14 rounded-b-md shadow-2xl"
              style={{
                background: 'linear-gradient(to right, #78350f, #d97706, #92400e)',
                transform: 'rotate(12deg)'
              }}
            />
            <div 
              className="w-3 h-8 sm:h-10 rounded-b-md shadow-xl opacity-60"
              style={{ background: 'linear-gradient(to right, #78350f, #92400e)' }}
            />
            <div 
              className="w-3.5 sm:w-4 h-12 sm:h-14 rounded-b-md shadow-2xl"
              style={{
                background: 'linear-gradient(to right, #92400e, #d97706, #78350f)',
                transform: 'rotate(-12deg)'
              }}
            />
          </div>

        </div>

      </section>

      {/* 2. HOW TO USE SECTION (STUDENT & TEACHER STEPS) */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 w-full space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Simple Steps</span>
          <h2 className="text-2xl md:text-3xl font-black text-white">How To Use QuickTuition</h2>
          <p className="text-xs md:text-sm text-slate-400">Zero complexity: 3 easy steps from start to solution</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center">
          <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setHowTab('student')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition ${
                howTab === 'student' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>For Students</span>
            </button>

            <button
              onClick={() => setHowTab('teacher')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition ${
                howTab === 'teacher' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>For Teachers</span>
            </button>
          </div>
        </div>

        {/* Step Cards */}
        {howTab === 'student' ? (
          <div className="grid md:grid-cols-3 gap-6 animate-in fade-in">
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                STEP 01
              </span>
              <h3 className="font-bold text-white text-base">Select Topic & Doubt</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose subject or type your exact question. Get connected to an available mentor in seconds.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/80 border border-emerald-500/40 space-y-3 shadow-lg relative overflow-hidden">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[9px] font-bold">
                100% FREE
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                STEP 02
              </span>
              <h3 className="font-bold text-white text-base">First 5 Mins Free Trial</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter digital whiteboard & audio room. Initial 5 minutes are completely free to assess the explanation.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
              <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
                STEP 03
              </span>
              <h3 className="font-bold text-white text-base">Direct UPI Pay Per Min</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                When finished, scan the teacher’s QR code directly via GPay, PhonePe or Paytm. Pay only for exact minutes.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 animate-in fade-in">
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                STEP 01
              </span>
              <h3 className="font-bold text-white text-base">Setup Profile & Rate</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add your teaching subjects, set per-minute charge (from ₹0 onwards) and upload your personal UPI QR.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                STEP 02
              </span>
              <h3 className="font-bold text-white text-base">Conduct Live Board Class</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Accept doubt requests, solve problems on multi-page vector whiteboard with live real-time sync.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/80 border border-emerald-500/40 space-y-3 shadow-lg relative overflow-hidden">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[9px] font-bold">
                0% COMMISSION
              </div>
              <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
                STEP 03
              </span>
              <h3 className="font-bold text-white text-base">100% Direct Bank Transfer</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                No middleman or platform deductions. The full student fee instantly hits your personal bank account.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 3. REVIEWS SECTION */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 w-full space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">Testimonials</span>
          <h2 className="text-2xl md:text-3xl font-black text-white">Loved by Learners & Educators</h2>
          <p className="text-xs md:text-sm text-slate-400">Real feedback from 1-on-1 micro-learning sessions</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex text-amber-400 gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400" />)}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "Got stuck on a tough physics proof late at night. Connected in 30 seconds, solved it in 14 minutes, and paid directly via UPI. Incredible utility!"
              </p>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-xs">
                R
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Rahul Sharma</h4>
                <span className="text-[10px] text-slate-500">High School Student</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex text-amber-400 gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400" />)}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "Teaching without platform cuts is amazing. 100% of the student's minute-based payment hits my UPI account right after the class ends."
              </p>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
              <div className="w-8 h-8 rounded-full bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center text-xs">
                P
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Pooja Verma</h4>
                <span className="text-[10px] text-slate-500">Mathematics Educator</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex text-amber-400 gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400" />)}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "The automatic timer pause on disconnect gave me complete peace of mind. I only paid for the real minutes we spent learning together."
              </p>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
              <div className="w-8 h-8 rounded-full bg-sky-600/30 text-sky-300 font-bold flex items-center justify-center text-xs">
                A
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Aman Gupta</h4>
                <span className="text-[10px] text-slate-500">Competitive Exam Learner</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FAQ SECTION */}
      <section className="max-w-3xl mx-auto px-4 md:px-8 w-full space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Questions & Answers</span>
          <h2 className="text-2xl md:text-3xl font-black text-white">Frequently Asked Questions</h2>
          <p className="text-xs md:text-sm text-slate-400">Everything you need to know about transparent micro-billing</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-white hover:text-indigo-400 transition"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? <ChevronUp className="w-4 h-4 shrink-0 text-indigo-400" /> : <ChevronDown className="w-4 h-4 shrink-0 text-slate-500" />}
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3 animate-in fade-in">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 5. SUGGESTION / APPRECIATION FORM */}
      <section className="max-w-xl mx-auto px-4 w-full">
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto mb-2">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base sm:text-lg">Share Suggestion or Appreciation</h3>
            <p className="text-xs text-slate-400">Help us make 1-on-1 micro-mentoring even better</p>
          </div>

          {sugSent ? (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs text-center font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Thank you! Your feedback has been received.</span>
            </div>
          ) : (
            <form onSubmit={handleSuggestionSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={sugName}
                  onChange={(e) => setSugName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={sugEmail}
                  onChange={(e) => setSugEmail(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <textarea
                required
                rows={3}
                placeholder="Share your suggestion, appreciation, or thoughts..."
                value={sugMessage}
                onChange={(e) => setSugMessage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Message</span>
              </button>
            </form>
          )}
        </div>
      </section>

    </div>
  );
}