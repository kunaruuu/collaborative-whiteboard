import React, { useRef, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001'); // Connect to your backend

function App() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  // Changed lastPos from useState to useRef for immediate updates
  const lastPos = useRef({ x: 0, y: 0 });
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentBrushSize, setCurrentBrushSize] = useState(2);
  const [drawingHistory, setDrawingHistory] = useState([]); // Stores all drawn strokes
  const prevCanvasDimensions = useRef({ width: 0, height: 0 }); // To store dimensions before resize

  // --- Helper Functions (wrapped in useCallback for stability) ---

  // drawLine: Draws a line segment on the canvas context
  const drawLine = useCallback((x1, y1, x2, y2, color, brushSize, context) => {
    if (!context) return; // Ensure context is available
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }, []); // No dependencies, as it uses its arguments

  // redrawCanvas: Clears canvas and redraws all strokes from history with scaling
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; // Ensure canvas is available
    const ctx = canvas.getContext('2d');

    const oldWidth = prevCanvasDimensions.current.width;
    const oldHeight = prevCanvasDimensions.current.height;
    const newWidth = canvas.width;
    const newHeight = canvas.height;

    // Only scale if old dimensions are valid (not 0)
    if (oldWidth > 0 && oldHeight > 0) {
      const scaleX = newWidth / oldWidth;
      const scaleY = newHeight / oldHeight;

      ctx.clearRect(0, 0, newWidth, newHeight); // Clear the entire canvas before redrawing

      drawingHistory.forEach(stroke => {
        // Scale each coordinate
        const scaledX1 = stroke.x1 * scaleX;
        const scaledY1 = stroke.y1 * scaleY;
        const scaledX2 = stroke.x2 * scaleX;
        const scaledY2 = stroke.y2 * scaleY;

        drawLine(scaledX1, scaledY1, scaledX2, scaledY2, stroke.color, stroke.brushSize, ctx);
      });
    }
  }, [drawingHistory, drawLine]); // Depends on drawingHistory and drawLine (which is stable)

  // setCanvasDimensions: Sets canvas size and triggers redraw (only on resize/mount)
  const setCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // No need for ctx here, as style updates are in a separate useEffect

    // Store current dimensions before changing them
    prevCanvasDimensions.current = {
      width: canvas.width,
      height: canvas.height,
    };

    // Set new dimensions
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;

    redrawCanvas(); // Call redrawCanvas to scale and redraw history
  }, [redrawCanvas]); // Only depends on redrawCanvas (which is stable)

  // --- Mouse Event Handlers ---

  const handleMouseDown = useCallback((e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Update lastPos.current directly
    lastPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []); // No dependencies, as it uses its arguments or stable state setters

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    // Draw on local canvas using current color/size
    ctx.strokeStyle = currentColor; // Apply current color
    ctx.lineWidth = currentBrushSize; // Apply current brush size
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    const strokeData = {
      x1: lastPos.current.x, // Use lastPos.current
      y1: lastPos.current.y, // Use lastPos.current
      x2: currentX,
      y2: currentY,
      color: currentColor,
      brushSize: currentBrushSize
    };

    socket.emit('drawing', strokeData);

    // Add the stroke to local drawing history
    setDrawingHistory(prevHistory => [
      ...prevHistory,
      strokeData
    ]);

    // Update lastPos.current directly for the next segment
    lastPos.current = { x: currentX, y: currentY };
  }, [isDrawing, currentColor, currentBrushSize, drawLine]); // Removed lastPos from dependencies

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleMouseOut = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // --- useEffect for Initial Canvas Setup and Listeners (Dimensions & Redraw) ---
  useEffect(() => {
    // Initial setup of canvas dimensions
    setCanvasDimensions();

    // Handle window resize event
    window.addEventListener('resize', setCanvasDimensions);

    // Cleanup function: Runs when the component unmounts
    return () => {
      window.removeEventListener('resize', setCanvasDimensions);
    };
  }, [setCanvasDimensions]); // Only depends on setCanvasDimensions (which is stable)

  // --- useEffect for Socket.IO Listeners (Receiving Drawings) ---
  useEffect(() => {
    // Listen for 'drawing' events from the Socket.IO server
    socket.on('drawing', (data) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      drawLine(data.x1, data.y1, data.x2, data.y2, data.color, data.brushSize, ctx);

      // Add the received stroke to local drawing history
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

    // Cleanup for socket listener
    return () => {
      socket.off('drawing');
    };
  }, [drawLine]); // Depends on drawLine (which is stable)

  // --- useEffect for Canvas Context Style Updates (Color/Brush Size) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Apply current color and brush size to the context
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentBrushSize;

    // No cleanup needed for these simple style updates
  }, [currentColor, currentBrushSize]); // Only runs when color or brush size changes

  // --- Render ---

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f0f0' }}>
      {/* The Canvas Element */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseOut={handleMouseOut}
        style={{ border: '1px solid black', backgroundColor: 'white' }}
      />

      {/* UI Controls for Color and Brush Size - Moved to bottom */}
      <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <label htmlFor="colorPicker">Color:</label>
        <input
          type="color"
          id="colorPicker"
          value={currentColor}
          onChange={(e) => setCurrentColor(e.target.value)}
        />

        <label htmlFor="brushSize">Brush Size:</label>
        <input
          type="range"
          id="brushSize"
          min="1"
          max="10"
          value={currentBrushSize}
          onChange={(e) => setCurrentBrushSize(parseInt(e.target.value))}
        />
        <span>{currentBrushSize}px</span>
      </div>
    </div>
  );
}

export default App;
