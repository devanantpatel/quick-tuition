import React from 'react';
import { Video, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function StudentRequests({ requests, onJoinLiveRoom }) {
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
          {requests.map((r) => (
            <div key={r.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white text-xs">{r.subject}</h4>
                  <span className="text-[11px] text-slate-500 font-mono">Slot: {r.time}</span>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                  r.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  r.status === 'declined' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {r.status}
                </span>
              </div>

              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] mb-0.5">Doubt / Topic:</span>
                {r.topic}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}