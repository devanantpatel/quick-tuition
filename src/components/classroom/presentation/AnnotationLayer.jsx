import React, { useRef, useEffect } from 'react';

export default function AnnotationLayer({
  drawingEnabled,
  tool,
  color = '#ef4444',
  broadcast,
  registerListener,
  isTeacher
}) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (!registerListener) return;

    registerListener('presentation:draw_stroke', (stroke) => {
      if (!isTeacher) drawRemoteStroke(stroke);
    });

    registerListener('presentation:clear_overlay', () => {
      if (!isTeacher) clearCanvas();
    });
  }, [registerListener, isTeacher]);

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
    if (!isTeacher || !drawingEnabled) return;
    isDrawingRef.current = true;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawingRef.current || !isTeacher || !drawingEnabled) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');

    ctx.strokeStyle = tool === 'eraser' ? '#000000' : color;
    ctx.lineWidth = tool === 'highlighter' ? 18 : tool === 'eraser' ? 24 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = tool === 'highlighter' ? 0.35 : 1.0;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

    ctx.lineTo(x, y);
    ctx.stroke();

    if (broadcast) {
      broadcast('presentation:draw_stroke', {
        x, y, tool, color,
        width: ctx.lineWidth,
        alpha: ctx.globalAlpha,
        isEraser: tool === 'eraser'
      });
    }
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const drawRemoteStroke = (stroke) => {
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

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
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
      className={`absolute inset-0 w-full h-full z-20 ${
        drawingEnabled && isTeacher 
          ? 'pointer-events-auto cursor-crosshair' 
          : 'pointer-events-none cursor-default'
      }`}
    />
  );
}