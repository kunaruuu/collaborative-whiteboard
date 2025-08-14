import React, { useState, useCallback } from 'react';
import io from 'socket.io-client';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';

const socket = io('http://localhost:3001'); // Connect to your backend

function App() {
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentBrushSize, setCurrentBrushSize] = useState(2);
  const [drawingHistory, setDrawingHistory] = useState([]); // Stores all drawn strokes

  // handleClearCanvas: Clears the canvas for all users
  const handleClearCanvas = useCallback(() => {
    
    // Emit an event to the server to tell all clients to clear their canvases
    socket.emit('clearCanvas');

    // Clear local drawing history immediately for responsiveness
    setDrawingHistory([]);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f0f0' }}>
      <Canvas
        socket={socket}
        currentColor={currentColor}
        currentBrushSize={currentBrushSize}
        drawingHistory={drawingHistory}
        setDrawingHistory={setDrawingHistory}
      />
      <Toolbar
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        currentBrushSize={currentBrushSize}
        setCurrentBrushSize={setCurrentBrushSize}
        onClearCanvas={handleClearCanvas}
      />
    </div>
  );
}

export default App;