import React, { useState } from 'react';
import { Search, Video, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function StudentDashboard() {
  const { 
    currentUser, 
    teacherSubjects, 
    requests, 
    addRequest, 
    setActiveTab 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState(teacherSubjects[0]?.id || 1);
  const [selectedTopic, setSelectedTopic] = useState('differential');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('6:00 PM - 6:45 PM');
  const [customSlot, setCustomSlot] = useState('');

  const filteredSubjects = teacherSubjects.filter(sub => 
    sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.chapters.some(ch => ch.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleBooking = () => {
    const chosenSubject = teacherSubjects.find(s => s.id === Number(selectedSubjectId));
    const topicFinal = selectedTopic === 'other' ? (customTopic || 'Custom Doubt') : selectedTopic;
    const timeFinal = selectedSlot === 'other' ? (customSlot || 'Custom Time') : selectedSlot;

    addRequest({
      id: Date.now(),
      studentName: currentUser?.name || 'You',
      subject: chosenSubject?.title || 'Subject',
      topic: topicFinal,
      time: timeFinal,
      status: 'pending'
    });

    alert('Request sent to tutor!');
  };

  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Student Dashboard</h2>
          <p className="text-slate-400 text-xs md:text-sm">Find tutors, request specific doubts, and join confirmed rooms.</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input 
            type="text" 
            placeholder="Search subjects or topics..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Left: Request Form */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base">Request 1-on-1 Micro-Mentorship</h3>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">1. Select Subject</label>
            <select 
              value={selectedSubjectId} 
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {filteredSubjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.rate === 0 ? 'Free' : `₹${s.rate}/min`} • 10m Free Trial)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">2. Select Chapter / Topic</label>
            <select 
              value={selectedTopic} 
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="First Order ODE">Differential Equations: First Order ODE</option>
              <option value="Matrices & Determinants">Linear Algebra: Matrices & Determinants</option>
              <option value="React Hooks Lifecycle">React.js: Hooks Lifecycle</option>
              <option value="other">✨ Other (Write your custom problem)</option>
            </select>

            {selectedTopic === 'other' && (
              <input 
                type="text" 
                placeholder="Type your exact question or doubt..." 
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="w-full mt-2 bg-slate-950 border border-indigo-500/50 rounded-xl p-3 text-xs md:text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">3. Preferred Time Slot</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {['6:00 PM - 6:45 PM', '8:30 PM - 9:15 PM'].map(slot => (
                <button 
                  key={slot}
                  type="button"
                  onClick={() => { setSelectedSlot(slot); setCustomSlot(''); }}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    selectedSlot === slot 
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>

            <input 
              type="text" 
              placeholder="Or propose custom time (e.g. Tonight 10:15 PM)" 
              value={customSlot}
              onChange={(e) => { setCustomSlot(e.target.value); setSelectedSlot('other'); }}
              className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button 
            onClick={handleBooking}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl text-xs md:text-sm transition shadow-lg shadow-indigo-600/25 mt-2"
          >
            Send Request to Tutor
          </button>
        </div>

        {/* Right: Active Requests */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">My Session Requests</h3>
          {requests.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-xs">
              No active requests yet.
            </div>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-white text-xs">{r.subject}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                    r.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    r.status === 'declined' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {r.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {r.topic}
                </p>

                <div className="text-[11px] text-slate-500 font-mono">
                  Requested Slot: {r.time}
                </div>

                {r.status === 'accepted' && (
                  <button 
                    onClick={() => setActiveTab('classroom')}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-600/20"
                  >
                    <Video className="w-3.5 h-3.5" /> Join Live Classroom Now
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}