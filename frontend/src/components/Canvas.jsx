import React, { useRef, useEffect, useState, useCallback } from 'react';

function Canvas({ socket, 
    currentColor, 
    currentBrushSize, 
    drawingHistory, 
    onDrawEnd,
    currentTool}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const prevCanvasDimensions = useRef({ width: 0, height: 0 });
  const currentStrokeRef = useRef(null);

  // --- Helper Functions (wrapped in useCallback for stability) ---

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
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.brushSize;
        ctx.beginPath();
        
        stroke.points.forEach((point, index) => {
            const scaledX= point.x * scaleX;
            const scaledY= point.y * scaleY;

            if(index === 0) {
                ctx.moveTo(scaledX, scaledY);
            } else {
                ctx.lineTo(scaledX, scaledY);
            }
        });
        ctx.stroke();
      });
    }
  }, [drawingHistory]);

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
    const currentPoint = {
        x: clientX- rect.left,
        y: clientY - rect.top
    }

    const points = currentStrokeRef.current.points;
    const lastPoint = points[points.length - 1];

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = currentStrokeRef.current.color;
    ctx.lineWidth = currentStrokeRef.current.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    socket.emit('drawing-in-progress', {
        start: lastPoint,
        end: currentPoint,
        color: currentStrokeRef.current.color,
        brushSize: currentStrokeRef.current.brushSize
    });

    currentStrokeRef.current.points.push(currentPoint);

  }, [isDrawing, socket]);

  // --- Mouse Event Handlers ---
  const handleMouseDown = useCallback((e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point = {
        x: e.clientX- rect.left,
        y: e.clientY - rect.top
    }
    currentStrokeRef.current = {
        color: currentTool === 'eraser' ? '#fff' : currentColor, // Eraser color is white
        brushSize: currentBrushSize,
        points: [point]
    }
    
  }, [currentColor, currentBrushSize, currentTool]);

  const handleMouseMove = useCallback((e) => {
    handleDrawingMove(e.clientX, e.clientY);
  }, [handleDrawingMove]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentStrokeRef.current &&
     currentStrokeRef.current.points.length > 1) {
         onDrawEnd(currentStrokeRef.current);
     }
     
    setIsDrawing(false);
    currentStrokeRef.current = null;
  }, [isDrawing, onDrawEnd]);

  const handleMouseOut = useCallback(() => {
    if (isDrawing){
        handleMouseUp();
    }
    setIsDrawing(false);
  }, [isDrawing, handleMouseUp]);

  // --- Touch Event Handlers ---
  const handleTouchStart = useCallback((e) => {
    e.preventDefault(); // Prevent default touch behavior (e.g., scrolling)
    const touch = e.touches[0];
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
    currentStrokeRef.current = {
        color: currentTool === 'eraser' ? '#fff' : currentColor,
        brushSize: currentBrushSize,
        points: [point]
    }
  }, [currentColor, currentBrushSize, currentTool]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault(); // Prevent default touch behavior (e.g., scrolling)
    const touch = e.touches[0];
    handleDrawingMove(touch.clientX, touch.clientY);
  }, [handleDrawingMove]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault(); // Prevent default touch behavior
    if (isDrawing && currentStrokeRef.current &&
     currentStrokeRef.current.points.length > 1) {
         onDrawEnd(currentStrokeRef.current);
     }
    setIsDrawing(false);
    currentStrokeRef.current = null;
  }, [onDrawEnd, isDrawing]);

  const handleTouchCancel = useCallback((e) => {
    e.preventDefault(); // Prevent default touch behavior
    handleTouchEnd(e);
  }, [handleTouchEnd]);

  // --- useEffects ---
  useEffect(() => {
    setCanvasDimensions();
    window.addEventListener('resize', setCanvasDimensions);
    return () => {
      window.removeEventListener('resize', setCanvasDimensions);
    };
  }, [setCanvasDimensions]);


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
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        for(let i = 0; i< stroke.points.length; i++){
            const point= stroke.points[i];
            if(i === 0){
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();
    })
  },[drawingHistory]);

  useEffect(() => {
    if (!socket) return;

    const handleInProgress = (data) => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(data.start.x, data.start.y);
        ctx.lineTo(data.end.x, data.end.y);
        ctx.stroke();
    }

    socket.on('drawing-in-progress', handleInProgress);

    return() => {
        socket.off('drawing-in-progress', handleInProgress);
    }
  },[socket]);

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
