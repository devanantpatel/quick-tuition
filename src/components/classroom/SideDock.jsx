import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, Send, QrCode, 
  MessageSquare, User, Volume2 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function SideDock({ 
  tutorName = 'Anant Patel', 
  broadcast, 
  registerListener 
}) {
  const { currentUser, activeSession } = useApp();
  const isTeacher = currentUser?.role === 'teacher';

  // Media States
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [mediaError, setMediaError] = useState(null);

  // Video Refs
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  // Realtime Chat States
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      sender: tutorName, 
      text: 'Namaste! Welcome to the session. Feel free to ask your doubts on the board or editor.',
      time: 'Start'
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const chatScrollRef = useRef(null);

  // QR Modal State & Tutor Payment Info
  const [showQrModal, setShowQrModal] = useState(false);
  const upiId = activeSession?.tutorUpi || '7607765685@okbizaxis';
  const qrCodeUrl = activeSession?.tutorQr || '';

  // 1. Camera & Microphone Setup (Native Browser Media Stream)
  useEffect(() => {
    let stream = null;

    const startLocalStream = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Camera/Mic permission denied or unavailable:', err);
        setMediaError('Camera/Mic preview unavailable');
      }
    };

    startLocalStream();

    return () => {
      // Cleanup tracks on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Toggle Microphone
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    } else {
      setMicOn(!micOn);
    }
  };

  // Toggle Camera
  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCamOn(videoTrack.enabled);
      }
    } else {
      setCamOn(!camOn);
    }
  };

  // 2. Realtime Chat Listeners
  useEffect(() => {
    if (!registerListener) return;

    registerListener('classroom:chat_message', (payload) => {
      if (payload && payload.id) {
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
      }
    });
  }, [registerListener]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle Send Chat
  const handleSend = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const newMsg = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender: currentUser?.name || (isTeacher ? tutorName : 'Student'),
      role: isTeacher ? 'teacher' : 'student',
      text: inputMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Local state update
    setMessages((prev) => [...prev, newMsg]);

    // Realtime Supabase broadcast to peer
    if (broadcast) {
      broadcast('classroom:chat_message', newMsg);
    }

    setInputMsg('');
  };

  return (
    <aside className="w-full h-full bg-slate-900 border-l border-slate-800 flex flex-col min-h-0">
      
      {/* 1. Live Video Preview Boxes */}
      <div className="p-3 border-b border-slate-800 space-y-2 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          
          {/* Box 1: Local Peer Video */}
          <div className="aspect-video bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
            {camOn && !mediaError ? (
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-1">
                <div className="w-9 h-9 rounded-full bg-indigo-600/20 text-indigo-300 font-bold flex items-center justify-center text-xs">
                  {(currentUser?.name || 'Y').charAt(0).toUpperCase()}
                </div>
                <span className="text-[9px]">Camera Off</span>
              </div>
            )}

            {/* Local Label Badge */}
            <span className="absolute bottom-1.5 left-1.5 text-[9px] bg-black/75 px-1.5 py-0.5 rounded text-white font-medium flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${micOn ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span>You ({isTeacher ? 'Tutor' : 'Student'})</span>
            </span>
          </div>

          {/* Box 2: Remote Peer Video Tile */}
          <div className="aspect-video bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
            <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
              <div className="w-9 h-9 rounded-full bg-emerald-600/20 text-emerald-300 font-bold flex items-center justify-center text-xs border border-emerald-500/30">
                {(isTeacher ? 'S' : tutorName.charAt(0)).toUpperCase()}
              </div>
              <span className="text-[9px] text-slate-500 font-mono">Live Peer Connected</span>
            </div>

            {/* Remote Label Badge */}
            <span className="absolute bottom-1.5 left-1.5 text-[9px] bg-black/75 px-1.5 py-0.5 rounded text-slate-200 font-medium">
              {isTeacher ? 'Student' : `${tutorName} (Tutor)`}
            </span>
          </div>
        </div>

        {/* Media Control Action Buttons */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          <div className="flex gap-1.5">
            <button
              onClick={toggleMic}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
              }`}
              title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{micOn ? 'Mute' : 'Muted'}</span>
            </button>

            <button
              onClick={toggleCam}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                camOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
              }`}
              title={camOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {camOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{camOn ? 'Cam' : 'Off'}</span>
            </button>
          </div>

          {/* Direct Pay UPI Button (Shows Tutor's real QR code) */}
          {!isTeacher && (
            <button
              onClick={() => setShowQrModal(true)}
              className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-semibold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Pay UPI</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Real-Time Chat Section */}
      <div className="flex-1 flex flex-col p-3 overflow-hidden text-xs min-h-0">
        <div className="flex items-center justify-between gap-1.5 text-slate-400 font-semibold mb-2 pb-1.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-white">Live Session Chat</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">{messages.length} msgs</span>
        </div>

        {/* Message Log */}
        <div 
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0"
        >
          {messages.map((m) => {
            const isMe = m.sender === currentUser?.name || (isTeacher ? m.role === 'teacher' : m.role === 'student');

            return (
              <div
                key={m.id}
                className={`p-2.5 rounded-xl max-w-[85%] text-xs space-y-0.5 shadow-sm ${
                  isMe
                    ? 'bg-indigo-600 text-white ml-auto rounded-tr-sm'
                    : 'bg-slate-950 text-slate-200 border border-slate-800 mr-auto rounded-tl-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className={`font-bold ${isMe ? 'text-indigo-200' : 'text-indigo-400'}`}>
                    {isMe ? 'You' : m.sender}
                  </span>
                  <span className={`font-mono text-[9px] ${isMe ? 'text-indigo-300' : 'text-slate-500'}`}>
                    {m.time}
                  </span>
                </div>
                <p className="leading-relaxed break-words">{m.text}</p>
              </div>
            );
          })}
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSend} className="flex gap-1.5 pt-2 border-t border-slate-800/80 shrink-0">
          <input
            type="text"
            placeholder="Type doubt or question..."
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition shadow flex items-center justify-center shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* 3. Direct UPI Payment Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-xs w-full text-center space-y-4 relative shadow-2xl">
            <button 
              onClick={() => setShowQrModal(false)} 
              className="absolute top-3 right-3 text-slate-500 hover:text-white"
            >
              ✕
            </button>
            
            <div>
              <h4 className="font-bold text-white text-base">Direct UPI Payment</h4>
              <p className="text-slate-400 text-xs mt-0.5">Pay educator directly via any UPI app</p>
            </div>

            <div className="w-48 h-48 mx-auto bg-white p-2.5 rounded-2xl flex items-center justify-center shadow-lg">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="Tutor QR Code" 
                  className="w-full h-full object-contain" 
                />
              ) : (
                <div className="border-2 border-slate-800 border-dashed w-full h-full flex flex-col items-center justify-center font-mono text-slate-900 text-xs font-bold gap-1">
                  <QrCode className="w-14 h-14 text-slate-800" />
                  <span>{upiId}</span>
                </div>
              )}
            </div>

            <div className="text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-500 block text-[10px]">Tutor UPI VPA:</span>
              <span className="text-emerald-400 font-mono font-bold select-all block text-sm">
                {upiId}
              </span>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-semibold transition shadow-lg shadow-indigo-600/25"
            >
              Done / Payment Sent
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}