import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Highlighter, Eraser, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TextHighlighterProps {
  text: string;
  onTextChange?: (text: string) => void;
  readOnly?: boolean;
  className?: string;
  selectedColor?: string;
  highlights?: Array<{id: string, start: number, end: number, color: string}>;
  onHighlightsChange?: (highlights: Array<{id: string, start: number, end: number, color: string}>) => void;
}

interface Highlight {
  id: string;
  start: number;
  end: number;
  color: string;
  text: string;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: 'bg-yellow-200', class: 'bg-yellow-200' },
  { name: 'Green', value: 'bg-green-200', class: 'bg-green-200' },
  { name: 'Blue', value: 'bg-blue-200', class: 'bg-blue-200' },
  { name: 'Pink', value: 'bg-pink-200', class: 'bg-pink-200' },
  { name: 'Orange', value: 'bg-orange-200', class: 'bg-orange-200' },
  { name: 'Purple', value: 'bg-purple-200', class: 'bg-purple-200' },
];

const TextHighlighter: React.FC<TextHighlighterProps> = ({
  text,
  onTextChange,
  readOnly = false,
  className = '',
  selectedColor: propSelectedColor,
  highlights: propHighlights,
  onHighlightsChange
}) => {
  const [highlights, setHighlights] = useState<Highlight[]>(propHighlights || []);
  const [selectedColor, setSelectedColor] = useState(propSelectedColor || HIGHLIGHT_COLORS[0].value);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // Update local state when props change
  useEffect(() => {
    if (propHighlights) {
      setHighlights(propHighlights);
    }
  }, [propHighlights]);

  useEffect(() => {
    if (propSelectedColor) {
      setSelectedColor(propSelectedColor);
    }
  }, [propSelectedColor]);

  // Handle text selection
  const handleMouseUp = () => {
    if (readOnly || !isHighlighting) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.commonAncestorContainer;
    
    if (textNode.nodeType === Node.TEXT_NODE && textRef.current?.contains(textNode)) {
      const textContent = textRef.current.textContent || '';
      const start = textContent.indexOf(range.toString());
      const end = start + range.toString().length;
      
      if (start >= 0 && end > start) {
        setSelection({ start, end });
      }
    }
  };

  // Add highlight
  const addHighlight = () => {
    if (!selection || readOnly) return;

    const newHighlight: Highlight = {
      id: Date.now().toString(),
      start: selection.start,
      end: selection.end,
      color: selectedColor,
      text: text.slice(selection.start, selection.end)
    };

    const newHighlights = [...highlights, newHighlight];
    setHighlights(newHighlights);
    setSelection(null);
    
    // Call the callback if provided
    if (onHighlightsChange) {
      onHighlightsChange(newHighlights);
    }
    
    // Clear selection
    window.getSelection()?.removeAllRanges();
  };

  // Remove highlight
  const removeHighlight = (highlightId: string) => {
    const newHighlights = highlights.filter(h => h.id !== highlightId);
    setHighlights(newHighlights);
    
    // Call the callback if provided
    if (onHighlightsChange) {
      onHighlightsChange(newHighlights);
    }
  };

  // Clear all highlights
  const clearAllHighlights = () => {
    setHighlights([]);
    
    // Call the callback if provided
    if (onHighlightsChange) {
      onHighlightsChange([]);
    }
  };

  // Render text with highlights
  const renderHighlightedText = () => {
    if (highlights.length === 0) {
      return <span>{text}</span>;
    }

    // Sort highlights by start position
    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);
    
    const parts: JSX.Element[] = [];
    let lastIndex = 0;

    sortedHighlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.slice(lastIndex, highlight.start)}
          </span>
        );
      }

      // Add highlighted text
      parts.push(
        <span
          key={highlight.id}
          className={cn(
            'highlighted-text cursor-pointer',
            HIGHLIGHT_COLORS.find(c => c.value === highlight.color)?.class || 'bg-yellow-200'
          )}
          onClick={() => !readOnly && removeHighlight(highlight.id)}
          title={readOnly ? '' : 'Click to remove highlight'}
        >
          {highlight.text}
        </span>
      );

      lastIndex = highlight.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.slice(lastIndex)}
        </span>
      );
    }

    return <>{parts}</>;
  };

  return (
    <div className={cn('text-highlighter', className)}>
      {!readOnly && (
        <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isHighlighting ? "default" : "outline"}
              size="sm"
              onClick={() => setIsHighlighting(!isHighlighting)}
            >
              <Highlighter className="h-4 w-4 mr-1" />
              {isHighlighting ? 'Highlighting' : 'Highlight'}
            </Button>
            
            {isHighlighting && (
              <>
                <div className="flex items-center gap-1">
                  <Palette className="h-4 w-4" />
                  <div className="flex gap-1">
                    {HIGHLIGHT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={cn(
                          'w-6 h-6 rounded border-2',
                          color.class,
                          selectedColor === color.value ? 'border-gray-800' : 'border-gray-300'
                        )}
                        onClick={() => setSelectedColor(color.value)}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
                
                {selection && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addHighlight}
                  >
                    Add Highlight
                  </Button>
                )}
              </>
            )}
            
            {highlights.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAllHighlights}
              >
                <Eraser className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}
      
      <div
        ref={textRef}
        className={cn(
          'highlightable-text p-4 border rounded-lg bg-white',
          isHighlighting && !readOnly && 'cursor-text select-text'
        )}
        onMouseUp={handleMouseUp}
        style={{ userSelect: isHighlighting && !readOnly ? 'text' : 'none' }}
      >
        {renderHighlightedText()}
      </div>
      
      {highlights.length > 0 && (
        <div className="mt-2 text-sm text-gray-600">
          {highlights.length} highlight{highlights.length !== 1 ? 's' : ''} added
        </div>
      )}
    </div>
  );
};

export default TextHighlighter;
