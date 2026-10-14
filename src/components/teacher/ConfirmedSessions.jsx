import React from 'react';
import { Video, Trash2, ShieldCheck, Power, RefreshCw } from 'lucide-react';

export default function ConfirmedSessions({ 
  confirmedRequests = [], 
  onLaunchRoom, 
  onCancelSession,
  onCreateRoom,
  onDestroyRoom 
}) {
  if (confirmedRequests.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
        No confirmed sessions yet. When you accept a student request, it will appear here.
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
      {confirmedRequests.map((session) => {
        const isRoomActive = session.room_status === 'active';

        return (
          <div 
            key={session.id} 
            className={`p-4 rounded-2xl bg-slate-900 border transition flex flex-col justify-between space-y-3.5 shadow-lg ${
              isRoomActive 
                ? 'border-emerald-500/60 ring-1 ring-emerald-500/30' 
                : 'border-slate-800'
            }`}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border flex items-center gap-1.5 ${
                  isRoomActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isRoomActive ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'}`} />
                  <span>{isRoomActive ? 'Room Active' : 'Ready to Create'}</span>
                </span>

                <span className="text-[10px] font-mono text-slate-500">{session.time}</span>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm">{session.subject}</h4>
                <p className="text-xs text-indigo-300 font-medium">Student: {session.studentName}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-300 space-y-0.5">
                <span className="text-slate-500 text-[10px] block">Specific Topic:</span>
                <span className="line-clamp-2">{session.topic}</span>
              </div>
            </div>

            {/* Actions: Room Lifecycle */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              {isRoomActive ? (
                <>
                  <button
                    onClick={() => onLaunchRoom(session)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/30 animate-pulse"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Enter / Rejoin Room</span>
                  </button>

                  <button
                    onClick={() => onDestroyRoom && onDestroyRoom(session.id)}
                    className="w-full bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Destroy / End Room</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onCreateRoom && onCreateRoom(session.id)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-indigo-600/30"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Create Live Room</span>
                </button>
              )}

              {!isRoomActive && (
                <button
                  onClick={() => onCancelSession(session.id)}
                  className="w-full text-center text-[10px] text-slate-500 hover:text-rose-400 py-1 flex items-center justify-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Cancel Session</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}