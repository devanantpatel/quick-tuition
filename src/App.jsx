import React from 'react';
import { useApp } from './context/AppContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import AuthModal from './components/common/AuthModal';
import LandingPage from './components/landing/LandingPage';

export default function App() {
  const { activeTab, currentUser } = useApp();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white justify-between">
      <div>
        <Navbar />
        <AuthModal />

        {/* Active View */}
        {(!currentUser || activeTab === 'landing') && <LandingPage />}

        {currentUser?.role === 'teacher' && activeTab !== 'landing' && (
          <div className="p-8 text-center text-slate-400">Teacher Dashboard Component Ready to Connect</div>
        )}
        {currentUser?.role === 'student' && activeTab !== 'landing' && (
          <div className="p-8 text-center text-slate-400">Student Dashboard Component Ready to Connect</div>
        )}
      </div>

      {/* Developer Footer */}
      <Footer />
    </div>
  );
}