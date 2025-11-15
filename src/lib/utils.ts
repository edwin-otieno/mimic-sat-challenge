import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import React from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const renderFormattedText = (text: string): React.ReactNode => {
  if (!text) return null;
  
  // Check if text contains HTML tables
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const tables: Array<{ start: number; end: number; html: string }> = [];
  let match;
  
  // Find all table HTML blocks
  while ((match = tableRegex.exec(text)) !== null) {
    tables.push({
      start: match.index,
      end: match.index + match[0].length,
      html: match[0]
    });
  }
  
  // If tables are found, render them separately
  if (tables.length > 0) {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    tables.forEach((table, tIndex) => {
      // Add text before table
      if (table.start > lastIndex) {
        const beforeText = text.substring(lastIndex, table.start);
        if (beforeText.trim()) {
          parts.push(renderTextWithoutTables(beforeText, `before-table-${tIndex}`));
        }
      }
      
      // Add table with proper styling - inject CSS to style all cells
      // First, ensure the table HTML has styles for all cells
      let styledTableHTML = table.html;
      
      // If table doesn't have cell styling, add it via CSS injection
      // We'll wrap it in a div with a style tag
      const hasCellStyles = /<t[dh][^>]*style[^>]*border/i.test(styledTableHTML);
      
      if (!hasCellStyles) {
        // Inject styles into the table tag
        styledTableHTML = styledTableHTML.replace(
          /<table([^>]*)>/i,
          (match, attrs) => {
            // Check if style attribute exists
            if (/style\s*=/i.test(attrs)) {
              return `<table${attrs.replace(/style\s*=\s*["']([^"']*)["']/i, (m, existingStyle) => {
                return `style="${existingStyle}; border-collapse: collapse;"`;
              })}>`;
            } else {
              return `<table${attrs} style="border-collapse: collapse;">`;
            }
          }
        );
        
        // Add styles to all th and td elements that don't have them
        styledTableHTML = styledTableHTML.replace(
          /<t([dh])([^>]*)>/gi,
          (match, tag, attrs) => {
            if (/style\s*=/i.test(attrs)) {
              // Merge existing styles
              return `<t${tag}${attrs.replace(/style\s*=\s*["']([^"']*)["']/i, (m, existingStyle) => {
                const hasBorder = /border/i.test(existingStyle);
                const hasPadding = /padding/i.test(existingStyle);
                let newStyle = existingStyle;
                if (!hasBorder) newStyle += '; border: 1px solid #000;';
                if (!hasPadding) newStyle += '; padding: 8px;';
                return `style="${newStyle}"`;
              })}>`;
            } else {
              return `<t${tag}${attrs} style="border: 1px solid #000; padding: 8px;">`;
            }
          }
        );
      }
      
      parts.push(
        React.createElement('div', {
          key: `table-${tIndex}`,
          className: 'my-4 overflow-x-auto question-table-wrapper',
          dangerouslySetInnerHTML: { 
            __html: `<div class="inline-block min-w-full">${styledTableHTML}</div>` 
          }
        })
      );
      
      lastIndex = table.end;
    });
    
    // Add remaining text after last table
    if (lastIndex < text.length) {
      const afterText = text.substring(lastIndex);
      if (afterText.trim()) {
        parts.push(renderTextWithoutTables(afterText, 'after-last-table'));
      }
    }
    
    return React.createElement(React.Fragment, {}, parts);
  }
  
  // No tables found, use original rendering
  return renderTextWithoutTables(text, 'no-tables');
};

// Helper function to render text without tables (original logic)
const renderTextWithoutTables = (text: string, keyPrefix: string): React.ReactNode => {
  // Split text into paragraphs (double line breaks)
  const paragraphs = text.split(/\n\s*\n/);
  
  return paragraphs.map((paragraph, pIndex) => {
    // Split paragraph into lines
    const lines = paragraph.split('\n');
    
    const formattedLines = lines.map((line, index) => {
      // Check if line is a list item
      if (line.trim().startsWith('- ')) {
        return React.createElement('li', { key: `${keyPrefix}-${pIndex}-${index}`, className: 'ml-4' },
          React.createElement('div', { dangerouslySetInnerHTML: { __html: line.substring(2) } })
        );
      }
      // Check if line is a numbered list item
      if (/^\d+\.\s/.test(line)) {
        return React.createElement('li', { key: `${keyPrefix}-${pIndex}-${index}`, className: 'ml-4' },
          React.createElement('div', { dangerouslySetInnerHTML: { __html: line.substring(line.indexOf('.') + 2) } })
        );
      }
      // Regular text with HTML formatting
      return React.createElement('div', { 
        key: `${keyPrefix}-${pIndex}-${index}`, 
        className: 'mb-2',
        dangerouslySetInnerHTML: { __html: line }
      });
    });

    // Wrap list items in a ul element if needed
    const hasListItems = lines.some(line => 
      line.trim().startsWith('- ') || /^\d+\.\s/.test(line)
    );

    if (hasListItems) {
      return React.createElement('ul', { key: `${keyPrefix}-${pIndex}`, className: 'mb-4' }, formattedLines);
    }

    return React.createElement('div', { key: `${keyPrefix}-${pIndex}`, className: 'mb-4' }, formattedLines);
  });
};
