import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Lock, User, GraduationCap, BookOpen, 
  ArrowRight, ShieldCheck, Zap 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function AuthModal() {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    authDefaultRole, 
    registeredUsers, 
    login, 
    register 
  } = useApp();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [role, setRole] = useState('student'); // 'student' | 'teacher'

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [headline, setHeadline] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (authDefaultRole) {
      setRole(authDefaultRole);
    }
  }, [authDefaultRole, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'signin') {
      // Find user by email and role
      const found = registeredUsers.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.role === role
      );

      if (found) {
        login(found);
      } else {
        // Fallback: create on the fly if user enters password
        if (email && password) {
          login({
            id: 'u_' + Date.now(),
            name: email.split('@')[0],
            email,
            role,
            headline: role === 'teacher' ? 'Independent Tutor' : 'Student Learner'
          });
        } else {
          setErrorMsg('Invalid email or password.');
        }
      }
    } else {
      // Registration flow
      if (!name.trim() || !email.trim() || !password) {
        setErrorMsg('Please fill in all mandatory fields.');
        return;
      }

      register({
        name: name.trim(),
        email: email.trim(),
        role,
        headline: headline.trim() || (role === 'teacher' ? 'Verified Mentor' : 'Student Learner')
      });
    }
  };

  // Quick 1-click Demo Fill
  const fillDemoAccount = (demoRole) => {
    setErrorMsg('');
    setRole(demoRole);
    if (demoRole === 'teacher') {
      setEmail('anant@tutor.com');
      setPassword('password123');
    } else {
      setEmail('rahul@student.com');
      setPassword('password123');
    }
    setMode('signin');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-5 my-8">
        
        {/* Close Button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-5 right-5 text-slate-500 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              Quick Tuition Authentication
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white">
            {mode === 'signin' ? 'Welcome Back' : 'Create an Account'}
          </h3>
          <p className="text-xs text-slate-400">
            {mode === 'signin' 
              ? 'Sign in to access your 1-on-1 tutoring workspace.' 
              : 'Join as a student or register your teaching profile.'}
          </p>
        </div>

        {/* 1. Role Selector Toggle */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition ${
              role === 'student'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>I'm a Student</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('teacher')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition ${
              role === 'teacher'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>I'm a Tutor</span>
          </button>
        </div>

        {/* Quick Demo Login Fillers */}
        <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> 1-Click Test:
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('student')}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-indigo-300 rounded-lg border border-slate-800 font-medium"
            >
              Demo Student
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('teacher')}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-emerald-300 rounded-lg border border-slate-800 font-medium"
            >
              Demo Tutor
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* 2. Main Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'signup' && (
            <div>
              <label className="text-slate-400 font-medium block mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Anant Patel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-slate-400 font-medium block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-medium block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="text-slate-400 font-medium block mb-1">
                {role === 'teacher' ? 'Specialization / Bio' : 'Grade / Target Exam'}
              </label>
              <input
                type="text"
                placeholder={role === 'teacher' ? 'e.g. Calculus & React Specialist' : 'e.g. Class 12 / JEE / NEET'}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 mt-2"
          >
            <span>{mode === 'signin' ? `Sign In as ${role === 'teacher' ? 'Tutor' : 'Student'}` : 'Complete Registration'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 3. Footer Switcher */}
        <div className="text-center pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          {mode === 'signin' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMsg(''); }}
                className="text-indigo-400 font-semibold hover:underline"
              >
                Sign up now
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMsg(''); }}
                className="text-indigo-400 font-semibold hover:underline"
              >
                Log in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}