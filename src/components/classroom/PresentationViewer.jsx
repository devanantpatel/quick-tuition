import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FileText, Monitor, ChevronLeft, ChevronRight, Pen, 
  Highlighter, Eraser, RotateCcw, Upload, X 
} from 'lucide-react';

export default function PresentationViewer({ 
  broadcast, 
  registerListener, 
  isTeacher = false 
}) {
  const [sourceType, setSourceType] = useState('none'); // 'none' | 'pdf' | 'screen'
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slides, setSlides] = useState([]); // List of slide image data URLs
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Drawing tools state
  const [tool, setTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser'
  const [color, setColor] = useState('#ef4444'); // Red default for marking
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef(null);
  const screenVideoRef = useRef(null);
  const screenStreamRef = useRef(null);

  // 1. Remote synchronization listeners
  useEffect(() => {
    if (!registerListener) return;

    registerListener('presentation:slide_change', (data) => {
      if (!isTeacher && typeof data.index === 'number') {
        setCurrentSlideIndex(data.index);
        clearOverlayCanvas();
      }
    });

    registerListener('presentation:draw_stroke', (stroke) => {
      if (!isTeacher) {
        drawStrokeOnCanvas(stroke);
      }
    });

    registerListener('presentation:clear_overlay', () => {
      if (!isTeacher) {
        clearOverlayCanvas();
      }
    });

    registerListener('presentation:slides_loaded', (data) => {
      if (!isTeacher && Array.isArray(data.slides)) {
        setSlides(data.slides);
        setSourceType('pdf');
        setCurrentSlideIndex(0);
      }
    });
  }, [registerListener, isTeacher]);

  // 2. Handle File Upload (Images / Exported PPT / PDF Pages)
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    const loadedSlides = [];
    let count = 0;

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        loadedSlides[index] = event.target.result;
        count++;
        if (count === files.length) {
          const validSlides = loadedSlides.filter(Boolean);
          setSlides(validSlides);
          setSourceType('pdf');
          setCurrentSlideIndex(0);
          clearOverlayCanvas();

          if (broadcast) {
            broadcast('presentation:slides_loaded', { slides: validSlides });
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 3. Screen Sharing Engine
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      screenStreamRef.current = stream;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }
      setIsScreenSharing(true);
      setSourceType('screen');

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.warn('Screen share canceled or failed:', err);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    if (sourceType === 'screen') {
      setSourceType('none');
    }
  };

  // 4. Slide Navigation
  const changeSlide = (newIndex) => {
    if (newIndex >= 0 && newIndex < slides.length) {
      setCurrentSlideIndex(newIndex);
      clearOverlayCanvas();
      if (broadcast) {
        broadcast('presentation:slide_change', { index: newIndex });
      }
    }
  };

  // 5. Drawing & Annotation Logic
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e) => {
    if (!isTeacher && sourceType !== 'none') return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');

    ctx.strokeStyle = tool === 'eraser' ? '#000000' : color;
    ctx.lineWidth = tool === 'highlighter' ? 18 : tool === 'eraser' ? 24 : strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = tool === 'highlighter' ? 0.35 : 1.0;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

    ctx.lineTo(x, y);
    ctx.stroke();

    const strokePayload = {
      x,
      y,
      tool,
      color,
      width: ctx.lineWidth,
      alpha: ctx.globalAlpha,
      isEraser: tool === 'eraser'
    };

    if (broadcast) {
      broadcast('presentation:draw_stroke', strokePayload);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const drawStrokeOnCanvas = (stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = stroke.alpha;
    ctx.globalCompositeOperation = stroke.isEraser ? 'destination-out' : 'source-over';

    ctx.lineTo(stroke.x, stroke.y);
    ctx.stroke();
  };

  const clearOverlayCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (isTeacher && broadcast) {
        broadcast('presentation:clear_overlay', {});
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 overflow-hidden relative select-none">
      
      {/* Top Presentation Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
        
        {/* Source Loaders */}
        <div className="flex items-center gap-2">
          {isTeacher && (
            <>
              <label className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition shadow">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload PPT / PDF Slides</span>
                <input 
                  type="file" 
                  accept="image/*,application/pdf" 
                  multiple 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>

              {!isScreenSharing ? (
                <button
                  onClick={startScreenShare}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition border border-slate-700"
                >
                  <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Share Screen</span>
                </button>
              ) : (
                <button
                  onClick={stopScreenShare}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Stop Screen</span>
                </button>
              )}
            </>
          )}

          {slides.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded-xl text-xs font-mono text-slate-300">
              {isTeacher && (
                <button 
                  onClick={() => changeSlide(currentSlideIndex - 1)}
                  disabled={currentSlideIndex === 0}
                  className="p-1 hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <span>Slide {currentSlideIndex + 1} / {slides.length}</span>
              {isTeacher && (
                <button 
                  onClick={() => changeSlide(currentSlideIndex + 1)}
                  disabled={currentSlideIndex === slides.length - 1}
                  className="p-1 hover:text-white disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Live Annotation Drawing Tools (Available on top of slides) */}
        {sourceType !== 'none' && isTeacher && (
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setTool('pen')}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
                tool === 'pen' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Pen Marker"
            >
              <Pen className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setTool('highlighter')}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
                tool === 'highlighter' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Text Highlighter"
            >
              <Highlighter className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setTool('eraser')}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
                tool === 'eraser' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>

            {/* Colors */}
            <div className="flex items-center gap-1 px-1">
              {['#ef4444', '#eab308', '#22c55e', '#3b82f6', '#ffffff'].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-3.5 h-3.5 rounded-full border ${color === c ? 'ring-2 ring-indigo-400' : 'border-slate-700'}`}
                />
              ))}
            </div>

            <button
              onClick={clearOverlayCanvas}
              className="p-1.5 text-slate-400 hover:text-rose-400 transition"
              title="Clear Annotation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>

      {/* Main Presentation Stage */}
      <div className="flex-1 relative flex items-center justify-center p-3 overflow-hidden bg-slate-950">
        
        {sourceType === 'none' && (
          <div className="text-center p-8 border border-dashed border-slate-800 rounded-2xl max-w-sm space-y-3">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-white text-sm font-semibold">Presentation Stage Empty</h4>
            <p className="text-slate-500 text-xs">
              {isTeacher 
                ? 'Upload your PDF / PPT slide images or share your screen to present with live annotation tools.' 
                : 'Waiting for educator to start presenting slides or screen...'}
            </p>
          </div>
        )}

        {/* Slide Viewer */}
        {sourceType === 'pdf' && slides[currentSlideIndex] && (
          <div className="relative max-h-full max-w-full flex items-center justify-center shadow-2xl rounded-xl overflow-hidden border border-slate-800 bg-white">
            <img 
              src={slides[currentSlideIndex]} 
              alt="Slide" 
              className="max-h-[75vh] w-auto object-contain pointer-events-none select-none" 
            />

            {/* Transparent Annotation Overlay Canvas */}
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className={`absolute inset-0 w-full h-full ${isTeacher ? 'cursor-crosshair' : 'pointer-events-none'}`}
            />
          </div>
        )}

        {/* Screen Share Viewer */}
        {sourceType === 'screen' && (
          <div className="relative max-h-full max-w-full flex items-center justify-center rounded-xl overflow-hidden border border-slate-800 bg-black">
            <video 
              ref={screenVideoRef} 
              autoPlay 
              playsInline 
              className="max-h-[75vh] w-auto object-contain" 
            />

            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className={`absolute inset-0 w-full h-full ${isTeacher ? 'cursor-crosshair' : 'pointer-events-none'}`}
            />
          </div>
        )}

      </div>

    </div>
  );
}