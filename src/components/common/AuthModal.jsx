import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function AuthModal() {
  const { authModalOpen, setAuthModalOpen, authMode, setAuthMode, login } = useApp();

  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!authModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;

    login({
      name: name || (role === 'teacher' ? 'Tutor' : 'Student'),
      email,
      role
    });

    setAuthModalOpen(false);
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-4 right-4 text-slate-500 hover:text-white text-sm"
        >
          ✕
        </button>

        <div className="text-center space-y-1">
          <h3 className="text-xl font-bold text-white">
            {authMode === 'login' ? 'Welcome Back' : 'Create an Account'}
          </h3>
          <p className="text-slate-400 text-xs">
            {authMode === 'login' ? 'Access your dashboard & live sessions' : 'Start learning or teaching in minutes'}
          </p>
        </div>

        {/* Role Toggle */}
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 grid grid-cols-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`py-2 rounded-lg transition ${
              role === 'student' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Student (Learn)
          </button>
          <button
            type="button"
            onClick={() => setRole('teacher')}
            className={`py-2 rounded-lg transition ${
              role === 'teacher' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Teacher (Teach)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {authMode === 'signup' && (
            <div>
              <label className="text-slate-400 font-medium block mb-1">Full Name</label>
              <input 
                type="text" 
                required
                placeholder={role === 'teacher' ? "e.g. Anant Patel" : "e.g. Rahul"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="text-slate-400 font-medium block mb-1">Email Address</label>
            <input 
              type="email" 
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-400 font-medium block mb-1">Password</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition text-xs shadow-lg shadow-indigo-600/30 mt-2"
          >
            {authMode === 'login' ? `Login as ${role}` : `Register as ${role}`}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-800">
          {authMode === 'login' ? (
            <>Don't have an account? <button onClick={() => setAuthMode('signup')} className="text-indigo-400 font-semibold hover:underline">Sign Up</button></>
          ) : (
            <>Already have an account? <button onClick={() => setAuthMode('login')} className="text-indigo-400 font-semibold hover:underline">Log In</button></>
          )}
        </div>
      </div>
    </div>
  );
}