import React, { useState } from 'react';
import { Clock, Trash2, Edit3, Check, Loader2, X } from 'lucide-react';
import { updateTeacherScheduleSlot } from '../../lib/db';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ScheduleManager({ 
  timeSlots = [], 
  setTimeSlots,
  onAddSlot,
  onDeleteSlot,
  onToggleSlot
}) {
  // New Slot Creation State
  const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Slot Inline Edit State
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editDays, setEditDays] = useState([]);
  const [editStart, setEditStart] = useState('18:00');
  const [editEnd, setEditEnd] = useState('19:00');
  const [isUpdating, setIsUpdating] = useState(false);

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

  // --- Start Inline Edit ---
  const handleStartEditSlot = (slot) => {
    setEditingSlotId(slot.id);
    setEditDays(Array.isArray(slot.days) ? [...slot.days] : ['Mon']);
    setEditStart(slot.startTime || '18:00');
    setEditEnd(slot.endTime || '19:00');
  };

  const toggleEditDay = (day) => {
    if (editDays.includes(day)) {
      if (editDays.length === 1) return;
      setEditDays(editDays.filter(d => d !== day));
    } else {
      setEditDays([...editDays, day]);
    }
  };

  // --- Save / Update Slot ---
  const handleUpdateSlot = async (slot) => {
    if (editDays.length === 0 || !editStart || !editEnd || isUpdating) return;

    if (editStart >= editEnd) {
      alert('End time start time se baad ka hona chahiye!');
      return;
    }

    // Collision check against other slots (excluding current one)
    const hasCollision = timeSlots.some((existing) => {
      if (existing.id === slot.id) return false;
      const existingDays = Array.isArray(existing.days) ? existing.days : [];
      const daysOverlap = editDays.some(d => existingDays.includes(d));

      if (daysOverlap) {
        return (editStart < existing.endTime) && (editEnd > existing.startTime);
      }
      return false;
    });

    if (hasCollision) {
      alert('⚠️ Slot Collision! Is din aur time par dusra slot already set hai.');
      return;
    }

    setIsUpdating(true);
    const isDemo = String(slot.id).startsWith('slot-demo-');

    try {
      if (!isDemo) {
        await updateTeacherScheduleSlot(slot.id, {
          days: editDays,
          startTime: editStart,
          endTime: editEnd,
          isActive: slot.isActive
        });
      }

      setTimeSlots(timeSlots.map(s => s.id === slot.id ? {
        ...s,
        days: editDays,
        startTime: editStart,
        endTime: editEnd
      } : s));

      setEditingSlotId(null);
    } catch (err) {
      console.error('Update slot error:', err);
      alert('Failed to update slot: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Create Slot ---
  const handleAddTimeSlot = async (e) => {
    e.preventDefault();
    if (selectedDays.length === 0 || !startTime || !endTime || isSubmitting) return;
    
    if (startTime >= endTime) {
      alert('End time start time se baad ka hona chahiye!');
      return;
    }

    const hasCollision = timeSlots.some((existingSlot) => {
      const existingDays = Array.isArray(existingSlot.days) ? existingSlot.days : [];
      const daysOverlap = selectedDays.some((d) => existingDays.includes(d));

      if (daysOverlap) {
        return (startTime < existingSlot.endTime) && (endTime > existingSlot.startTime);
      }
      return false;
    });

    if (hasCollision) {
      alert('⚠️ Slot Collision! Duplicate ya overlapping slot nahi ban sakta.');
      return;
    }

    setIsSubmitting(true);
    try {
      const slotPayload = {
        days: [...selectedDays],
        startTime,
        endTime,
        isActive: true
      };

      if (onAddSlot) {
        await onAddSlot(slotPayload);
      } else {
        setTimeSlots([...timeSlots, { id: Date.now(), ...slotPayload }]);
      }
    } catch (err) {
      console.error('Failed to create time slot:', err);
      alert('Slot save failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete Slot ---
  const handleDeleteTimeSlot = async (id) => {
    if (!confirm('Delete this scheduled slot?')) return;
    try {
      if (onDeleteSlot) {
        await onDeleteSlot(id);
      } else {
        setTimeSlots(timeSlots.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete slot:', err);
      alert('Delete failed: ' + err.message);
    }
  };

  // --- Toggle Slot Active ---
  const toggleSlotActive = async (id) => {
    const slot = timeSlots.find(s => s.id === id);
    if (!slot) return;
    const nextStatus = !slot.isActive;

    try {
      if (onToggleSlot) {
        await onToggleSlot(id, nextStatus);
      } else {
        setTimeSlots(timeSlots.map(s => s.id === id ? { ...s, isActive: nextStatus } : s));
      }
    } catch (err) {
      console.error('Failed to toggle slot:', err);
      alert('Failed to update status: ' + err.message);
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6 items-start">
      {/* Left Column: Add Available Slot Form */}
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

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Slot...</span>
              </>
            ) : (
              <span>+ Save Time Slot</span>
            )}
          </button>
        </form>
      </div>

      {/* Right Column: Scheduled Slots List */}
      <div className="md:col-span-2 space-y-3">
        <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">
          Your Scheduled Slots ({timeSlots.length})
        </h3>

        {timeSlots.map((slot) => {
          const isEditing = editingSlotId === slot.id;
          const daysList = Array.isArray(slot.days) ? slot.days : [];

          return (
            <div 
              key={slot.id} 
              className={`p-4 rounded-2xl bg-slate-900 border transition space-y-3 ${
                slot.isActive ? 'border-slate-800' : 'border-slate-800/50 opacity-60'
              }`}
            >
              {isEditing ? (
                /* INLINE EDIT MODE FOR SLOT */
                <div className="space-y-3 bg-slate-950 p-3.5 rounded-xl border border-indigo-500/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-300">Edit Time Slot</span>
                    <button 
                      onClick={() => setEditingSlotId(null)}
                      className="text-slate-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day Buttons */}
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS_OF_WEEK.map((d) => {
                      const sel = editDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleEditDay(d)}
                          className={`py-1 rounded text-center font-bold text-[10px] transition ${
                            sel 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>

                  {/* Time Inputs */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">Start Time</span>
                      <input 
                        type="time"
                        value={editStart}
                        onChange={(e) => setEditStart(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">End Time</span>
                      <input 
                        type="time"
                        value={editEnd}
                        onChange={(e) => setEditEnd(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Update Button */}
                  <div className="flex gap-2 pt-1">
                    <button
                      disabled={isUpdating}
                      onClick={() => handleUpdateSlot(slot)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
                    >
                      {isUpdating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Update Slot</span>
                    </button>
                    <button
                      onClick={() => setEditingSlotId(null)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* DISPLAY MODE */
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      <span>{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {daysList.map((d) => (
                        <span key={d} className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-medium">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* EDIT SLOT BUTTON */}
                    <button
                      onClick={() => handleStartEditSlot(slot)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 bg-slate-950 hover:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-800 text-xs font-medium transition"
                      title="Edit Slot Hours & Days"
                    >
                      <Edit3 className="w-3 h-3 text-indigo-400" />
                      <span>Edit</span>
                    </button>

                    <button 
                      onClick={() => toggleSlotActive(slot.id)}
                      className={`text-xs px-3 py-1 rounded-xl border font-semibold transition ${
                        slot.isActive 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {slot.isActive ? 'Active' : 'Paused'}
                    </button>

                    <button 
                      onClick={() => handleDeleteTimeSlot(slot.id)} 
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                      title="Delete Slot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}