import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001'); // Connect to your backend

function App() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentBrushSize, setcurrentBrushSize] = useState(2);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;

    // Drawing settings
    ctx.lineWidth = currentBrushSize;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentColor;

    const drawLine = (x1, y1, x2, y2, color, brushSize) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    // Handle incoming drawing data from other clients
    socket.on('drawing', (data) => {
      drawLine(data.x1, data.y1, data.x2, data.y2,data.color, data.brushSize);
    });

    return () => {
      socket.off('drawing');
    };
  }, []);

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    setLastPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    // Draw on local canvas
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = currentBrushSize;
    ctx.strokeStyle = currentColor;
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    // Emit drawing data to the server
    socket.emit('drawing', {
      x1: lastPos.x,
      y1: lastPos.y,
      x2: currentX,
      y2: currentY,
      color: currentColor,
      brushSize: currentBrushSize
    });

    setLastPos({ x: currentX, y: currentY });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleMouseOut = () => {
    setIsDrawing(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f0f0' }}>
    <div style={{margin: '10px', display:'flex', gap: '10px', alignItems:'center'}}>
      <label htmlFor='colorPicker'>Color:</label>
      <input type='color' id="colorPicker" value={currentColor}
      onChange={(e)=> setCurrentColor(e.target.value)}></input>

      <label htmlFor='brushSize'>Color:</label>
      <input type='range' id="brushSize" 
      min="1"
      max="10"
      value={currentBrushSize}
      onChange={(e)=> setcurrentBrushSize(e.target.value)}></input>
      <span>{currentBrushSize}px</span>
    </div>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseOut={handleMouseOut}
        style={{ border: '1px solid black', backgroundColor: 'white' }}
      />
    </div>
  );
}

export default App;