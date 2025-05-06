
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface LineReaderProps {
  visible: boolean;
  onToggle: () => void;
}

const LineReader: React.FC<LineReaderProps> = ({ visible, onToggle }) => {
  const [position, setPosition] = useState({ y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);
  
  const handleMouseDown = () => {
    setIsDragging(true);
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && readerRef.current) {
      setPosition({
        y: e.clientY - readerRef.current.offsetHeight / 2
      });
    }
  };
  
  useEffect(() => {
    if (visible) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [visible, isDragging]);
  
  if (!visible) return null;
  
  return (
    <>
      <div 
        ref={readerRef}
        className="fixed left-0 right-0 h-8 bg-yellow-100/30 border-y border-yellow-400 cursor-move z-50"
        style={{ top: `${position.y}px` }}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute right-2 top-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={onToggle}
          >
            Hide
          </Button>
        </div>
      </div>
    </>
  );
};

export default LineReader;
