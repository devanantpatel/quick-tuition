import React from 'react';
import { useApp } from './context/AppContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import AuthModal from './components/common/AuthModal';
import LandingPage from './components/landing/LandingPage';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import StudentDashboard from './components/student/StudentDashboard';
import LiveClassroom from './components/classroom/LiveClassroom';

export default function App() {
  const { activeTab, currentUser } = useApp();

  // Full-screen classroom view without standard navbar/footer
  if (activeTab === 'classroom') {
    return <LiveClassroom />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white justify-between">
      <div>
        <Navbar />
        <AuthModal />

        {!currentUser ? (
          <LandingPage />
        ) : currentUser.role === 'teacher' ? (
          <TeacherDashboard />
        ) : (
          <StudentDashboard />
        )}
      </div>

      <Footer />
    </div>
  );
}