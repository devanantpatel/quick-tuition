import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Upload, Trash2, Eye, MousePointer } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function PresentationViewer({ broadcast, registerListener, isTeacher, currentUser }) {
  const { activeSession } = useApp();
  const roomId = activeSession?.id ? `pdf_cache_${activeSession.id}` : 'pdf_cache_default';

  const [pdfDataUrl, setPdfDataUrl] = useState(() => {
    try {
      return localStorage.getItem(`${roomId}_data`) || '';
    } catch (e) {
      return '';
    }
  });

  const [pdfName, setPdfName] = useState(() => {
    try {
      return localStorage.getItem(`${roomId}_name`) || '';
    } catch (e) {
      return '';
    }
  });

  // Pointer Activation Mode (Ensures iframe clicks vs pointer coordination)
  const [isLaserActive, setIsLaserActive] = useState(true);
  const [peerPointer, setPeerPointer] = useState(null);
  const pointerTimeoutRef = useRef(null);
  const lastSendTimeRef = useRef(0);

  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  // LocalStorage Room Cache
  useEffect(() => {
    try {
      if (pdfDataUrl) {
        localStorage.setItem(`${roomId}_data`, pdfDataUrl);
        localStorage.setItem(`${roomId}_name`, pdfName);
      } else {
        localStorage.removeItem(`${roomId}_data`);
        localStorage.removeItem(`${roomId}_name`);
      }
    } catch (e) {}
  }, [pdfDataUrl, pdfName, roomId]);

  // Realtime Listeners
  useEffect(() => {
    if (!registerListener) return;

    registerListener('pdf:load_document', (data) => {
      if (!isTeacher && data?.dataUrl) {
        setPdfDataUrl(data.dataUrl);
        setPdfName(data.name || 'Shared Document.pdf');
      }
    });

    registerListener('pdf:close_document', () => {
      if (!isTeacher) {
        setPdfDataUrl('');
        setPdfName('');
        setPeerPointer(null);
      }
    });

    // Realtime Laser Pointer (Throttled smooth reception)
    registerListener('pdf:laser_pointer', (data) => {
      if (data && data.senderRole !== currentUser?.role) {
        setPeerPointer(data);
        if (pointerTimeoutRef.current) clearTimeout(pointerTimeoutRef.current);
        pointerTimeoutRef.current = setTimeout(() => {
          setPeerPointer(null);
        }, 3000);
      }
    });

    // Student Rejoin Handshake
    registerListener('room:request_state', () => {
      if (isTeacher && pdfDataUrl && broadcast) {
        broadcast('pdf:load_document', {
          dataUrl: pdfDataUrl,
          name: pdfName
        });
      }
    });
  }, [registerListener, isTeacher, currentUser, pdfDataUrl, pdfName, broadcast]);

  // Throttled Pointer Emitter (Max 25 updates/sec to protect Supabase channel)
  const handlePointerMove = useCallback((e) => {
    if (!pdfDataUrl || !containerRef.current || !broadcast) return;
    const now = Date.now();
    if (now - lastSendTimeRef.current < 40) return; // 25 fps
    lastSendTimeRef.current = now;

    const rect = containerRef.current.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    broadcast('pdf:laser_pointer', {
      nx,
      ny,
      senderRole: currentUser?.role || (isTeacher ? 'teacher' : 'student'),
      senderName: currentUser?.name || (isTeacher ? 'Teacher' : 'Student')
    });
  }, [pdfDataUrl, broadcast, currentUser, isTeacher]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only .pdf files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl === 'string') {
        setPdfDataUrl(dataUrl);
        setPdfName(file.name);

        if (broadcast) {
          broadcast('pdf:load_document', {
            dataUrl,
            name: file.name
          });
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClosePdf = () => {
    setPdfDataUrl('');
    setPdfName('');
    setPeerPointer(null);
    if (isTeacher && broadcast) {
      broadcast('pdf:close_document', {});
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#020617] overflow-hidden select-none">
      
      {/* Top Header */}
      <div className="h-10 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-2 overflow-hidden max-w-[50%]">
          <FileText className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-semibold text-slate-200 truncate text-[11px]" title={pdfName}>
            {pdfName || 'No PDF Selected'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {pdfDataUrl && (
            <button
              onClick={() => setIsLaserActive(!isLaserActive)}
              className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition ${
                isLaserActive 
                  ? 'bg-rose-950/80 border-rose-500/50 text-rose-300' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Toggle Live Laser Pointer Layer"
            >
              <MousePointer className="w-3 h-3 text-rose-400" />
              <span>Laser: {isLaserActive ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {isTeacher && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition shadow"
              >
                <Upload className="w-3 h-3" />
                <span>Upload PDF</span>
              </button>

              {pdfDataUrl && (
                <button
                  onClick={handleClosePdf}
                  className="p-1 bg-rose-950/40 border border-rose-500/30 text-rose-400 hover:text-white hover:bg-rose-600 rounded-lg transition"
                  title="Close PDF"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}

          {!isTeacher && !pdfDataUrl && (
            <span className="text-[10px] text-slate-500 font-mono">
              Waiting for educator to share PDF...
            </span>
          )}
        </div>
      </div>

      {/* PDF VIEWER STAGE */}
      <div 
        ref={containerRef}
        onMouseMove={handlePointerMove}
        className="flex-1 w-full h-full bg-slate-950 flex items-center justify-center relative overflow-hidden"
      >
        {pdfDataUrl ? (
          <div className="w-full h-full relative">
            <object
              data={`${pdfDataUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              type="application/pdf"
              className="w-full h-full border-none rounded-none bg-white"
            >
              <iframe
                src={`${pdfDataUrl}#toolbar=0&navpanes=0`}
                title="PDF Document"
                className="w-full h-full border-none bg-white"
              />
            </object>

            {/* TRANSPARENT LASER INTERACTION OVERLAY (Catches mouse events over object/iframe) */}
            {isLaserActive && (
              <div 
                onMouseMove={handlePointerMove}
                className="absolute inset-0 z-20 cursor-crosshair bg-transparent"
              />
            )}

            {/* LIVE PULSATING LASER POINTER WITH NAME BADGE */}
            {peerPointer && (
              <div 
                className="absolute z-30 pointer-events-none transition-all duration-75 flex items-center gap-1.5"
                style={{
                  left: `${peerPointer.nx * 100}%`,
                  top: `${peerPointer.ny * 100}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 border-2 border-white shadow-xl" />
                </span>
                <span className="bg-slate-950/95 text-rose-300 border border-rose-500/50 text-[10px] font-mono px-1.5 py-0.5 rounded shadow-lg font-bold">
                  {peerPointer.senderName}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-2 text-slate-500 max-w-sm p-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-rose-400">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-xs font-bold text-slate-300">No PDF Document Open</h3>
            <p className="text-[11px] text-slate-500">
              {isTeacher
                ? 'Click "Upload PDF" above to present exercises or question papers.'
                : 'Educator has not shared any PDF yet.'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}