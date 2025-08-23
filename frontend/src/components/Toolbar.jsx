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
  setCurrentTool,
  onSaveCanvas
 }){
 
  const [showSaveOptions, setShowSaveOptions] = React.useState(false);
  return (
    <div style={{ display: 'flex', gap: '10px', 
    alignItems: 'center', border: '1px solid #bbbbbbff', padding: '10px',
     backgroundColor: '#d5d1d134',
      borderRadius: '5px',
      // maxWidth: '80vw',
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

        <button onClick={() => setCurrentTool('circle')}
          style={{
            padding: '8px 15px',
            cursor: 'pointer',
            backgroundColor: currentTool === 'circle' ? '#007bff' : '#f0f0f0',
            color: currentTool === 'circle' ? 'white' :'black',
            border: '1px solid #007bff',
            borderRadius: '3px'
          }}>
          Circle
        </button>

        <button onClick={() => setCurrentTool('rectangle')}
          style={{
            padding: '8px 15px',
            cursor: 'pointer',
            backgroundColor: currentTool === 'rectangle' ? '#007bff' : '#f0f0f0',
            color: currentTool === 'rectangle' ? 'white' :'black',
            border: '1px solid #007bff',
            borderRadius: '3px'
          }}>
          Rectangle
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
      
      <div style={{position: 'relative',
        display: 'inline-block',
        marginLeft: '20px',
        border: '1px solid #007bff',
        borderRadius: '3px',
        whiteSpace: 'nowrap'
      }}>
        <button onClick={() => onSaveCanvas(true)} style={{ padding: '8px 15px', cursor: 'pointer',
        border : 'none',
        background: 'none',
        borderRight: '1px solid #007bff'
         }}>
          Save
        </button>
        <button onClick={() => setShowSaveOptions(!showSaveOptions)} style={{ padding: '8px 5px', cursor: 'pointer',
        border : 'none',
        background: 'none'
        }}>
          &#9660; {/* Down arrow icon */}
        </button>
        {showSaveOptions && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '3px',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            minWidth: '150px',
            
          }}>
            <button onClick={ () => {onSaveCanvas(false);
              setShowSaveOptions(false);
            }} style={{ padding: '8px 15px', cursor: 'pointer',
            border: 'none',
            background: 'none',
            textAlign: 'left',
            whiteSpace: 'nowrap'
             }}>
              Save without Background
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Toolbar;
