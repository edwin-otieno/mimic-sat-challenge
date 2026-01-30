import React, { useRef, useEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface EssayTextareaWithPagesProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  className?: string;
}

// Standard page height for essay: 11" page with 1" top and bottom margins = 9" = ~864px at 96 DPI
const PAGE_HEIGHT_PX = 864;

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

  // Calculate page breaks based on textarea scroll height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const calculatePageBreaks = () => {
      const computedStyle = window.getComputedStyle(textarea);
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
      
      // Use the actual scrollHeight of the textarea
      // This accounts for all text including word wrapping
      const scrollHeight = textarea.scrollHeight;
      const contentHeight = scrollHeight - paddingTop - paddingBottom;
      
      // Calculate number of pages
      const pages = Math.max(1, Math.ceil(contentHeight / PAGE_HEIGHT_PX));
      setPageCount(pages);
      
      // Calculate page break positions
      const breaks: number[] = [];
      for (let i = 1; i < pages; i++) {
        const breakPosition = paddingTop + (i * PAGE_HEIGHT_PX);
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
