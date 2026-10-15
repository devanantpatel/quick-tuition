import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Send, MessageSquare } from 'lucide-react';

export default function SideDock({
  tutorName = 'Verified Educator',
  broadcast,
  registerListener,
  peersInRoom = [],
  isTeacher = false,
  currentUser
}) {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Chat & Stream Status Listeners
  useEffect(() => {
    if (!registerListener) return;

    registerListener('chat:new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    registerListener('stream:screen_share_status', (data) => {
      if (data && data.senderRole !== currentUser?.role) {
        // Handle remote peer stream alert if needed
      }
    });
  }, [registerListener, currentUser]);

  // SCREEN SHARING ENGINE (WebRTC getDisplayMedia)
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      if (broadcast) {
        broadcast('stream:screen_share_status', { isSharing: false, senderRole: currentUser?.role });
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });

        screenStreamRef.current = stream;
        setIsScreenSharing(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // When user stops sharing via browser bar
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
          if (broadcast) {
            broadcast('stream:screen_share_status', { isSharing: false, senderRole: currentUser?.role });
          }
        };

        if (broadcast) {
          broadcast('stream:screen_share_status', { isSharing: true, senderRole: currentUser?.role });
        }
      } catch (err) {
        console.warn('Screen sharing cancelled or not allowed:', err);
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      sender: currentUser?.name || (isTeacher ? 'Teacher' : 'Student'),
      role: currentUser?.role || (isTeacher ? 'teacher' : 'student'),
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newMsg]);
    if (broadcast) {
      broadcast('chat:new_message', newMsg);
    }
    setChatInput('');
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border-l border-slate-800 select-none overflow-hidden">
      
      {/* 1. TOP VIDEO & SCREEN SHARE TILES */}
      <div className="p-3 border-b border-slate-800 space-y-2 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          
          {/* Your Tile (Camera or Screen Share) */}
          <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isScreenSharing ? 'block' : isVideoOn ? 'block' : 'hidden'}`}
            />
            {!isVideoOn && !isScreenSharing && (
              <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-xs">
                You
              </div>
            )}
            <span className="absolute bottom-1 left-1.5 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[9px] text-slate-300">
              {currentUser?.name || (isTeacher ? 'Teacher' : 'Student')} {isScreenSharing && '(Sharing Screen)'}
            </span>
          </div>

          {/* Remote Peer Tile */}
          <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover hidden"
            />
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center font-bold text-xs">
              {isTeacher ? 'Student' : 'Teacher'}
            </div>
            <span className="absolute bottom-1 left-1.5 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[9px] text-slate-300">
              {isTeacher ? 'Student' : tutorName}
            </span>
          </div>
        </div>

        {/* Media Control Action Buttons */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {/* Mic */}
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`p-2 rounded-xl text-xs transition border ${
              isMicOn ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-rose-600/20 border-rose-500/40 text-rose-400'
            }`}
            title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
          >
            {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </button>

          {/* Camera */}
          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`p-2 rounded-xl text-xs transition border ${
              isVideoOn ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
            title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isVideoOn ? <Video className="w-3.5 h-3.5 text-indigo-400" /> : <VideoOff className="w-3.5 h-3.5" />}
          </button>

          {/* SCREEN SHARE BUTTON (Teacher aur Student dono ke liye) */}
          <button
            onClick={toggleScreenShare}
            className={`p-2 rounded-xl text-xs transition border flex items-center gap-1 ${
              isScreenSharing
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen (Full Screen / Browser Tab / PPT)'}
          >
            {isScreenSharing ? <MonitorOff className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 2. CHAT PANEL */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50">
        <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
          <span>Live Session Chat</span>
        </div>

        <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
          {messages.length === 0 ? (
            <p className="text-[11px] text-slate-500 text-center py-4">
              Welcome to the live session! Realtime doubts can be asked here.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === currentUser?.role ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-0.5">
                  <span className="font-bold text-slate-400">{m.sender}</span>
                  <span>{m.time}</span>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-2xl max-w-[85%] break-words ${
                    m.role === currentUser?.role
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-800 flex items-center gap-1.5 bg-slate-950">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type doubt or question..."
            className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
          />
          <button
            type="submit"
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}