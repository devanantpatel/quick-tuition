import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Calendar, UserCheck, History, Bell, 
  CheckCircle, XCircle, X, RefreshCw 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  fetchTeacherSubjects, 
  createSubject, 
  fetchTeacherSchedules, 
  addTeacherScheduleSlot, 
  updateTeacherScheduleSlot,
  deleteTeacherScheduleSlot, 
  updateTeacherPayoutDetails, 
  updateTeacherOnlineStatus,
  getProfile,
  fetchUserBookings,
  updateBookingStatus,
  cancelOrDeleteBooking
} from '../../lib/db';
import { supabase } from '../../lib/supabase';
import TeacherMetrics from './TeacherMetrics';
import CourseManager from './CourseManager';
import ScheduleManager from './ScheduleManager';
import ConfirmedSessions from './ConfirmedSessions';
import SessionHistory from './SessionHistory';
import PayoutModal from './PayoutModal';
import AddSubjectModal from './AddSubjectModal';

const DEFAULT_DEMO_COURSE = {
  id: 'demo-1',
  title: 'Mathematics (Calculus & Vectors)',
  rate: 5,
  freeMins: 10,
  isPublished: false,
  isDemo: true,
  chapters: [
    {
      id: 101,
      name: 'Differential Equations',
      topics: ['First Order ODE', 'Homogeneous Equations']
    }
  ]
};

const DEFAULT_EXAMPLE_SLOT = {
  id: 'slot-demo-1',
  days: ['Mon', 'Wed', 'Fri'],
  startTime: '18:00',
  endTime: '19:00',
  isActive: true,
  isDemo: true
};

