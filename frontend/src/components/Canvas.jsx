import React, { useRef, useEffect, useState, useCallback } from 'react';

// This component will receive socket, currentColor, currentBrushSize,
// and setDrawingHistory as props from App.jsx
function Canvas({ socket, currentColor, currentBrushSize, drawingHistory, setDrawingHistory }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const prevCanvasDimensions = useRef({ width: 0, height: 0 });

  // --- Helper Functions (wrapped in useCallback for stability) ---

  // drawLine: Draws a line segment on the canvas context
  const drawLine = useCallback((x1, y1, x2, y2, color, brushSize, context) => {
    if (!context) return;
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }, []);

  // redrawCanvas: Clears canvas and redraws all strokes from history with scaling
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

      drawingHistory.forEach(stroke => {
        // Scale each coordinate
        const scaledX1 = stroke.x1 * scaleX;
        const scaledY1 = stroke.y1 * scaleY;
        const scaledX2 = stroke.x2 * scaleX;
        const scaledY2 = stroke.y2 * scaleY;

        drawLine(scaledX1, scaledY1, scaledX2, scaledY2, stroke.color, stroke.brushSize, ctx);
      });
    }
  }, [drawingHistory, drawLine]);

  // setCanvasDimensions: Sets canvas size and triggers redraw (only on resize/mount)
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
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

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

    setDrawingHistory(prevHistory => [
      ...prevHistory,
      strokeData
    ]);

    lastPos.current = { x: currentX, y: currentY };
  }, [isDrawing, currentColor, currentBrushSize, drawLine, socket, setDrawingHistory]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleMouseOut = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // --- useEffect for Initial Canvas Setup and Listeners (Dimensions & Redraw) ---
  useEffect(() => {
    setCanvasDimensions();
    window.addEventListener('resize', setCanvasDimensions);
    return () => {
      window.removeEventListener('resize', setCanvasDimensions);
    };
  }, [setCanvasDimensions]);

  // --- useEffect for Socket.IO Listeners (Receiving Drawings) ---
  useEffect(() => {
    socket.on('drawing', (data) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      drawLine(data.x1, data.y1, data.x2, data.y2, data.color, data.brushSize, ctx);

      setDrawingHistory(prevHistory => [
        ...prevHistory,
        {
          x1: data.x1,
          y1: data.y1,
          x2: data.x2,
          y2: data.y2,
          color: data.color,
          brushSize: data.brushSize
        }
      ]);
    });

    return () => {
      socket.off('drawing');
    };
  }, [drawLine, socket, setDrawingHistory]);

  // --- useEffect for Canvas Context Style Updates (Color/Brush Size) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentBrushSize;
  }, [currentColor, currentBrushSize]);

  // --- Render ---
  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseOut={handleMouseOut}
      style={{ border: '1px solid black', backgroundColor: 'white' }}
    />
  );
}

export default Canvas;
