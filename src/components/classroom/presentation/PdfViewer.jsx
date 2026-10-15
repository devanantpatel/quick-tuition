import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ZoomIn, ZoomOut, RotateCcw, FileText, Presentation, 
  Trash2, ExternalLink, Lock, Eye, MonitorPlay
} from 'lucide-react';

export default function PdfViewer({ 
  documents = [], 
  activeDocIndex = 0, 
  onSelectDoc, 
  onRemoveDoc,
  isTeacher = false, 
  broadcast, 
  registerListener 
}) {
  const teacherScrollRef = useRef(null);
  const [zoom, setZoom] = useState(100);

  const [studentBroadcastState, setStudentBroadcastState] = useState({
    activeDocName: '',
    docType: 'pdf',
    scrollRatio: 0,
    zoomLevel: 100
  });

  const activeDoc = documents[activeDocIndex] || null;
  const isPdf = activeDoc?.url?.endsWith('.pdf') || activeDoc?.url?.startsWith('data:application/pdf') || activeDoc?.type === 'pdf';
  const isPpt = activeDoc?.name?.toLowerCase().endsWith('.ppt') || activeDoc?.name?.toLowerCase().endsWith('.pptx');

  // Teacher Side Only: Office Viewer Memoized
  const msOfficeViewerUrl = useMemo(() => {
    if (!activeDoc?.url || !isTeacher) return null;
    const isPublic = activeDoc.url.startsWith('http://') || activeDoc.url.startsWith('https://');
    return isPublic ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(activeDoc.url)}` : null;
  }, [activeDoc?.url, isTeacher]);

  // 1. STUDENT SIDE: Realtime Broadcast Receiver
  useEffect(() => {
    if (isTeacher || !registerListener) return;

    registerListener('presentation:live_broadcast_frame', (frameData) => {
      if (frameData) {
        setStudentBroadcastState(frameData);
      }
    });
  }, [registerListener, isTeacher]);

  // 2. TEACHER SIDE: Broadcast State Sender
  const broadcastLiveFrame = useCallback((override = {}) => {
    if (!isTeacher || !broadcast || !activeDoc) return;

    let currentRatio = 0;
    if (teacherScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = teacherScrollRef.current;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll > 0) currentRatio = scrollTop / maxScroll;
    }

    const payload = {
      activeDocName: activeDoc.name,
      docType: isPpt ? 'ppt' : 'pdf',
      scrollRatio: override.scrollRatio !== undefined ? override.scrollRatio : currentRatio,
      zoomLevel: override.zoom !== undefined ? override.zoom : zoom,
      url: activeDoc.url
    };

    broadcast('presentation:live_broadcast_frame', payload);
  }, [isTeacher, broadcast, activeDoc, isPpt, zoom]);

  const handleTeacherScroll = (e) => {
    if (!isTeacher) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll <= 0) return;
    broadcastLiveFrame({ scrollRatio: scrollTop / maxScroll });
  };

  useEffect(() => {
    if (isTeacher && activeDoc) {
      broadcastLiveFrame();
    }
  }, [activeDocIndex, zoom, isTeacher, activeDoc, broadcastLiveFrame]);

  // ----------------------------------------------------
  // A. STUDENT VIEW (Lightweight Live Broadcast Display)
  // ----------------------------------------------------
  if (!isTeacher) {
    return (
      <div className="relative w-full h-full flex flex-col bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 select-none">
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white font-bold flex items-center gap-1.5 font-mono text-[11px]">
              <MonitorPlay className="w-3.5 h-3.5 text-indigo-400" />
              LIVE BROADCAST
            </span>
            <span className="text-slate-400 truncate max-w-[200px]">
              {studentBroadcastState.activeDocName || activeDoc?.name || 'Classroom Stream'}
            </span>
          </div>

          <span className="text-[10px] text-indigo-300 bg-indigo-950/80 border border-indigo-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-semibold">
            <Lock className="w-2.5 h-2.5" /> Auto-Follow Teacher Screen
          </span>
        </div>

        <div className="flex-1 w-full h-full overflow-hidden relative flex items-center justify-center bg-slate-950 p-2">
          {activeDoc?.url ? (
            <div 
              className="w-full h-full rounded-xl overflow-hidden bg-white shadow-2xl relative transition-transform duration-100"
              style={{ transform: `scale(${studentBroadcastState.zoomLevel / 100})` }}
            >
              {studentBroadcastState.docType === 'ppt' ? (
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(activeDoc.url)}`}
                  title="PPT Stream"
                  className="w-full h-full border-0 pointer-events-none"
                />
              ) : (
                <iframe
                  src={`${activeDoc.url}#toolbar=0&navpanes=0`}
                  title="PDF Stream"
                  className="w-full h-full border-0 pointer-events-none"
                />
              )}
            </div>
          ) : (
            <div className="text-center p-8 text-slate-500 space-y-2">
              <Eye className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
              <p className="text-xs">Waiting for educator to share slide or document...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // B. TEACHER VIEW (Interactive Controls & Uploads)
  // ----------------------------------------------------
  if (!activeDoc) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
        <FileText className="w-12 h-12 text-slate-700 mb-2" />
        <p className="text-xs">No active presentation. Upload a document from the tray.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
      
      {/* 1. TOP DOCUMENT TRAY */}
      <div className="bg-slate-950 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto shrink-0 select-none">
        
        {/* Document Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {documents.map((doc, idx) => (
            <button
              key={doc.id || idx}
              onClick={() => onSelectDoc(idx)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition border shrink-0 ${
                activeDocIndex === idx
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              {doc.name.toLowerCase().includes('ppt') ? (
                <Presentation className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span className="truncate max-w-[120px]">{doc.name}</span>
              {documents.length > 1 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDoc(idx);
                  }}
                  className="hover:text-rose-300 ml-1 p-0.5 rounded cursor-pointer"
                  title="Remove document"
                >
                  <Trash2 className="w-3 h-3" />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
          <button 
            onClick={() => setZoom(prev => Math.max(50, prev - 15))}
            className="p-1 text-slate-400 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[10px] text-slate-300 px-1">{zoom}%</span>
          <button 
            onClick={() => setZoom(prev => Math.min(200, prev + 15))}
            className="p-1 text-slate-400 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => setZoom(100)}
            className="p-1 text-slate-400 hover:text-indigo-400"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. TEACHER INTERACTIVE VIEWPORT */}
      <div 
        ref={teacherScrollRef}
        onScroll={handleTeacherScroll}
        className="flex-1 w-full h-full bg-slate-950 p-2 overflow-y-auto overflow-x-hidden relative"
      >
        <div 
          className="w-full min-h-full flex items-center justify-center transition-transform origin-top"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          {isPdf ? (
            <div className="w-full h-[95vh] rounded-xl overflow-hidden bg-white shadow-2xl">
              <iframe
                key={activeDoc.url}
                src={`${activeDoc.url}#toolbar=0&navpanes=0`}
                title={activeDoc.name}
                className="w-full h-full border-0"
              />
            </div>
          ) : isPpt && msOfficeViewerUrl ? (
            <div className="w-full h-[95vh] rounded-xl overflow-hidden bg-white shadow-2xl">
              <iframe
                key={activeDoc.url}
                src={msOfficeViewerUrl}
                title={activeDoc.name}
                className="w-full h-full border-0"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl max-w-md space-y-3">
              <Presentation className="w-12 h-12 text-amber-400 mx-auto" />
              <h4 className="text-white font-bold text-sm">{activeDoc.name}</h4>
              <p className="text-slate-400 text-xs">
                File is uploaded. Open locally if preview is taking time.
              </p>
              <a
                href={activeDoc.url}
                download={activeDoc.name}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open / Download PPT</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}