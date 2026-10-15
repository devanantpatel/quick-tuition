import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, 
  Send, MessageSquare, Tv, ChevronDown, ChevronUp, AlertCircle 
} from 'lucide-react';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export default function SideDock({
  tutorName = 'Verified Educator',
  broadcast,
  registerListener,
  peersInRoom = [],
  isTeacher = false,
  currentUser
}) {
  const [activeTab, setActiveTab] = useState('chat');
  const [isVideoCollapsed, setIsVideoCollapsed] = useState(false);

  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Single-user ownership
  const [currentSharingRole, setCurrentSharingRole] = useState(null);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Video Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenDisplayVideoRef = useRef(null);

  // Streams & WebRTC
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);

  // 1. WebRTC Signaling Setup for direct high-quality stream
  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (event) => {
      if (event.candidate && broadcast) {
        broadcast('webrtc:ice_candidate', {
          candidate: event.candidate,
          senderRole: currentUser?.role
        });
      }
    };

    pc.ontrack = (event) => {
      // Remote screen or camera track received
      if (screenDisplayVideoRef.current && event.streams[0]) {
        screenDisplayVideoRef.current.srcObject = event.streams[0];
        screenDisplayVideoRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play().catch(() => {});
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [broadcast, currentUser?.role]);

  // 2. Realtime Signaling & State Listeners
  useEffect(() => {
    if (!registerListener) return;

    registerListener('chat:new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    registerListener('screen:share_state', (data) => {
      if (data && data.senderRole !== currentUser?.role) {
        if (data.isSharing) {
          setCurrentSharingRole(data.senderRole);
          setActiveTab('screen'); // Auto switch view on student/peer side
        } else {
          setCurrentSharingRole(null);
          if (screenDisplayVideoRef.current) {
            screenDisplayVideoRef.current.srcObject = null;
          }
        }
      }
    });

    // WebRTC Offer/Answer/ICE
    registerListener('webrtc:offer', async (data) => {
      if (data.senderRole === currentUser?.role) return;
      try {
        const pc = createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (broadcast) {
          broadcast('webrtc:answer', { answer, senderRole: currentUser?.role });
        }
      } catch (err) {
        console.warn('Signaling error (offer):', err);
      }
    });

    registerListener('webrtc:answer', async (data) => {
      if (data.senderRole === currentUser?.role) return;
      try {
        if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'stable') {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      } catch (err) {
        console.warn('Signaling error (answer):', err);
      }
    });

    registerListener('webrtc:ice_candidate', async (data) => {
      if (data.senderRole === currentUser?.role) return;
      try {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.warn('Signaling error (ICE):', err);
      }
    });
  }, [registerListener, broadcast, currentUser?.role, createPeerConnection]);

  // 3. Camera Handler
  const toggleCamera = async () => {
    try {
      if (isVideoOn) {
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(t => t.stop());
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        setIsVideoOn(false);
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: false
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          await localVideoRef.current.play().catch(() => {});
        }
        setIsVideoOn(true);
      }
    } catch (err) {
      alert('Camera access error: ' + err.message);
    }
  };

  // 4. Mic Handler
  const toggleMic = async () => {
    try {
      if (isMicOn) {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(t => t.stop());
        }
        setIsMicOn(false);
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (localStreamRef.current) {
          stream.getAudioTracks().forEach(t => localStreamRef.current.addTrack(t));
        } else {
          localStreamRef.current = stream;
        }
        setIsMicOn(true);
      }
    } catch (err) {
      alert('Microphone access error: ' + err.message);
    }
  };

  // 5. DIRECT SCREEN SHARE ENGINE (Native MediaStream with Guaranteed Playback)
  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (screenDisplayVideoRef.current) {
      screenDisplayVideoRef.current.srcObject = null;
    }

    setIsScreenSharing(false);
    setCurrentSharingRole(null);

    if (broadcast) {
      broadcast('screen:share_state', {
        isSharing: false,
        senderRole: currentUser?.role
      });
    }
  };

  const toggleScreenShare = async () => {
    // Single-user conflict check
    if (!isScreenSharing && currentSharingRole && currentSharingRole !== currentUser?.role) {
      alert(`Screen is already being shared by ${currentSharingRole}. Wait for them to stop!`);
      return;
    }

    if (isScreenSharing) {
      stopScreenShare();
      return;
    }

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert('Please open the app directly in Google Chrome / Edge to use screen sharing.');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      });

      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      setCurrentSharingRole(currentUser?.role);
      setActiveTab('screen');

      // Bind directly to local preview container
      setTimeout(() => {
        if (screenDisplayVideoRef.current) {
          screenDisplayVideoRef.current.srcObject = stream;
          screenDisplayVideoRef.current.muted = true;
          screenDisplayVideoRef.current.play().catch(e => console.warn('Preview play warning:', e));
        }
      }, 100);

      // Add Track to WebRTC Peer Connection
      const pc = createPeerConnection();
      const videoTrack = stream.getVideoTracks()[0];
      const senders = pc.getSenders();
      const videoSender = senders.find(s => s.track?.kind === 'video');

      if (videoSender) {
        videoSender.replaceTrack(videoTrack);
      } else {
        pc.addTrack(videoTrack, stream);
      }

      // Create Offer for Peer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (broadcast) {
        broadcast('screen:share_state', {
          isSharing: true,
          senderRole: currentUser?.role,
          senderName: currentUser?.name || (isTeacher ? 'Teacher' : 'Student')
        });

        broadcast('webrtc:offer', {
          offer,
          senderRole: currentUser?.role
        });
      }

      // Handle browser native "Stop Sharing" button
      videoTrack.onended = () => {
        stopScreenShare();
      };

    } catch (err) {
      console.warn('Screen share error/cancelled:', err);
      if (err.name !== 'NotAllowedError') {
        alert('Screen share error: ' + err.message);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      if (peerConnectionRef.current) peerConnectionRef.current.close();
    };
  }, []);

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

  const isOtherPersonSharing = currentSharingRole && currentSharingRole !== currentUser?.role;

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border-l border-slate-800 select-none overflow-hidden">
      
      {/* 1. COLLAPSIBLE SMALL WEBCAM TILES BOX */}
      <div className="border-b border-slate-800 bg-slate-950/70 shrink-0 flex flex-col">
        
        {/* Toggle Collapse Bar */}
        <div className="px-3 py-1 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/60 text-[10px] text-slate-400">
          <span className="font-bold tracking-wide text-slate-300">Video & Audio</span>
          <button
            onClick={() => setIsVideoCollapsed(!isVideoCollapsed)}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition"
            title={isVideoCollapsed ? 'Expand Video' : 'Collapse Video'}
          >
            <span>{isVideoCollapsed ? 'Show Video' : 'Hide Video'}</span>
            {isVideoCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>

        {/* Video Box Content */}
        {!isVideoCollapsed && (
          <div className="p-2 space-y-2">
            <div className="grid grid-cols-2 gap-1.5 w-full">
              {/* User Camera */}
              <div className="relative h-20 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoOn ? 'block' : 'hidden'}`}
                />
                {!isVideoOn && (
                  <div className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-[10px]">
                    You
                  </div>
                )}
                <span className="absolute bottom-0.5 left-1 bg-black/70 px-1 py-0.2 rounded text-[8px] text-slate-300 font-mono">
                  {currentUser?.name || (isTeacher ? 'Teacher' : 'Student')}
                </span>
              </div>

              {/* Peer Camera */}
              <div className="relative h-20 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover hidden"
                />
                <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center font-bold text-[10px]">
                  {isTeacher ? 'Student' : 'Teacher'}
                </div>
                <span className="absolute bottom-0.5 left-1 bg-black/70 px-1 py-0.2 rounded text-[8px] text-slate-300 font-mono">
                  {isTeacher ? 'Student' : tutorName}
                </span>
              </div>
            </div>

            {/* Media Action Row */}
            <div className="w-full bg-slate-900 border border-slate-800 py-1 px-3 rounded-xl flex items-center justify-around shadow-inner">
              <button
                onClick={toggleMic}
                className={`p-1.5 rounded-lg text-xs transition flex items-center gap-1 ${
                  isMicOn ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
              >
                {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              </button>

              <div className="w-[1px] h-3.5 bg-slate-800" />

              <button
                onClick={toggleCamera}
                className={`p-1.5 rounded-lg text-xs transition flex items-center gap-1 ${
                  isVideoOn ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title={isVideoOn ? 'Turn Off Video' : 'Turn On Video'}
              >
                {isVideoOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
              </button>

              <div className="w-[1px] h-3.5 bg-slate-800" />

              {/* Screen Share with Conflict Lock */}
              <button
                disabled={isOtherPersonSharing}
                onClick={toggleScreenShare}
                className={`p-1.5 rounded-lg text-xs transition flex items-center gap-1 ${
                  isScreenSharing 
                    ? 'bg-emerald-600 text-white shadow' 
                    : isOtherPersonSharing 
                    ? 'opacity-30 cursor-not-allowed text-slate-500' 
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
                title={
                  isOtherPersonSharing 
                    ? `${currentSharingRole} is currently sharing screen` 
                    : isScreenSharing 
                    ? 'Stop Screen Share' 
                    : 'Share Screen'
                }
              >
                {isScreenSharing ? <MonitorOff className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. CHAT vs SCREEN VIEW SWITCHER */}
      <div className="bg-slate-950 px-2 py-1.5 border-b border-slate-800 flex items-center justify-center shrink-0">
        <div className="grid grid-cols-2 gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800 w-full">
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'chat' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Live Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('screen')}
            className={`py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'screen' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Screen View {isScreenSharing || currentSharingRole ? '(Live)' : ''}</span>
          </button>
        </div>
      </div>

      {/* 3. SWITCHABLE VIEWPORT: CHAT OR SCREEN CAST */}
      
      {/* SCREEN VIEW (Guaranteed Video Element Stream) */}
      <div className={`flex-1 w-full h-full bg-slate-950 flex flex-col items-center justify-center p-2 relative overflow-hidden ${
        activeTab === 'screen' ? 'flex' : 'hidden'
      }`}>
        <div className="w-full h-full bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center relative">
          
          {/* Main Video Stream Element (Always in DOM to avoid black screen) */}
          <video
            ref={screenDisplayVideoRef}
            autoPlay
            playsInline
            muted={isScreenSharing}
            className={`w-full h-full object-contain ${
              isScreenSharing || currentSharingRole ? 'block' : 'hidden'
            }`}
          />

          {/* Status Overlay Badges */}
          {isScreenSharing && (
            <span className="absolute top-2 left-2 bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 z-10 shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              You are sharing your screen (Live)
            </span>
          )}

          {!isScreenSharing && currentSharingRole && (
            <span className="absolute top-2 left-2 bg-indigo-950/90 border border-indigo-500/50 text-indigo-300 text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 z-10 shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              {currentSharingRole}'s Screen (Live Stream)
            </span>
          )}

          {!isScreenSharing && !currentSharingRole && (
            <div className="text-center p-4 text-slate-500 space-y-2">
              <Monitor className="w-8 h-8 mx-auto text-slate-700" />
              <p className="text-xs">No active screen cast.</p>
              <button
                disabled={isOtherPersonSharing}
                onClick={toggleScreenShare}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow"
              >
                Start Screen Share
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CHAT VIEW */}
      <div className={`flex-1 flex-col min-h-0 bg-slate-900/50 ${
        activeTab === 'chat' ? 'flex' : 'hidden'
      }`}>
        <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
          {messages.length === 0 ? (
            <p className="text-[11px] text-slate-500 text-center py-4">
              No doubts yet. Send a message to get started!
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === currentUser?.role ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1 text-[9px] text-slate-500 mb-0.5">
                  <span className="font-bold text-slate-400">{m.sender}</span>
                  <span>{m.time}</span>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-2xl max-w-[85%] break-words text-xs ${
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

        <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-800 flex items-center gap-1.5 bg-slate-950">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type message..."
            className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-xl focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
          />
          <button
            type="submit"
            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

    </div>
  );
}