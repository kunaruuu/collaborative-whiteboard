import React, { useRef, useEffect, useState, useCallback } from 'react';

function Canvas({ socket, 
    currentColor, 
    currentBrushSize, 
    drawingHistory, 
    setDrawingHistory, 
    setRedoStack }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const prevCanvasDimensions = useRef({ width: 0, height: 0 });
  const drawingHistoryRef = useRef([]);

  // --- Helper Functions (wrapped in useCallback for stability) ---

  const drawLine = useCallback((x1, y1, x2, y2, color, brushSize, context) => {
    if (!context) return;
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const oldWidth = prevCanvasDimensions.current.width;
    const oldHeight = prevCanvasDimensions.current.height;
    const newWidth = canvas.width;
    const newHeight = canvas.height;

    if (oldWidth > 0 && oldHeight > 0) {
      const scaleX = newWidth / oldWidth;
      const scaleY = newHeight / oldHeight;

      ctx.clearRect(0, 0, newWidth, newHeight);

      drawingHistoryRef.current.forEach(stroke => {
        const scaledX1 = stroke.x1 * scaleX;
        const scaledY1 = stroke.y1 * scaleY;
        const scaledX2 = stroke.x2 * scaleX;
        const scaledY2 = stroke.y2 * scaleY;

        drawLine(scaledX1, scaledY1, scaledX2, scaledY2, stroke.color, stroke.brushSize, ctx);
      });
    }
  }, [drawLine]);

  const setCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    prevCanvasDimensions.current = {
      width: canvas.width,
      height: canvas.height,
    };

    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;

    redrawCanvas();
  }, [redrawCanvas]);

  // --- Unified Event Handler Logic ---
  // This function handles both mouse and touch move events
  const handleDrawingMove = useCallback((clientX, clientY) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentBrushSize;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    const strokeData = {
      x1: lastPos.current.x,
      y1: lastPos.current.y,
      x2: currentX,
      y2: currentY,
      color: currentColor,
      brushSize: currentBrushSize
    };

    socket.emit('drawing', strokeData);

    drawingHistoryRef.current.push(strokeData);
    setDrawingHistory(drawingHistoryRef.current);
    setRedoStack([]);

    lastPos.current = { x: currentX, y: currentY };
  }, [isDrawing, currentColor, currentBrushSize, socket, setDrawingHistory, setRedoStack]);

  // --- Mouse Event Handlers ---
  const handleMouseDown = useCallback((e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    lastPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseMove = useCallback((e) => {
    handleDrawingMove(e.clientX, e.clientY);
  }, [handleDrawingMove]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleMouseOut = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // --- Touch Event Handlers ---
  const handleTouchStart = useCallback((e) => {
    e.preventDefault(); // Prevent default touch behavior (e.g., scrolling)
    const touch = e.touches[0];
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    lastPos.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault(); // Prevent default touch behavior (e.g., scrolling)
    const touch = e.touches[0];
    handleDrawingMove(touch.clientX, touch.clientY);
  }, [handleDrawingMove]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault(); // Prevent default touch behavior
    setIsDrawing(false);
  }, []);

  const handleTouchCancel = useCallback((e) => {
    e.preventDefault(); // Prevent default touch behavior
    setIsDrawing(false);
  }, []);

  // --- useEffects ---
  useEffect(() => {
    setCanvasDimensions();
    window.addEventListener('resize', setCanvasDimensions);
    return () => {
      window.removeEventListener('resize', setCanvasDimensions);
    };
  }, [setCanvasDimensions]);

  useEffect(() => {
    socket.on('drawing', (data) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      drawLine(data.x1, data.y1, data.x2, data.y2, data.color, data.brushSize, ctx);

      drawingHistoryRef.current.push({
        x1: data.x1,
        y1: data.y1,
        x2: data.x2,
        y2: data.y2,
        color: data.color,
        brushSize: data.brushSize
      });
      setDrawingHistory(drawingHistoryRef.current);
    });

    socket.on('clearCanvas', () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawingHistoryRef.current = [];
      setDrawingHistory([]);
    });


    return () => {
      socket.off('drawing');
      socket.off('clearCanvas');
      
    };
  }, [drawLine, socket, setDrawingHistory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentBrushSize;
  }, [currentColor, currentBrushSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawingHistory.forEach(stroke => {
        drawLine(stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.color, stroke.brushSize, ctx);
    })
  },[drawingHistory, drawLine]);

  // --- Render ---
  return (
    <canvas
      ref={canvasRef}
      // Mouse Events
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseOut={handleMouseOut}
      // Touch Events
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{ border: '1px solid black', backgroundColor: 'white', touchAction: 'none' }} // touchAction: 'none' helps prevent default browser gestures
    />
  );
}

export default Canvas;
