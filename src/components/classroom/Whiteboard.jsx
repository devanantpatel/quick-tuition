import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Pencil, Highlighter, Eraser, Sparkles, Square, Circle, ArrowRight,
  Undo2, Redo2, Trash2, ChevronLeft, ChevronRight, Plus, Minus,
  MousePointer, Move, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const COLORS = [
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

  // Multi-Page Canvas State
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

  // Tools: 'pen' | 'highlighter' | 'eraser' | 'magic_eraser' | 'rect' | 'circle' | 'arrow' | 'laser' | 'pan'
  const [activeTool, setActiveTool] = useState('pen');
  const [activeColor, setActiveColor] = useState('#ffffff');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const strokeWidth = 3;

  // Zoom & Pan Matrix
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

  // Student can draw ONLY if Teacher allowed
  const canDraw = isTeacher || Boolean(isStudentAllowed);
  // Student can zoom/pan ONLY if Teacher has NOT locked view
  const canNavigate = isTeacher || !Boolean(lockStudentView);

  // Cache persistence
  useEffect(() => {
    try {
      localStorage.setItem(`${roomId}_pages`, JSON.stringify(pages));
    } catch (e) {}
  }, [pages, roomId]);

  // 1. STABLE REALTIME SYNC (Zero-Collision Stroke Injection)
  useEffect(() => {
    if (!registerListener) return;

    // Stroke Sync: Append without wiping existing strokes
    registerListener('whiteboard:stroke_drawn', (data) => {
      if (data && data.senderRole !== currentUser?.role) {
        const targetPage = Number(data.pageIndex ?? 0);
        const incomingStroke = data.stroke;
        if (!incomingStroke) return;

        setPages((prevPages) => {
          const next = prevPages.map((pg, idx) => {
            if (idx === targetPage) {
              // Avoid duplicate strokes
              const exists = pg.strokes.some((s) => s.id === incomingStroke.id);
              if (exists) return pg;
              return { ...pg, strokes: [...pg.strokes, incomingStroke] };
            }
            return pg;
          });

          // If target page doesn't exist yet, create it safely
          if (!next[targetPage]) {
            next[targetPage] = { id: targetPage + 1, strokes: [incomingStroke] };
          }
          return next;
        });
      }
    });

    // Undo Sync: Pops last stroke on targeted page
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

    // Magic Eraser Sync: Deletes stroke by unique ID
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

    // Page Switch Sync
    registerListener('whiteboard:page_sync', (data) => {
      if (!isTeacher && data && data.pageIndex !== undefined) {
        setCurrentPageIndex(Number(data.pageIndex));
        if (data.pages && Array.isArray(data.pages)) {
          setPages(data.pages);
        }
      }
    });

    // Zoom & Pan Sync (Follows educator when locked)
    registerListener('whiteboard:zoom_sync', (data) => {
      if (!isTeacher && lockStudentView && data) {
        if (data.scale !== undefined) setScale(data.scale);
        if (data.offset !== undefined) setOffset(data.offset);
      }
    });

    // Remote Laser Pointer
    registerListener('whiteboard:laser_pointer', (data) => {
      if (data && data.senderRole !== currentUser?.role) {
        setRemotePointer(data);
        if (remotePointerTimeoutRef.current) clearTimeout(remotePointerTimeoutRef.current);
        remotePointerTimeoutRef.current = setTimeout(() => {
          setRemotePointer(null);
        }, 2500);
      }
    });

    // Rejoin handshake
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

  // 2. CANVAS REDRAW (Crisp Grid + Transformed Strokes)
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Grid Background
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

    // Zoom & Pan matrix
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    const currentStrokes = pages[currentPageIndex]?.strokes || [];
    currentStrokes.forEach((st) => {
      drawSingleStroke(ctx, st, width, height);
    });

    // Local ongoing drawing preview
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
    ctx.lineWidth = st.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (st.tool === 'highlighter') {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = st.width * 3.5;
    } else if (st.tool === 'eraser') {
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = st.width * 5;
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

  // 3. Transformation: Screen -> Virtual Normalized Coordinates
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
      x: Math.max(0, Math.min(1, virtualX / canvas.width)),
      y: Math.max(0, Math.min(1, virtualY / canvas.height)),
      rawScreenX: screenX,
      rawScreenY: screenY
    };
  };

  // Laser Pointer Emitter
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

  // Magic Eraser Hit Detection
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

  // 4. Pointer Interaction
  const handlePointerDown = (e) => {
    if (e.pointerType === 'touch') {
      try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
    }

    const pt = getCanvasPoint(e);

    // Pan / Drag (ONLY if permitted by Educator lock)
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
    currentStrokeRef.current = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tool: activeTool,
      color: activeColor,
      width: strokeWidth,
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
      // Safe Immutability Update: Preserves all existing teacher & student strokes
      setPages((prevPages) => {
        return prevPages.map((pg, idx) => {
          if (idx === currentPageIndex) {
            return { ...pg, strokes: [...pg.strokes, finalStroke] };
          }
          return pg;
        });
      });

      setRedoStack([]);

      // Broadcast single stroke to peer
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

  // Zoom Helpers (Disabled if Student is locked)
  const handleZoom = (delta) => {
    if (!canNavigate) return;
    const newScale = Math.max(0.4, Math.min(3.5, Number((scale + delta).toFixed(2))));
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

  // Undo (Synced for both Teacher & Student)
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

  // Page Controls
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

  // Global export hook
  useEffect(() => {
    window.__exportWhiteboardAllPages = async () => pages;
    return () => { delete window.__exportWhiteboardAllPages; };
  }, [pages]);

  return (
    <div className="flex flex-col h-full w-full bg-[#020617] overflow-hidden select-none relative">
      
      {/* 1. COMPACT TOOLBAR (Exact Locked UI) */}
      <div className="h-10 bg-slate-900 border-b border-slate-800 px-1.5 flex items-center justify-between shrink-0 text-xs gap-1 z-30">
        
        {/* Left: Page Navigation + Add + Delete */}
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
                title="Add New Page"
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

        {/* Center: Tools */}
        <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTool('pen')}
            className={`p-1.5 rounded-lg transition ${activeTool === 'pen' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Pen"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTool('highlighter')}
            className={`p-1.5 rounded-lg transition ${activeTool === 'highlighter' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Highlighter"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTool('eraser')}
            className={`p-1.5 rounded-lg transition ${activeTool === 'eraser' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Stroke Eraser"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTool('magic_eraser')}
            className={`p-1.5 rounded-lg transition ${activeTool === 'magic_eraser' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-amber-400'}`}
            title="Magic Eraser"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTool('rect')}
            className={`p-1.5 rounded-lg transition ${activeTool === 'rect' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Rectangle"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTool('circle')}
            className={`p-1.5 rounded-lg transition ${activeTool === 'circle' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Circle"
          >
            <Circle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTool('arrow')}
            className={`p-1.5 rounded-lg transition ${activeTool === 'arrow' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Arrow"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTool('laser')}
            className={`p-1.5 rounded-lg transition ${activeTool === 'laser' ? 'bg-rose-600 text-white shadow animate-pulse' : 'text-slate-400 hover:text-rose-400'}`}
            title="Laser Pointer"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          {/* Hand Pan Tool (Disabled if Screen Follow Locked for student) */}
          <button
            disabled={!canNavigate}
            onClick={() => setActiveTool('pan')}
            className={`p-1.5 rounded-lg transition disabled:opacity-20 ${activeTool === 'pan' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-emerald-400'}`}
            title={canNavigate ? 'Pan / Move Canvas' : 'Pan Locked by Educator'}
          >
            <Move className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Colors, Desktop Zoom & Undo/Redo */}
        <div className="flex items-center gap-1 shrink-0 relative">
          
          {/* Universal Color Selector */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-5 h-5 rounded-full border-2 border-slate-700 shadow flex items-center justify-center p-0.5"
              style={{ backgroundColor: activeColor }}
              title="Pick Color"
            />

            {showColorPicker && (
              <div className="absolute right-0 top-7 bg-slate-900 border border-slate-800 p-1.5 rounded-xl flex items-center gap-1.5 shadow-2xl z-50">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setActiveColor(c); setShowColorPicker(false); }}
                    className={`w-4 h-4 rounded-full border transition ${activeColor === c ? 'border-white scale-125 shadow' : 'border-transparent opacity-75'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Desktop Zoom In / Zoom Out (Locked if Student is locked) */}
          <div className="hidden sm:flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button disabled={!canNavigate} onClick={() => handleZoom(-0.15)} className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20" title="Zoom Out">
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[9px] font-mono text-slate-300 px-1">{Math.round(scale * 100)}%</span>
            <button disabled={!canNavigate} onClick={() => handleZoom(0.15)} className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20" title="Zoom In">
              <ZoomIn className="w-3 h-3" />
            </button>
            <button disabled={!canNavigate} onClick={handleResetZoom} className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20" title="Reset View">
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Undo / Redo / Clear */}
          <div className="flex items-center gap-0.5">
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

      {/* 2. INFINITE WORKSPACE CANVAS */}
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

        {/* Mobile Floating Zoom Bar (Disabled when Teacher locks screen) */}
        {canNavigate && (
          <div className="sm:hidden absolute bottom-2 left-2 flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-xl z-20">
            <button onClick={() => handleZoom(-0.2)} className="p-1 text-slate-300 hover:text-white">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-0.5">{Math.round(scale * 100)}%</span>
            <button onClick={() => handleZoom(0.2)} className="p-1 text-slate-300 hover:text-white">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleResetZoom} className="p-1 text-slate-400 hover:text-white">
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Student Locked Indicator */}
        {!canDraw && (
          <div className="absolute bottom-2 right-2 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono pointer-events-none shadow">
            Drawing locked by educator
          </div>
        )}
      </div>

    </div>
  );
}