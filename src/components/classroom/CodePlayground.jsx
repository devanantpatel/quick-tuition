import React, { useState, useEffect } from 'react';
import { Code2, ExternalLink, Lock, Unlock, RefreshCw, Maximize2, Minimize2, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function CodePlayground({
  isStudentCodeAllowed,
  setIsStudentCodeAllowed,
  broadcast,
  registerListener,
  isTeacher
}) {
  const { activeSession } = useApp();
  const roomId = activeSession?.id ? `ide_room_${activeSession.id}` : 'ide_room_default';

  // Room Persistence Cache
  const [reloadKey, setReloadKey] = useState(() => {
    return Number(sessionStorage.getItem(`${roomId}_key`)) || 0;
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  const canEdit = isTeacher || Boolean(isStudentCodeAllowed);

  // Full IDE URL with Horizontal File Scroll and Dark Theme
  const ideEmbedUrl = 'https://onecompiler.com/embed?theme=dark&listenToEvents=true&hideLanguageSelection=false&hideNew=false';

  useEffect(() => {
    sessionStorage.setItem(`${roomId}_key`, reloadKey.toString());
  }, [reloadKey, roomId]);

  const handleReset = () => {
    const next = reloadKey + 1;
    setReloadKey(next);
    if (isTeacher && broadcast) {
      broadcast('ide:force_reload', { reloadKey: next });
    }
  };

  useEffect(() => {
    if (!registerListener) return;
    registerListener('ide:force_reload', (data) => {
      if (!isTeacher && data?.reloadKey) {
        setReloadKey(data.reloadKey);
      }
    });
  }, [registerListener, isTeacher]);

  return (
    <div className={`flex flex-col h-full w-full bg-[#1e1e1e] overflow-hidden select-none relative ${
      isFullscreen ? 'fixed inset-0 z-50' : ''
    }`}>
      
      {/* Top Header Controls (Collapsible for Maximum Screen) */}
      {!isHeaderCollapsed && (
        <div className="h-10 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between shrink-0 text-xs">
          
          {/* Left Side: Branding & Lock */}
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200 text-xs">Cloud Code IDE</span>
            
            {isTeacher && (
              <button
                onClick={() => setIsStudentCodeAllowed(!isStudentCodeAllowed)}
                className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition ${
                  isStudentCodeAllowed
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {isStudentCodeAllowed ? <Unlock className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3" />}
                <span>Student Access: {isStudentCodeAllowed ? 'Allowed' : 'Locked'}</span>
              </button>
            )}
          </div>

          {/* Right Side: Tools & Fullscreen */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px] px-2"
              title="Reset IDE"
            >
              <RefreshCw className="w-3 h-3 text-indigo-400" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px] px-2 font-medium"
              title={isFullscreen ? 'Exit Fullscreen' : 'Expand IDE'}
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3 text-amber-400" /> : <Maximize2 className="w-3 h-3 text-indigo-400" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Minimize' : 'Maximize'}</span>
            </button>

            <button
              onClick={() => setIsHeaderCollapsed(true)}
              className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
              title="Hide top bar"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Expand button when header is hidden */}
      {isHeaderCollapsed && (
        <button
          onClick={() => setIsHeaderCollapsed(false)}
          className="absolute top-2 right-4 z-40 bg-slate-900/90 border border-slate-700 p-1.5 rounded-lg text-slate-300 hover:text-white shadow-xl flex items-center gap-1 text-xs"
          title="Show Top Bar"
        >
          <Eye className="w-3.5 h-3.5 text-indigo-400" />
          <span>Show Controls</span>
        </button>
      )}

      {/* Embedded IDE Container with Horizontal Scroll Enabled for Multiple Tabs */}
      <div className="flex-1 w-full h-full relative overflow-x-auto overflow-y-hidden bg-[#1e1e1e]">
        <iframe
          key={reloadKey}
          src={ideEmbedUrl}
          title="Online Multi-File Cloud IDE"
          className={`w-full h-full min-w-[320px] border-none bg-[#1e1e1e] ${
            !canEdit ? 'pointer-events-none opacity-85' : ''
          }`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
        />

        {/* Locked Banner for Student */}
        {!canEdit && (
          <div className="absolute bottom-3 right-3 bg-slate-900/95 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300 flex items-center gap-2 shadow-2xl z-30">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>IDE view-only (Locked by educator)</span>
          </div>
        )}
      </div>

    </div>
  );
}