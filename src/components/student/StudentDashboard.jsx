import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { fetchAllSubjects, createBooking, fetchUserBookings, cancelOrDeleteBooking } from '../../lib/db';
import TutorCard from './TutorCard';
import BookingModal from './BookingModal';
import { 
  Search, Users, Filter, BookOpen, Clock, Video, 
  CheckCircle2, AlertCircle, Sparkles, X, ChevronDown, 
  History, Wifi, WifiOff, Loader2, RefreshCw, ChevronUp,
  Calendar
} from 'lucide-react';

export default function StudentDashboard() {
  const { currentUser, setActiveTab } = useApp();
  const studentId = currentUser?.id;

  // Real Database States
  const [courses, setCourses] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [previousLearnings, setPreviousLearnings] = useState([]);
  
  // Loading & Action Locks
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isBookingInProgress = useRef(false);

  // Top Section States
  const [topSectionView, setTopSectionView] = useState('requests');
  const [isTopSectionCollapsed, setIsTopSectionCollapsed] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('ALL');
  const [onlyOnlineTeachers, setOnlyOnlineTeachers] = useState(false);
  const [onlyFree, setOnlyFree] = useState(false);

  // Modal State
  const [selectedCourseForBooking, setSelectedCourseForBooking] = useState(null);

  // Central Loader Function
  const loadDashboardData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [dbSubjects, dbBookings] = await Promise.all([
        fetchAllSubjects(),
        studentId ? fetchUserBookings(studentId, 'student') : Promise.resolve([])
      ]);

      // 1. Process Published Courses
      if (dbSubjects && dbSubjects.length > 0) {
        const publishedOnly = dbSubjects
          .filter(sub => sub.is_published !== false)
          .map(sub => ({
            id: sub.id,
            teacherId: sub.teacher_id,
            teacherName: sub.profiles?.name || 'Verified Educator',
            teacherHeadline: sub.profiles?.headline || 'Subject Mentor',
            isOnline: Boolean(sub.profiles?.is_online),
            title: sub.title,
            rate: sub.rate ?? 5,
            freeMins: sub.free_mins ?? 10,
            chapters: Array.isArray(sub.chapters) ? sub.chapters : []
          }));
        setCourses(publishedOnly);
      } else {
        setCourses([]);
      }

      // 2. Process Bookings (Exclude Cancelled)
      if (dbBookings && dbBookings.length > 0) {
        const activeList = dbBookings.filter(b => b.status === 'pending' || b.status === 'accepted' || b.status === 'declined');
        const mappedActive = activeList.map(b => ({
          id: b.id,
          subject: b.subject_title || 'Session Request',
          topic: b.topic || 'General Doubt',
          time: b.start_time || 'Flexible Timing',
          status: b.status,
          teacherName: b.teacher_name || 'Assigned Educator',
          teacherId: b.teacher_id,
          createdAt: b.created_at ? new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          date: b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Today'
        }));
        setRequestsList(mappedActive);

        const completedList = dbBookings.filter(b => b.status === 'completed');
        const mappedCompleted = completedList.map(b => ({
          id: b.id,
          subject: b.subject_title || 'Session',
          topic: b.topic || 'Doubt Clarification',
          duration: b.duration_mins ? `${b.duration_mins} mins` : 'Completed',
          date: b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Recent',
          teacherName: b.teacher_name || 'Educator',
          amountPaid: b.total_amount ? `₹${b.total_amount}` : '₹0 (Free Trial)'
        }));
        setPreviousLearnings(mappedCompleted);
      } else {
        setRequestsList([]);
        setPreviousLearnings([]);
      }

    } catch (err) {
      console.error('Error fetching student dashboard data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Unique Teachers List
  const uniqueTeachersMap = new Map();
  courses.forEach(c => {
    if (c.teacherId && !uniqueTeachersMap.has(c.teacherId)) {
      uniqueTeachersMap.set(c.teacherId, {
        id: c.teacherId,
        name: c.teacherName,
        isOnline: c.isOnline
      });
    }
  });
  const availableTeachers = Array.from(uniqueTeachersMap.values());

  // Filter Logic
  const filteredCourses = courses.filter((course) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      course.title.toLowerCase().includes(q) ||
      course.chapters.some(ch => 
        ch.name.toLowerCase().includes(q) ||
        (Array.isArray(ch.topics) && ch.topics.some(t => t.toLowerCase().includes(q)))
      )
    );
    const matchesTeacher = selectedTeacherId === 'ALL' || course.teacherId === selectedTeacherId;
    const matchesOnline = onlyOnlineTeachers ? course.isOnline : true;
    const matchesFree = onlyFree ? course.rate === 0 : true;

    return matchesSearch && matchesTeacher && matchesOnline && matchesFree;
  });

  // Anti-Duplicate Booking Confirmation
  const handleConfirmBooking = async (bookingData) => {
    if (isBookingInProgress.current) return;
    isBookingInProgress.current = true;

    try {
      const created = await createBooking({
  student_id: studentId,
  teacher_id: selectedCourseForBooking?.teacherId,
  subject_title: bookingData.subject || selectedCourseForBooking?.title,
  topic: bookingData.topic,
  start_time: bookingData.time,
  slot_time: bookingData.time, // <--- slot_time bhi pass karein
  status: 'pending'
});

      const newCard = {
        id: created?.id || Date.now(),
        subject: bookingData.subject || selectedCourseForBooking?.title,
        topic: bookingData.topic,
        time: bookingData.time,
        status: 'pending',
        teacherName: selectedCourseForBooking?.teacherName || 'Assigned Educator',
        createdAt: 'Just now',
        date: 'Today'
      };

      setRequestsList(prev => [newCard, ...prev]);
      setSelectedCourseForBooking(null);
    } catch (err) {
      console.error('Failed to create booking:', err);
      alert('Failed to send booking: ' + err.message);
    } finally {
      isBookingInProgress.current = false;
    }
  };

  // Permanent Cancel Logic (DB + Local State)
  const handleCancelRequest = async (requestId) => {
    setRequestsList(prev => prev.filter(r => r.id !== requestId));
    try {
      await cancelOrDeleteBooking(requestId);
    } catch (err) {
      console.error('Failed to cancel request in DB:', err);
    }
  };

  const selectedTeacherObj = availableTeachers.find(t => t.id === selectedTeacherId);

  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6 w-full">
      {/* 1. Header & Sync Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <span>Student Dashboard</span>
            <span className="text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
              Live Connect
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Book instant 1-on-1 sessions, track request responses, and browse verified mentors.
          </p>
        </div>

        <button
          onClick={() => loadDashboardData(true)}
          disabled={isRefreshing}
          className="self-start sm:self-auto bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm"
          title="Sync latest requests and teacher statuses from database"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Live Updates'}</span>
        </button>
      </div>

      {/* 2. Top Section (Scrollable & Collapsible) */}
      <div className="p-4 md:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setTopSectionView('requests'); setIsTopSectionCollapsed(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                topSectionView === 'requests' 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>My Requests</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                topSectionView === 'requests' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {requestsList.length}
              </span>
            </button>

            <button
              onClick={() => { setTopSectionView('history'); setIsTopSectionCollapsed(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                topSectionView === 'history' 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Previous Learning</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                topSectionView === 'history' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {previousLearnings.length}
              </span>
            </button>
          </div>

          <button
            onClick={() => setIsTopSectionCollapsed(!isTopSectionCollapsed)}
            className="text-slate-400 hover:text-white text-xs flex items-center gap-1 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 transition"
          >
            <span>{isTopSectionCollapsed ? 'Show Section' : 'Minimize'}</span>
            {isTopSectionCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {!isTopSectionCollapsed && (
          <div className="max-h-64 overflow-y-auto pr-1">
            {topSectionView === 'requests' && (
              requestsList.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-500 text-xs">
                  No active requests. Select a course below to request a 1-on-1 session with a mentor!
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {requestsList.map((r) => (
                    <div 
                      key={r.id} 
                      className={`p-3.5 rounded-xl bg-slate-950 border transition flex flex-col justify-between space-y-3 ${
                        r.status === 'accepted' ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-slate-800'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border flex items-center gap-1 ${
                            r.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            r.status === 'declined' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {r.status === 'accepted' && <CheckCircle2 className="w-3 h-3" />}
                            {r.status === 'pending' && <Clock className="w-3 h-3 animate-spin" />}
                            {r.status === 'declined' && <AlertCircle className="w-3 h-3" />}
                            <span>{r.status}</span>
                          </span>

                          <span className="text-[10px] text-slate-500 font-mono">{r.createdAt}</span>
                        </div>

                        <div>
                          <h4 className="text-white font-bold text-xs">{r.subject}</h4>
                          <span className="text-[11px] text-indigo-300 block font-medium">
                            👨‍🏫 {r.teacherName}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] text-slate-300">
                          <span className="text-slate-500 text-[10px] block">Specific Doubt:</span>
                          <span className="line-clamp-2">{r.topic}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{r.time}</span>
                        </div>
                      </div>

                      <div>
                        {r.status === 'accepted' ? (
                          <button
                            onClick={() => setActiveTab('classroom')}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/30 animate-pulse"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Join Classroom (Tutor Ready)</span>
                          </button>
                        ) : r.status === 'declined' ? (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-rose-400">Educator unavailable</span>
                            <button
                              onClick={() => handleCancelRequest(r.id)}
                              className="text-[10px] text-slate-400 hover:text-white underline"
                            >
                              Dismiss
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                            <span className="text-[10px] text-amber-400/90 flex items-center gap-1">
                              Waiting tutor confirmation...
                            </span>
                            <button
                              onClick={() => handleCancelRequest(r.id)}
                              className="text-[10px] text-slate-500 hover:text-rose-400"
                              title="Cancel this request"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {topSectionView === 'history' && (
              previousLearnings.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-500 text-xs">
                  No completed sessions yet.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {previousLearnings.map((item) => (
                    <div key={item.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white text-xs truncate">{item.subject}</span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {item.duration}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{item.topic}</p>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1.5 border-t border-slate-900">
                        <span>Mentor: {item.teacherName}</span>
                        <span>{item.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* 3. Search & Dual Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
        <div className="grid md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-7 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input 
              type="text" 
              placeholder="Search by subject, chapter or doubt (e.g. Calculus, Equations, Web Dev)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="md:col-span-5 relative">
            <div className="relative">
              <Users className="w-4 h-4 text-indigo-400 absolute left-3 top-3 pointer-events-none" />
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-8 py-2.5 focus:outline-none focus:border-indigo-500 appearance-none font-medium cursor-pointer"
              >
                <option value="ALL">All Available Mentors ({availableTeachers.length})</option>
                {availableTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.isOnline ? '🟢' : '⚪'} {teacher.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyOnlineTeachers(!onlyOnlineTeachers)}
              className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                onlyOnlineTeachers 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {onlyOnlineTeachers ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{onlyOnlineTeachers ? '✓ Online Mentors Only' : 'Show Online Only'}</span>
            </button>

            <button
              onClick={() => setOnlyFree(!onlyFree)}
              className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                onlyFree 
                  ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{onlyFree ? '✓ Free Sessions (₹0)' : 'Free Sessions Only'}</span>
            </button>
          </div>

          {(searchQuery || selectedTeacherId !== 'ALL' || onlyOnlineTeachers || onlyFree) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTeacherId('ALL');
                setOnlyOnlineTeachers(false);
                setOnlyFree(false);
              }}
              className="text-slate-500 hover:text-rose-400 text-xs flex items-center gap-1 transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Selected Teacher Banner */}
      {selectedTeacherId !== 'ALL' && selectedTeacherObj && (
        <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${selectedTeacherObj.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>
              Showing all subject offerings curated by <strong className="text-white">{selectedTeacherObj.name}</strong>
            </span>
          </div>
          <button 
            onClick={() => setSelectedTeacherId('ALL')}
            className="text-slate-400 hover:text-white underline text-[11px]"
          >
            Show all educators
          </button>
        </div>
      )}

      {/* 4. Courses Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Matched Offerings & Mentors ({filteredCourses.length})</span>
          </h3>
        </div>

        {isLoading ? (
          <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-slate-400 text-xs font-medium">Fetching verified courses and educators from database...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <Filter className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="text-white font-semibold text-sm">No Courses Found</h4>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              No subjects matched your selected combination. Try clearing your search query or selecting a different educator.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTeacherId('ALL');
                setOnlyOnlineTeachers(false);
                setOnlyFree(false);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredCourses.map((course) => (
              <TutorCard 
                key={course.id}
                course={course}
                onSelectCourse={(c) => setSelectedCourseForBooking(c)}
                onSelectTeacher={(tId) => setSelectedTeacherId(tId)}
                isSelectedTeacher={selectedTeacherId === course.teacherId}
              />
            ))}
          </div>
        )}
      </div>

      <BookingModal 
        course={selectedCourseForBooking}
        isOpen={Boolean(selectedCourseForBooking)}
        onClose={() => setSelectedCourseForBooking(null)}
        onConfirmBooking={handleConfirmBooking}
      />
    </main>
  );
}