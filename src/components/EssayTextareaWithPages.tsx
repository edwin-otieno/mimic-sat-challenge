import React, { useRef, useEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface EssayTextareaWithPagesProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  className?: string;
}

// Page breaks after every 15 lines
const LINES_PER_PAGE = 15;

export const EssayTextareaWithPages: React.FC<EssayTextareaWithPagesProps> = ({
  value,
  onChange,
  onKeyDown,
  className,
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pageBreaks, setPageBreaks] = useState<number[]>([]);
  const [pageCount, setPageCount] = useState(1);

  // Calculate page breaks based on line count (15 lines per page)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const calculatePageBreaks = () => {
      const computedStyle = window.getComputedStyle(textarea);
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const fontSize = parseFloat(computedStyle.fontSize) || 20; // Default to 20px for text-xl
      const lineHeight = parseFloat(computedStyle.lineHeight) || fontSize * 1.5;
      
      // Count the number of lines in the text
      const text = value || '';
      const lines = text.split('\n');
      
      // Calculate total lines accounting for word wrapping
      // We'll use a temporary element to measure actual rendered lines
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.whiteSpace = 'pre-wrap';
      tempDiv.style.width = `${textarea.clientWidth - parseFloat(computedStyle.paddingLeft) - parseFloat(computedStyle.paddingRight)}px`;
      tempDiv.style.fontSize = computedStyle.fontSize;
      tempDiv.style.fontFamily = computedStyle.fontFamily;
      tempDiv.style.fontWeight = computedStyle.fontWeight;
      tempDiv.style.letterSpacing = computedStyle.letterSpacing;
      tempDiv.style.lineHeight = computedStyle.lineHeight;
      tempDiv.textContent = text;
      document.body.appendChild(tempDiv);
      
      const totalHeight = tempDiv.offsetHeight;
      const actualLineCount = Math.ceil(totalHeight / lineHeight);
      document.body.removeChild(tempDiv);
      
      // Calculate number of pages (15 lines per page)
      const pages = Math.max(1, Math.ceil(actualLineCount / LINES_PER_PAGE));
      setPageCount(pages);
      
      // Calculate page break positions (after lines 15, 30, 45, etc.)
      const breaks: number[] = [];
      for (let i = 1; i < pages; i++) {
        const lineNumber = i * LINES_PER_PAGE;
        const breakPosition = paddingTop + (lineNumber * lineHeight);
        breaks.push(breakPosition);
      }
      setPageBreaks(breaks);
    };

    // Calculate immediately
    calculatePageBreaks();
    
    // Recalculate when value changes (with a small delay to allow rendering)
    const timeoutId = setTimeout(calculatePageBreaks, 10);
    
    // Also recalculate on resize
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(calculatePageBreaks, 10);
    });
    
    if (textarea) {
      resizeObserver.observe(textarea);
    }
    
    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [value]);

  return (
    <div className="relative">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className={cn("relative z-10 bg-transparent", className)}
          {...props}
        />
        {/* Page break indicators overlay */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-md">
          {pageBreaks.map((top, index) => (
            <div
              key={index}
              className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400 opacity-50"
              style={{ top: `${top}px` }}
            >
              <span className="absolute right-2 -top-3 bg-white px-1.5 text-xs text-blue-600 font-medium rounded shadow-sm">
                Page {index + 2}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* Page count display */}
      <div className="mt-2 text-sm text-gray-600">
        <span className="text-xs text-gray-500">
          {pageCount} {pageCount === 1 ? 'page' : 'pages'}
        </span>
      </div>
    </div>
  );
};
