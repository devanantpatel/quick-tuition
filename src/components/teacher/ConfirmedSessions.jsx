import React from 'react';
import { Video } from 'lucide-react';

export default function ConfirmedSessions({ confirmedRequests, onLaunchRoom }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">Confirmed Live Sessions</h3>
        <span className="text-xs text-emerald-400 font-semibold">{confirmedRequests.length} Scheduled</span>
      </div>

      {confirmedRequests.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-xs">
          No confirmed sessions yet. Once you accept student requests, they appear here.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {confirmedRequests.map((req) => (
            <div key={req.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">{req.subject}</span>
                  <h4 className="font-bold text-white text-base mt-0.5">{req.studentName}</h4>
                </div>
                <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Ready to Start
                </span>
              </div>

              <div className="text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Topic:</span>
                <span className="text-slate-200 font-medium">{req.topic}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Scheduled: {req.time}</span>
              </div>

              <button 
                onClick={onLaunchRoom}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
              >
                <Video className="w-4 h-4" /> Start Live Classroom (Board + Code)
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}