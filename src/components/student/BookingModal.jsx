import React, { useState, useEffect } from 'react';
import { Clock, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchTeacherSchedules } from '../../lib/db';

export default function BookingModal({ course, isOpen, onClose, onConfirmBooking }) {
  if (!isOpen || !course) return null;

  const chaptersList = Array.isArray(course.chapters) ? course.chapters : [];
  const firstAvailableTopic = chaptersList[0]?.topics?.[0] || 'other';

  const [selectedTopic, setSelectedTopic] = useState(firstAvailableTopic);
  const [customDoubt, setCustomDoubt] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [customTime, setCustomTime] = useState('');
  
  // Real Teacher Slots from DB
  const [teacherSlots, setTeacherSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to format 24h to 12h
  const formatTimeSlot = (startTime, endTime) => {
    const to12h = (t) => {
      if (!t) return '';
      const [h, m] = t.split(':');
      const hour = parseInt(h, 10);
      const suffix = hour >= 12 ? 'PM' : 'AM';
      const formattedH = hour % 12 || 12;
      return `${formattedH}:${m} ${suffix}`;
    };
    return `${to12h(startTime)} - ${to12h(endTime)}`;
  };

  // 1. Load actual teacher schedule slots from Supabase
  useEffect(() => {
    const loadSchedule = async () => {
      if (!course.teacherId) return;
      setLoadingSlots(true);
      try {
        const slots = await fetchTeacherSchedules(course.teacherId);
        const activeSlots = (slots || [])
          .filter(s => s.is_active !== false)
          .map(s => {
            const timeLabel = formatTimeSlot(s.start_time, s.end_time);
            const daysLabel = Array.isArray(s.days) ? s.days.join(', ') : (s.day_of_week || 'Daily');
            return {
              id: s.id,
              display: `${timeLabel} (${daysLabel})`,
              rawTime: timeLabel
            };
          });

        if (activeSlots.length > 0) {
          setTeacherSlots(activeSlots);
          setSelectedSlot(activeSlots[0].display);
        } else {
          // Fallback slots if teacher hasn't set any slots yet
          const fallback = [
            '05:00 PM - 06:00 PM (Daily)',
            '06:30 PM - 07:30 PM (Daily)',
            '08:30 PM - 09:30 PM (Daily)'
          ];
          setTeacherSlots(fallback.map((f, i) => ({ id: i, display: f, rawTime: f })));
          setSelectedSlot(fallback[0]);
        }
      } catch (err) {
        console.error('Failed to load teacher schedules:', err);
      } finally {
        setLoadingSlots(false);
      }
    };

    loadSchedule();
  }, [course.teacherId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalTopic = selectedTopic === 'other' ? (customDoubt.trim() || 'Custom Problem Discussion') : selectedTopic;
    const finalTime = selectedSlot === 'custom' ? (customTime.trim() || 'Flexible Timing') : selectedSlot;

    try {
      await onConfirmBooking({
        subject: course.title,
        topic: finalTopic,
        time: finalTime
      });
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
          ✕
        </button>

        <div>
          <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-wider">
            Booking Request
          </span>
          <h3 className="text-lg font-bold text-white mt-1">{course.title}</h3>
          <p className="text-xs text-slate-400">
            {course.rate === 0 ? 'Free session' : `₹${course.rate} / min`} • First {course.freeMins || 10} minutes free trial included
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Select Topic or Custom Doubt */}
          <div className="space-y-2">
            <label className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 block">
              1. Select Topic or Specific Doubt
            </label>

            <select 
              value={selectedTopic} 
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {chaptersList.map((chap) => (
                <optgroup key={chap.id} label={`Chapter: ${chap.name}`}>
                  {(chap.topics || []).map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                </optgroup>
              ))}
              <option value="other">✨ Other (Type your custom problem/doubt)</option>
            </select>

            {selectedTopic === 'other' && (
              <textarea 
                rows="2"
                required
                placeholder="Briefly describe what you need help with (e.g. Solving Question 4 on Integration)..."
                value={customDoubt}
                onChange={(e) => setCustomDoubt(e.target.value)}
                className="w-full bg-slate-950 border border-indigo-500/40 rounded-xl p-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>

          {/* 2. Select Live Schedule Slot */}
          <div className="space-y-2">
            <label className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 block">
              2. Available Educator Slots
            </label>

            {loadingSlots ? (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Checking educator availability...</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {teacherSlots.map((slot) => (
                  <button
                    type="button"
                    key={slot.id}
                    onClick={() => { setSelectedSlot(slot.display); setCustomTime(''); }}
                    className={`w-full p-2.5 rounded-xl border text-left font-mono transition text-xs flex items-center justify-between ${
                      selectedSlot === slot.display 
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{slot.display}</span>
                    </span>
                    {selectedSlot === slot.display && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            )}

            <input 
              type="text" 
              placeholder="Or suggest custom timing (e.g. Today at 09:30 PM)" 
              value={customTime}
              onChange={(e) => { setCustomTime(e.target.value); setSelectedSlot('custom'); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* 10-Minute Free Guarantee */}
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
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-indigo-600/25 mt-1 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Request...</span>
              </>
            ) : (
              <span>Confirm & Send Request to Tutor</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}