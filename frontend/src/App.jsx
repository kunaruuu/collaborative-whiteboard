import React, { useState, useCallback, useEffect } from 'react';
import io from 'socket.io-client';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';

const socket = io(import.meta.env.VITE_BACKEND_URL
     || 'http://localhost:3001'); // Connect to your backend

function App() {
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentBrushSize, setCurrentBrushSize] = useState(2);
  const [drawingHistory, setDrawingHistory] = useState([]); // Stores all drawn strokes
  const [redoStack, setRedoStack] = useState([]);
  const [currentTool, setCurrentTool] = useState('brush');
  const canvasRef = React.useRef(null);

  const handleSaveCanvas = useCallback((withBackground = true) => {
    if(canvasRef.current) {
      canvasRef.current.saveImage(withBackground);
    }
  }, []);

  
  const undo = useCallback(() => {
    if (drawingHistory.length === 0) return;
    
    const lastAction = drawingHistory[drawingHistory.length-1];
    setRedoStack((prev) => [...prev, lastAction]);
    setDrawingHistory((prev) => prev.slice(0,-1));
  }, [drawingHistory]);
  
  
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const lastUndo = redoStack[redoStack.length-1];
    setDrawingHistory((prev) => [...prev, lastUndo]);
    setRedoStack((prev) => prev.slice(0,-1));
  }, [redoStack]);
  
  const clear = useCallback(() => {
    setDrawingHistory([]);
    setRedoStack([]);
  },[]);
  
  const handleUndo = () => {
    undo();
    socket.emit('undo');
  };

  const handleRedo = () => {
    redo();
    socket.emit('redo');
  };
  
  // handleClearCanvas: Clears the canvas for all users
  const handleClearCanvas = () => {
    clear();
    // Emit an event to the server to tell all clients to clear their canvases
    socket.emit('clearCanvas');
  };

  const handleDraw = useCallback((stroke) => {
    setDrawingHistory(prevHistory => [...prevHistory, stroke]);
    setRedoStack([]);
    socket.emit('drawing', stroke);

  }, [socket])

  useEffect(() => {
    socket.on('drawing', (stroke) => {
      setDrawingHistory(prevHistory => [...prevHistory, stroke]);

    });
    socket.on('undo', undo);
    socket.on('redo', redo);
    socket.on('clearCanvas', clear);
    return () => {
      socket.off('drawing');
      socket.off('undo', undo);
      socket.off('redo', redo);
      socket.off('clearCanvas', clear);
    }
  }, [undo, redo, socket]);

  return (
    <div style={{ display: 'flex', gap:'10px', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f0f0' }}>
      <Canvas
        socket={socket}
        ref={canvasRef}
        currentColor={currentColor}
        currentBrushSize={currentBrushSize}
        drawingHistory={drawingHistory}
        onDrawEnd={handleDraw}
        currentTool={currentTool}
      />
      <Toolbar
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        currentBrushSize={currentBrushSize}
        setCurrentBrushSize={setCurrentBrushSize}
        onClearCanvas={handleClearCanvas}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={drawingHistory.length>0}
        canRedo={redoStack.length>0}
        currentTool={currentTool}
        setCurrentTool={setCurrentTool}
        onSaveCanvas={handleSaveCanvas}
      />
    </div>
  );
}

export default App;