import React from 'react';
import { History } from 'lucide-react';

export default function SessionHistory({ history = [] }) {
  if (history.length === 0) {
    return (
      <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
        <History className="w-8 h-8 text-slate-600 mx-auto" />
        <h4 className="text-white font-semibold text-sm">No Teaching History Yet</h4>
        <p className="text-slate-400 text-xs">Completed student sessions and invoice records will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item) => (
        <div 
          key={item.id} 
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div>
            <div className="font-bold text-white text-sm">{item.studentName}</div>
            <div className="text-slate-400">{item.subject} • {item.topic}</div>
            <div className="text-slate-500 text-[11px] mt-0.5">{item.date}</div>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-center">
            <span className="text-emerald-400 font-bold text-sm">{item.earned}</span>
            <span className="text-slate-500 text-[11px]">{item.duration}</span>
          </div>
        </div>
      ))}
    </div>
  );
}