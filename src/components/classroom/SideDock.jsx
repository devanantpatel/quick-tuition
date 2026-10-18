import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, ChevronUp, ChevronDown, 
  MessageSquare, Tv, Send, User, GraduationCap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export default function SideDock({
  tutorName,
  broadcast,
  registerListener,
  peersInRoom,
  isTeacher,
  currentUser
}) {
  const { activeSession } = useApp() || {};
  const chatStorageKey = activeSession?.id ? `room_chat_${activeSession.id}` : 'room_chat_default';

  const [isVideoSectionOpen, setIsVideoSectionOpen] = useState(true);
  const [activeSideTab, setActiveSideTab] = useState('chat'); // 'chat' | 'screen'

  // Persistent Media Preferences
  const [isMicOn, setIsMicOn] = useState(() => {
    try { return localStorage.getItem('media_pref_mic') === 'true'; } catch (e) { return false; }
  });
  const [isCamOn, setIsCamOn] = useState(() => {
    try { return localStorage.getItem('media_pref_cam') === 'true'; } catch (e) { return false; }
  });

  // Remote Peer Media State
  const [remoteMediaStatus, setRemoteMediaStatus] = useState({
    isMicOn: false,
    isCamOn: false
  });

  // Detailed Descriptive Backend / WebRTC States
  const [connectionStage, setConnectionStage] = useState('idle');
  const [diagnosticSentence, setDiagnosticSentence] = useState('Initializing classroom channels...');

  // Chat State
  const [chatMessages, setChatMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(chatStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [inputMessage, setInputMessage] = useState('');

  // WebRTC References
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pcRef = useRef(null);
  const iceCandidatesQueueRef = useRef([]);
  const headerActionTimeoutRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const userRole = currentUser?.role || (isTeacher ? 'teacher' : 'student');
  const userName = currentUser?.name || (isTeacher ? 'Teacher' : 'Student');
  
  const otherRole = isTeacher ? 'student' : 'teacher';
  const matchedPeer = (peersInRoom || []).find((p) => p && p.role === otherRole);
  const peerName = matchedPeer?.name || (isTeacher ? (activeSession?.student_name || activeSession?.studentName || 'Student') : (tutorName || activeSession?.teacher_name || 'Teacher'));

  // Auto-Save Chat
  useEffect(() => {
    try {
      localStorage.setItem(chatStorageKey, JSON.stringify(chatMessages));
    } catch (e) {}
  }, [chatMessages, chatStorageKey]);

  // Save Media Preferences
  useEffect(() => {
    try {
      localStorage.setItem('media_pref_mic', String(isMicOn));
      localStorage.setItem('media_pref_cam', String(isCamOn));
    } catch (e) {}
  }, [isMicOn, isCamOn]);

  // Re-attach video stream elements whenever video section is re-opened (fixes collapse unsync)
  useEffect(() => {
    if (isVideoSectionOpen) {
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      if (remoteVideoRef.current && remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (broadcast) {
        broadcast('media:status_change', {
          senderRole: userRole,
          senderName: userName,
          isMicOn,
          isCamOn
        });
      }
    }
  }, [isVideoSectionOpen, broadcast, userRole, userName, isMicOn, isCamOn]);

  // Broadcast Local Media State
  const broadcastMediaStatus = useCallback((micState, camState) => {
    if (broadcast) {
      broadcast('media:status_change', {
        senderRole: userRole,
        senderName: userName,
        isMicOn: micState,
        isCamOn: camState
      });
    }
  }, [broadcast, userRole, userName]);

  // 1. Initialize Local Stream
  const initLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      setDiagnosticSentence('Detecting camera and microphone devices...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      stream.getVideoTracks().forEach((t) => { t.enabled = isCamOn; });
      stream.getAudioTracks().forEach((t) => { t.enabled = isMicOn; });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setDiagnosticSentence('Local audio and video channels active');
      return stream;
    } catch (err) {
      console.warn('Fallback to audio only:', err);
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioOnly.getAudioTracks().forEach((t) => { t.enabled = isMicOn; });
        localStreamRef.current = audioOnly;
        setDiagnosticSentence('Microphone online (Video camera blocked/unavailable)');
        return audioOnly;
      } catch (e) {
        setDiagnosticSentence('Device permission denied by web browser');
        return null;
      }
    }
  }, [isCamOn, isMicOn]);

  // 2. WebRTC Peer Connection Factory
  const getOrCreatePeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    setConnectionStage('signaling');
    setDiagnosticSentence('Exchanging WebRTC handshake with peer...');

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
      setDiagnosticSentence('Live encrypted audio/video peer connection established');
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && broadcast) {
        broadcast('webrtc:ice_candidate', {
          candidate: event.candidate,
          senderRole: userRole
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'checking') {
        setConnectionStage('ice');
        setDiagnosticSentence('Verifying network routes (ICE candidate discovery)...');
      } else if (state === 'connected' || state === 'completed') {
        setConnectionStage('connected');
        setDiagnosticSentence('Secure 1-on-1 media bridge fully connected');
      } else if (state === 'disconnected') {
        setConnectionStage('reconnecting');
        setDiagnosticSentence('Network fluctuating, auto-recovering media stream...');
      } else if (state === 'failed') {
        setConnectionStage('failed');
        setDiagnosticSentence('Media channel interrupted, re-negotiating connection...');
        pc.restartIce();
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setConnectionStage('connected');
        setDiagnosticSentence('Live encrypted audio/video peer connection established');
      } else if (['failed', 'closed'].includes(pc.connectionState)) {
        setConnectionStage('failed');
        setDiagnosticSentence('Peer disconnected from secure media channel');
      }
    };

    return pc;
  }, [broadcast, userRole]);

  // 3. Initiate Call Offer
  const initiateCall = useCallback(async () => {
    await initLocalStream();
    const pc = getOrCreatePeerConnection();

    try {
      setConnectionStage('signaling');
      setDiagnosticSentence('Sending peer connection invitation...');

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      if (broadcast) {
        broadcast('webrtc:offer', {
          sdp: offer,
          senderRole: userRole,
          senderName: userName
        });
      }
    } catch (err) {
      console.error('Call offer error:', err);
      setDiagnosticSentence('Failed to generate call handshake offer');
    }
  }, [initLocalStream, getOrCreatePeerConnection, broadcast, userRole, userName]);

  // 4. Realtime Listeners
  useEffect(() => {
    if (!registerListener) return;

    registerListener('room:peer_joined', async (data) => {
      if (data && data.senderRole !== userRole) {
        setDiagnosticSentence(`Peer (${data.senderName || peerName}) joined, syncing channels...`);
        broadcastMediaStatus(isMicOn, isCamOn);
        if (isTeacher) {
          setTimeout(() => initiateCall(), 600);
        }
      }
    });

    registerListener('media:status_change', (data) => {
      if (data && data.senderRole !== userRole) {
        setRemoteMediaStatus({
          isMicOn: Boolean(data.isMicOn),
          isCamOn: Boolean(data.isCamOn)
        });
      }
    });

    registerListener('webrtc:offer', async (data) => {
      if (!data?.sdp || data.senderRole === userRole) return;
      await initLocalStream();
      const pc = getOrCreatePeerConnection();

      try {
        setConnectionStage('signaling');
        setDiagnosticSentence('Connection invitation received, generating answer...');

        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

        while (iceCandidatesQueueRef.current.length > 0) {
          const cand = iceCandidatesQueueRef.current.shift();
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (broadcast) {
          broadcast('webrtc:answer', {
            sdp: answer,
            senderRole: userRole,
            senderName: userName
          });
        }
      } catch (err) {
        console.error('Answer handling error:', err);
      }
    });

    registerListener('webrtc:answer', async (data) => {
      if (!data?.sdp || data.senderRole === userRole) return;
      const pc = pcRef.current;
      if (pc && pc.signalingState !== 'stable') {
        try {
          setDiagnosticSentence('Handshake finalized, opening audio and video streams');
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

          while (iceCandidatesQueueRef.current.length > 0) {
            const cand = iceCandidatesQueueRef.current.shift();
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
        } catch (err) {
          console.error('Remote answer error:', err);
        }
      }
    });

    registerListener('webrtc:ice_candidate', async (data) => {
      if (!data?.candidate || data.senderRole === userRole) return;
      const pc = pcRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {}
      } else {
        iceCandidatesQueueRef.current.push(data.candidate);
      }
    });

    registerListener('sidedock:tab_sync', (data) => {
      if (!isTeacher && data?.tab) {
        setActiveSideTab(data.tab);
      }
    });

    registerListener('chat:new_message', (msg) => {
      if (msg && msg.senderRole !== userRole) {
        setChatMessages((prev) => {
          const exists = prev.some((m) => m.id === msg.id);
          if (exists) return prev;
          return [...prev, msg];
        });
      }
    });

    registerListener('room:ping_sync', () => {
      broadcastMediaStatus(isMicOn, isCamOn);
    });

    registerListener('room:request_state', () => {
      broadcastMediaStatus(isMicOn, isCamOn);
    });
  }, [registerListener, userRole, userName, peerName, broadcast, initLocalStream, getOrCreatePeerConnection, isTeacher, isMicOn, isCamOn, broadcastMediaStatus, initiateCall]);

  useEffect(() => {
    initLocalStream().then(() => {
      if (broadcast) {
        broadcast('room:peer_joined', { senderRole: userRole, senderName: userName });
        broadcastMediaStatus(isMicOn, isCamOn);
      }
      if (isTeacher) {
        setDiagnosticSentence('Educator online, waiting for student media link...');
        const t = setTimeout(() => initiateCall(), 1200);
        return () => clearTimeout(t);
      } else {
        setDiagnosticSentence('Student online, connecting to educator stream...');
      }
    });
  }, [initLocalStream, broadcast, isTeacher, initiateCall, userRole, userName, broadcastMediaStatus, isMicOn, isCamOn]);

  // 5. Mic & Cam Toggles
  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const nextState = !audioTrack.enabled;
      audioTrack.enabled = nextState;
      setIsMicOn(nextState);
      broadcastMediaStatus(nextState, isCamOn);
    }
  };

  const toggleCam = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      const nextState = !videoTrack.enabled;
      videoTrack.enabled = nextState;
      setIsCamOn(nextState);
      broadcastMediaStatus(isMicOn, nextState);
    }
  };

  const handleTabSwitch = (tab) => {
    setActiveSideTab(tab);
    if (isTeacher && broadcast) {
      broadcast('sidedock:tab_sync', { tab });
    }
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    if (broadcast) {
      broadcast('chat:typing', { senderRole: userRole, senderName: userName });
      broadcast('peer:action_update', {
        senderRole: userRole,
        action: 'typing',
        tab: 'call_chat'
      });
    }

    if (headerActionTimeoutRef.current) clearTimeout(headerActionTimeoutRef.current);
    headerActionTimeoutRef.current = setTimeout(() => {
      if (broadcast) {
        broadcast('peer:action_update', {
          senderRole: userRole,
          action: 'idle',
          tab: 'call_chat'
        });
      }
    }, 2200);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderName: userName,
      senderRole: userRole,
      text: inputMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setInputMessage('');

    if (headerActionTimeoutRef.current) clearTimeout(headerActionTimeoutRef.current);
    if (broadcast) {
      broadcast('chat:new_message', newMsg);
      broadcast('peer:action_update', {
        senderRole: userRole,
        action: 'idle',
        tab: 'call_chat'
      });
    }
  };

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (headerActionTimeoutRef.current) {
        clearTimeout(headerActionTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border-l border-slate-800 select-none overflow-hidden text-xs">
      
      {/* 1. TOP VIDEO & AUDIO HUB */}
      <div className="border-b border-slate-800 bg-slate-900/90 shrink-0">
        
        {/* RESPONSIVE TOP BAR: Role Symbol + Diagnostic Sentence + Accordion Toggle */}
        <div className="px-2.5 py-1.5 flex items-center justify-between gap-1.5 min-w-0">
          
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Clean Role Symbol Indicator */}
            <div className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
              {isTeacher ? (
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" title="Educator Channel" />
              ) : (
                <User className="w-3.5 h-3.5 text-emerald-400" title="Student Channel" />
              )}
            </div>

            {/* Clear Descriptive Backend Diagnostic Status */}
            <div 
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-mono truncate max-w-[220px] sm:max-w-[280px] ${
                connectionStage === 'connected'
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                  : connectionStage === 'failed'
                  ? 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                  : 'bg-amber-950/60 border-amber-500/30 text-amber-300'
              }`}
              title={diagnosticSentence}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                connectionStage === 'connected' 
                  ? 'bg-emerald-400' 
                  : connectionStage === 'failed' 
                  ? 'bg-rose-500' 
                  : 'bg-amber-400 animate-ping'
              }`} />
              <span className="truncate">{diagnosticSentence}</span>
            </div>
          </div>

          {/* Video Accordion Button */}
          <button
            onClick={() => setIsVideoSectionOpen(!isVideoSectionOpen)}
            className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition shrink-0"
            title={isVideoSectionOpen ? 'Hide Video' : 'Show Video'}
          >
            {isVideoSectionOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

        </div>

        {isVideoSectionOpen && (
          <div className="px-3 pb-3 pt-1 flex flex-col gap-2">
            
            <div className="grid grid-cols-2 gap-2">
              
              {/* Card 1: Self */}
              <div className="relative aspect-video bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover mirror ${isCamOn ? 'block' : 'hidden'}`}
                />

                {!isCamOn && (
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div className="w-9 h-9 rounded-full bg-indigo-600/40 border border-indigo-500/50 flex items-center justify-center text-indigo-200 font-bold text-xs shadow">
                      You
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                      <VideoOff className="w-2.5 h-2.5 text-rose-400" /> Cam Off
                    </span>
                  </div>
                )}

                <span className="absolute bottom-1 left-1 bg-slate-950/80 backdrop-blur px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-300 border border-slate-800">
                  {userName}
                </span>

                <span className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-slate-950/80 px-1.5 py-0.5 rounded-full border border-slate-800">
                  {isMicOn ? (
                    <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] text-rose-400 font-mono">
                      <MicOff className="w-2.5 h-2.5" /> Muted
                    </span>
                  )}
                </span>
              </div>

              {/* Card 2: Remote Peer */}
              <div className="relative aspect-video bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${remoteMediaStatus.isCamOn ? 'block' : 'hidden'}`}
                />

                {!remoteMediaStatus.isCamOn && (
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
                      {peerName.charAt(0)}
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                      <VideoOff className="w-2.5 h-2.5 text-rose-400" /> Cam Off
                    </span>
                  </div>
                )}

                <span className="absolute bottom-1 left-1 bg-slate-950/80 backdrop-blur px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-300 border border-slate-800 z-10">
                  {peerName}
                </span>

                <span className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-slate-950/80 px-1.5 py-0.5 rounded-full border border-slate-800 z-10">
                  {remoteMediaStatus.isMicOn ? (
                    <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] text-rose-400 font-mono">
                      <MicOff className="w-2.5 h-2.5" /> Muted
                    </span>
                  )}
                </span>
              </div>

            </div>

            {/* Media Action Controls */}
            <div className="flex items-center justify-center gap-3 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-inner">
              <button
                onClick={toggleMic}
                className={`p-2 rounded-lg transition ${
                  isMicOn 
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
                title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
              >
                {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-rose-400" />}
              </button>

              <button
                onClick={toggleCam}
                className={`p-2 rounded-lg transition ${
                  isCamOn 
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
                title={isCamOn ? 'Turn Off Cam' : 'Turn On Cam'}
              >
                {isCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-rose-400" />}
              </button>

              <button
                disabled
                className="p-2 rounded-lg transition bg-slate-900/60 text-slate-600 border border-slate-800 cursor-not-allowed relative"
                title="Screen Share (Coming Soon)"
              >
                <Monitor className="w-4 h-4" />
                <span className="absolute -top-1.5 -right-1.5 bg-slate-800 text-[8px] font-mono text-slate-400 border border-slate-700 px-1 rounded-full whitespace-nowrap scale-90">
                  Soon
                </span>
              </button>
            </div>

          </div>
        )}
      </div>

      {/* 2. SUB-TAB SWITCHER */}
      <div className="p-2 border-b border-slate-800 bg-slate-950/60 shrink-0">
        <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => handleTabSwitch('chat')}
            className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeSideTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Live Chat</span>
          </button>

          <button
            onClick={() => handleTabSwitch('screen')}
            className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeSideTab === 'screen'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Screen View</span>
          </button>
        </div>
      </div>

      {/* 3. SUB-TAB CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative flex flex-col min-h-0 bg-slate-950/30">
        {activeSideTab === 'chat' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
              {chatMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center p-4">
                  <p className="text-[11px] text-slate-500 font-mono">
                    No doubts yet. Send a message to get started!
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMine = msg.senderRole === userRole;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1 text-[9px] text-slate-400 mb-0.5 px-1 font-mono">
                        <span>{msg.senderName}</span>
                        <span>•</span>
                        <span>{msg.time}</span>
                      </div>
                      <div
                        className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-xs break-words shadow-sm ${
                          isMine
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-800 bg-slate-900 shrink-0 flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Type message..."
                value={inputMessage}
                onChange={handleInputChange}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-xl transition shadow"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {activeSideTab === 'screen' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-2">
            <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center relative shadow-inner">
              <div className="text-center p-4 space-y-1">
                <Monitor className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-[11px] font-bold text-slate-400">Screen View Coming Soon</p>
                <p className="text-[10px] text-slate-600">
                  Screen sharing will be enabled after video calling stability checks.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}