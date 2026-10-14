import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Pencil, Eraser, Wand2, Trash2, Lock, Unlock, Square, Circle, 
  Minus, ArrowRight, ChevronLeft, ChevronRight, Plus, AlertTriangle 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Whiteboard({ 
  isStudentAllowed, 
  setIsStudentAllowed, 
  broadcast, 
  registerListener 
}) {
  const { currentUser, activeSession } = useApp();
  const isTeacher = currentUser?.role === 'teacher';
  const roomId = activeSession?.id ? `board_cache_${activeSession.id}` : 'board_cache_default';

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // 1. Initial State from Local Storage (Zero Data Loss on Rejoin)
  const [pages, setPages] = useState(() => {
    try {
      const saved = localStorage.getItem(roomId);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load board cache:', e);
    }
    return { 1: [] };
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(() => Object.keys(pages).length || 1);

  // Tools: 'pen' | 'pixel_eraser' | 'magic_eraser' | 'rect' | 'circle' | 'line' | 'arrow'
  const [activeTool, setActiveTool] = useState('pen');
  const [color, setColor] = useState('#818cf8');
  const [penSize, setPenSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(16);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [showCleanModal, setShowCleanModal] = useState(false);

  const canDraw = isTeacher || Boolean(isStudentAllowed);
  const elements = pages[currentPage] || [];

  // Auto-Save to Local Cache on Every Stroke Update
  useEffect(() => {
    try {
      localStorage.setItem(roomId, JSON.stringify(pages));
    } catch (e) {
      console.warn('Storage quota error:', e);
    }
  }, [pages, roomId]);

  const setPageElements = useCallback((newElements, pageNum = currentPage) => {
    setPages(prev => ({ ...prev, [pageNum]: newElements }));
  }, [currentPage]);

  // Redraw Canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    elements.forEach(elem => {
      ctx.strokeStyle = elem.color;
      ctx.fillStyle = elem.color;
      ctx.lineWidth = elem.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (elem.type === 'pen') {
        if (!elem.points || elem.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(elem.points[0].nx * w, elem.points[0].ny * h);
        for (let i = 1; i < elem.points.length; i++) {
          ctx.lineTo(elem.points[i].nx * w, elem.points[i].ny * h);
        }
        ctx.stroke();
      } else if (elem.type === 'rect') {
        ctx.strokeRect(elem.startNx * w, elem.startNy * h, elem.widthN * w, elem.heightN * h);
      } else if (elem.type === 'circle') {
        const r = elem.radiusN * Math.min(w, h);
        ctx.beginPath();
        ctx.arc(elem.startNx * w, elem.startNy * h, r, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (elem.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(elem.startNx * w, elem.startNy * h);
        ctx.lineTo(elem.endNx * w, elem.endNy * h);
        ctx.stroke();
      } else if (elem.type === 'arrow') {
        const sx = elem.startNx * w;
        const sy = elem.startNy * h;
        const ex = elem.endNx * w;
        const ey = elem.endNy * h;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        const angle = Math.atan2(ey - sy, ex - sx);
        const head = 12 + elem.size;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - head * Math.cos(angle - Math.PI / 6), ey - head * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - head * Math.cos(angle + Math.PI / 6), ey - head * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    });
  }, [elements]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawCanvas();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Real-Time Supabase Synchronization
  useEffect(() => {
    if (!registerListener) return;

    registerListener('whiteboard:stroke_added', (payload) => {
      if (payload && payload.element && payload.page) {
        setPages(prev => {
          const targetPageList = prev[payload.page] || [];
          if (targetPageList.some(el => el.id === payload.element.id)) return prev;
          return {
            ...prev,
            [payload.page]: [...targetPageList, payload.element]
          };
        });
      }
    });

    registerListener('whiteboard:page_update', (payload) => {
      if (payload && payload.page !== undefined) {
        setPages(prev => ({
          ...prev,
          [payload.page]: payload.elements || []
        }));
      }
    });

    registerListener('whiteboard:page_nav', (payload) => {
      if (!isTeacher && payload) {
        if (payload.currentPage) setCurrentPage(payload.currentPage);
        if (payload.totalPages) setTotalPages(payload.totalPages);
      }
    });

    // Rejoin Peer Request & Response
    registerListener('whiteboard:request_full_state', () => {
      if (broadcast && Object.keys(pages).length > 0) {
        broadcast('whiteboard:sync_full_state', { pages, currentPage, totalPages });
      }
    });

    registerListener('whiteboard:sync_full_state', (payload) => {
      if (payload && payload.pages) {
        setPages(payload.pages);
        if (payload.currentPage) setCurrentPage(payload.currentPage);
        if (payload.totalPages) setTotalPages(payload.totalPages);
      }
    });
  }, [registerListener, isTeacher, broadcast, pages, currentPage, totalPages]);

  // Request Peer Sync upon entering
  useEffect(() => {
    if (broadcast) {
      const timer = setTimeout(() => {
        broadcast('whiteboard:request_full_state', {});
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [broadcast]);

  // Coordinate normalizer (0.0 to 1.0)
  const getNormalizedCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, nx: 0, ny: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const nx = Math.max(0, Math.min(1, x / canvas.width));
    const ny = Math.max(0, Math.min(1, y / canvas.height));

    return { x, y, nx, ny };
  };

  const distToSegment = (p, v, w) => {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  };

  const handleMagicErase = (pt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    const threshold = 16;

    const remaining = elements.filter(elem => {
      if (elem.type === 'pen') {
        for (let i = 0; i < elem.points.length - 1; i++) {
          const ptA = { x: elem.points[i].nx * w, y: elem.points[i].ny * h };
          const ptB = { x: elem.points[i + 1].nx * w, y: elem.points[i + 1].ny * h };
          if (distToSegment(pt, ptA, ptB) < threshold + elem.size) return false;
        }
      } else if (elem.type === 'rect') {
        const sx = elem.startNx * w;
        const sy = elem.startNy * h;
        const rw = elem.widthN * w;
        const rh = elem.heightN * h;
        if (pt.x >= Math.min(sx, sx + rw) - threshold && pt.x <= Math.max(sx, sx + rw) + threshold &&
            pt.y >= Math.min(sy, sy + rh) - threshold && pt.y <= Math.max(sy, sy + rh) + threshold) return false;
      } else if (elem.type === 'circle') {
        const sx = elem.startNx * w;
        const sy = elem.startNy * h;
        const r = elem.radiusN * Math.min(w, h);
        if (Math.abs(Math.hypot(pt.x - sx, pt.y - sy) - r) < threshold + elem.size) return false;
      } else if (elem.type === 'line' || elem.type === 'arrow') {
        const sx = elem.startNx * w;
        const sy = elem.startNy * h;
        const ex = elem.endNx * w;
        const ey = elem.endNy * h;
        if (distToSegment(pt, { x: sx, y: sy }, { x: ex, y: ey }) < threshold + elem.size) return false;
      }
      return true;
    });

    if (remaining.length !== elements.length) {
      setPageElements(remaining);
      if (broadcast) {
        broadcast('whiteboard:page_update', { page: currentPage, elements: remaining });
      }
    }
  };

  const handlePointerDown = (e) => {
    if (!canDraw) return;
    const pt = getNormalizedCoords(e);
    setIsDrawing(true);

    if (activeTool === 'magic_eraser') {
      handleMagicErase({ x: pt.x, y: pt.y });
      return;
    }

    const strokeId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (activeTool === 'pen') {
      setCurrentStroke({
        id: strokeId,
        type: 'pen',
        points: [{ nx: pt.nx, ny: pt.ny }],
        color,
        size: penSize
      });
    } else if (activeTool === 'pixel_eraser') {
      setCurrentStroke({
        id: strokeId,
        type: 'pen',
        points: [{ nx: pt.nx, ny: pt.ny }],
        color: '#020617',
        size: eraserSize
      });
    } else {
      setCurrentStroke({
        id: strokeId,
        type: activeTool,
        startNx: pt.nx,
        startNy: pt.ny,
        endNx: pt.nx,
        endNy: pt.ny,
        widthN: 0,
        heightN: 0,
        radiusN: 0,
        color,
        size: penSize
      });
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || !canDraw) return;
    const pt = getNormalizedCoords(e);

    if (activeTool === 'magic_eraser') {
      handleMagicErase({ x: pt.x, y: pt.y });
      return;
    }

    if (!currentStroke) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    if (currentStroke.type === 'pen') {
      const updated = {
        ...currentStroke,
        points: [...currentStroke.points, { nx: pt.nx, ny: pt.ny }]
      };
      setCurrentStroke(updated);

      ctx.strokeStyle = updated.color;
      ctx.lineWidth = updated.size;
      ctx.lineCap = 'round';
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    } else {
      const updated = { 
        ...currentStroke, 
        endNx: pt.nx, 
        endNy: pt.ny,
        widthN: pt.nx - currentStroke.startNx,
        heightN: pt.ny - currentStroke.startNy,
        radiusN: Math.hypot(pt.nx - currentStroke.startNx, pt.ny - currentStroke.startNy)
      };
      setCurrentStroke(updated);

      redrawCanvas();
      ctx.strokeStyle = updated.color;
      ctx.lineWidth = updated.size;

      if (activeTool === 'rect') {
        ctx.strokeRect(updated.startNx * w, updated.startNy * h, updated.widthN * w, updated.heightN * h);
      } else if (activeTool === 'circle') {
        ctx.beginPath();
        ctx.arc(updated.startNx * w, updated.startNy * h, updated.radiusN * Math.min(w, h), 0, 2 * Math.PI);
        ctx.stroke();
      } else if (activeTool === 'line' || activeTool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(updated.startNx * w, updated.startNy * h);
        ctx.lineTo(updated.endNx * w, updated.endNy * h);
        ctx.stroke();
      }
    }
  };

  const handlePointerUp = () => {
    if (isDrawing && currentStroke) {
      const updatedList = [...elements, currentStroke];
      setPageElements(updatedList);

      if (broadcast) {
        broadcast('whiteboard:stroke_added', {
          page: currentPage,
          element: currentStroke
        });
      }
    }
    setIsDrawing(false);
    setCurrentStroke(null);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (isTeacher && broadcast) {
      broadcast('whiteboard:page_nav', { currentPage: newPage, totalPages });
    }
  };

  const handleAddNewPage = () => {
    const nextPg = totalPages + 1;
    setTotalPages(nextPg);
    setPages(prev => ({ ...prev, [nextPg]: [] }));
    setCurrentPage(nextPg);

    if (isTeacher && broadcast) {
      broadcast('whiteboard:page_nav', { currentPage: nextPg, totalPages: nextPg });
    }
  };

  const handleCleanPage = () => {
    setPageElements([]);
    setShowCleanModal(false);

    if (broadcast) {
      broadcast('whiteboard:page_update', { page: currentPage, elements: [] });
    }
  };

  return (
    <div ref={containerRef} className="flex-1 w-full h-full bg-[#020617] relative overflow-hidden select-none touch-none min-h-0">
      
      {/* Top Floating Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 bg-slate-900/95 backdrop-blur border border-slate-800 p-2 rounded-2xl shadow-2xl max-w-[95%]">
        
        {canDraw ? (
          <>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTool('pen')}
                className={`p-1.5 rounded-lg transition ${activeTool === 'pen' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Pen"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setActiveTool('pixel_eraser')}
                className={`p-1.5 rounded-lg transition ${activeTool === 'pixel_eraser' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Pixel Eraser"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setActiveTool('magic_eraser')}
                className={`p-1.5 rounded-lg transition flex items-center gap-1 text-[11px] font-semibold ${
                  activeTool === 'magic_eraser' ? 'bg-purple-600 text-white shadow' : 'text-purple-400 hover:text-white'
                }`}
                title="Magic Object Eraser"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Magic</span>
              </button>

              <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

              <button
                onClick={() => setActiveTool('rect')}
                className={`p-1.5 rounded-lg transition ${activeTool === 'rect' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Rectangle"
              >
                <Square className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setActiveTool('circle')}
                className={`p-1.5 rounded-lg transition ${activeTool === 'circle' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Circle"
              >
                <Circle className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setActiveTool('line')}
                className={`p-1.5 rounded-lg transition ${activeTool === 'line' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Line"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setActiveTool('arrow')}
                className={`p-1.5 rounded-lg transition ${activeTool === 'arrow' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Arrow"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sizing Controls */}
            {activeTool === 'pixel_eraser' ? (
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-semibold">
                <span className="text-slate-500 px-1">Eraser:</span>
                <button
                  onClick={() => setEraserSize(14)}
                  className={`px-2 py-0.5 rounded-md transition ${eraserSize === 14 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Thin
                </button>
                <button
                  onClick={() => setEraserSize(36)}
                  className={`px-2 py-0.5 rounded-md transition ${eraserSize === 36 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Thick
                </button>
              </div>
            ) : activeTool !== 'magic_eraser' && (
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-semibold">
                <span className="text-slate-500 px-1">Pen:</span>
                {[
                  { label: 'Thin', val: 2 },
                  { label: 'Mid', val: 5 },
                  { label: 'Thick', val: 10 }
                ].map((s) => (
                  <button
                    key={s.val}
                    onClick={() => setPenSize(s.val)}
                    className={`px-1.5 py-0.5 rounded-md transition ${penSize === s.val ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* Colors */}
            {activeTool !== 'pixel_eraser' && activeTool !== 'magic_eraser' && (
              <div className="flex items-center gap-1 px-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {['#818cf8', '#34d399', '#f87171', '#fbbf24', '#ffffff'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-3.5 h-3.5 rounded-full border transition ${color === c ? 'scale-125 border-white ring-1 ring-white/50' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)} 
                  className="w-4 h-4 bg-transparent border-0 cursor-pointer rounded-full p-0"
                  title="Custom Color"
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 text-slate-400 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>View Only Mode (Teacher Locked)</span>
          </div>
        )}

        {/* Multi-Page Controller */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button 
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          <span className="text-[11px] text-slate-300 px-1 font-sans">
            Page {currentPage}/{totalPages}
          </span>

          <button 
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {isTeacher && (
            <button 
              onClick={handleAddNewPage}
              className="p-1 text-indigo-400 hover:text-indigo-300 ml-1 border-l border-slate-800 pl-1.5"
              title="Add New Whiteboard Page"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Clean Page */}
        {isTeacher && (
          <button
            onClick={() => setShowCleanModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-600 border border-rose-500/30 rounded-xl transition text-[11px] font-semibold"
            title="Wipe current page"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clean Page</span>
          </button>
        )}

        {/* Host Lock */}
        {isTeacher && (
          <button
            onClick={() => setIsStudentAllowed(!isStudentAllowed)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ml-auto ${
              isStudentAllowed ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {isStudentAllowed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isStudentAllowed ? 'Student Can Draw' : 'Student Locked'}</span>
          </button>
        )}
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        className={`w-full h-full block bg-[#020617] ${
          canDraw ? (activeTool === 'magic_eraser' ? 'cursor-pointer' : 'cursor-crosshair') : 'cursor-default'
        }`}
      />

      {showCleanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-950/60 border border-rose-500/40 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Clean Current Page?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Erase all drawings on <strong>Page {currentPage}</strong>?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCleanModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCleanPage}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-lg shadow-rose-600/30"
              >
                Yes, Clean Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}