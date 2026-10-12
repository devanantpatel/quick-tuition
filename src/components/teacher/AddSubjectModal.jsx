import React, { useState } from 'react';

export default function AddSubjectModal({ isOpen, onClose, onAddSubject }) {
  const [title, setTitle] = useState('');
  const [rate, setRate] = useState(5);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddSubject({
      id: Date.now(),
      title,
      rate: Number(rate) || 0,
      freeMins: 10,
      isPublished: true,
      chapters: []
    });
    setTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
        <h3 className="text-lg font-bold text-white">Register New Subject</h3>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="text-slate-400 font-medium block mb-1">Subject Name</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Next.js & Fullstack Web"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-400 font-medium block mb-1">Rate per Minute (₹0 for Free)</label>
            <input 
              type="number" 
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">First 10 mins free trial is automatically included.</span>
          </div>

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition mt-2 shadow-lg shadow-indigo-600/20">
            Create Subject Card
          </button>
        </form>
      </div>
    </div>
  );
}