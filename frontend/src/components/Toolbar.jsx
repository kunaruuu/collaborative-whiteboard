import React from 'react';

function Toolbar({ currentColor, setCurrentColor, currentBrushSize, setCurrentBrushSize, onClearCanvas }) {
  return (
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

      <button onClick={onClearCanvas} style={{ marginLeft: '20px', padding: '8px 15px', cursor: 'pointer' }}>
        Clear Canvas
      </button>
    </div>
  );
}

export default Toolbar;
