import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Send, QrCode, MessageSquare } from 'lucide-react';

export default function SideDock({ tutorName = 'Anant Patel' }) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [messages, setMessages] = useState([
    { sender: 'Tutor', text: 'Namaste! Kaunse topic me doubt hai?' }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages([...messages, { sender: 'You', text: inputMsg }]);
    setInputMsg('');
  };

  return (
    <aside className="w-full lg:w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full">
      {/* Video Thumbnails */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Tutor Video Box */}
          <div className="aspect-video bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-sm">
              {tutorName.charAt(0)}
            </div>
            <span className="absolute bottom-1.5 left-1.5 text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-white font-medium">
              {tutorName} (Tutor)
            </span>
          </div>

          {/* Student Video Box */}
          <div className="aspect-video bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center text-sm">
              Y
            </div>
            <span className="absolute bottom-1.5 left-1.5 text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-white font-medium">
              You (Student)
            </span>
          </div>
        </div>

        {/* Media Controls & Direct Pay Button */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          <div className="flex gap-1.5">
            <button
              onClick={() => setMicOn(!micOn)}
              className={`p-2 rounded-xl text-xs transition ${
                micOn ? 'bg-slate-800 text-white' : 'bg-rose-600/20 text-rose-400'
              }`}
            >
              {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setCamOn(!camOn)}
              className={`p-2 rounded-xl text-xs transition ${
                camOn ? 'bg-slate-800 text-white' : 'bg-rose-600/20 text-rose-400'
              }`}
            >
              {camOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={() => setShowQrModal(true)}
            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-semibold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Pay UPI</span>
          </button>
        </div>
      </div>

      {/* Live Text Chat */}
      <div className="flex-1 flex flex-col p-3 overflow-hidden text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-2">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
          <span>Live Session Chat</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-xl max-w-[85%] ${
                m.sender === 'You'
                  ? 'bg-indigo-600/30 text-indigo-100 ml-auto border border-indigo-500/30'
                  : 'bg-slate-950 text-slate-300 border border-slate-800'
              }`}
            >
              <span className="text-[10px] text-slate-400 block font-bold">{m.sender}</span>
              <span>{m.text}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="flex gap-1.5 pt-2 border-t border-slate-800/80">
          <input
            type="text"
            placeholder="Type message..."
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* UPI QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-xs w-full text-center space-y-4 relative shadow-2xl">
            <button onClick={() => setShowQrModal(false)} className="absolute top-3 right-3 text-slate-500 hover:text-white">✕</button>
            <h4 className="font-bold text-white text-base">Direct UPI Payment</h4>
            <div className="w-44 h-44 mx-auto bg-white p-2 rounded-xl flex items-center justify-center shadow">
              {/* Fallback QR representation */}
              <div className="border-4 border-slate-900 w-full h-full flex flex-col items-center justify-center font-mono text-slate-900 text-xs font-bold">
                <QrCode className="w-16 h-16 mb-1" />
                <span>SCAN & PAY</span>
              </div>
            </div>
            <div className="text-xs space-y-0.5">
              <span className="text-slate-400 block">Tutor UPI VPA:</span>
              <span className="text-emerald-400 font-mono font-bold">anant@okaxis</span>
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl text-xs font-semibold"
            >
              Done / Payment Sent
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}