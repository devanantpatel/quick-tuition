import React from 'react';
import { History, Calendar, CheckCircle2, IndianRupee } from 'lucide-react';

export default function SessionHistory({ history = [] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">
            Completed Sessions Log
          </h3>
          <p className="text-xs text-slate-500">
            Records of finished 1-on-1 sessions and revenue generated.
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {history.length} Sessions Logged
        </span>
      </div>

      {history.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs space-y-1">
          <History className="w-7 h-7 text-slate-600 mx-auto mb-2" />
          <p className="font-medium text-slate-400">No session history yet.</p>
          <p>Completed tutoring sessions with invoice summaries will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {history.map((item) => (
            <div 
              key={item.id} 
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{item.subject}</span>
                  <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    with {item.studentName}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">{item.topic}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <Calendar className="w-3 h-3" />
                  <span>{item.date}</span>
                  <span>•</span>
                  <span>Duration: {item.duration}</span>
                </div>
              </div>

              <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                <span className="text-[10px] text-slate-500 block">Earnings:</span>
                <span className="font-bold text-emerald-400 text-sm font-mono flex items-center">
                  {item.earned}
                </span>
                <span className="text-[10px] text-emerald-500/80 flex items-center gap-0.5 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Completed
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}