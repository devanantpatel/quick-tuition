import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, ChevronUp, ChevronDown, 
  MessageSquare, Tv, Send, RotateCcw
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

  // Connection & Activity Statuses in Full Readable Sentences
  const [connectionStage, setConnectionStage] = useState('idle'); // 'idle' | 'signaling' | 'ice' | 'connected' | 'reconnecting' | 'failed'
  const [leftDiagnosticSentence, setLeftDiagnosticSentence] = useState('Checking classroom status...');
  const [centerPeerActionSentence, setCenterPeerActionSentence] = useState('Waiting for peer...');
  const [isManualSyncing, setIsManualSyncing] = useState(false);

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
  const pcRef = useRef(null);
  const iceCandidatesQueueRef = useRef([]);
  const typingTimeoutRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const userRole = currentUser?.role || (isTeacher ? 'teacher' : 'student');
  const userName = currentUser?.name || (isTeacher ? 'Teacher' : 'Student');
  const peerName = isTeacher ? 'Student' : (tutorName || 'Teacher');

  // Auto-Save Chat to Storage
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
      setLeftDiagnosticSentence('Accessing camera and microphone...');
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
      setLeftDiagnosticSentence('Devices initialized successfully');
      return stream;
    } catch (err) {
      console.warn('Media fallback to audio:', err);
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioOnly.getAudioTracks().forEach((t) => { t.enabled = isMicOn; });
        localStreamRef.current = audioOnly;
        setLeftDiagnosticSentence('Audio only initialized (Camera blocked)');
        return audioOnly;
      } catch (e) {
        setLeftDiagnosticSentence('Device access denied by browser');
        return null;
      }
    }
  }, [isCamOn, isMicOn]);

  // 2. WebRTC Peer Connection Factory
  const getOrCreatePeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    setConnectionStage('signaling');
    setLeftDiagnosticSentence('Negotiating secure peer connection...');

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      setLeftDiagnosticSentence('Audio and video streams established');
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
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
        setLeftDiagnosticSentence('Verifying network ICE connection...');
      } else if (state === 'connected' || state === 'completed') {
        setConnectionStage('connected');
        setLeftDiagnosticSentence('Connected: Audio & video live');
      } else if (state === 'disconnected') {
        setConnectionStage('reconnecting');
        setLeftDiagnosticSentence('Network interrupted, reconnecting...');
      } else if (state === 'failed') {
        setConnectionStage('failed');
        setLeftDiagnosticSentence('Connection failed, restarting ICE...');
        pc.restartIce();
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setConnectionStage('connected');
        setLeftDiagnosticSentence('Connected: Live sync active');
      } else if (['failed', 'closed'].includes(pc.connectionState)) {
        setConnectionStage('failed');
        setLeftDiagnosticSentence('Peer disconnected from room');
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
      setLeftDiagnosticSentence('Sending call offer to peer...');

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
      setLeftDiagnosticSentence('Signaling offer generation failed');
    }
  }, [initLocalStream, getOrCreatePeerConnection, broadcast, userRole, userName]);

  // 4. Force Resync All Backend Services & WebRTC
  const handleForceResyncServices = async () => {
    setIsManualSyncing(true);
    setLeftDiagnosticSentence('Forcing full backend & WebRTC resync...');
    try {
      const saved = localStorage.getItem(chatStorageKey);
      if (saved) {
        setChatMessages(JSON.parse(saved));
      }

      const pc = pcRef.current;
      if (pc) {
        pc.restartIce();
      }
      await initiateCall();

      broadcastMediaStatus(isMicOn, isCamOn);

      if (broadcast) {
        broadcast('room:request_state', { senderRole: userRole });
      }

      setLeftDiagnosticSentence('Backend services resynced');
    } catch (e) {
      setLeftDiagnosticSentence('Resync error, retrying...');
    } finally {
      setTimeout(() => setIsManualSyncing(false), 800);
    }
  };

  // 5. Realtime Listeners for Rejoin & State Recovery
  useEffect(() => {
    if (!registerListener) return;

    registerListener('room:peer_joined', async (data) => {
      if (data && data.senderRole !== userRole) {
        setCenterPeerActionSentence(`${data.senderName || peerName} joined the room`);
        setLeftDiagnosticSentence('Peer rejoined, auto-reconnecting call...');
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

        const pName = data.senderName || peerName;
        if (!data.isCamOn && !data.isMicOn) {
          setCenterPeerActionSentence(`${pName} turned off camera and muted mic`);
        } else if (!data.isCamOn) {
          setCenterPeerActionSentence(`${pName} turned off camera`);
        } else if (!data.isMicOn) {
          setCenterPeerActionSentence(`${pName} is muted`);
        } else {
          setCenterPeerActionSentence(`${pName} turned on camera and mic`);
        }
      }
    });

    registerListener('chat:typing', (data) => {
      if (data && data.senderRole !== userRole) {
        setCenterPeerActionSentence(`${data.senderName || peerName} is typing a message...`);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setCenterPeerActionSentence(`${peerName} is in room`);
        }, 2200);
      }
    });

    registerListener('webrtc:offer', async (data) => {
      if (!data?.sdp || data.senderRole === userRole) return;
      await initLocalStream();
      const pc = getOrCreatePeerConnection();

      try {
        setConnectionStage('signaling');
        setLeftDiagnosticSentence('Call offer received, generating answer...');
        setCenterPeerActionSentence(`${data.senderName || peerName} is connecting...`);

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
          setLeftDiagnosticSentence('Handshake confirmed with peer');
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
        setCenterPeerActionSentence(`${msg.senderName} sent a message`);
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
      }
      if (isTeacher) {
        setCenterPeerActionSentence('Waiting for student to connect...');
        const t = setTimeout(() => initiateCall(), 1200);
        return () => clearTimeout(t);
      } else {
        setCenterPeerActionSentence('Connected as student');
      }
    });
  }, [initLocalStream, broadcast, isTeacher, initiateCall, userRole, userName]);

  // 6. Mic & Cam Toggles
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
    }
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

    if (broadcast) {
      broadcast('chat:new_message', newMsg);
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
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border-l border-slate-800 select-none overflow-hidden text-xs">
      
      {/* 1. TOP VIDEO & AUDIO HUB */}
      <div className="border-b border-slate-800 bg-slate-900/90 shrink-0">
        
        {/* RESPONSIVE TOP BAR */}
        <div className="px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-1.5 min-w-0">
          
          {/* Top Row: Resync Icon Button + Left Diagnostic Status + Hide Icon Button */}
          <div className="flex items-center justify-between w-full min-w-0 gap-1.5">
            
            {/* Left: Icon-Only Resync Button + Left Diagnostic Sentence */}
            <div className="flex items-center gap-1.5 min-w-0 shrink">
              <button
                onClick={handleForceResyncServices}
                disabled={isManualSyncing}
                className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-indigo-400 transition shrink-0"
                title="Force-resync call, chat & backend services"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin text-indigo-400' : ''}`} />
              </button>

              <div 
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono truncate max-w-[130px] sm:max-w-[170px] ${
                  connectionStage === 'connected'
                    ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                    : connectionStage === 'failed'
                    ? 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                    : 'bg-amber-950/60 border-amber-500/30 text-amber-300'
                }`}
                title={leftDiagnosticSentence}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  connectionStage === 'connected' 
                    ? 'bg-emerald-400' 
                    : connectionStage === 'failed' 
                    ? 'bg-rose-500' 
                    : 'bg-amber-400 animate-ping'
                }`} />
                <span className="truncate">{leftDiagnosticSentence}</span>
              </div>
            </div>

            {/* Right: Icon-Only Hide/Show Accordion Button */}
            <button
              onClick={() => setIsVideoSectionOpen(!isVideoSectionOpen)}
              className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition shrink-0"
              title={isVideoSectionOpen ? 'Hide Video' : 'Show Video'}
            >
              {isVideoSectionOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Under-Row (Centered on compact / narrow space): Student & Teacher Interaction Indicator */}
          <div className="w-full flex items-center justify-center pt-0.5">
            <span 
              className="text-[10px] font-mono text-slate-300 truncate text-center w-full bg-slate-950/80 border border-slate-800/80 px-2 py-0.5 rounded shadow-inner"
              title={centerPeerActionSentence}
            >
              {centerPeerActionSentence}
            </span>
          </div>

        </div>

        {isVideoSectionOpen && (
          <div className="px-3 pb-3 pt-1 flex flex-col gap-2">
            
            {/* 2 Webcam Cards */}
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

              {/* Screen Share (Coming Soon) */}
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
        
        {/* TAB 1: LIVE CHAT */}
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

        {/* TAB 2: SCREEN VIEW */}
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