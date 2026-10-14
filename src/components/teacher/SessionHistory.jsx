import React from 'react';
import { History, Eye, Download, FileText } from 'lucide-react';

export default function SessionHistory({ history = [] }) {
  if (history.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
        No completed teaching sessions recorded yet. Completed sessions and study notes will appear here.
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
      {history.map((item) => (
        <div key={item.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white text-sm truncate">{item.subject}</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {item.earned}
              </span>
            </div>

            <p className="text-xs text-indigo-300 font-medium">Student: {item.studentName}</p>
            <p className="text-[11px] text-slate-400 line-clamp-2">{item.topic}</p>

            <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-800 font-mono">
              <span>Duration: {item.duration}</span>
              <span>{item.date}</span>
            </div>
          </div>

          {/* Notes View & Download */}
          <div className="pt-2 border-t border-slate-800">
            {item.whiteboardNotes ? (
              <button
                onClick={() => {
                  const imageWindow = window.open('');
                  imageWindow.document.write(`
                    <html>
                      <head><title>Notes - ${item.subject}</title></head>
                      <body style="margin:0; background:#020617; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif;">
                        <h3 style="color:#fff; margin-bottom:12px;">Session Notes: ${item.subject} (${item.date})</h3>
                        <img src="${item.whiteboardNotes}" style="max-width:90%; max-height:75vh; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.5); border:1px solid #1e293b; background:#020617;" />
                        <br/>
                        <a href="${item.whiteboardNotes}" download="notes-${item.id}.jpg" style="background:#4f46e5; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:13px;">Download Notes JPG</a>
                      </body>
                    </html>
                  `);
                }}
                className="w-full bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold py-1.5 rounded-xl border border-indigo-500/30 flex items-center justify-center gap-1.5 transition shadow"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View & Download Notes</span>
              </button>
            ) : (
              <div className="text-[10px] text-slate-500 text-center italic py-1">
                No whiteboard notes saved
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}