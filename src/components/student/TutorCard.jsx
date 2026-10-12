import React from 'react';
import { ChevronRight, Star, UserCheck } from 'lucide-react';

export default function TutorCard({ course, onSelectCourse }) {
  const totalTopics = course.chapters.reduce((acc, chap) => acc + chap.topics.length, 0);
  const tutorInitial = course.tutorName ? course.tutorName.charAt(0).toUpperCase() : 'T';

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-4 flex flex-col justify-between shadow-lg group">
      <div className="space-y-3.5">
        
        {/* 1. Mini Teacher Identity Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            {/* Avatar with Online indicator */}
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-sm">
                {tutorInitial}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                course.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
              }`} />
            </div>

            {/* Name & Bio */}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white text-xs leading-none">
                  {course.tutorName || 'Verified Tutor'}
                </span>
                <UserCheck className="w-3 h-3 text-indigo-400" />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {course.tutorExp || 'Math & Code Mentor'}
              </span>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-[10px] font-bold text-amber-400">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{course.tutorRating || '4.9'}</span>
          </div>
        </div>

        {/* 2. Course Details & Badges */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-start gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              10 Mins Free Trial
            </span>
            <span className={`text-xs font-bold font-mono ${course.rate === 0 ? 'text-emerald-400' : 'text-indigo-400'}`}>
              {course.rate === 0 ? 'Free (₹0/m)' : `₹${course.rate} / min`}
            </span>
          </div>

          <h4 className="font-bold text-white text-base leading-snug group-hover:text-indigo-300 transition">
            {course.title}
          </h4>

          <span className="text-[11px] text-slate-500 block">
            {course.chapters.length} Chapters • {totalTopics} Topics Covered
          </span>
        </div>

        {/* 3. Chapters Preview */}
        <div className="space-y-1.5 pt-0.5">
          {course.chapters.slice(0, 2).map((chap) => (
            <div key={chap.id} className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px]">
              <span className="text-indigo-300 font-medium block">📁 {chap.name}</span>
              <span className="text-slate-500 text-[10px] truncate block">
                {chap.topics.join(' • ') || 'General doubt clearing'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Action Button */}
      <button 
        onClick={() => onSelectCourse(course)}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-indigo-600/20 mt-3"
      >
        <span>Request 1-on-1 Session</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}