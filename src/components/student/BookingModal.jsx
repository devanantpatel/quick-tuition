import React, { useState } from 'react';
import { Clock, Sparkles } from 'lucide-react';

export default function BookingModal({ course, isOpen, onClose, onConfirmBooking }) {
  if (!isOpen || !course) return null;

  const [selectedTopic, setSelectedTopic] = useState(
    course.chapters[0]?.topics[0] || 'other'
  );
  const [customDoubt, setCustomDoubt] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('06:00 PM - 07:00 PM');
  const [customTime, setCustomTime] = useState('');

  const defaultSlots = [
    '05:00 PM - 06:00 PM',
    '06:30 PM - 07:30 PM',
    '08:30 PM - 09:30 PM'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalTopic = selectedTopic === 'other' ? (customDoubt || 'Custom Problem Discussion') : selectedTopic;
    const finalTime = selectedSlot === 'custom' ? (customTime || 'Custom Proposed Time') : selectedSlot;

    onConfirmBooking({
      subject: course.title,
      topic: finalTopic,
      time: finalTime
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>

        <div>
          <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-wider">
            Booking Request
          </span>
          <h3 className="text-lg font-bold text-white mt-1">{course.title}</h3>
          <p className="text-xs text-slate-400">
            {course.rate === 0 ? 'Free session' : `₹${course.rate} / min`} • First 10 minutes free trial included
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Select Topic or Custom */}
          <div className="space-y-2">
            <label className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 block">
              1. Select Topic or Specific Doubt
            </label>

            <select 
              value={selectedTopic} 
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {course.chapters.map((chap) => (
                <optgroup key={chap.id} label={`Chapter: ${chap.name}`}>
                  {chap.topics.map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                </optgroup>
              ))}
              <option value="other">✨ Other (Type your custom problem/doubt)</option>
            </select>

            {/* If Other is selected */}
            {selectedTopic === 'other' && (
              <textarea 
                rows="2"
                required
                placeholder="Briefly describe what you need help with (e.g. Solving question 4 on double integration)..."
                value={customDoubt}
                onChange={(e) => setCustomDoubt(e.target.value)}
                className="w-full bg-slate-950 border border-indigo-500/40 rounded-xl p-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>

          {/* 2. Select Time Slot */}
          <div className="space-y-2">
            <label className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 block">
              2. Select Timing
            </label>

            <div className="grid grid-cols-2 gap-2">
              {defaultSlots.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  onClick={() => { setSelectedSlot(slot); setCustomTime(''); }}
                  className={`p-2.5 rounded-xl border text-left font-mono transition ${
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
              placeholder="Or suggest custom timing (e.g. Today 10:00 PM)" 
              value={customTime}
              onChange={(e) => { setCustomTime(e.target.value); setSelectedSlot('custom'); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Trial Notice */}
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-emerald-400 text-[11px] space-y-0.5">
            <div className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> 10-Minute Free Guarantee
            </div>
            <p className="text-slate-400 text-[10px]">
              No deduction until minute 10 ends. If your doubt is cleared within 10 mins, you pay ₹0.
            </p>
          </div>

          <button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-indigo-600/25 mt-1"
          >
            Confirm & Send Request to Tutor
          </button>
        </form>
      </div>
    </div>
  );
}