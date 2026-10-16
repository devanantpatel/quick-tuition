import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, ChevronUp, ChevronDown, 
  MessageSquare, Tv, Send, Lock, RotateCcw
} from 'lucide-react';

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
  const [isVideoSectionOpen, setIsVideoSectionOpen] = useState(true);
  const [activeSideTab, setActiveSideTab] = useState('chat'); // 'chat' | 'screen'

  // Connection & Sync Health: 'connected' | 'connecting' | 'disconnected'
  const [syncHealth, setSyncHealth] = useState('connecting');
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Local Media State
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Remote Media Status
  const [remoteMediaStatus, setRemoteMediaStatus] = useState({
    isMicOn: false,
    isCamOn: false
  });

  // Screen Share Mutex Lock
  const [activePresenterRole, setActivePresenterRole] = useState(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');

  // WebRTC References
  const localCamStreamRef = useRef(null);
  const localScreenStreamRef = useRef(null);
  const remoteCamStreamRef = useRef(null);
  const remoteScreenStreamRef = useRef(null);

  const pcRef = useRef(null);
  const iceCandidatesQueueRef = useRef([]);
  const isNegotiatingRef = useRef(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenVideoRef = useRef(null);

  const userRole = currentUser?.role || (isTeacher ? 'teacher' : 'student');
  const userName = currentUser?.name || (isTeacher ? 'Teacher' : 'Student');
  const peerName = isTeacher ? 'Student' : (tutorName || 'Teacher');

  const isSomeoneElsePresenting = Boolean(activePresenterRole && activePresenterRole !== userRole);

  // Broadcast Local Media State
  const broadcastMediaStatus = useCallback((micState, camState) => {
    if (broadcast) {
      broadcast('media:status_change', {
        senderRole: userRole,
        isMicOn: micState,
        isCamOn: camState
      });
    }
  }, [broadcast, userRole]);

  // 1. Initialize Local Webcam & Mic Stream
  const initLocalCamStream = useCallback(async () => {
    if (localCamStreamRef.current) return localCamStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 24 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Maintain user's current mute/video state
      stream.getVideoTracks().forEach((t) => { t.enabled = isCamOn; });
      stream.getAudioTracks().forEach((t) => { t.enabled = isMicOn; });

      localCamStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.warn('Webcam fallback to audio-only:', err);
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioOnly.getAudioTracks().forEach((t) => { t.enabled = isMicOn; });
        localCamStreamRef.current = audioOnly;
        return audioOnly;
      } catch (e) {
        return null;
      }
    }
  }, [isCamOn, isMicOn]);

  // 2. WebRTC Peer Connection with Strict Stream ID Separation
  const getOrCreatePeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Attach local camera stream with explicit ID 'cam_stream'
    if (localCamStreamRef.current) {
      localCamStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localCamStreamRef.current);
      });
    }

    // Attach screen stream if already active
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localScreenStreamRef.current);
      });
    }

    // Route Incoming Tracks strictly by stream identity
    pc.ontrack = (event) => {
      const incomingStream = event.streams[0] || new MediaStream([event.track]);
      const track = event.track;

      if (track.kind === 'video') {
        // Agar incoming video screen share ki hai
        const isScreenTrack = track.label.toLowerCase().includes('screen') || 
                              incomingStream.id.includes('screen') || 
                              Boolean(activePresenterRole && activePresenterRole !== userRole);

        if (isScreenTrack) {
          remoteScreenStreamRef.current = incomingStream;
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = incomingStream;
            screenVideoRef.current.play().catch(() => {});
          }
        } else {
          // Camera video strictly goes to top webcam card
          remoteCamStreamRef.current = incomingStream;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = incomingStream;
            remoteVideoRef.current.play().catch(() => {});
          }
        }
      } else if (track.kind === 'audio') {
        const audioEl = document.getElementById('remote-peer-audio') || document.createElement('audio');
        audioEl.id = 'remote-peer-audio';
        audioEl.srcObject = incomingStream;
        audioEl.autoplay = true;
        if (!document.body.contains(audioEl)) {
          document.body.appendChild(audioEl);
        }
        audioEl.play().catch(() => {});
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

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setSyncHealth('connected');
      } else if (pc.connectionState === 'connecting') {
        setSyncHealth('connecting');
      } else if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        setSyncHealth('disconnected');
        pc.restartIce();
      }
    };

    return pc;
  }, [broadcast, userRole, activePresenterRole]);

  // 3. Negotiation Engine
  const sendNegotiationOffer = useCallback(async () => {
    if (isNegotiatingRef.current) return;
    try {
      isNegotiatingRef.current = true;
      const pc = getOrCreatePeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (broadcast) {
        broadcast('webrtc:offer', {
          sdp: offer,
          senderRole: userRole
        });
      }
    } catch (e) {
      console.error('Offer negotiation failed:', e);
    } finally {
      isNegotiatingRef.current = false;
    }
  }, [getOrCreatePeerConnection, broadcast, userRole]);

  // Force Resync / Doctor Action
  const handleManualForceSync = async () => {
    setIsManualSyncing(true);
    setSyncHealth('connecting');
    try {
      const pc = pcRef.current;
      if (pc) {
        pc.restartIce();
      }
      await sendNegotiationOffer();
      broadcastMediaStatus(isMicOn, isCamOn);

      if (broadcast) {
        broadcast('room:ping_sync', { senderRole: userRole });
      }

      if (remoteVideoRef.current && remoteCamStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteCamStreamRef.current;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (screenVideoRef.current && (remoteScreenStreamRef.current || localScreenStreamRef.current)) {
        screenVideoRef.current.srcObject = remoteScreenStreamRef.current || localScreenStreamRef.current;
        screenVideoRef.current.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Manual sync retry error:', e);
    } finally {
      setTimeout(() => setIsManualSyncing(false), 800);
    }
  };

  // 4. Signaling Listeners
  useEffect(() => {
    if (!registerListener) return;

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
      await initLocalCamStream();
      const pc = getOrCreatePeerConnection();

      try {
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
            senderRole: userRole
          });
        }
      } catch (err) {
        console.error('Answer setting error:', err);
      }
    });

    registerListener('webrtc:answer', async (data) => {
      if (!data?.sdp || data.senderRole === userRole) return;
      const pc = pcRef.current;
      if (pc && pc.signalingState !== 'stable') {
        try {
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

    // Screen Share Synchronizer (Directs view strictly to Screen View tab)
    registerListener('screen:status', (data) => {
      if (data) {
        if (data.isActive) {
          setActivePresenterRole(data.senderRole);
          setActiveSideTab('screen');
        } else {
          setActivePresenterRole(null);
          remoteScreenStreamRef.current = null;
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
          }
          if (data.senderRole !== userRole) {
            setActiveSideTab('chat');
          }
        }
      }
    });

    registerListener('chat:new_message', (msg) => {
      if (msg && msg.senderRole !== userRole) {
        setChatMessages((prev) => [...prev, msg]);
      }
    });

    registerListener('room:ping_sync', () => {
      broadcastMediaStatus(isMicOn, isCamOn);
    });

    registerListener('room:request_state', () => {
      broadcastMediaStatus(isMicOn, isCamOn);
    });
  }, [registerListener, userRole, broadcast, initLocalCamStream, getOrCreatePeerConnection, isTeacher, isMicOn, isCamOn, broadcastMediaStatus]);

  // Initial call start
  useEffect(() => {
    initLocalCamStream().then(() => {
      if (isTeacher) {
        const timeout = setTimeout(() => {
          sendNegotiationOffer();
        }, 1200);
        return () => clearTimeout(timeout);
      }
    });
  }, [initLocalCamStream, isTeacher, sendNegotiationOffer]);

  // 5. Mic & Camera Toggles
  const toggleMic = () => {
    if (!localCamStreamRef.current) return;
    const audioTrack = localCamStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const nextState = !audioTrack.enabled;
      audioTrack.enabled = nextState;
      setIsMicOn(nextState);
      broadcastMediaStatus(nextState, isCamOn);
    }
  };

  const toggleCam = () => {
    if (!localCamStreamRef.current) return;
    const videoTrack = localCamStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      const nextState = !videoTrack.enabled;
      videoTrack.enabled = nextState;
      setIsCamOn(nextState);
      broadcastMediaStatus(isMicOn, nextState);
    }
  };

  // 6. Toggle Screen Share with Mutex (Presentation strictly in Screen View)
  const toggleScreenShare = async () => {
    if (isSomeoneElsePresenting) {
      alert(`${activePresenterRole === 'teacher' ? 'Educator' : 'Student'} is already presenting.`);
      return;
    }

    if (isScreenSharing) {
      setIsScreenSharing(false);
      setActivePresenterRole(null);
      setActiveSideTab('chat');

      if (localScreenStreamRef.current) {
        localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
        localScreenStreamRef.current = null;
      }

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }

      const pc = pcRef.current;
      if (pc) {
        const senders = pc.getSenders();
        senders.forEach((s) => {
          if (s.track && s.track.label.toLowerCase().includes('screen')) {
            pc.removeTrack(s);
          }
        });
      }

      await sendNegotiationOffer();

      if (broadcast) {
        broadcast('screen:status', { isActive: false, senderRole: userRole });
        broadcast('sidedock:tab_sync', { tab: 'chat' });
      }
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', frameRate: { ideal: 30 } },
        audio: false
      });

      localScreenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      setIsScreenSharing(true);
      setActivePresenterRole(userRole);
      setActiveSideTab('screen');

      // Presenter sees their own screen inside Screen View container
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = screenStream;
        screenVideoRef.current.play().catch(() => {});
      }

      const pc = getOrCreatePeerConnection();
      pc.addTrack(screenTrack, screenStream);

      await sendNegotiationOffer();

      if (broadcast) {
        broadcast('screen:status', { isActive: true, senderRole: userRole });
        broadcast('sidedock:tab_sync', { tab: 'screen' });
      }

      screenTrack.onended = () => {
        setIsScreenSharing(false);
        setActivePresenterRole(null);
        setActiveSideTab('chat');
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = null;
        }
        if (broadcast) {
          broadcast('screen:status', { isActive: false, senderRole: userRole });
          broadcast('sidedock:tab_sync', { tab: 'chat' });
        }
      };
    } catch (err) {
      console.warn('Screen share canceled or denied:', err);
    }
  };

  const handleTabSwitch = (tab) => {
    setActiveSideTab(tab);
    if (isTeacher && broadcast) {
      broadcast('sidedock:tab_sync', { tab });
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
      if (localCamStreamRef.current) {
        localCamStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (localScreenStreamRef.current) {
        localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border-l border-slate-800 select-none overflow-hidden text-xs">
      
      {/* 1. TOP VIDEO & AUDIO HUB (WEBCAM & AUDIO CALLS ONLY) */}
      <div className="border-b border-slate-800 bg-slate-900/90 shrink-0">
        <div className="px-3 py-2 flex items-center justify-between">
          
          {/* Header Title + Realtime Sync Health Indicator */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-200 text-xs">Video & Audio</span>
            
            <div 
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-mono transition ${
                syncHealth === 'connected'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : syncHealth === 'connecting'
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}
              title={`Call Sync Health: ${syncHealth}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                syncHealth === 'connected' 
                  ? 'bg-emerald-400' 
                  : syncHealth === 'connecting' 
                  ? 'bg-amber-400 animate-ping' 
                  : 'bg-rose-500'
              }`} />
              <span className="hidden sm:inline">
                {syncHealth === 'connected' ? 'Live' : syncHealth === 'connecting' ? 'Connecting' : 'Reconnecting'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Manual Doctor / Enforce Sync Button */}
            <button
              onClick={handleManualForceSync}
              disabled={isManualSyncing}
              className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
              title="Resync / Refresh Call & Screen Connection"
            >
              <RotateCcw className={`w-3 h-3 ${isManualSyncing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {/* Accordion Collapse */}
            <button
              onClick={() => setIsVideoSectionOpen(!isVideoSectionOpen)}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] transition"
            >
              <span>{isVideoSectionOpen ? 'Hide Video' : 'Show Video'}</span>
              {isVideoSectionOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {isVideoSectionOpen && (
          <div className="px-3 pb-3 flex flex-col gap-2">
            
            {/* 2 Dedicated Webcam Cards */}
            <div className="grid grid-cols-2 gap-2">
              
              {/* Card 1: Self ("You") */}
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

              {/* Card 2: Remote Peer (Strictly Webcam Only) */}
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
                disabled={isSomeoneElsePresenting}
                onClick={toggleScreenShare}
                className={`p-2 rounded-lg transition relative ${
                  isScreenSharing 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500' 
                    : isSomeoneElsePresenting
                    ? 'bg-slate-950 text-slate-600 border border-slate-800/60 cursor-not-allowed opacity-50'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
                title={
                  isSomeoneElsePresenting 
                    ? `${activePresenterRole === 'teacher' ? 'Educator' : 'Student'} is already presenting` 
                    : isScreenSharing 
                    ? 'Stop Screen Share' 
                    : 'Share Screen'
                }
              >
                <Monitor className="w-4 h-4" />
                {isSomeoneElsePresenting && (
                  <span className="absolute -top-1 -right-1 bg-amber-500/90 text-slate-950 p-0.5 rounded-full">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                )}
              </button>
            </div>

          </div>
        )}
      </div>

      {/* 2. SYNCHRONIZED SUB-TAB SWITCHER */}
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
            {activePresenterRole && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-0.5" />
            )}
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
                onChange={(e) => setInputMessage(e.target.value)}
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

        {/* TAB 2: LOCKED SCREEN PRESENTATION AREA (Both Presenter & Viewer see screen here) */}
        {activeSideTab === 'screen' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-2">
            <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center relative shadow-inner">
              
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-contain ${
                  isScreenSharing || activePresenterRole ? 'block' : 'hidden'
                }`}
              />

              {!isScreenSharing && !activePresenterRole && (
                <div className="text-center p-4 space-y-1">
                  <Monitor className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-[11px] font-bold text-slate-400">Screen View Inactive</p>
                  <p className="text-[10px] text-slate-600">
                    Click the monitor button above to present your screen.
                  </p>
                </div>
              )}

              {activePresenterRole && (
                <span className="absolute top-2 left-2 bg-slate-950/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 border border-emerald-500/30 flex items-center gap-1 z-20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    Viewing {activePresenterRole === userRole ? 'Your Screen' : `${activePresenterRole === 'teacher' ? 'Educator' : 'Student'}'s Screen`}
                  </span>
                </span>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}