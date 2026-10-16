import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Pencil, Highlighter, Eraser, Sparkles, Square, Circle, ArrowRight,
  Undo2, Redo2, Trash2, ChevronLeft, ChevronRight, Plus, Minus,
  MousePointer, Move, ZoomIn, ZoomOut, RotateCcw, Save,
  Layers, ChevronUp, ChevronDown, Palette
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const PRESET_COLORS = [
  '#ffffff', // White
  '#f87171', // Red
  '#fbbf24', // Yellow
  '#34d399', // Green
  '#60a5fa', // Blue
  '#a78bfa'  // Purple
];

export default function Whiteboard({
  isStudentAllowed,
  setIsStudentAllowed,
  isTeacher,
  lockStudentView,
  broadcast,
  registerListener
}) {
  const { activeSession, currentUser } = useApp();
  const roomId = activeSession?.id ? `board_cache_${activeSession.id}` : 'board_cache_default';

  const [pages, setPages] = useState(() => {
    try {
      const saved = localStorage.getItem(`${roomId}_pages`);
      return saved ? JSON.parse(saved) : [{ id: 1, strokes: [] }];
    } catch (e) {
      return [{ id: 1, strokes: [] }];
    }
  });

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [redoStack, setRedoStack] = useState([]);

  // Save Status Tracker
  const [saveStatus, setSaveStatus] = useState('saved');
  const [isPageStripOpen, setIsPageStripOpen] = useState(false);

  // Tools: 'pen' | 'highlighter' | 'eraser' | 'magic_eraser' | 'rect' | 'circle' | 'arrow' | 'laser' | 'pan'
  const [activeTool, setActiveTool] = useState('pen');
  const [activeColor, setActiveColor] = useState('#ffffff');

  // Thickness
  const [penThickness, setPenThickness] = useState(3);
  const [eraserThickness, setEraserThickness] = useState(25);
  const [showThicknessPopover, setShowThicknessPopover] = useState(null);

  // Hidden native color picker input reference
  const colorInputRef = useRef(null);

  // Infinite Canvas Matrix
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });

  // Remote Laser Pointer
  const [remotePointer, setRemotePointer] = useState(null);
  const remotePointerTimeoutRef = useRef(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  const lastPointerBroadcastRef = useRef(0);

  const canDraw = isTeacher || Boolean(isStudentAllowed);
  const canNavigate = isTeacher || !Boolean(lockStudentView);

  // Auto-Save Effect
  useEffect(() => {
    try {
      setSaveStatus('saving');
      localStorage.setItem(`${roomId}_pages`, JSON.stringify(pages));
      const t = setTimeout(() => {
        setSaveStatus('saved');
      }, 300);
      return () => clearTimeout(t);
    } catch (e) {
      setSaveStatus('saved');
    }
  }, [pages, roomId]);

  const handleManualForceSave = () => {
    try {
      setSaveStatus('saving');
      localStorage.setItem(`${roomId}_pages`, JSON.stringify(pages));
      setTimeout(() => {
        setSaveStatus('saved');
      }, 200);
    } catch (e) {}
  };

  // Realtime Listeners
  useEffect(() => {
    if (!registerListener) return;

    registerListener('whiteboard:stroke_drawn', (data) => {
      if (data && data.senderRole !== currentUser?.role) {
        const targetPage = Number(data.pageIndex ?? 0);
        const incomingStroke = data.stroke;
        if (!incomingStroke) return;

        setPages((prevPages) => {
          const next = prevPages.map((pg, idx) => {
            if (idx === targetPage) {
              const exists = pg.strokes.some((s) => s.id === incomingStroke.id);
              if (exists) return pg;
              return { ...pg, strokes: [...pg.strokes, incomingStroke] };
            }
            return pg;
          });

          if (!next[targetPage]) {
            next[targetPage] = { id: targetPage + 1, strokes: [incomingStroke] };
          }
          return next;
        });
      }
    });

    registerListener('whiteboard:clear_page', (data) => {
      if (data && data.pageIndex !== undefined) {
        const targetPage = Number(data.pageIndex);
        setPages((prevPages) => {
          return prevPages.map((pg, idx) => {
            if (idx === targetPage) return { ...pg, strokes: [] };
            return pg;
          });
        });
        setRedoStack([]);
      }
    });

    registerListener('whiteboard:undo_action', (data) => {
      if (data && data.senderRole !== currentUser?.role) {
        const targetPage = Number(data.pageIndex ?? 0);
        setPages((prevPages) => {
          return prevPages.map((pg, idx) => {
            if (idx === targetPage) {
              return { ...pg, strokes: pg.strokes.slice(0, -1) };
            }
            return pg;
          });
        });
      }
    });

    registerListener('whiteboard:magic_erase_stroke', (data) => {
      if (data && data.strokeId) {
        const targetPage = Number(data.pageIndex ?? 0);
        setPages((prevPages) => {
          return prevPages.map((pg, idx) => {
            if (idx === targetPage) {
              return { ...pg, strokes: pg.strokes.filter((s) => s.id !== data.strokeId) };
            }
            return pg;
          });
        });
      }
    });

    registerListener('whiteboard:page_sync', (data) => {
      if (!isTeacher && data && data.pageIndex !== undefined) {
        setCurrentPageIndex(Number(data.pageIndex));
        if (data.pages && Array.isArray(data.pages)) {
          setPages(data.pages);
        }
      }
    });

    registerListener('whiteboard:zoom_sync', (data) => {
      if (!isTeacher && lockStudentView && data) {
        if (data.scale !== undefined) setScale(data.scale);
        if (data.offset !== undefined) setOffset(data.offset);
      }
    });

    registerListener('whiteboard:laser_pointer', (data) => {
      if (data && data.senderRole !== currentUser?.role) {
        setRemotePointer(data);
        if (remotePointerTimeoutRef.current) clearTimeout(remotePointerTimeoutRef.current);
        remotePointerTimeoutRef.current = setTimeout(() => {
          setRemotePointer(null);
        }, 2500);
      }
    });

    registerListener('room:request_state', () => {
      if (isTeacher && broadcast) {
        broadcast('whiteboard:full_sync', {
          pages,
          currentPageIndex,
          scale,
          offset
        });
      }
    });

    registerListener('whiteboard:full_sync', (data) => {
      if (!isTeacher && data?.pages) {
        setPages(data.pages);
        if (data.currentPageIndex !== undefined) setCurrentPageIndex(Number(data.currentPageIndex));
        if (data.scale !== undefined) setScale(data.scale);
        if (data.offset !== undefined) setOffset(data.offset);
      }
    });
  }, [registerListener, currentUser, isTeacher, broadcast, pages, currentPageIndex, lockStudentView, scale, offset]);

  // Infinite Canvas Redraw Engine
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 40 * scale;
    const startX = (offset.x % gridSize);
    const startY = (offset.y % gridSize);

    for (let x = startX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = startY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    const currentStrokes = pages[currentPageIndex]?.strokes || [];
    currentStrokes.forEach((st) => {
      drawSingleStroke(ctx, st, width, height);
    });

    if (currentStrokeRef.current) {
      drawSingleStroke(ctx, currentStrokeRef.current, width, height);
    }

    ctx.restore();
  }, [pages, currentPageIndex, scale, offset]);

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        redrawCanvas();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [pages, currentPageIndex, redrawCanvas]);

  const drawSingleStroke = (ctx, st, w, h) => {
    ctx.save();
    ctx.strokeStyle = st.color;
    ctx.lineWidth = st.width || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (st.tool === 'highlighter') {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = (st.width || 3) * 3.5;
    } else if (st.tool === 'eraser') {
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = st.width || 25;
    } else {
      ctx.globalAlpha = 1.0;
    }

    if (st.tool === 'rect' && st.points.length >= 2) {
      const p1 = st.points[0];
      const p2 = st.points[st.points.length - 1];
      ctx.strokeRect(p1.x * w, p1.y * h, (p2.x - p1.x) * w, (p2.y - p1.y) * h);
    } else if (st.tool === 'circle' && st.points.length >= 2) {
      const p1 = st.points[0];
      const p2 = st.points[st.points.length - 1];
      const rx = Math.abs((p2.x - p1.x) * w) / 2;
      const ry = Math.abs((p2.y - p1.y) * h) / 2;
      const cx = (p1.x + p2.x) * w / 2;
      const cy = (p1.y + p2.y) * h / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx || 1, ry || 1, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (st.tool === 'arrow' && st.points.length >= 2) {
      const p1 = st.points[0];
      const p2 = st.points[st.points.length - 1];
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();

      const headlen = 12;
      const dx = (p2.x - p1.x) * w;
      const dy = (p2.y - p1.y) * h;
      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(p2.x * w, p2.y * h);
      ctx.lineTo(p2.x * w - headlen * Math.cos(angle - Math.PI / 6), p2.y * h - headlen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(p2.x * w, p2.y * h);
      ctx.lineTo(p2.x * w - headlen * Math.cos(angle + Math.PI / 6), p2.y * h - headlen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    } else if (st.points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(st.points[0].x * w, st.points[0].y * h);
      for (let i = 1; i < st.points.length; i++) {
        ctx.lineTo(st.points[i].x * w, st.points[i].y * h);
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;

    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const virtualX = (screenX - offset.x) / scale;
    const virtualY = (screenY - offset.y) / scale;

    return {
      x: virtualX / canvas.width,
      y: virtualY / canvas.height,
      rawScreenX: screenX,
      rawScreenY: screenY
    };
  };

  const emitLaserPointer = (pt) => {
    const now = Date.now();
    if (now - lastPointerBroadcastRef.current < 45) return;
    lastPointerBroadcastRef.current = now;

    if (broadcast) {
      broadcast('whiteboard:laser_pointer', {
        nx: pt.x,
        ny: pt.y,
        senderRole: currentUser?.role || (isTeacher ? 'teacher' : 'student'),
        senderName: currentUser?.name || (isTeacher ? 'Teacher' : 'Student')
      });
    }
  };

  const handleMagicErase = (pt) => {
    const curStrokes = pages[currentPageIndex]?.strokes || [];
    const threshold = 0.025;

    const strokeIndex = curStrokes.findIndex((st) => {
      return st.points.some(p => Math.hypot(p.x - pt.x, p.y - pt.y) < threshold);
    });

    if (strokeIndex !== -1) {
      const deletedStroke = curStrokes[strokeIndex];
      setPages((prevPages) => {
        return prevPages.map((pg, idx) => {
          if (idx === currentPageIndex) {
            return { ...pg, strokes: pg.strokes.filter((_, i) => i !== strokeIndex) };
          }
          return pg;
        });
      });

      if (broadcast) {
        broadcast('whiteboard:magic_erase_stroke', {
          pageIndex: currentPageIndex,
          strokeId: deletedStroke.id
        });
      }
    }
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === 'touch') {
      try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
    }

    setShowThicknessPopover(null);

    const pt = getCanvasPoint(e);

    if ((activeTool === 'pan' || e.button === 1) && canNavigate) {
      isPanningRef.current = true;
      startPanRef.current = { x: pt.rawScreenX - offset.x, y: pt.rawScreenY - offset.y };
      return;
    }

    if (activeTool === 'laser') {
      isDrawingRef.current = true;
      emitLaserPointer(pt);
      return;
    }

    if (activeTool === 'magic_eraser') {
      if (canDraw) handleMagicErase(pt);
      return;
    }

    if (!canDraw) return;

    isDrawingRef.current = true;
    const currentWidth = activeTool === 'eraser' ? Number(eraserThickness) : Number(penThickness);

    currentStrokeRef.current = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tool: activeTool,
      color: activeColor,
      width: currentWidth,
      points: [{ x: pt.x, y: pt.y }]
    };

    redrawCanvas();
  };

  const handlePointerMove = (e) => {
    const pt = getCanvasPoint(e);

    if (isPanningRef.current && canNavigate) {
      const newOffset = { x: pt.rawScreenX - startPanRef.current.x, y: pt.rawScreenY - startPanRef.current.y };
      setOffset(newOffset);
      redrawCanvas();
      if (isTeacher && broadcast) {
        broadcast('whiteboard:zoom_sync', { scale, offset: newOffset });
      }
      return;
    }

    if (activeTool === 'laser') {
      if (e.pointerType !== 'touch' || isDrawingRef.current) {
        emitLaserPointer(pt);
      }
      return;
    }

    if (!isDrawingRef.current || !currentStrokeRef.current || !canDraw) return;

    if (['rect', 'circle', 'arrow'].includes(activeTool)) {
      currentStrokeRef.current.points = [currentStrokeRef.current.points[0], { x: pt.x, y: pt.y }];
    } else {
      currentStrokeRef.current.points.push({ x: pt.x, y: pt.y });
    }

    redrawCanvas();
  };

  const handlePointerUp = (e) => {
    if (e.pointerType === 'touch') {
      try { e.target.releasePointerCapture(e.pointerId); } catch (err) {}
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (activeTool === 'laser') {
      isDrawingRef.current = false;
      return;
    }

    if (!isDrawingRef.current || !currentStrokeRef.current || !canDraw) {
      isDrawingRef.current = false;
      return;
    }

    isDrawingRef.current = false;
    const finalStroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    if (finalStroke && finalStroke.points.length > 0) {
      setPages((prevPages) => {
        return prevPages.map((pg, idx) => {
          if (idx === currentPageIndex) {
            return { ...pg, strokes: [...pg.strokes, finalStroke] };
          }
          return pg;
        });
      });

      setRedoStack([]);

      if (broadcast) {
        broadcast('whiteboard:stroke_drawn', {
          pageIndex: currentPageIndex,
          stroke: finalStroke,
          senderRole: currentUser?.role
        });
      }
    }

    redrawCanvas();
  };

  const handleZoom = (delta) => {
    if (!canNavigate) return;
    const newScale = Math.max(0.3, Math.min(4.0, Number((scale + delta).toFixed(2))));
    setScale(newScale);
    if (isTeacher && broadcast) {
      broadcast('whiteboard:zoom_sync', { scale: newScale, offset });
    }
  };

  const handleResetZoom = () => {
    if (!canNavigate) return;
    setScale(1);
    setOffset({ x: 0, y: 0 });
    if (isTeacher && broadcast) {
      broadcast('whiteboard:zoom_sync', { scale: 1, offset: { x: 0, y: 0 } });
    }
  };

  const handleUndo = () => {
    const curStrokes = pages[currentPageIndex]?.strokes || [];
    if (curStrokes.length === 0) return;

    const popped = curStrokes[curStrokes.length - 1];
    setRedoStack((prev) => [...prev, popped]);

    setPages((prevPages) => {
      return prevPages.map((pg, idx) => {
        if (idx === currentPageIndex) {
          return { ...pg, strokes: pg.strokes.slice(0, -1) };
        }
        return pg;
      });
    });

    if (broadcast) {
      broadcast('whiteboard:undo_action', {
        pageIndex: currentPageIndex,
        senderRole: currentUser?.role
      });
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const strokeToRestore = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));

    setPages((prevPages) => {
      return prevPages.map((pg, idx) => {
        if (idx === currentPageIndex) {
          return { ...pg, strokes: [...pg.strokes, strokeToRestore] };
        }
        return pg;
      });
    });

    if (broadcast) {
      broadcast('whiteboard:stroke_drawn', {
        pageIndex: currentPageIndex,
        stroke: strokeToRestore,
        senderRole: currentUser?.role
      });
    }
  };

  const handlePageChange = (newIdx) => {
    if (newIdx < 0 || newIdx >= pages.length) return;
    setCurrentPageIndex(newIdx);
    setRedoStack([]);

    if (isTeacher && broadcast) {
      broadcast('whiteboard:page_sync', { pageIndex: newIdx });
    }
  };

  const handleAddPage = () => {
    setPages((prev) => {
      const updated = [...prev, { id: prev.length + 1, strokes: [] }];
      const nextIdx = prev.length;
      setCurrentPageIndex(nextIdx);
      if (isTeacher && broadcast) {
        broadcast('whiteboard:page_sync', { pageIndex: nextIdx, pages: updated });
      }
      return updated;
    });
  };

  const handleDeletePage = () => {
    if (pages.length <= 1) return;
    if (!window.confirm(`Delete page ${currentPageIndex + 1}?`)) return;

    setPages((prev) => {
      const updated = prev.filter((_, i) => i !== currentPageIndex);
      const nextIdx = Math.max(0, currentPageIndex - 1);
      setCurrentPageIndex(nextIdx);
      if (isTeacher && broadcast) {
        broadcast('whiteboard:page_sync', { pageIndex: nextIdx, pages: updated });
      }
      return updated;
    });
  };

  const handleClearBoard = () => {
    if (!window.confirm('Clear all strokes on this page?')) return;
    setPages((prev) => {
      return prev.map((pg, idx) => {
        if (idx === currentPageIndex) return { ...pg, strokes: [] };
        return pg;
      });
    });
    setRedoStack([]);
    if (broadcast) {
      broadcast('whiteboard:clear_page', { pageIndex: currentPageIndex });
    }
  };

  const handleToolClick = (toolName) => {
    if (activeTool === toolName) {
      setShowThicknessPopover(showThicknessPopover === toolName ? null : toolName);
    } else {
      setActiveTool(toolName);
      setShowThicknessPopover(null);
    }
  };

  useEffect(() => {
    window.__exportWhiteboardAllPages = async () => {
      return pages.map((page, index) => ({
        pageNumber: index + 1,
        strokes: page.strokes,
        scale,
        offset
      }));
    };
    return () => { delete window.__exportWhiteboardAllPages; };
  }, [pages, scale, offset]);

  return (
    <div className="flex flex-col h-full w-full bg-[#020617] overflow-hidden select-none relative">
      
      {/* 2-ROW TOOLBAR */}
      <div className="bg-slate-900 border-b border-slate-800 px-2 py-1 flex flex-col gap-1 shrink-0 z-30">
        
        {/* ROW 1: Page Navigation, Smooth Scrollable Color Palette, Undo, Redo, Clear */}
        <div className="flex items-center justify-between w-full text-xs gap-1">
          
          {/* Page Navigation */}
          <div className="flex items-center gap-0.5 shrink-0 font-mono text-xs">
            <button
              disabled={(!isTeacher && lockStudentView) || currentPageIndex === 0}
              onClick={() => handlePageChange(currentPageIndex - 1)}
              className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-20"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="text-slate-200 px-1 font-bold text-[11px] whitespace-nowrap">
              {currentPageIndex + 1} / {pages.length}
            </span>

            <button
              disabled={(!isTeacher && lockStudentView) || currentPageIndex === pages.length - 1}
              onClick={() => handlePageChange(currentPageIndex + 1)}
              className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-20"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {isTeacher && (
              <>
                <button
                  onClick={handleAddPage}
                  className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white ml-0.5 shadow-sm"
                  title="Add Page"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                {pages.length > 1 && (
                  <button
                    onClick={handleDeletePage}
                    className="p-1 rounded bg-rose-950/40 border border-rose-500/40 text-rose-400 hover:text-white hover:bg-rose-600 ml-0.5"
                    title="Remove Current Page"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Right side: SCROLLABLE COLOR STRIP + Undo / Redo / Clear */}
          <div className="flex items-center gap-1 shrink min-w-0 justify-end overflow-hidden">
            
            {/* Color Strip with Smooth Horizontal Scroll & Touch Support */}
            <div 
              className="flex items-center gap-1.5 bg-slate-950 px-1.5 py-0.5 rounded-lg border border-slate-800 shadow-inner overflow-x-auto shrink min-w-0 max-w-[130px] sm:max-w-none"
              style={{
                touchAction: 'pan-x',
                scrollbarWidth: 'thin',
                scrollbarColor: '#475569 transparent'
              }}
            >
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveColor(c)}
                  className={`w-3.5 h-3.5 rounded-full border transition transform shrink-0 ${
                    activeColor.toLowerCase() === c.toLowerCase()
                      ? 'border-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.6)] z-10'
                      : 'border-transparent opacity-75 hover:opacity-100 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={`Select ${c}`}
                />
              ))}

              {/* Custom Color Chooser Button */}
              <div className="relative flex items-center shrink-0">
                <button
                  onClick={() => colorInputRef.current?.click()}
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition shadow-sm shrink-0 ${
                    !PRESET_COLORS.includes(activeColor)
                      ? 'border-white scale-125 shadow-[0_0_8px_rgba(99,102,241,0.8)]'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                  style={{
                    backgroundColor: !PRESET_COLORS.includes(activeColor) ? activeColor : undefined
                  }}
                  title="Choose Custom Color"
                >
                  <Palette className="w-2 h-2" />
                </button>
                
                <input
                  ref={colorInputRef}
                  type="color"
                  value={activeColor}
                  onChange={(e) => setActiveColor(e.target.value)}
                  className="absolute opacity-0 pointer-events-none w-0 h-0"
                />
              </div>
            </div>

            {/* Actions: Undo / Redo / Clear (Always Visible) */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={handleUndo}
                disabled={!canDraw || (pages[currentPageIndex]?.strokes || []).length === 0}
                className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-20"
                title="Undo"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleRedo}
                disabled={!canDraw || redoStack.length === 0}
                className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-20"
                title="Redo"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleClearBoard}
                disabled={!canDraw}
                className="p-1 rounded bg-rose-950/40 border border-rose-500/30 text-rose-400 hover:text-white hover:bg-rose-600"
                title="Clear Canvas"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: All Drawing Tools */}
        <div className="flex items-center justify-between bg-slate-950 px-1 py-0.5 rounded-xl border border-slate-800 relative w-full overflow-visible">
          
          {/* Pen Tool + Thickness Slider */}
          <div className="relative">
            <button
              onClick={() => handleToolClick('pen')}
              className={`p-1.5 rounded-lg transition relative ${activeTool === 'pen' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              title="Pen (Click again for thickness)"
            >
              <Pencil className="w-3.5 h-3.5" />
              {activeTool === 'pen' && (
                <span className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-white" />
              )}
            </button>

            {showThicknessPopover === 'pen' && (
              <div className="absolute top-9 left-0 bg-slate-900 border border-slate-700 p-2 rounded-xl shadow-2xl z-50 flex flex-col gap-1 w-36">
                <span className="text-[10px] text-slate-300 font-mono">Pen Width: {penThickness}px</span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={penThickness}
                  onChange={(e) => setPenThickness(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => handleToolClick('highlighter')}
            className={`p-1.5 rounded-lg transition ${activeTool === 'highlighter' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Highlighter"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>

          {/* Eraser Tool + Thickness Slider */}
          <div className="relative">
            <button
              onClick={() => handleToolClick('eraser')}
              className={`p-1.5 rounded-lg transition relative ${activeTool === 'eraser' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              title="Eraser (Click again for size)"
            >
              <Eraser className="w-3.5 h-3.5" />
              {activeTool === 'eraser' && (
                <span className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-white" />
              )}
            </button>

            {showThicknessPopover === 'eraser' && (
              <div className="absolute top-9 left-0 bg-slate-900 border border-slate-700 p-2 rounded-xl shadow-2xl z-50 flex flex-col gap-1 w-36">
                <span className="text-[10px] text-slate-300 font-mono">Eraser Size: {eraserThickness}px</span>
                <input
                  type="range"
                  min="8"
                  max="80"
                  value={eraserThickness}
                  onChange={(e) => setEraserThickness(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => { setActiveTool('magic_eraser'); setShowThicknessPopover(null); }}
            className={`p-1.5 rounded-lg transition ${activeTool === 'magic_eraser' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-amber-400'}`}
            title="Magic Eraser (Tap any stroke to delete)"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => { setActiveTool('rect'); setShowThicknessPopover(null); }}
            className={`p-1.5 rounded-lg transition ${activeTool === 'rect' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Rectangle"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => { setActiveTool('circle'); setShowThicknessPopover(null); }}
            className={`p-1.5 rounded-lg transition ${activeTool === 'circle' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Circle"
          >
            <Circle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => { setActiveTool('arrow'); setShowThicknessPopover(null); }}
            className={`p-1.5 rounded-lg transition ${activeTool === 'arrow' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Arrow"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => { setActiveTool('laser'); setShowThicknessPopover(null); }}
            className={`p-1.5 rounded-lg transition ${activeTool === 'laser' ? 'bg-rose-600 text-white shadow animate-pulse' : 'text-slate-400 hover:text-rose-400'}`}
            title="Laser Pointer"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          <button
            disabled={!canNavigate}
            onClick={() => { setActiveTool('pan'); setShowThicknessPopover(null); }}
            className={`p-1.5 rounded-lg transition disabled:opacity-20 ${activeTool === 'pan' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-emerald-400'}`}
            title={canNavigate ? 'Pan / Move Infinite Canvas' : 'Locked by Educator'}
          >
            <Move className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* INFINITE CANVAS WORKSPACE */}
      <div 
        ref={containerRef}
        className="flex-1 w-full h-full relative overflow-hidden bg-[#020617] touch-none select-none"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`block w-full h-full touch-none select-none ${
            activeTool === 'pan' 
              ? canNavigate ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed'
              : activeTool === 'magic_eraser' 
              ? 'cursor-pointer' 
              : activeTool === 'laser' 
              ? 'cursor-crosshair' 
              : !canDraw 
              ? 'cursor-not-allowed opacity-90' 
              : 'cursor-crosshair'
          }`}
          style={{ touchAction: 'none' }}
        />

        {/* Remote Laser Pointer with Sender Name Badge */}
        {remotePointer && (
          <div
            className="absolute z-50 pointer-events-none transition-all duration-75 flex items-center gap-1.5"
            style={{
              left: `${(remotePointer.nx * (canvasRef.current?.width || 0) * scale + offset.x)}px`,
              top: `${(remotePointer.ny * (canvasRef.current?.height || 0) * scale + offset.y)}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 border-2 border-white shadow-xl" />
            </span>
            <span className="bg-slate-950/95 text-rose-300 border border-rose-500/50 text-[10px] font-mono px-1.5 py-0.5 rounded shadow-lg font-bold whitespace-nowrap">
              {remotePointer.senderName}
            </span>
          </div>
        )}

        {/* ZOOM CONTROLS PLACED EXACTLY IN LEFT-BOTTOM */}
        {canNavigate && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl shadow-xl z-20">
            <button onClick={() => handleZoom(-0.2)} className="p-1 text-slate-300 hover:text-white" title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-300 px-1 font-bold">{Math.round(scale * 100)}%</span>
            <button onClick={() => handleZoom(0.2)} className="p-1 text-slate-300 hover:text-white" title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleResetZoom} className="p-1 text-slate-400 hover:text-white ml-0.5" title="Reset Zoom">
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* FLOATING PAGE SAVE STATUS & QUICK SLIDER BAR (Bottom Right) */}
        <div className="absolute bottom-3 right-3 z-30 flex flex-col items-end gap-1.5 pointer-events-auto">
          
          {isPageStripOpen && (
            <div className="bg-slate-900/95 backdrop-blur border border-slate-800 p-2 rounded-2xl shadow-2xl flex flex-col gap-2 max-w-[280px] sm:max-w-sm animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>PDF Sheet Slider ({currentPageIndex + 1}/{pages.length})</span>
                </span>
                <button
                  onClick={handleManualForceSave}
                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow"
                  title="Manual Force Save"
                >
                  <Save className="w-3 h-3" />
                  <span>Save Now</span>
                </button>
              </div>

              <input
                type="range"
                min="0"
                max={pages.length - 1}
                value={currentPageIndex}
                disabled={!isTeacher && lockStudentView}
                onChange={(e) => handlePageChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />

              <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
                {pages.map((p, idx) => (
                  <button
                    key={p.id || idx}
                    disabled={!isTeacher && lockStudentView}
                    onClick={() => handlePageChange(idx)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold shrink-0 transition ${
                      currentPageIndex === idx
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Pg {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-full shadow-lg text-[10px] font-mono text-slate-300">
            <span className={`w-2 h-2 rounded-full ${saveStatus === 'saved' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 animate-ping'}`} />
            <span className="hidden sm:inline">
              {saveStatus === 'saved' ? `Saved: ${pages.length} Pages` : 'Saving...'}
            </span>
            <span className="sm:hidden font-bold">
              {pages.length}P
            </span>
            <button
              onClick={() => setIsPageStripOpen(!isPageStripOpen)}
              className="p-0.5 text-slate-400 hover:text-white ml-0.5 rounded"
              title="Toggle Page Navigation Slider"
            >
              {isPageStripOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>

        </div>

        {/* Student Locked Indicator */}
        {!canDraw && (
          <div className="absolute top-2 left-2 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono pointer-events-none shadow">
            Drawing locked by educator
          </div>
        )}
      </div>

    </div>
  );
}