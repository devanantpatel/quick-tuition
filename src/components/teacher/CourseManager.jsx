import React, { useState } from 'react';
import { 
  Plus, Trash2, Edit3, Eye, EyeOff, Check, 
  PlusCircle, BookOpen, Loader2, ChevronDown, ChevronUp 
} from 'lucide-react';
import { updateSubject, deleteSubject, createSubject } from '../../lib/db';

export default function CourseManager({ 
  courses = [], 
  setCourses, 
  teacherId, 
  onOpenAddModal 
}) {
  // 1. Edit Mode 1: Course Info (Name & Rate)
  const [editingInfoId, setEditingInfoId] = useState(null);
  const [tempTitle, setTempTitle] = useState('');
  const [tempRate, setTempRate] = useState(5);

  // 2. Edit Mode 2: Curriculum Structure (Chapters & Topics)
  const [editingCurriculumId, setEditingCurriculumId] = useState(null);
  const [activeAddChapterCourseId, setActiveAddChapterCourseId] = useState(null);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [activeAddTopicChapId, setActiveAddTopicChapId] = useState(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');

  // 3. Compact Collapse State per Course Card
  const [collapsedCourses, setCollapsedCourses] = useState({});

  // Loading state per card
  const [processingId, setProcessingId] = useState(null);

  const toggleCourseCollapse = (courseId) => {
    setCollapsedCourses(prev => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  // ==========================================
  // ACTION 1: COURSE INFO (NAME & RATE)
  // ==========================================
  const handleStartEditInfo = (course) => {
    setEditingInfoId(course.id);
    setTempTitle(course.title);
    setTempRate(course.rate);
  };

  const handleUpdateCourseInfo = async (course) => {
    setProcessingId(course.id);
    const newTitle = tempTitle.trim() || course.title;
    const newRate = Number(tempRate) || 0;

    const isDemo = course.isDemo || String(course.id).startsWith('demo-');

    try {
      if (isDemo) {
        const created = await createSubject({
          teacher_id: teacherId,
          title: newTitle,
          rate: newRate,
          free_mins: 5,
          is_published: true,
          chapters: course.chapters || []
        });

        setCourses(courses.map(c => c.id === course.id ? {
          ...created,
          freeMins: 5,
          isPublished: true,
          isDemo: false
        } : c));
      } else {
        await updateSubject(course.id, {
          title: newTitle,
          rate: newRate,
          is_published: true
        });

        setCourses(courses.map(c => c.id === course.id ? {
          ...c,
          title: newTitle,
          rate: newRate,
          isPublished: true
        } : c));
      }

      setEditingInfoId(null);
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed to update: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // ==========================================
  // ACTION 2: CURRICULUM (CHAPTERS & TOPICS)
  // ==========================================
  const handleToggleEditCurriculum = async (course) => {
    if (editingCurriculumId === course.id) {
      setProcessingId(course.id);
      const isDemo = course.isDemo || String(course.id).startsWith('demo-');

      try {
        if (!isDemo) {
          await updateSubject(course.id, {
            chapters: course.chapters || [],
            is_published: true
          });
          setCourses(courses.map(c => c.id === course.id ? { ...c, isPublished: true } : c));
        }
        setEditingCurriculumId(null);
        setActiveAddChapterCourseId(null);
        setActiveAddTopicChapId(null);
      } catch (err) {
        console.error('Curriculum update error:', err);
        alert('Curriculum update failed: ' + err.message);
      } finally {
        setProcessingId(null);
      }
    } else {
      // Expand automatically when entering edit mode
      setCollapsedCourses(prev => ({ ...prev, [course.id]: false }));
      setEditingCurriculumId(course.id);
    }
  };

  // Chapter Helpers
  const handleAddChapter = (courseId) => {
    if (!newChapterTitle.trim()) return;
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const updated = [
      ...(course.chapters || []),
      { id: Date.now(), name: newChapterTitle.trim(), topics: [] }
    ];

    setCourses(courses.map(c => c.id === courseId ? { ...c, chapters: updated } : c));
    setNewChapterTitle('');
    setActiveAddChapterCourseId(null);
  };

  const handleDeleteChapter = (courseId, chapterId) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const updated = (course.chapters || []).filter(ch => ch.id !== chapterId);
    setCourses(courses.map(c => c.id === courseId ? { ...c, chapters: updated } : c));
  };

  // Topic Helpers
  const handleAddTopic = (courseId, chapterId) => {
    if (!newTopicTitle.trim()) return;
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const updated = (course.chapters || []).map(ch => 
      ch.id === chapterId ? { ...ch, topics: [...(ch.topics || []), newTopicTitle.trim()] } : ch
    );

    setCourses(courses.map(c => c.id === courseId ? { ...c, chapters: updated } : c));
    setNewTopicTitle('');
    setActiveAddTopicChapId(null);
  };

  const handleDeleteTopic = (courseId, chapterId, topicIdx) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const updated = (course.chapters || []).map(ch => 
      ch.id === chapterId ? { ...ch, topics: (ch.topics || []).filter((_, idx) => idx !== topicIdx) } : ch
    );

    setCourses(courses.map(c => c.id === courseId ? { ...c, chapters: updated } : c));
  };

  // ==========================================
  // ACTION 3: PUBLISH / UNPUBLISH TOGGLE
  // ==========================================
  const handleTogglePublish = async (course) => {
    const isDemo = course.isDemo || String(course.id).startsWith('demo-');
    if (isDemo) {
      handleStartEditInfo(course);
      return;
    }

    const next = !course.isPublished;
    setCourses(courses.map(c => c.id === course.id ? { ...c, isPublished: next } : c));
    try {
      await updateSubject(course.id, { is_published: next });
    } catch (err) {
      console.error(err);
      setCourses(courses.map(c => c.id === course.id ? { ...c, isPublished: course.isPublished } : c));
    }
  };

  const handleDeleteSubject = async (course) => {
    if (!confirm('Are you sure you want to delete this subject card?')) return;
    setCourses(courses.filter(c => c.id !== course.id));
    if (!course.isDemo && !String(course.id).startsWith('demo-')) {
      try {
        await deleteSubject(course.id);
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Header with Add Course */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
        <div>
          <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">
            Your Offerings ({courses.length})
          </h3>
          <p className="text-xs text-slate-500">
            Manage rates, publish status, and curriculum cleanly in compact cards.
          </p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow transition"
        >
          <PlusCircle className="w-4 h-4" /> Add New Course
        </button>
      </div>

      {/* Compact 2-Column Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {courses.map((course) => {
          const isEditingInfo = editingInfoId === course.id;
          const isEditingCurriculum = editingCurriculumId === course.id;
          const isProcessing = processingId === course.id;
          const isCollapsed = Boolean(collapsedCourses[course.id]);
          const chaptersList = Array.isArray(course.chapters) ? course.chapters : [];
          const totalTopics = chaptersList.reduce((sum, ch) => sum + (Array.isArray(ch.topics) ? ch.topics.length : 0), 0);

          return (
            <div
              key={course.id}
              className={`min-w-0 p-4 rounded-2xl bg-slate-900 border transition space-y-3 shadow-md ${
                course.isPublished 
                  ? 'border-emerald-500/30' 
                  : 'border-slate-800 bg-slate-900/90'
              }`}
            >
              {/* TOP HEADER: COURSE NAME, RATE & ACTIONS */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="min-w-0 flex-1 space-y-1">
                  {isEditingInfo ? (
                    /* INLINE EDIT MODE (NAME & RATE) */
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        placeholder="Course title..."
                        className="w-full bg-slate-950 border border-indigo-500 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none"
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-950 border border-indigo-500 rounded-xl px-2.5 py-1 text-xs">
                          <span className="text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={tempRate}
                            onChange={(e) => setTempRate(e.target.value)}
                            className="w-14 bg-transparent text-white font-mono focus:outline-none"
                          />
                          <span className="text-slate-500 text-[11px]">/ min</span>
                        </div>

                        <button
                          disabled={isProcessing}
                          onClick={() => handleUpdateCourseInfo(course)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                        >
                          {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          <span>Save</span>
                        </button>

                        <button
                          onClick={() => setEditingInfoId(null)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-xl text-xs transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* DISPLAY MODE */
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-white text-base truncate max-w-full">{course.title}</h4>

                        {course.isPublished ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1 shrink-0">
                            <Check className="w-2.5 h-2.5" /> Published
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20 shrink-0">
                            Draft
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                        <span className="text-emerald-400 font-bold">
                          {course.rate === 0 ? '₹0 (Free)' : `₹${course.rate} / min`}
                        </span>

                        <button
                          onClick={() => handleStartEditInfo(course)}
                          className="text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-medium transition"
                          title="Edit Course Name & Rate"
                        >
                          <Edit3 className="w-3 h-3 text-indigo-400" />
                          <span>Edit Info</span>
                        </button>

                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 text-[11px]">5 Mins Free Trial</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT ACTIONS: UNPUBLISH & DELETE */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleTogglePublish(course)}
                    className={`text-[11px] px-2.5 py-1.5 rounded-xl border flex items-center gap-1 transition font-semibold ${
                      course.isPublished
                        ? 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/30'
                    }`}
                  >
                    {course.isPublished ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{course.isPublished ? 'Unpublish' : 'Publish'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteSubject(course)}
                    className="p-1.5 bg-slate-950 text-slate-500 hover:text-rose-400 border border-slate-800 rounded-xl transition"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* CURRICULUM HEADER & CONTROLS */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => toggleCourseCollapse(course.id)}
                  className="text-[11px] font-semibold text-slate-400 hover:text-white uppercase tracking-wider flex items-center gap-1.5 transition"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    {chaptersList.length} Chapters • {totalTopics} Topics
                  </span>
                  {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>

                <div className="flex items-center gap-1.5">
                  {isEditingCurriculum ? (
                    <button
                      disabled={isProcessing}
                      onClick={() => handleToggleEditCurriculum(course)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 shadow transition"
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      <span>Save Curriculum</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleEditCurriculum(course)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      <Edit3 className="w-3 h-3 text-indigo-400" />
                      <span>Edit Curriculum</span>
                    </button>
                  )}
                </div>
              </div>

              {/* CURRICULUM BODY (COMPACT SCROLLABLE CONTAINER) */}
              {!isCollapsed && (
                <div className="space-y-2.5">
                  {/* Add Chapter Form (Visible in Edit Curriculum Mode) */}
                  {isEditingCurriculum && (
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-2">
                      {activeAddChapterCourseId === course.id ? (
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="New chapter name..."
                            value={newChapterTitle}
                            onChange={(e) => setNewChapterTitle(e.target.value)}
                            className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                          />
                          <button
                            onClick={() => handleAddChapter(course.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-2.5 py-1 rounded-lg font-semibold shrink-0"
                          >
                            + Add
                          </button>
                          <button
                            onClick={() => setActiveAddChapterCourseId(null)}
                            className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded-lg shrink-0"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveAddChapterCourseId(course.id)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add New Chapter
                        </button>
                      )}
                    </div>
                  )}

                  {/* Chapters List (Scrollable inside card so page stays compact) */}
                  {chaptersList.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-center text-[11px] text-slate-500">
                      No chapters added yet. Click "Edit Curriculum" to organize topics.
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1 chapter-scrollbar">
                      {chaptersList.map((chap) => {
                        const topicsList = Array.isArray(chap.topics) ? chap.topics : [];

                        return (
                          <div
                            key={chap.id}
                            className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-xs text-indigo-300 truncate">
                                📁 {chap.name}
                              </span>

                              {isEditingCurriculum && (
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() =>
                                      setActiveAddTopicChapId(activeAddTopicChapId === chap.id ? null : chap.id)
                                    }
                                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-0.5"
                                  >
                                    <Plus className="w-3 h-3" /> Subtopic
                                  </button>
                                  <button
                                    onClick={() => handleDeleteChapter(course.id, chap.id)}
                                    className="text-slate-600 hover:text-rose-400"
                                    title="Delete Chapter"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Add Subtopic Input */}
                            {isEditingCurriculum && activeAddTopicChapId === chap.id && (
                              <div className="flex gap-1.5 p-1.5 bg-slate-900 rounded-lg border border-slate-700">
                                <input
                                  type="text"
                                  placeholder="Subtopic name..."
                                  value={newTopicTitle}
                                  onChange={(e) => setNewTopicTitle(e.target.value)}
                                  className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
                                />
                                <button
                                  onClick={() => handleAddTopic(course.id, chap.id)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2 py-0.5 rounded font-semibold shrink-0"
                                >
                                  Add
                                </button>
                              </div>
                            )}

                            {/* Subtopics List */}
                            <div className="flex flex-wrap gap-1">
                              {topicsList.length === 0 ? (
                                <span className="text-[10px] text-slate-600 italic">No subtopics added yet</span>
                              ) : (
                                topicsList.map((t, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1"
                                  >
                                    <span>{t}</span>
                                    {isEditingCurriculum && (
                                      <button
                                        onClick={() => handleDeleteTopic(course.id, chap.id, tIdx)}
                                        className="text-slate-500 hover:text-rose-400"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}