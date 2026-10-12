import React, { useState } from 'react';
import { PlusCircle, BookOpen, Calendar, UserCheck, History } from 'lucide-react';
import { useApp } from '../../context/AppContext';

import TeacherMetrics from './TeacherMetrics';
import CourseManager from './CourseManager';
import ScheduleManager from './ScheduleManager';
import ConfirmedSessions from './ConfirmedSessions';
import SessionHistory from './SessionHistory';
import PayoutModal from './PayoutModal';
import AddSubjectModal from './AddSubjectModal';

export default function TeacherDashboard() {
  const { 
    isTeacherOnline, 
    setIsTeacherOnline, 
    requests, 
    updateRequestStatus, 
    setActiveTab 
  } = useApp();

  const [dashboardTab, setDashboardTab] = useState('courses');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);

  // Courses State
  const [courses, setCourses] = useState([
    {
      id: 1,
      title: 'Mathematics (Calculus & Vectors)',
      rate: 5,
      freeMins: 10,
      isPublished: true,
      chapters: [
        {
          id: 101,
          name: 'Differential Equations',
          topics: ['First Order ODE', 'Homogeneous Equations']
        }
      ]
    },
    {
      id: 2,
      title: 'Full-Stack Web Development',
      rate: 8,
      freeMins: 10,
      isPublished: true,
      chapters: [
        {
          id: 201,
          name: 'React.js State Architecture',
          topics: ['Hooks Lifecycle (useEffect)', 'Zustand & Context API']
        }
      ]
    }
  ]);

  // Schedule State
  const [timeSlots, setTimeSlots] = useState([
    { id: 1, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '17:00', endTime: '19:00', isActive: true },
    { id: 2, days: ['Sat', 'Sun'], startTime: '20:30', endTime: '22:30', isActive: true }
  ]);

  // History State
  const [history] = useState([
    {
      id: 1,
      studentName: 'Aman Sharma',
      subject: 'Mathematics',
      topic: 'Integration by Parts',
      duration: '35 mins',
      earned: '₹125.00',
      date: 'Yesterday'
    }
  ]);

  // Payout States
  const [payoutMethod, setPayoutMethod] = useState('upi');
  const [upiId, setUpiId] = useState('anant@okaxis');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountName: 'Anant Patel',
    accountNumber: '••••••••1245',
    ifsc: 'HDFC0001234'
  });

  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (file) setQrCodeUrl(URL.createObjectURL(file));
  };

  const confirmedRequests = requests.filter(r => r.status === 'accepted');

  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold text-white">Teacher Dashboard</h2>
            <span className={`w-2.5 h-2.5 rounded-full ${isTeacherOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
          </div>
          <p className="text-slate-400 text-xs md:text-sm">Manage curriculum, slots, rates, payouts & incoming requests.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsTeacherOnline(!isTeacherOnline)}
            className={`text-xs font-semibold px-4 py-2.5 rounded-xl border flex items-center gap-2 transition ${
              isTeacherOnline ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isTeacherOnline ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
            {isTeacherOnline ? 'Status: Online' : 'Status: Offline'}
          </button>

          <button 
            onClick={() => setShowAddSubjectModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition"
          >
            <PlusCircle className="w-4 h-4" /> Add Subject
          </button>
        </div>
      </div>

      {/* Top Metrics Component */}
      <TeacherMetrics 
        coursesCount={courses.filter(c => c.isPublished).length}
        pendingCount={requests.filter(r => r.status === 'pending').length}
        payoutMethod={payoutMethod}
        onOpenPayout={() => setShowPayoutModal(true)}
      />

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setDashboardTab('courses')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
            dashboardTab === 'courses' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Courses & Curriculum
        </button>

        <button
          onClick={() => setDashboardTab('schedule')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
            dashboardTab === 'schedule' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" /> Teaching Slots & Timing ({timeSlots.length})
        </button>

        <button
          onClick={() => setDashboardTab('confirmed')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
            dashboardTab === 'confirmed' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Confirmed Sessions ({confirmedRequests.length})
        </button>

        <button
          onClick={() => setDashboardTab('history')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
            dashboardTab === 'history' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" /> Session History
        </button>
      </div>

      {/* Tab Views */}
      {dashboardTab === 'courses' && (
        <CourseManager 
          courses={courses}
          setCourses={setCourses}
          requests={requests}
          onAcceptRequest={(id) => updateRequestStatus(id, 'accepted')}
          onDeclineRequest={(id) => updateRequestStatus(id, 'declined')}
        />
      )}

      {dashboardTab === 'schedule' && (
        <ScheduleManager 
          timeSlots={timeSlots}
          setTimeSlots={setTimeSlots}
        />
      )}

      {dashboardTab === 'confirmed' && (
        <ConfirmedSessions 
          confirmedRequests={confirmedRequests}
          onLaunchRoom={() => setActiveTab('classroom')}
        />
      )}

      {dashboardTab === 'history' && (
        <SessionHistory history={history} />
      )}

      {/* Modals */}
      <PayoutModal 
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        payoutMethod={payoutMethod}
        setPayoutMethod={setPayoutMethod}
        upiId={upiId}
        setUpiId={setUpiId}
        qrCodeUrl={qrCodeUrl}
        onQrUpload={handleQrUpload}
        bankDetails={bankDetails}
        setBankDetails={setBankDetails}
      />

      <AddSubjectModal 
        isOpen={showAddSubjectModal}
        onClose={() => setShowAddSubjectModal(false)}
        onAddSubject={(newSub) => setCourses([...courses, newSub])}
      />
    </main>
  );
}