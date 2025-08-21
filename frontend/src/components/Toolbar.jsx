import React from 'react';

function Toolbar({ currentColor,
  setCurrentColor, 
  currentBrushSize, 
  setCurrentBrushSize, 
  onClearCanvas, 
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  currentTool,
  setCurrentTool
 }) {
  
  return (
    <div style={{ display: 'flex', gap: '10px', 
    alignItems: 'center', border: '1px solid #bbbbbbff', padding: '10px',
     backgroundColor: '#d5d1d134',
      borderRadius: '5px',
      maxWidth: '80vw',
      boxSizing: 'border-box',
      // flexWrap: 'wrap'
       }}>
      <div style = {{
        marginRight: '20px',
        display: 'flex',
        gap: '5px',
      }}>
        <button onClick={() => setCurrentTool('brush')} 
          style={{
            padding: '8px 15px',
            cursor: 'pointer',
            backgroundColor: currentTool === 'brush' ? '#007bff' : '#f0f0f0',
            color: currentTool === 'brush' ? 'white' :'black',
            border: '1px solid #007bff',
            borderRadius: '3px'
          }}>
          Brush
          </button>

        <button onClick={() => setCurrentTool('eraser')}
          style={{
            padding: '8px 15px',
            cursor: 'pointer',
            backgroundColor: currentTool === 'eraser' ? '#007bff' : '#f0f0f0',
            color: currentTool === 'eraser' ? 'white' :'black',
            border: '1px solid #007bff',
            borderRadius: '3px'
          }}>
          Eraser
        </button>
      </div>
      <label htmlFor="colorPicker" style={{
        opacity: currentTool === 'eraser' ? 0.5 : 1
      }}>Color:</label>
      <input
        type="color"
        id="colorPicker"
        value={currentColor}
        onChange={(e) => setCurrentColor(e.target.value)}
        disabled={currentTool === 'eraser'}
        style={{ cursor: currentTool === 'eraser' ? 'not-allowed' : 'pointer' }}
      />

      <label htmlFor="brushSize" style={{
      }}>Brush Size:</label>
      <input
        type="range"
        id="brushSize"
        min="1"
        max="100"
        value={currentBrushSize}
        onChange={(e) => setCurrentBrushSize(parseInt(e.target.value))}
      />
      <span>{currentBrushSize}px</span>

      <button onClick={onClearCanvas} style={{ marginLeft: '20px', padding: '8px 15px', cursor: 'pointer' }}>
        Clear Canvas
      </button>
      <button onClick={onUndo} disabled ={!canUndo} style={{ padding: '8px 15px', cursor: 'pointer' }}>
        Undo
      </button>
      <button onClick={onRedo} disabled ={!canRedo} style={{ padding: '8px 15px', cursor: 'pointer' }}>
        Redo
      </button>
    </div>
  );
}

export default Toolbar;
