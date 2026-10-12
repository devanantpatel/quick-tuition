import React from 'react';

export default function SessionHistory({ history }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">Completed Sessions & Earnings Log</h3>
      
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5">Student</th>
                <th className="p-3.5">Subject & Topic</th>
                <th className="p-3.5">Duration</th>
                <th className="p-3.5">Earned</th>
                <th className="p-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {history.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/30">
                  <td className="p-3.5 font-semibold text-white">{s.studentName}</td>
                  <td className="p-3.5">
                    <div className="text-white">{s.subject}</div>
                    <div className="text-slate-500 text-[11px]">{s.topic}</div>
                  </td>
                  <td className="p-3.5 font-mono">{s.duration}</td>
                  <td className="p-3.5 font-bold text-emerald-400">{s.earned}</td>
                  <td className="p-3.5 text-slate-500">{s.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}