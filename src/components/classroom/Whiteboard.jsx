import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Pencil, Eraser, Sparkles, Trash2, 
  ChevronLeft, ChevronRight, Plus, Minus, Lock,
  Square, Circle, Minus as LineIcon
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useApp } from '../../context/AppContext';

const PRESET_COLORS = [
  { name: 'Indigo', value: '#818cf8' },
  { name: 'Emerald', value: '#34d399' },
  { name: 'Rose', value: '#f87171' },
  { name: 'Amber', value: '#fbbf24' },
  { name: 'White', value: '#ffffff' }
];

export default function Whiteboard({ 
  isStudentAllowed, 
  setIsStudentAllowed, 
  isTeacher: propIsTeacher,
  lockStudentView = true,
  broadcast, 
  registerListener 
}) {
  const { currentUser, activeSession } = useApp();
  const isTeacher = propIsTeacher ?? (currentUser?.role === 'teacher');
  const roomId = activeSession?.id ? `board_cache_${activeSession.id}` : 'board_cache_default';

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [pages, setPages] = useState(() => {
    try {
      const saved = localStorage.getItem(roomId);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { 1: [] };
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(() => Object.keys(pages).length || 1);

  // Tools: 'pen' | 'eraser' | 'magic' | 'rect' | 'circle' | 'line'
  const [activeTool, setActiveTool] = useState('pen');
  const [color, setColor] = useState('#818cf8');
  const [thicknessPreset, setThicknessPreset] = useState('thin'); 

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [shapeStart, setShapeStart] = useState(null);

  const canDraw = isTeacher || Boolean(isStudentAllowed);
  const elements = pages[currentPage] || [];

  const getStrokeSize = () => {
    if (activeTool === 'eraser') {
      return thicknessPreset === 'thin' ? 14 : thicknessPreset === 'mid' ? 24 : 36;
    }
    return thicknessPreset === 'thin' ? 2.5 : thicknessPreset === 'mid' ? 5 : 9;
  };

  useEffect(() => {
    try {
      localStorage.setItem(roomId, JSON.stringify(pages));
    } catch (e) {}
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

      if (elem.type === 'pen' && elem.points?.length > 1) {
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
        ctx.arc(elem.startNx * w, elem.startNy * h, Math.max(0, r), 0, 2 * Math.PI);
        ctx.stroke();
      } else if (elem.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(elem.startNx * w, elem.startNy * h);
        ctx.lineTo(elem.endNx * w, elem.endNy * h);
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

  // Realtime Supabase Sync
  useEffect(() => {
    if (!registerListener) return;

    registerListener('whiteboard:stroke_added', (payload) => {
      if (payload?.element && payload?.page) {
        setPages(prev => {
          const list = prev[payload.page] || [];
          if (list.some(el => el.id === payload.element.id)) return prev;
          return { ...prev, [payload.page]: [...list, payload.element] };
        });
      }
    });

    registerListener('whiteboard:page_update', (payload) => {
      if (payload?.page !== undefined) {
        setPages(prev => ({ ...prev, [payload.page]: payload.elements || [] }));
      }
    });

    registerListener('whiteboard:page_nav', (payload) => {
      if (!isTeacher && payload) {
        if (payload.currentPage) setCurrentPage(payload.currentPage);
        if (payload.totalPages) setTotalPages(payload.totalPages);
        if (payload.allPages) setPages(payload.allPages);
      }
    });
  }, [registerListener, isTeacher]);

  const getNormalizedCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, nx: 0, ny: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return {
      x,
      y,
      nx: Math.max(0, Math.min(1, x / canvas.width)),
      ny: Math.max(0, Math.min(1, y / canvas.height))
    };
  };

  const handlePointerDown = (e) => {
    if (!canDraw) return;
    const pt = getNormalizedCoords(e);

    // Magic Eraser
    if (activeTool === 'magic') {
      const hitIndex = elements.findLastIndex(elem => {
        if (elem.points) {
          return elem.points.some(p => Math.hypot(p.nx - pt.nx, p.ny - pt.ny) < 0.035);
        }
        return Math.hypot((elem.startNx || 0) - pt.nx, (elem.startNy || 0) - pt.ny) < 0.04;
      });

      if (hitIndex !== -1) {
        const updated = elements.filter((_, idx) => idx !== hitIndex);
        setPageElements(updated);
        if (broadcast) {
          broadcast('whiteboard:page_update', { page: currentPage, elements: updated });
        }
      }
      return;
    }

    setIsDrawing(true);
    const strokeId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const strokeSize = getStrokeSize();

    if (activeTool === 'pen') {
      setCurrentStroke({
        id: strokeId,
        type: 'pen',
        points: [{ nx: pt.nx, ny: pt.ny }],
        color,
        size: strokeSize
      });
    } else if (activeTool === 'eraser') {
      setCurrentStroke({
        id: strokeId,
        type: 'pen',
        points: [{ nx: pt.nx, ny: pt.ny }],
        color: '#020617',
        size: strokeSize
      });
    } else if (['rect', 'circle', 'line'].includes(activeTool)) {
      setShapeStart({ startNx: pt.nx, startNy: pt.ny });
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || !canDraw) return;
    const pt = getNormalizedCoords(e);

    if (currentStroke) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

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
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawing || !canDraw) return;
    const pt = getNormalizedCoords(e);
    const strokeId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const strokeSize = getStrokeSize();

    let newElem = null;

    if (currentStroke) {
      newElem = currentStroke;
    } else if (shapeStart) {
      if (activeTool === 'rect') {
        newElem = {
          id: strokeId,
          type: 'rect',
          startNx: Math.min(shapeStart.startNx, pt.nx),
          startNy: Math.min(shapeStart.startNy, pt.ny),
          widthN: Math.abs(pt.nx - shapeStart.startNx),
          heightN: Math.abs(pt.ny - shapeStart.startNy),
          color,
          size: strokeSize
        };
      } else if (activeTool === 'circle') {
        const radius = Math.hypot(pt.nx - shapeStart.startNx, pt.ny - shapeStart.startNy);
        newElem = {
          id: strokeId,
          type: 'circle',
          startNx: shapeStart.startNx,
          startNy: shapeStart.startNy,
          radiusN: radius,
          color,
          size: strokeSize
        };
      } else if (activeTool === 'line') {
        newElem = {
          id: strokeId,
          type: 'line',
          startNx: shapeStart.startNx,
          startNy: shapeStart.startNy,
          endNx: pt.nx,
          endNy: pt.ny,
          color,
          size: strokeSize
        };
      }
    }

    if (newElem) {
      const updated = [...elements, newElem];
      setPageElements(updated);
      if (broadcast) {
        broadcast('whiteboard:stroke_added', { page: currentPage, element: newElem });
      }
    }

    setIsDrawing(false);
    setCurrentStroke(null);
    setShapeStart(null);
  };

  const handlePageChange = (newPage) => {
    if (!isTeacher && lockStudentView) return;
    setCurrentPage(newPage);
    if (isTeacher && broadcast) {
      broadcast('whiteboard:page_nav', { currentPage: newPage, totalPages, allPages: pages });
    }
  };

  const handleAddNewPage = () => {
    if (!isTeacher) return;
    const nextPg = totalPages + 1;
    const nextPages = { ...pages, [nextPg]: [] };
    setTotalPages(nextPg);
    setPages(nextPages);
    setCurrentPage(nextPg);
    if (broadcast) {
      broadcast('whiteboard:page_nav', { currentPage: nextPg, totalPages: nextPg, allPages: nextPages });
    }
  };

  const handleRemoveCurrentPage = () => {
    if (!isTeacher || totalPages <= 1) return;

    const remainingPages = {};
    const oldKeys = Object.keys(pages).map(Number).sort((a, b) => a - b);
    let newIndex = 1;

    oldKeys.forEach(k => {
      if (k !== currentPage) {
        remainingPages[newIndex] = pages[k];
        newIndex++;
      }
    });

    const newTotal = totalPages - 1;
    const newCurrent = Math.min(currentPage, newTotal);

    setPages(remainingPages);
    setTotalPages(newTotal);
    setCurrentPage(newCurrent);

    if (broadcast) {
      broadcast('whiteboard:page_nav', { 
        currentPage: newCurrent, 
        totalPages: newTotal, 
        allPages: remainingPages 
      });
    }
  };

  const handleCleanPage = () => {
    if (!isTeacher) return;
    setPageElements([]);
    if (broadcast) {
      broadcast('whiteboard:page_update', { page: currentPage, elements: [] });
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#020617] overflow-hidden select-none">
      
      {/* TOOLBAR */}
      <div className="w-full bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-1.5 shrink-0 z-20 shadow-md">
        
        {/* GROUP 1: PAGE CHANGER (LOCKED FOR STUDENTS) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 font-mono text-xs shadow-inner">
            <button 
              disabled={currentPage <= 1 || (!isTeacher && lockStudentView)}
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            
            <span className="text-slate-200 font-sans font-bold px-1.5 text-xs flex items-center gap-1">
              {!isTeacher && lockStudentView && <Lock className="w-2.5 h-2.5 text-indigo-400" />}
              {currentPage}/{totalPages}
            </span>

            <button 
              disabled={currentPage >= totalPages || (!isTeacher && lockStudentView)}
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            
            {isTeacher && (
              <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-800">
                <button 
                  onClick={handleAddNewPage}
                  className="p-0.5 text-indigo-400 hover:text-indigo-300"
                  title="Add New Page"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button 
                  disabled={totalPages <= 1}
                  onClick={handleRemoveCurrentPage}
                  className="p-0.5 text-rose-400 hover:text-rose-300 disabled:opacity-30"
                  title="Delete Selected Page"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {isTeacher && (
            <button
              onClick={handleCleanPage}
              className="px-2.5 py-1 bg-rose-950/40 border border-rose-500/40 text-rose-400 hover:text-white hover:bg-rose-600 rounded-xl transition text-xs font-bold flex items-center gap-1 shadow-sm"
              title="Wipe current page clean"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clean</span>
            </button>
          )}
        </div>

        {/* GROUP 2: TOOLS (PEN, ERASER, MAGIC, RECT, CIRCLE, LINE) + THICKNESS + COLORS */}
        <div className={`flex items-center gap-1.5 overflow-x-auto ${
          !canDraw ? 'opacity-40 pointer-events-none' : ''
        }`}>
          
          {/* Main Drawing & Shapes Tools In The Same Row */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800 shadow-inner shrink-0">
            {/* Pen */}
            <button
              onClick={() => setActiveTool('pen')}
              className={`p-1.5 rounded-lg transition ${activeTool === 'pen' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              title="Pen"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {/* Eraser */}
            <button
              onClick={() => setActiveTool('eraser')}
              className={`p-1.5 rounded-lg transition ${activeTool === 'eraser' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              title="Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>

            {/* Magic Eraser */}
            <button
              onClick={() => setActiveTool('magic')}
              className={`p-1.5 rounded-lg transition ${activeTool === 'magic' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-400 hover:text-amber-300'}`}
              title="Magic Eraser (Tap any stroke/shape to erase)"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-3.5 bg-slate-800 mx-0.5" />

            {/* Rectangle */}
            <button
              onClick={() => setActiveTool('rect')}
              className={`p-1.5 rounded-lg transition ${activeTool === 'rect' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              title="Draw Rectangle"
            >
              <Square className="w-3.5 h-3.5" />
            </button>

            {/* Circle */}
            <button
              onClick={() => setActiveTool('circle')}
              className={`p-1.5 rounded-lg transition ${activeTool === 'circle' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              title="Draw Circle"
            >
              <Circle className="w-3.5 h-3.5" />
            </button>

            {/* Line */}
            <button
              onClick={() => setActiveTool('line')}
              className={`p-1.5 rounded-lg transition ${activeTool === 'line' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              title="Draw Line"
            >
              <LineIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Thickness Pill (Thin, Mid, Bold) */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 shadow-inner shrink-0">
            <button
              onClick={() => setThicknessPreset('thin')}
              className={`px-1.5 py-0.5 rounded-md flex items-center justify-center transition ${
                thicknessPreset === 'thin' ? 'bg-indigo-600/40 border border-indigo-500/50' : 'hover:bg-slate-900'
              }`}
              title="Thin (2px)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            </button>

            <button
              onClick={() => setThicknessPreset('mid')}
              className={`px-1.5 py-0.5 rounded-md flex items-center justify-center transition ${
                thicknessPreset === 'mid' ? 'bg-indigo-600/40 border border-indigo-500/50' : 'hover:bg-slate-900'
              }`}
              title="Medium (5px)"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            </button>

            <button
              onClick={() => setThicknessPreset('bold')}
              className={`px-1.5 py-0.5 rounded-md flex items-center justify-center transition ${
                thicknessPreset === 'bold' ? 'bg-indigo-600/40 border border-indigo-500/50' : 'hover:bg-slate-900'
              }`}
              title="Bold (10px)"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-slate-300" />
            </button>
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1.5 rounded-xl border border-slate-800 shadow-inner shrink-0">
            {PRESET_COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => { setColor(c.value); if (activeTool === 'eraser' || activeTool === 'magic') setActiveTool('pen'); }}
                className={`w-4 h-4 rounded-full border transition ${
                  color === c.value && activeTool !== 'eraser' && activeTool !== 'magic'
                    ? 'scale-125 border-white ring-2 ring-indigo-500/50' 
                    : 'border-transparent opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>

        </div>

      </div>

      {/* CANVAS DRAWING STAGE */}
      <div ref={containerRef} className="flex-1 w-full h-full relative overflow-hidden bg-[#020617] touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className={`w-full h-full block bg-[#020617] ${
            !canDraw 
              ? 'cursor-not-allowed' 
              : activeTool === 'magic' 
              ? 'cursor-pointer' 
              : 'cursor-crosshair'
          }`}
        />

        {!canDraw && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-full text-xs text-slate-400 flex items-center gap-1.5 shadow-xl pointer-events-none">
            <Lock className="w-3 h-3 text-rose-400" />
            <span>Whiteboard drawing is locked by educator</span>
          </div>
        )}
      </div>

    </div>
  );
}