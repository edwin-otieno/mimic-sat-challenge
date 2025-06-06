import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import React from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const renderFormattedText = (text: string): React.ReactNode => {
  if (!text) return null;
  
  // Split text into paragraphs (double line breaks)
  const paragraphs = text.split(/\n\s*\n/);
  
  return paragraphs.map((paragraph, pIndex) => {
    // Split paragraph into lines
    const lines = paragraph.split('\n');
    
    const formattedLines = lines.map((line, index) => {
      // Check if line is a list item
      if (line.trim().startsWith('- ')) {
        return React.createElement('li', { key: index, className: 'ml-4' },
          React.createElement('div', { dangerouslySetInnerHTML: { __html: line.substring(2) } })
        );
      }
      // Check if line is a numbered list item
      if (/^\d+\.\s/.test(line)) {
        return React.createElement('li', { key: index, className: 'ml-4' },
          React.createElement('div', { dangerouslySetInnerHTML: { __html: line.substring(line.indexOf('.') + 2) } })
        );
      }
      // Regular text with HTML formatting
      return React.createElement('div', { 
        key: index, 
        className: 'mb-2',
        dangerouslySetInnerHTML: { __html: line }
      });
    });

    // Wrap list items in a ul element if needed
    const hasListItems = lines.some(line => 
      line.trim().startsWith('- ') || /^\d+\.\s/.test(line)
    );

    if (hasListItems) {
      return React.createElement('ul', { key: pIndex, className: 'mb-4' }, formattedLines);
    }

    return React.createElement('div', { key: pIndex, className: 'mb-4' }, formattedLines);
  });
};