export default function TeacherDashboard() {
  const { 
    currentUser,
    isTeacherOnline, 
    setIsTeacherOnline, 
    startClassroomSession,
    cancelBooking
  } = useApp();

  const teacherId = currentUser?.id;

  const [dashboardTab, setDashboardTab] = useState('courses');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Courses & Schedule State
  const [courses, setCourses] = useState([DEFAULT_DEMO_COURSE]);
  const [timeSlots, setTimeSlots] = useState([DEFAULT_EXAMPLE_SLOT]);

  // Real History, Metrics & Bookings State
  const [history, setHistory] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [taughtMinutes, setTaughtMinutes] = useState(0);
  const [dbBookingsList, setDbBookingsList] = useState([]);

  // Payout States
  const [payoutMethod, setPayoutMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    ifsc: ''
  });

  // Central Load Function
  const loadTeacherData = useCallback(async (manual = false) => {
    if (!teacherId) return;
    if (manual) setIsRefreshing(true);

    try {
      const [dbSubjects, dbSchedules, dbProfile, dbBookings] = await Promise.all([
        fetchTeacherSubjects(teacherId),
        fetchTeacherSchedules(teacherId),
        getProfile(teacherId),
        fetchUserBookings(teacherId, 'teacher')
      ]);

      // 1. Subjects
      if (dbSubjects && dbSubjects.length > 0) {
        const mappedCourses = dbSubjects.map(s => ({
          id: s.id,
          title: s.title,
          rate: s.rate ?? 5,
          freeMins: s.free_mins ?? 10,
          isPublished: s.is_published ?? true,
          isDemo: false,
          chapters: Array.isArray(s.chapters) ? s.chapters : []
        }));
        setCourses(mappedCourses);
      }

      // 2. Schedules
      if (dbSchedules && dbSchedules.length > 0) {
        const mappedSlots = dbSchedules.map(sc => ({
          id: sc.id,
          days: Array.isArray(sc.days) ? sc.days : (sc.day_of_week ? [sc.day_of_week] : ['Mon']),
          startTime: sc.start_time || '10:00',
          endTime: sc.end_time || '11:00',
          isActive: sc.is_active ?? true,
          isDemo: false
        }));
        setTimeSlots(mappedSlots);
      }

      // 3. Profile & Payout
      if (dbProfile) {
        if (dbProfile.upi_id) setUpiId(dbProfile.upi_id);
        if (dbProfile.qr_code_url) setQrCodeUrl(dbProfile.qr_code_url);
        if (dbProfile.bank_holder_name || dbProfile.bank_account_no) {
          setBankDetails({
            accountName: dbProfile.bank_holder_name || '',
            accountNumber: dbProfile.bank_account_no || '',
            ifsc: dbProfile.bank_ifsc || ''
          });
          if (!dbProfile.upi_id && dbProfile.bank_account_no) {
            setPayoutMethod('gateway');
          }
        }
        if (dbProfile.is_online !== undefined) {
          setIsTeacherOnline(dbProfile.is_online);
        }
      }

      // 4. Bookings & Requests Sync
      if (dbBookings && dbBookings.length > 0) {
        setDbBookingsList(dbBookings.map(b => ({
          id: b.id,
          studentName: b.student_name || 'Student',
          student_id: b.student_id,
          subject: b.subject_title || 'Session Request',
          topic: b.topic || 'Doubt Clearing',
          time: b.start_time || b.slot_time || 'Flexible Timing',
          status: b.status || 'pending',
          rate: b.rate || 5,
          createdAt: b.created_at ? new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'
        })));

        const completed = dbBookings.filter(b => b.status === 'completed');
        let sumEarned = 0;
        let sumMins = 0;

        const mappedHistory = completed.map(item => {
          const mins = item.duration_mins || 0;
          const amt = item.total_amount || 0;
          sumMins += mins;
          sumEarned += amt;

          return {
            id: item.id,
            studentName: item.student_name || 'Student',
            subject: item.subject_title || 'Session',
            topic: item.topic || 'Doubt Clearing',
            duration: `${mins} mins`,
            earned: `₹${amt.toFixed(2)}`,
            date: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'
          };
        });

        setHistory(mappedHistory);
        setTotalEarnings(sumEarned);
        setTaughtMinutes(sumMins);
      } else {
        setDbBookingsList([]);
        setHistory([]);
        setTotalEarnings(0);
        setTaughtMinutes(0);
      }

    } catch (err) {
      console.error('Error fetching teacher data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [teacherId, setIsTeacherOnline]);

 useEffect(() => {
  if (!teacherId) return;

  // Pehli baar data load karein
  loadTeacherData();

  // Realtime listener (Student ke request bhejte hi live card pop-up hoga)
  const channel = supabase
    .channel(`teacher_bookings_${teacherId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'session_bookings',
        filter: `teacher_id=eq.${teacherId}`
      },
      () => {
        loadTeacherData(); // Auto reload without manual sync button
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [teacherId, loadTeacherData]);

  // Online Status Toggle
  const handleToggleOnlineStatus = async () => {
    const nextStatus = !isTeacherOnline;
    setIsTeacherOnline(nextStatus);
    if (teacherId) {
      try {
        await updateTeacherOnlineStatus(teacherId, nextStatus);
      } catch (err) {
        console.error('Failed to update online status:', err);
      }
    }
  };

  // Add Subject
  const handleAddSubjectToDb = async (newSub) => {
    if (!teacherId) return;

    try {
      const created = await createSubject({
        teacher_id: teacherId,
        title: newSub.title,
        rate: newSub.rate,
        free_mins: newSub.freeMins || 10,
        is_published: true,
        chapters: newSub.chapters || []
      });

      setCourses(prev => [
        ...prev.filter(c => c.id !== 'demo-1'),
        {
          id: created.id,
          title: created.title,
          rate: created.rate,
          freeMins: created.free_mins,
          isPublished: created.is_published,
          isDemo: false,
          chapters: created.chapters || []
        }
      ]);
    } catch (err) {
      console.error('Error creating subject:', err);
      alert('Subject save failed: ' + err.message);
    }
  };

  // Slot Handlers
  const handleAddSlotToDb = async (slotData) => {
    if (!teacherId) return;

    try {
      const created = await addTeacherScheduleSlot({
        teacher_id: teacherId,
        day_of_week: slotData.days[0] || 'Monday',
        start_time: slotData.startTime,
        end_time: slotData.endTime,
        is_active: slotData.isActive ?? true
      });

      setTimeSlots(prev => [
        ...prev.filter(s => s.id !== 'slot-demo-1'),
        {
          id: created.id,
          days: slotData.days,
          startTime: slotData.startTime,
          endTime: slotData.endTime,
          isActive: slotData.isActive,
          isDemo: false
        }
      ]);
    } catch (err) {
      console.error('Error adding slot:', err);
      alert('Slot save failed: ' + err.message);
    }
  };

  const handleUpdateSlotInDb = async (slotId, slotData) => {
    if (!teacherId || String(slotId).startsWith('slot-demo-')) return;
    try {
      await updateTeacherScheduleSlot(slotId, slotData);
    } catch (err) {
      console.error('Error updating slot in DB:', err);
      throw err;
    }
  };

  const handleToggleSlotInDb = async (slotId, nextActiveStatus) => {
    const slot = timeSlots.find(s => s.id === slotId);
    if (!slot) return;

    setTimeSlots(prev => prev.map(s => s.id === slotId ? { ...s, isActive: nextActiveStatus } : s));

    if (teacherId && !String(slotId).startsWith('slot-demo-')) {
      try {
        await updateTeacherScheduleSlot(slotId, {
          days: slot.days,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: nextActiveStatus
        });
      } catch (err) {
        console.error('Error toggling slot active status:', err);
      }
    }
  };

  const handleDeleteSlotFromDb = async (slotId) => {
    try {
      if (!String(slotId).startsWith('slot-demo-')) {
        await deleteTeacherScheduleSlot(slotId);
      }
      setTimeSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (err) {
      console.error('Error deleting slot:', err);
    }
  };

  // Payout Save
  const handleSavePayoutToDb = async (payoutPayload) => {
    if (!teacherId) return;
    try {
      await updateTeacherPayoutDetails(teacherId, {
        payoutMethod: payoutPayload.payoutMethod,
        upiId: payoutPayload.upiId,
        bankDetails: payoutPayload.bankDetails,
        qrCodeUrl: payoutPayload.qrCodeUrl
      });
    } catch (err) {
      console.error('Error saving payout:', err);
      throw err;
    }
  };

  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Please upload an image smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setQrCodeUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const pendingRequests = dbBookingsList.filter(r => r.status === 'pending');
  const confirmedRequests = dbBookingsList.filter(r => r.status === 'accepted');

  // Accept Request Handler
  const handleAcceptRequest = async (requestId) => {
    setDbBookingsList(prev => prev.map(r => r.id === requestId ? { ...r, status: 'accepted' } : r));
    setShowRequestsModal(false);
    setDashboardTab('confirmed');

    try {
      await updateBookingStatus(requestId, 'accepted');
    } catch (err) {
      console.error('Failed to accept booking in DB:', err);
      alert('Accept failed in DB: ' + err.message);
    }
  };

  // Decline Request Handler
  const handleDeclineRequest = async (requestId) => {
    setDbBookingsList(prev => prev.map(r => r.id === requestId ? { ...r, status: 'declined' } : r));

    try {
      await updateBookingStatus(requestId, 'declined');
    } catch (err) {
      console.error('Failed to decline booking in DB:', err);
      alert('Decline failed in DB: ' + err.message);
    }
  };

  // Cancel Confirmed Session Handler
  const handleCancelConfirmedSession = async (requestId) => {
    setDbBookingsList(prev => prev.filter(r => r.id !== requestId));
    try {
      if (cancelBooking) {
        await cancelBooking(requestId);
      } else {
        await cancelOrDeleteBooking(requestId);
      }
    } catch (err) {
      console.error('Failed to cancel confirmed session in DB:', err);
    }
  };

  // Direct dynamic room launcher for Teacher
  const handleLaunchRoom = (session) => {
    const roomPayload = {
      ...session,
      tutorUpi: upiId,
      tutorQr: qrCodeUrl
    };

    if (startClassroomSession) {
      startClassroomSession(roomPayload);
    }
  };

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

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadTeacherData(true)}
            disabled={isRefreshing}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            title="Sync latest student requests from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <button 
            onClick={() => setShowRequestsModal(true)}
            className="relative bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Requests</span>
            {pendingRequests.length > 0 && (
              <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button 
            onClick={handleToggleOnlineStatus}
            className={`text-xs font-semibold px-4 py-2.5 rounded-xl border flex items-center gap-2 transition ${
              isTeacherOnline ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isTeacherOnline ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
            {isTeacherOnline ? 'Status: Online' : 'Status: Offline'}
          </button>
        </div>
      </div>

      <TeacherMetrics 
        taughtMinutes={taughtMinutes}
        totalEarnings={totalEarnings}
        payoutMethod={payoutMethod}
        onOpenPayout={() => setShowPayoutModal(true)}
      />

      <div className="flex gap-2 border-b border-slate-800 pb-2 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setDashboardTab('courses')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            dashboardTab === 'courses' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Courses & Curriculum</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            dashboardTab === 'courses' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            {courses.length}
          </span>
        </button>

        <button
          onClick={() => setDashboardTab('schedule')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            dashboardTab === 'schedule' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Teaching Slots & Timing</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            dashboardTab === 'schedule' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            {timeSlots.length}
          </span>
        </button>

        <button
          onClick={() => setDashboardTab('confirmed')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            dashboardTab === 'confirmed' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Confirmed Sessions</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            dashboardTab === 'confirmed' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            {confirmedRequests.length}
          </span>
        </button>

        <button
          onClick={() => setDashboardTab('history')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            dashboardTab === 'history' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Session History</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            dashboardTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            {history.length}
          </span>
        </button>
      </div>

      {dashboardTab === 'courses' && (
        <CourseManager 
          courses={courses}
          setCourses={setCourses}
          teacherId={teacherId}
          onOpenAddModal={() => setShowAddSubjectModal(true)}
        />
      )}

      {dashboardTab === 'schedule' && (
        <ScheduleManager 
          timeSlots={timeSlots}
          setTimeSlots={setTimeSlots}
          onAddSlot={handleAddSlotToDb}
          onUpdateSlot={handleUpdateSlotInDb}
          onToggleSlot={handleToggleSlotInDb}
          onDeleteSlot={handleDeleteSlotFromDb}
        />
      )}

      {dashboardTab === 'confirmed' && (
        <ConfirmedSessions 
          confirmedRequests={confirmedRequests}
          onLaunchRoom={handleLaunchRoom}
          onCancelSession={handleCancelConfirmedSession}
        />
      )}

      {dashboardTab === 'history' && (
        <SessionHistory history={history} />
      )}

      {/* Requests Modal */}
      {showRequestsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setShowRequestsModal(false)} 
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                <span>Pending Student Requests</span>
              </h3>
              <p className="text-xs text-slate-400">Accept to launch immediate 1-on-1 tutoring sessions.</p>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {pendingRequests.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-500 text-xs">
                  No new pending requests right now.
                </div>
              ) : (
                pendingRequests.map((req) => (
                  <div key={req.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-sm">{req.studentName}</span>
                      <span className="text-[11px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {req.time}
                      </span>
                    </div>
                    <div className="text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-0.5">
                      <div className="text-slate-400">{req.subject}</div>
                      <div className="text-slate-200 font-medium">{req.topic}</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAcceptRequest(req.id)} 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1 transition shadow"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button 
                        onClick={() => handleDeclineRequest(req.id)} 
                        className="flex-1 bg-slate-800 hover:bg-rose-900/30 text-slate-300 hover:text-rose-400 text-xs font-semibold py-2 rounded-xl border border-slate-700 flex items-center justify-center gap-1 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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
        onSave={handleSavePayoutToDb}
      />

      <AddSubjectModal 
        isOpen={showAddSubjectModal}
        onClose={() => setShowAddSubjectModal(false)}
        onAddSubject={handleAddSubjectToDb}
      />
    </main>
  );
}