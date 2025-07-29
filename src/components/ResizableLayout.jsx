import React, { useState, useRef, useEffect } from 'react';

const ResizableLayout = ({ leftPanel, rightPanel, minLeftWidth = 250, maxLeftWidth = 500, defaultLeftWidth = 320 }) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);
  const resizerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      const containerWidth = containerRect.width;
      
      // Ensure minimum width for right panel (at least 300px)
      const maxAllowedLeftWidth = Math.min(maxLeftWidth, containerWidth - 300);
      
      // Constrain width within bounds
      const constrainedWidth = Math.max(minLeftWidth, Math.min(maxAllowedLeftWidth, newWidth));
      setLeftWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minLeftWidth, maxLeftWidth]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  return (
    <div ref={containerRef} className="flex h-full w-full relative overflow-hidden">
      {/* Left Panel */}
      <div 
        className="flex-shrink-0 h-full overflow-hidden"
        style={{ width: `${leftWidth}px` }}
      >
        <div className="w-full h-full">
          {leftPanel}
        </div>
      </div>
      
      {/* Resizer */}
      <div
        ref={resizerRef}
        className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors duration-200 relative group flex-shrink-0 h-full"
        onMouseDown={handleMouseDown}
      >
        {/* Visual indicator */}
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-blue-400 group-hover:opacity-20 transition-all duration-200" />
      </div>
      
      {/* Right Panel */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        <div className="w-full h-full">
          {rightPanel}
        </div>
      </div>
    </div>
  );
};

export default ResizableLayout;