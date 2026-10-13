import React from 'react';
import { Video, Clock, CheckCircle, AlertCircle, X } from 'lucide-react';

export default function StudentRequests({ requests = [], onJoinLiveRoom, onCancelRequest }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">My Active Requests</h3>
        <span className="text-xs text-indigo-400 font-mono font-semibold">{requests.length} Total</span>
      </div>

      {requests.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
          No session requests yet. Find a tutor on the left and request your first session!
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const subjectTitle = r.subject || r.subject_title || 'General Doubt Clearing';
            const slotTiming = r.time || r.start_time || 'Flexible Timing';

            return (
              <div key={r.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md relative">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-bold text-white text-xs">{subjectTitle}</h4>
                    <span className="text-[11px] text-slate-500 font-mono">Slot: {slotTiming}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                      r.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      r.status === 'declined' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {r.status}
                    </span>

                    {onCancelRequest && (r.status === 'pending' || r.status === 'declined') && (
                      <button 
                        onClick={() => onCancelRequest(r.id)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition"
                        title="Dismiss Request"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] mb-0.5">Doubt / Topic:</span>
                  {r.topic || 'General Problem Discussion'}
                </p>

                {r.status === 'accepted' && (
                  <button 
                    onClick={onJoinLiveRoom}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/20 animate-pulse"
                  >
                    <Video className="w-3.5 h-3.5" /> Join Live Classroom (Tutor Ready)
                  </button>
                )}

                {r.status === 'pending' && (
                  <div className="text-[11px] text-amber-400/90 flex items-center gap-1.5 pt-0.5">
                    <Clock className="w-3.5 h-3.5" /> Waiting for tutor confirmation...
                  </div>
                )}

                {r.status === 'declined' && (
                  <div className="text-[11px] text-rose-400/90 flex items-center gap-1.5 pt-0.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Educator unavailable for this slot. Please try another tutor.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}