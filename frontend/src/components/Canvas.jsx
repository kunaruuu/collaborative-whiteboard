import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

const Canvas = forwardRef(({ socket, 
    currentColor, 
    currentBrushSize, 
    drawingHistory, 
    onDrawEnd,
    currentTool}, ref) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const prevCanvasDimensions = useRef({ width: 0, height: 0 });
  const currentStrokeRef = useRef(null);

  // --- Helper Functions (wrapped in useCallback for stability) ---

  const drawHistoryCanvas = useCallback((ctx, history, scaleX =1, scaleY =1) => {
    history.forEach(stroke => {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const scaledStartPoint = {
        x: stroke.startPoint.x * scaleX,
        y: stroke.startPoint.y * scaleY
      };
      const scaledEndPoint = stroke.endPoint ? {
        x: stroke.endPoint.x * scaleX,
        y: stroke.endPoint.y * scaleY
      } : null;

      switch(stroke.type) {
        case 'line':
          stroke.points.forEach((point, index) => {
            const scaledX = point.x * scaleX;
            const scaledY = point.y * scaleY;
  
            if (index === 0) {
              ctx.moveTo(scaledX, scaledY);
            } else {
              ctx.lineTo(scaledX, scaledY);
            }
          });
          break;
        case 'rectangle':
          if(scaledEndPoint) {
            const width = scaledEndPoint.x - scaledStartPoint.x;
            const height = scaledEndPoint.y - scaledStartPoint.y;
            ctx.strokeRect(scaledStartPoint.x, scaledStartPoint.y, width, height);
          }
          break;
        case 'circle':
          if(scaledEndPoint) {
            const width = scaledEndPoint.x - scaledStartPoint.x;
            const height = scaledEndPoint.y - scaledStartPoint.y;
            const centerX = scaledStartPoint.x + width / 2;
            const centerY = scaledStartPoint.y + height / 2;
            // Calculate radius based on the distance from the center to the end point
            const radius = Math.sqrt(width * width + height * height);
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          }
          break;
        default:
          console.warn(`Unknown stroke type: ${stroke.type}`);
          break;
      }
      
      ctx.stroke();
    });
  },[]);

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

      // Redraw the history with scaling
      drawHistoryCanvas(ctx, drawingHistory, scaleX, scaleY);
    }
  }, [drawingHistory, drawHistoryCanvas]);

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
    if (!isDrawing || !currentStrokeRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currentPoint = {
        x: clientX- rect.left,
        y: clientY - rect.top
    }
    
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if(currentStrokeRef.current.type === 'line') {
      
      const points = currentStrokeRef.current.points;
      const lastPoint = points[points.length - 1];
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();
      
      currentStrokeRef.current.points.push(currentPoint);
    }else {
      currentStrokeRef.current.endPoint = currentPoint;
      ctx.clearRect(0, 0, canvas.width, canvas.height); // to prevent redrawing all the in between shapes overlapping each other
      drawHistoryCanvas(ctx, drawingHistory);  // to prevent erasing previous drawings
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentBrushSize
      
      ctx.beginPath();
      const startX = currentStrokeRef.current.startPoint.x;
      const startY = currentStrokeRef.current.startPoint.y;
      const width = currentPoint.x - startX;
      const height = currentPoint.y - startY;
      if(currentStrokeRef.current.type === 'rectangle') {
        ctx.strokeRect(startX, startY, width, height);
      }
      else if(currentStrokeRef.current.type === 'circle') {
        const centerX = startX + width / 2;
        const centerY = startY + height / 2;
        // Calculate radius based on the distance from the center to the current point
        const radius = Math.sqrt(width * width + height * height);
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } 
    }
    const lastPointForEmit = currentStrokeRef.current.type === 'line' ?
      currentStrokeRef.current.points[currentStrokeRef.current.points.length - 2] :
      currentStrokeRef.current.startPoint;
    socket.emit('drawing-in-progress', {
        type: currentStrokeRef.current.type,
        start: lastPointForEmit,
        end: currentPoint,
        color: currentTool === 'eraser' ? '#fff' : currentColor,
        brushSize: currentBrushSize
      });
    
  }, [isDrawing, socket, drawingHistory, drawHistoryCanvas, currentBrushSize, currentColor, currentTool]);

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
        type: currentTool ==='brush' || currentTool === 'eraser' ? 'line' : currentTool,
        startPoint: point,
        endPoint: point,
        points: [point]
    }
    
  }, [currentTool]);

  const handleMouseMove = useCallback((e) => {
    handleDrawingMove(e.clientX, e.clientY);
  }, [handleDrawingMove]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentStrokeRef.current){ 
      setIsDrawing(false);
      return;}

      let strokeToCommit = null;
    if (currentStrokeRef.current.type === 'line' &&
     currentStrokeRef.current.points.length > 1) {
        strokeToCommit = { ...currentStrokeRef.current,
        color: currentTool === 'eraser' ? '#fff' : currentColor,
        brushSize: currentBrushSize };
        //  onDrawEnd(currentStrokeRef.current);
     }else{
      if(currentStrokeRef.current.startPoint && currentStrokeRef.current.endPoint &&
         (currentStrokeRef.current.startPoint.x !== currentStrokeRef.current.endPoint.x ||
          currentStrokeRef.current.startPoint.y !== currentStrokeRef.current.endPoint.y)) {
            strokeToCommit = { ...currentStrokeRef.current,
            color: currentTool === 'eraser' ? '#fff' : currentColor,
            brushSize: currentBrushSize };
     }

     if(strokeToCommit) {
      onDrawEnd(strokeToCommit);
     }
    }
    setIsDrawing(false);
    currentStrokeRef.current = null;
  }, [isDrawing, onDrawEnd, currentBrushSize, currentColor, currentTool]);

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
        type: currentTool ==='brush' || currentTool === 'eraser' ? 'line' : currentTool,
        color: currentTool === 'eraser' ? '#fff' : currentColor,
        brushSize: currentBrushSize,
        startPoint: point,
        endPoint: point,
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

  useImperativeHandle(ref, () => ({
    saveImage: (withBackground = true) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('Canvas element not found for saving');
        return;
      }
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (withBackground) {
        tempCtx.fillStyle = 'white'; // Set background color
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      }
      drawHistoryCanvas(tempCtx, drawingHistory, 1, 1);
      // Convert to data URL and trigger download
      const dataURL = tempCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'whiteboard.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }), [drawingHistory, drawHistoryCanvas]);


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

    drawHistoryCanvas(ctx, drawingHistory);
  },[drawingHistory, drawHistoryCanvas]);

  useEffect(() => {
    if (!socket) return;

    const handleInProgress = (data) => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');

        if(data.type !== 'line') {
          ctx.clearRect(0, 0, canvas.width, canvas.height); // to prevent redrawing all the in between shapes overlapping each other
          drawHistoryCanvas(ctx, drawingHistory);
        }
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        switch(data.type) {
          case 'line':  
            ctx.moveTo(data.start.x, data.start.y);
            ctx.lineTo(data.end.x, data.end.y);
            break;
          case 'rectangle':
            const rectWidth = data.end.x - data.start.x;
            const rectHeight = data.end.y - data.start.y;
            ctx.strokeRect(data.start.x, data.start.y, rectWidth, rectHeight);
            break;
          case 'circle':
            const width = data.end.x - data.start.x;
            const height = data.end.y - data.start.y;
            const centerX = data.start.x + width / 2;
            const centerY = data.start.y + height / 2;
            // Calculate radius based on the distance from the center to the end point
            const radius = Math.sqrt(width * width + height * height);
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            break;
          default:
            console.warn(`Unknown stroke type: ${data.type}`);
            break;
        }
        ctx.stroke();
    }

    socket.on('drawing-in-progress', handleInProgress);

    return() => {
        socket.off('drawing-in-progress', handleInProgress);
    }
  },[socket, drawingHistory, drawHistoryCanvas]);

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
});

export default Canvas;
