import React, { useState } from 'react';
import { X, Plus, Trash2, BookPlus, Loader2 } from 'lucide-react';

export default function AddSubjectModal({ isOpen, onClose, onAddSubject }) {
  const [title, setTitle] = useState('');
  const [rate, setRate] = useState(5);
  const [freeMins, setFreeMins] = useState(10);
  const [chapters, setChapters] = useState([
    { id: 1, name: 'Introduction & Basics', topics: ['Overview', 'Key Concepts'] }
  ]);
  const [chapterInput, setChapterInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddChapter = () => {
    if (!chapterInput.trim()) return;
    setChapters([
      ...chapters,
      { id: Date.now(), name: chapterInput.trim(), topics: [] }
    ]);
    setChapterInput('');
  };

  const handleDeleteChapter = (id) => {
    setChapters(chapters.filter(ch => ch.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddSubject({
        title: title.trim(),
        rate: Number(rate) || 0,
        freeMins: Number(freeMins) || 10,
        chapters: chapters
      });

      // Reset
      setTitle('');
      setRate(5);
      setFreeMins(10);
      setChapters([{ id: 1, name: 'Introduction & Basics', topics: ['Overview', 'Key Concepts'] }]);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-500 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BookPlus className="w-5 h-5 text-indigo-400" />
            <span>Add New Subject Offering</span>
          </h3>
          <p className="text-xs text-slate-400">
            Publish a new subject with curriculum topics for students to book.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Subject Title */}
          <div>
            <label className="text-slate-400 font-medium block mb-1">Subject Title *</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Physics (Mechanics & Thermodynamics)" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Pricing & Free Trial */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Rate per minute (₹)</label>
              <input 
                type="number" 
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Free Trial (Minutes)</label>
              <input 
                type="number" 
                min="0"
                value={freeMins}
                onChange={(e) => setFreeMins(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Initial Chapters Builder */}
          <div className="space-y-2">
            <label className="text-slate-400 font-medium block">Curriculum Chapters ({chapters.length})</label>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Chapter name (e.g. Newton's Laws)..." 
                value={chapterInput}
                onChange={(e) => setChapterInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <button 
                type="button" 
                onClick={handleAddChapter}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {chapters.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px]">
                  <span className="text-indigo-300 font-medium truncate">📁 {ch.name}</span>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteChapter(ch.id)}
                    className="text-slate-500 hover:text-rose-400 ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creating & Publishing...</span>
              </>
            ) : (
              <span>Create & Publish Offering</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}