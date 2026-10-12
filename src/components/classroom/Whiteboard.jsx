import React, { useRef, useState, useEffect } from 'react';
import { 
  Pencil, Eraser, Wand2, Trash2, Lock, Unlock, Square, Circle, 
  Minus, ArrowRight, ChevronLeft, ChevronRight, Plus, AlertTriangle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Whiteboard({ isStudentAllowed, setIsStudentAllowed }) {
  const { currentUser } = useApp();
  const isTeacher = currentUser?.role === 'teacher';

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Multi-Page State (Each page holds its own array of strokes/shapes)
  const [pages, setPages] = useState({
    1: [] // Array of stroke objects
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Tool states: 'pen' | 'pixel_eraser' | 'magic_eraser' | 'rect' | 'circle' | 'line' | 'arrow'
  const [activeTool, setActiveTool] = useState('pen');
  const [color, setColor] = useState('#818cf8');
  const [penSize, setPenSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(16);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [showCleanModal, setShowCleanModal] = useState(false);

  const canDraw = isTeacher || isStudentAllowed;

  // Active elements of current page
  const elements = pages[currentPage] || [];

  const setPageElements = (newElements) => {
    setPages(prev => ({ ...prev, [currentPage]: newElements }));
  };

  // Re-draw all vector elements onto canvas
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    elements.forEach(elem => {
      ctx.strokeStyle = elem.color;
      ctx.fillStyle = elem.color;
      ctx.lineWidth = elem.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (elem.type === 'pen') {
        if (elem.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(elem.points[0].x, elem.points[0].y);
        for (let i = 1; i < elem.points.length; i++) {
          ctx.lineTo(elem.points[i].x, elem.points[i].y);
        }
        ctx.stroke();
      } else if (elem.type === 'rect') {
        ctx.strokeRect(elem.startX, elem.startY, elem.width, elem.height);
      } else if (elem.type === 'circle') {
        ctx.beginPath();
        ctx.arc(elem.startX, elem.startY, elem.radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (elem.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(elem.startX, elem.startY);
        ctx.lineTo(elem.endX, elem.endY);
        ctx.stroke();
      } else if (elem.type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(elem.startX, elem.startY);
        ctx.lineTo(elem.endX, elem.endY);
        ctx.stroke();

        const angle = Math.atan2(elem.endY - elem.startY, elem.endX - elem.startX);
        const head = 12 + elem.size;
        ctx.beginPath();
        ctx.moveTo(elem.endX, elem.endY);
        ctx.lineTo(elem.endX - head * Math.cos(angle - Math.PI / 6), elem.endY - head * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(elem.endX, elem.endY);
        ctx.lineTo(elem.endX - head * Math.cos(angle + Math.PI / 6), elem.endY - head * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    });
  };

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
  }, [currentPage, pages]);

  useEffect(() => {
    redrawCanvas();
  }, [elements]);

  const getCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // Distance helper from point to line segment (For Magic Eraser Hit-Test)
  const distToSegment = (p, v, w) => {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  };

  // Magic Eraser: Tap or swipe to erase the targeted stroke/shape completely
  const handleMagicErase = (pt) => {
    const threshold = 16;
    const remaining = elements.filter(elem => {
      if (elem.type === 'pen') {
        for (let i = 0; i < elem.points.length - 1; i++) {
          if (distToSegment(pt, elem.points[i], elem.points[i + 1]) < threshold + elem.size) {
            return false; // delete this entire stroke
          }
        }
      } else if (elem.type === 'rect') {
        const inX = pt.x >= Math.min(elem.startX, elem.startX + elem.width) - threshold &&
                    pt.x <= Math.max(elem.startX, elem.startX + elem.width) + threshold;
        const inY = pt.y >= Math.min(elem.startY, elem.startY + elem.height) - threshold &&
                    pt.y <= Math.max(elem.startY, elem.startY + elem.height) + threshold;
        if (inX && inY) return false;
      } else if (elem.type === 'circle') {
        const d = Math.hypot(pt.x - elem.startX, pt.y - elem.startY);
        if (Math.abs(d - elem.radius) < threshold + elem.size) return false;
      } else if (elem.type === 'line' || elem.type === 'arrow') {
        if (distToSegment(pt, { x: elem.startX, y: elem.startY }, { x: elem.endX, y: elem.endY }) < threshold + elem.size) {
          return false;
        }
      }
      return true;
    });

    if (remaining.length !== elements.length) {
      setPageElements(remaining);
    }
  };

  const handlePointerDown = (e) => {
    if (!canDraw) return;
    e.preventDefault();
    const pt = getCoords(e);
    setIsDrawing(true);

    if (activeTool === 'magic_eraser') {
      handleMagicErase(pt);
      return;
    }

    if (activeTool === 'pen') {
      setCurrentStroke({
        id: Date.now(),
        type: 'pen',
        points: [pt],
        color,
        size: penSize
      });
    } else if (activeTool === 'pixel_eraser') {
      setCurrentStroke({
        id: Date.now(),
        type: 'pen',
        points: [pt],
        color: '#020617',
        size: eraserSize
      });
    } else {
      setCurrentStroke({
        id: Date.now(),
        type: activeTool,
        startX: pt.x,
        startY: pt.y,
        endX: pt.x,
        endY: pt.y,
        color,
        size: penSize
      });
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || !canDraw) return;
    e.preventDefault();
    const pt = getCoords(e);

    if (activeTool === 'magic_eraser') {
      handleMagicErase(pt);
      return;
    }

    if (!currentStroke) return;

    if (currentStroke.type === 'pen') {
      const updated = {
        ...currentStroke,
        points: [...currentStroke.points, pt]
      };
      setCurrentStroke(updated);

      // Fast immediate preview on canvas
      const ctx = canvasRef.current.getContext('2d');
      ctx.strokeStyle = updated.color;
      ctx.lineWidth = updated.size;
      ctx.lineCap = 'round';
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    } else {
      let updated = { ...currentStroke, endX: pt.x, endY: pt.y };
      if (activeTool === 'rect') {
        updated.width = pt.x - currentStroke.startX;
        updated.height = pt.y - currentStroke.startY;
      } else if (activeTool === 'circle') {
        updated.radius = Math.hypot(pt.x - currentStroke.startX, pt.y - currentStroke.startY);
      }
      setCurrentStroke(updated);

      // Draw all + live preview of current shape
      redrawCanvas();
      const ctx = canvasRef.current.getContext('2d');
      ctx.strokeStyle = updated.color;
      ctx.lineWidth = updated.size;
      if (activeTool === 'rect') ctx.strokeRect(updated.startX, updated.startY, updated.width, updated.height);
      if (activeTool === 'circle') {
        ctx.beginPath();
        ctx.arc(updated.startX, updated.startY, updated.radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
      if (activeTool === 'line' || activeTool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(updated.startX, updated.startY);
        ctx.lineTo(updated.endX, updated.endY);
        ctx.stroke();
      }
    }
  };

  const handlePointerUp = () => {
    if (isDrawing && currentStroke) {
      setPageElements([...elements, currentStroke]);
    }
    setIsDrawing(false);
    setCurrentStroke(null);
  };

  // Multi-Page Handlers
  const handleAddNewPage = () => {
    const nextPg = totalPages + 1;
    setTotalPages(nextPg);
    setPages(prev => ({ ...prev, [nextPg]: [] }));
    setCurrentPage(nextPg);
  };

  const handleCleanPage = () => {
    setPageElements([]);
    setShowCleanModal(false);
  };

  return (
    <div ref={containerRef} className="flex-1 w-full h-full bg-[#020617] relative overflow-hidden select-none touch-none">
      
      {/* Top Floating Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 bg-slate-900/95 backdrop-blur border border-slate-800 p-2 rounded-2xl shadow-2xl max-w-[95%]">
        
        {canDraw ? (
          <>
            {/* 1. Core Tool Selector */}
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

              {/* Magic Eraser: Tap/Swipe to wipe whole stroke */}
              <button
                onClick={() => setActiveTool('magic_eraser')}
                className={`p-1.5 rounded-lg transition flex items-center gap-1 text-[11px] font-semibold ${
                  activeTool === 'magic_eraser' ? 'bg-purple-600 text-white shadow' : 'text-purple-400 hover:text-white'
                }`}
                title="Magic Object Eraser: Tap any stroke/shape to erase whole object"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Magic</span>
              </button>

              <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

              {/* Shapes */}
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

            {/* 2. Sizing Controls */}
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

            {/* 3. Colors */}
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

        {/* 4. Multi-Page Controller */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button 
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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

        {/* 5. Clean Page Button (Triggers Confirmation Modal) */}
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

        {/* 6. Host Lock Toggle */}
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

      {/* Canvas */}
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

      {/* Clean Page Confirmation Modal */}
      {showCleanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-950/60 border border-rose-500/40 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Clean Current Page?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to erase all drawings and equations on <strong>Page {currentPage}</strong>? This action cannot be undone.
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