import React, { useState } from 'react';
import { Clock, Trash2 } from 'lucide-react';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ScheduleManager({ timeSlots, setTimeSlots }) {
  const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 || 12;
    return `${formattedH}:${minutes} ${suffix}`;
  };

  const toggleDaySelection = (day) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return;
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const selectPresetDays = (preset) => {
    if (preset === 'all') setSelectedDays([...DAYS_OF_WEEK]);
    if (preset === 'weekdays') setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    if (preset === 'weekends') setSelectedDays(['Sat', 'Sun']);
  };

  const handleAddTimeSlot = (e) => {
    e.preventDefault();
    if (selectedDays.length === 0 || !startTime || !endTime) return;
    
    // 1. Basic Timing Check
    if (startTime >= endTime) {
      alert('End time start time se baad ka hona chahiye!');
      return;
    }

    // 2. Duplicate & Overlap Detection
    const hasCollision = timeSlots.some((existingSlot) => {
      // Check if any selected day matches with existing slot days
      const daysOverlap = selectedDays.some((d) => existingSlot.days.includes(d));

      if (daysOverlap) {
        // Overlap formula: (NewStart < ExistEnd) AND (NewEnd > ExistStart)
        const isTimeOverlapping = (startTime < existingSlot.endTime) && (endTime > existingSlot.startTime);
        return isTimeOverlapping;
      }
      return false;
    });

    if (hasCollision) {
      alert('⚠️ Slot Collision! Is din aur time window me pehle se ek slot maujood hai. Duplicate ya overlapping slot nahi ban sakta.');
      return;
    }

    // 3. Agar koi duplicate ya clash nahi hai, tabhi save karein
    setTimeSlots([...timeSlots, {
      id: Date.now(),
      days: [...selectedDays],
      startTime,
      endTime,
      isActive: true
    }]);
  };
  const handleDeleteTimeSlot = (id) => {
    setTimeSlots(timeSlots.filter(s => s.id !== id));
  };

  const toggleSlotActive = (id) => {
    setTimeSlots(timeSlots.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  return (
    <div className="grid md:grid-cols-3 gap-6 items-start">
      {/* Form */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <h3 className="font-bold text-white text-base">Add Available Slot</h3>
          <p className="text-slate-400 text-xs">Configure days and exact session hours.</p>
        </div>

        <form onSubmit={handleAddTimeSlot} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-400">
              <label className="font-semibold uppercase tracking-wider text-[11px]">Select Days</label>
              <div className="flex gap-1.5 text-[10px]">
                <button type="button" onClick={() => selectPresetDays('all')} className="text-indigo-400 hover:underline">All</button>
                <span>•</span>
                <button type="button" onClick={() => selectPresetDays('weekdays')} className="text-indigo-400 hover:underline">Mon-Fri</button>
                <span>•</span>
                <button type="button" onClick={() => selectPresetDays('weekends')} className="text-indigo-400 hover:underline">Sat-Sun</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDaySelection(day)}
                    className={`py-2 rounded-lg text-center font-bold text-[11px] transition ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30' 
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">Available Time Window</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500">Start Time</span>
                <input 
                  type="time" 
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500">End Time</span>
                <input 
                  type="time" 
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1 text-[11px]">
            <span className="text-slate-500 block">Slot Preview:</span>
            <span className="font-bold text-emerald-400">
              {formatTime(startTime)} – {formatTime(endTime)}
            </span>
            <span className="text-slate-400 block text-[10px]">
              ({selectedDays.join(', ')})
            </span>
          </div>

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-indigo-600/20">
            + Save Time Slot
          </button>
        </form>
      </div>

      {/* Slots List */}
      <div className="md:col-span-2 space-y-3">
        <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">
          Your Scheduled Slots ({timeSlots.length})
        </h3>

        {timeSlots.map((slot) => (
          <div 
            key={slot.id} 
            className={`p-4 rounded-2xl bg-slate-900 border transition flex items-center justify-between ${
              slot.isActive ? 'border-slate-800' : 'border-slate-800/50 opacity-60'
            }`}
          >
            <div className="space-y-1.5">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {slot.days.map((d) => (
                  <span key={d} className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-medium">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => toggleSlotActive(slot.id)}
                className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition ${
                  slot.isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {slot.isActive ? 'Active' : 'Paused'}
              </button>
              <button onClick={() => handleDeleteTimeSlot(slot.id)} className="p-1.5 text-slate-500 hover:text-rose-400 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}