import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, MessageSquare, Send, 
  ExternalLink, Globe, Shield, RefreshCw 
} from 'lucide-react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function SideDock({
  tutorName = 'Educator',
  broadcast,
  registerListener,
  peersInRoom = [],
  callMode = 'custom',
  googleMeetUrl = '',
  isTeacher = false,
  onToggleCallMode,
  currentUser
}) {
  // Media States
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  // Chat States
  const [messages, setMessages] = useState([
    { id: 1, sender: 'System', text: 'Welcome to the session! Doubts can be asked here.', isSystem: true }
  ]);
  const [inputText, setInputText] = useState('');

  // Refs for WebRTC
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcRef = useRef(null);
  const chatBottomRef = useRef(null);

  const myRole = isTeacher ? 'teacher' : 'student';
  const otherRole = isTeacher ? 'student' : 'teacher';
  const isPeerOnline = peersInRoom.some(p => p.role === otherRole);

  // 1. Initialize Local Camera Stream
  useEffect(() => {
    let active = true;

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!active) return;

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize PeerConnection
        setupPeerConnection(stream);
      } catch (err) {
        console.warn('Camera/Mic permission failed or unavailable:', err);
      }
    }

    if (callMode === 'custom') {
      initMedia();
    }

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, [callMode]);

  // 2. WebRTC Peer Connection Setup & Supabase Signaling
  const setupPeerConnection = (stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Add local tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Remote Track Listener
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setHasRemoteStream(true);
      }
    };

    // ICE Candidate Exchange
    pc.onicecandidate = (event) => {
      if (event.candidate && broadcast) {
        broadcast('webrtc:ice_candidate', {
          candidate: event.candidate,
          from: myRole,
        });
      }
    };

    // Signaling Listeners
    if (registerListener) {
      registerListener('webrtc:offer', async (data) => {
        if (data.from !== myRole && pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            broadcast('webrtc:answer', { answer, from: myRole });
          } catch (e) {
            console.error('Error handling offer:', e);
          }
        }
      });

      registerListener('webrtc:answer', async (data) => {
        if (data.from !== myRole && pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          } catch (e) {
            console.error('Error handling answer:', e);
          }
        }
      });

      registerListener('webrtc:ice_candidate', async (data) => {
        if (data.from !== myRole && pcRef.current && data.candidate) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.error('Error adding candidate:', e);
          }
        }
      });

      registerListener('classroom:chat_message', (msg) => {
        setMessages((prev) => [...prev, msg]);
      });
    }

    // Teacher initiates WebRTC call offer
    if (isTeacher) {
      createCallOffer(pc);
    }
  };

  const createCallOffer = async (pc) => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (broadcast) {
        broadcast('webrtc:offer', { offer, from: myRole });
      }
    } catch (err) {
      console.error('Failed to create call offer:', err);
    }
  };

  // Toggle Mute / Cam
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Send Chat Message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: currentUser?.name || (isTeacher ? 'Teacher' : 'Student'),
      role: myRole,
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    if (broadcast) {
      broadcast('classroom:chat_message', newMsg);
    }
    setInputText('');
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden">
      
      {/* 1. Call Mode Switcher Tab (WebRTC vs Google Meet) */}
      <div className="p-2 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-1.5 shrink-0">
        <div className="flex gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[11px] font-semibold w-full">
          <button
            onClick={() => onToggleCallMode && onToggleCallMode('custom')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              callMode === 'custom' 
                ? 'bg-indigo-600 text-white shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>In-App Video</span>
          </button>

          <button
            onClick={() => {
              if (onToggleCallMode) {
                let meetUrl = googleMeetUrl;
                if (!meetUrl && isTeacher) {
                  meetUrl = prompt('Enter Google Meet Link (e.g., https://meet.google.com/abc-defg-hij):', 'https://meet.google.com/new') || '';
                }
                onToggleCallMode('meet', meetUrl);
              }
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              callMode === 'meet' 
                ? 'bg-emerald-600 text-white shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Google Meet</span>
          </button>
        </div>
      </div>

      {/* 2. Video Calling Container (WebRTC or Google Meet) */}
      <div className="p-3 border-b border-slate-800 shrink-0 space-y-2">
        {callMode === 'custom' ? (
          <div className="grid grid-cols-2 gap-2">
            
            {/* Local Video Tile */}
            <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
              />
              {isVideoOff && (
                <div className="text-[10px] text-slate-500 font-mono">Camera Off</div>
              )}
              <div className="absolute bottom-1 left-1.5 bg-black/60 backdrop-blur-sm text-[9px] font-semibold text-slate-300 px-1.5 py-0.5 rounded">
                You ({myRole})
              </div>
            </div>

            {/* Remote Peer Video Tile (2-Way View) */}
            <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover ${hasRemoteStream ? 'block' : 'hidden'}`}
              />
              {!hasRemoteStream && (
                <div className="text-center p-2">
                  <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${isPeerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  <span className="text-[10px] text-slate-400 block font-medium">
                    {isPeerOnline ? `Connecting ${otherRole}...` : `Waiting for ${otherRole}...`}
                  </span>
                </div>
              )}
              <div className="absolute bottom-1 left-1.5 bg-black/60 backdrop-blur-sm text-[9px] font-semibold text-emerald-400 px-1.5 py-0.5 rounded">
                {otherRole === 'teacher' ? tutorName : 'Student'}
              </div>
            </div>

          </div>
        ) : (
          /* Google Meet Integrated Box */
          <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-semibold">
              <Globe className="w-4 h-4" />
              <span>Google Meet Mode Active</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Audio & Video call is hosted via Google Meet while tools stay synced here!
            </p>
            {googleMeetUrl ? (
              <a
                href={googleMeetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition shadow"
              >
                <span>Join Google Meet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                onClick={() => {
                  const url = prompt('Enter Google Meet Link:', 'https://meet.google.com/new');
                  if (url && onToggleCallMode) onToggleCallMode('meet', url);
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2 px-3 rounded-xl transition"
              >
                Set Meet URL
              </button>
            )}
          </div>
        )}

        {/* Media Controls for In-App */}
        {callMode === 'custom' && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition ${
                isMuted 
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-semibold">{isMuted ? 'Muted' : 'Mute'}</span>
            </button>

            <button
              onClick={toggleVideo}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition ${
                isVideoOff 
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              {isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-semibold">{isVideoOff ? 'Cam Off' : 'Camera'}</span>
            </button>

            {isTeacher && (
              <button
                onClick={() => pcRef.current && createCallOffer(pcRef.current)}
                className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-indigo-300 bg-slate-950 transition"
                title="Reconnect Video Stream"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Live Chat Workspace */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-900">
        <div className="p-2.5 border-b border-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-300">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
          <span>Live Session Chat</span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs min-h-0">
          {messages.map((m) => (
            <div 
              key={m.id} 
              className={`p-2.5 rounded-xl space-y-1 ${
                m.isSystem 
                  ? 'bg-slate-950/80 border border-slate-800/80 text-slate-400 text-center text-[11px]' 
                  : m.role === myRole
                    ? 'bg-indigo-600/20 border border-indigo-500/30 ml-4'
                    : 'bg-slate-800/80 border border-slate-700/80 mr-4'
              }`}
            >
              {!m.isSystem && (
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span className="font-bold text-slate-200">{m.sender}</span>
                  <span className="font-mono">{m.time}</span>
                </div>
              )}
              <p className="text-slate-200 text-xs break-words">{m.text}</p>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-2.5 border-t border-slate-800 bg-slate-950 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type doubt or question..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition shadow"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

    </div>
  );
}