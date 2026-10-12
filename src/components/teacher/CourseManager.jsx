import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Eye, EyeOff, Save, CheckCircle, XCircle } from 'lucide-react';

export default function CourseManager({ 
  courses, 
  setCourses, 
  requests, 
  onAcceptRequest, 
  onDeclineRequest 
}) {
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editRate, setEditRate] = useState(0);

  const togglePublish = (id) => {
    setCourses(courses.map(c => c.id === id ? { ...c, isPublished: !c.isPublished } : c));
  };

  const handleDeleteSubject = (id) => {
    if (confirm('Delete this subject?')) {
      setCourses(courses.filter(c => c.id !== id));
    }
  };

  const handleSavePrice = (courseId) => {
    setCourses(courses.map(c => c.id === courseId ? { ...c, rate: Number(editRate) } : c));
    setEditingCourseId(null);
  };

  const handleAddChapter = (courseId) => {
    if (!newChapterTitle.trim()) return;
    setCourses(courses.map(c => c.id === courseId ? {
      ...c,
      chapters: [...c.chapters, { id: Date.now(), name: newChapterTitle, topics: [] }]
    } : c));
    setNewChapterTitle('');
    setActiveCourseId(null);
  };

  const handleDeleteChapter = (courseId, chapterId) => {
    setCourses(courses.map(c => c.id === courseId ? {
      ...c,
      chapters: c.chapters.filter(ch => ch.id !== chapterId)
    } : c));
  };

  const handleAddTopic = (courseId, chapterId) => {
    if (!newTopicTitle.trim()) return;
    setCourses(courses.map(c => c.id === courseId ? {
      ...c,
      chapters: c.chapters.map(ch => ch.id === chapterId ? { ...ch, topics: [...ch.topics, newTopicTitle] } : ch)
    } : c));
    setNewTopicTitle('');
    setActiveChapterId(null);
  };

  const handleDeleteTopic = (courseId, chapterId, topicIndex) => {
    setCourses(courses.map(c => c.id === courseId ? {
      ...c,
      chapters: c.chapters.map(ch => ch.id === chapterId ? { ...ch, topics: ch.topics.filter((_, idx) => idx !== topicIndex) } : ch)
    } : c));
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      {/* Course Cards */}
      <div className="lg:col-span-2 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">Your Offerings</h3>
          <span className="text-xs text-slate-500">{courses.length} Subjects</span>
        </div>

        {courses.map((course) => (
          <div 
            key={course.id} 
            className={`p-5 rounded-2xl bg-slate-900/80 border transition space-y-4 ${
              course.isPublished ? 'border-slate-800' : 'border-slate-800/50 opacity-70'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-base md:text-lg">{course.title}</h4>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    course.isPublished 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {course.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs">
                  {editingCourseId === course.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">₹</span>
                      <input 
                        type="number" 
                        min="0"
                        value={editRate} 
                        onChange={(e) => setEditRate(e.target.value)}
                        className="w-16 bg-slate-950 border border-indigo-500 rounded px-2 py-1 text-white text-xs"
                      />
                      <span className="text-slate-400">/ min</span>
                      <button onClick={() => handleSavePrice(course.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded">
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold text-sm">
                        {course.rate === 0 ? '₹0 (Free Session)' : `₹${course.rate} / min`}
                      </span>
                      <button onClick={() => { setEditingCourseId(course.id); setEditRate(course.rate); }} className="text-slate-500 hover:text-indigo-400 p-0.5">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400 text-[11px]">10 Mins Free</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button 
                  onClick={() => togglePublish(course.id)}
                  className="text-xs px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 flex items-center gap-1.5 transition"
                >
                  {course.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{course.isPublished ? 'Unpublish' : 'Publish'}</span>
                </button>
                <button onClick={() => handleDeleteSubject(course.id)} className="p-1.5 bg-slate-950 text-slate-500 hover:text-rose-400 border border-slate-800 rounded-xl transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chapters & Topics */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chapters & Topics</span>
                <button 
                  onClick={() => setActiveCourseId(activeCourseId === course.id ? null : course.id)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Chapter
                </button>
              </div>

              {activeCourseId === course.id && (
                <div className="flex gap-2 p-3 bg-slate-950 rounded-xl border border-indigo-500/40">
                  <input 
                    type="text" 
                    placeholder="Chapter name..." 
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-600 focus:outline-none"
                  />
                  <button onClick={() => handleAddChapter(course.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg">
                    Add
                  </button>
                </div>
              )}

              {course.chapters.map((chap) => (
                <div key={chap.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-indigo-300">📁 {chap.name}</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setActiveChapterId(activeChapterId === chap.id ? null : chap.id)}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> Subtopic
                      </button>
                      <button onClick={() => handleDeleteChapter(course.id, chap.id)} className="text-slate-600 hover:text-rose-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {activeChapterId === chap.id && (
                    <div className="flex gap-2 p-2 bg-slate-900 rounded-lg border border-slate-700">
                      <input 
                        type="text" 
                        placeholder="Subtopic name..." 
                        value={newTopicTitle}
                        onChange={(e) => setNewTopicTitle(e.target.value)}
                        className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-600 focus:outline-none"
                      />
                      <button onClick={() => handleAddTopic(course.id, chap.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1 rounded">
                        Save
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {chap.topics.map((t, tIdx) => (
                      <span key={tIdx} className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] pl-2.5 pr-1.5 py-1 rounded-lg flex items-center gap-1.5">
                        <span>{t}</span>
                        <button onClick={() => handleDeleteTopic(course.id, chap.id, tIdx)} className="text-slate-500 hover:text-rose-400">
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Requests Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">Incoming Requests</h3>
          <span className="text-xs text-amber-400 font-mono font-semibold">{pendingRequests.length} Pending</span>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-xs">
            No new pending requests right now.
          </div>
        ) : (
          pendingRequests.map((req) => (
            <div key={req.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">{req.studentName}</span>
                <span className="text-[11px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {req.time}
                </span>
              </div>
              <div className="text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">{req.subject}</div>
                <div className="text-slate-200 font-semibold">{req.topic}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onAcceptRequest(req.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1 transition shadow">
                  <CheckCircle className="w-3.5 h-3.5" /> Accept
                </button>
                <button onClick={() => onDeclineRequest(req.id)} className="flex-1 bg-slate-800 hover:bg-rose-900/30 text-slate-300 hover:text-rose-400 text-xs font-semibold py-2 rounded-xl border border-slate-700 flex items-center justify-center gap-1 transition">
                  <XCircle className="w-3.5 h-3.5" /> Decline
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}