import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, MessageSquare, Send, RefreshCw 
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
  isTeacher = false,
  currentUser
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  const [messages, setMessages] = useState([
    { id: 1, sender: 'System', text: 'Welcome to the live session! Realtime doubts can be asked here.', isSystem: true }
  ]);
  const [inputText, setInputText] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcRef = useRef(null);
  const chatBottomRef = useRef(null);

  const myRole = isTeacher ? 'teacher' : 'student';
  const otherRole = isTeacher ? 'student' : 'teacher';
  const isPeerOnline = peersInRoom.some(p => p.role === otherRole);

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

        setupPeerConnection(stream);
      } catch (err) {
        console.warn('Camera or Mic access failed:', err);
      }
    }

    initMedia();

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  const setupPeerConnection = (stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setHasRemoteStream(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && broadcast) {
        broadcast('webrtc:ice_candidate', {
          candidate: event.candidate,
          from: myRole,
        });
      }
    };

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
            console.error('Error adding ICE candidate:', e);
          }
        }
      });

      registerListener('classroom:chat_message', (msg) => {
        setMessages((prev) => [...prev, msg]);
      });
    }

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
      
      {/* 1. Direct WebRTC Video Tiles */}
      <div className="p-3 border-b border-slate-800 shrink-0 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          
          {/* Local Tile */}
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

          {/* Remote Peer Video Tile */}
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

        {/* Media Control Buttons */}
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
      </div>

      {/* 2. Live Chat Workspace */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-900">
        <div className="p-2.5 border-b border-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-300">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
          <span>Live Session Chat</span>
        </div>

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