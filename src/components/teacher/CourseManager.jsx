import React, { useState } from 'react';
import { 
  Plus, Trash2, Edit3, Eye, EyeOff, Check, 
  PlusCircle, BookOpen, Loader2, X 
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

  // Loading state per card
  const [processingId, setProcessingId] = useState(null);

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
        // Agar pehli baar create/publish ho raha hai
        const created = await createSubject({
          teacher_id: teacherId,
          title: newTitle,
          rate: newRate,
          free_mins: course.freeMins || 10,
          is_published: true,
          chapters: course.chapters || []
        });

        setCourses(courses.map(c => c.id === course.id ? {
          ...created,
          freeMins: created.free_mins,
          isPublished: true,
          isDemo: false
        } : c));
      } else {
        // Existing DB row update (auto publish / keep published)
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
    // Agar user currently curriculum edit mode me tha aur ab "Update Curriculum" click kiya
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
      // Enter Curriculum Edit Mode
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
    <div className="space-y-5">
      {/* Tab Header with Add Course */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
        <div>
          <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">
            Your Offerings
          </h3>
          <p className="text-xs text-slate-500">
            Edit course details & curriculum separately, then update to keep published.
          </p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow transition"
        >
          <PlusCircle className="w-4 h-4" /> Add New Course
        </button>
      </div>

      <div className="space-y-4">
        {courses.map((course) => {
          const isEditingInfo = editingInfoId === course.id;
          const isEditingCurriculum = editingCurriculumId === course.id;
          const isProcessing = processingId === course.id;
          const chaptersList = Array.isArray(course.chapters) ? course.chapters : [];

          return (
            <div
              key={course.id}
              className={`p-5 rounded-2xl bg-slate-900 border transition space-y-4 ${
                course.isPublished 
                  ? 'border-emerald-500/30' 
                  : 'border-slate-800 bg-slate-900/90'
              }`}
            >
              {/* TOP HEADER: COURSE NAME & RATE */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex-1 space-y-1.5">
                  {isEditingInfo ? (
                    /* INLINE EDIT MODE (NAME & RATE) */
                    <div className="space-y-2 max-w-lg">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                          Course Title
                        </span>
                        <input
                          type="text"
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          className="w-full bg-slate-950 border border-indigo-500 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-950 border border-indigo-500 rounded-xl px-2.5 py-1 text-xs">
                          <span className="text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={tempRate}
                            onChange={(e) => setTempRate(e.target.value)}
                            className="w-16 bg-transparent text-white font-mono focus:outline-none"
                          />
                          <span className="text-slate-500 text-[11px]">/ min</span>
                        </div>

                        {/* BUTTON CONVERTS TO "UPDATE" */}
                        <button
                          disabled={isProcessing}
                          onClick={() => handleUpdateCourseInfo(course)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow shadow-emerald-600/20"
                        >
                          {isProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Update</span>
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
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-white text-base md:text-lg">{course.title}</h4>

                        {/* PUBLISHED / DRAFT STATUS SIDE PE */}
                        {course.isPublished ? (
                          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Published
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">
                            Draft (Unpublished)
                          </span>
                        )}

                        {course.isDemo && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                            Demo Example
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs">
                        <span className="text-emerald-400 font-bold text-sm">
                          {course.rate === 0 ? '₹0 (Free Session)' : `₹${course.rate} / min`}
                        </span>

                        {/* EDIT 1 BUTTON: COURSE NAME & RATE */}
                        <button
                          onClick={() => handleStartEditInfo(course)}
                          className="text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-medium transition"
                          title="Edit Course Name & Rate"
                        >
                          <Edit3 className="w-3 h-3 text-indigo-400" />
                          <span>Edit Info</span>
                        </button>

                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 text-[11px]">
                          {course.freeMins || 10} Mins Free Trial
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT ACTIONS: UNPUBLISH & DELETE */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => handleTogglePublish(course)}
                    className={`text-xs px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition font-semibold ${
                      course.isPublished
                        ? 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/30'
                    }`}
                  >
                    {course.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{course.isPublished ? 'Unpublish' : 'Publish'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteSubject(course)}
                    className="p-1.5 bg-slate-950 text-slate-500 hover:text-rose-400 border border-slate-800 rounded-xl transition"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* CURRICULUM SECTION (CHAPTERS & SUBTOPICS) */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Curriculum & Topics ({chaptersList.length})</span>
                  </span>

                  {/* EDIT 2 BUTTON: CURRICULUM TOGGLE / UPDATE */}
                  <div className="flex items-center gap-2">
                    {isEditingCurriculum ? (
                      <button
                        disabled={isProcessing}
                        onClick={() => handleToggleEditCurriculum(course)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Update Curriculum</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleEditCurriculum(course)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Edit3 className="w-3 h-3 text-indigo-400" />
                        <span>Edit Curriculum</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Add Chapter Form (Visible in Edit Curriculum Mode) */}
                {isEditingCurriculum && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-2">
                    <div className="text-[11px] font-semibold text-indigo-300">
                      Curriculum Edit Mode: Add or delete chapters and subtopics
                    </div>
                    {activeAddChapterCourseId === course.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Chapter name..."
                          value={newChapterTitle}
                          onChange={(e) => setNewChapterTitle(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                        />
                        <button
                          onClick={() => handleAddChapter(course.id)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1 rounded-lg font-semibold"
                        >
                          + Add
                        </button>
                        <button
                          onClick={() => setActiveAddChapterCourseId(null)}
                          className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded-lg"
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

                {/* Chapters List */}
                <div className="space-y-2">
                  {chaptersList.map((chap) => {
                    const topicsList = Array.isArray(chap.topics) ? chap.topics : [];

                    return (
                      <div
                        key={chap.id}
                        className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-indigo-300">
                            📁 {chap.name}
                          </span>

                          {isEditingCurriculum && (
                            <div className="flex items-center gap-2">
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
                          <div className="flex gap-2 p-2 bg-slate-900 rounded-lg border border-slate-700">
                            <input
                              type="text"
                              placeholder="Subtopic name..."
                              value={newTopicTitle}
                              onChange={(e) => setNewTopicTitle(e.target.value)}
                              className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
                            />
                            <button
                              onClick={() => handleAddTopic(course.id, chap.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1 rounded font-semibold"
                            >
                              Add
                            </button>
                          </div>
                        )}

                        {/* Subtopics List */}
                        <div className="flex flex-wrap gap-1.5">
                          {topicsList.length === 0 ? (
                            <span className="text-[10px] text-slate-600 italic">No subtopics added yet</span>
                          ) : (
                            topicsList.map((t, tIdx) => (
                              <span
                                key={tIdx}
                                className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] pl-2.5 pr-1.5 py-1 rounded-lg flex items-center gap-1.5"
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}