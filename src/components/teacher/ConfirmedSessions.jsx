import React from 'react';
import { Video, Calendar, User, BookOpen, Clock } from 'lucide-react';

export default function ConfirmedSessions({ confirmedRequests = [], onLaunchRoom }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">
            Confirmed Live Sessions
          </h3>
          <p className="text-xs text-slate-500">
            Sessions accepted and ready for 1-on-1 live classroom.
          </p>
        </div>
        <span className="text-xs text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
          {confirmedRequests.length} Scheduled
        </span>
      </div>

      {confirmedRequests.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs space-y-1">
          <p className="font-medium text-slate-400">No confirmed sessions yet.</p>
          <p>Accepted student requests will appear here with instant classroom launch access.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {confirmedRequests.map((session) => (
            <div 
              key={session.id} 
              className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-4 flex flex-col justify-between shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-xs">
                      {(session.studentName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs block">{session.studentName || 'Student'}</span>
                      <span className="text-[10px] text-emerald-400 font-medium">Session Confirmed</span>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    <span>{session.time || 'Flexible Timing'}</span>
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-white font-semibold">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{session.subject}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-[11px]">
                    <span className="text-slate-500 block text-[10px] mb-0.5">Doubt / Topic:</span>
                    <span>{session.topic || 'General Problem Discussion'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onLaunchRoom && onLaunchRoom(session)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20 animate-pulse"
              >
                <Video className="w-4 h-4" />
                <span>Launch Live Classroom</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}