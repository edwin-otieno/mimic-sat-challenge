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

// Helper function to find matching closing tag for a block element
const findMatchingClosingTag = (text: string, tagName: string, startPos: number): number => {
  const openTag = `<${tagName}`;
  const closeTag = `</${tagName}>`;
  let depth = 1;
  let pos = startPos;
  
  // Find the end of the opening tag
  const tagEnd = text.indexOf('>', startPos);
  if (tagEnd === -1) return -1;
  pos = tagEnd + 1;
  
  while (pos < text.length && depth > 0) {
    // Look for opening tags - must be a complete tag (followed by space, >, or end)
    let nextOpen = text.indexOf(openTag, pos);
    // Make sure it's actually a tag (not part of another tag name)
    while (nextOpen !== -1) {
      const charAfter = text[nextOpen + openTag.length];
      if (charAfter === ' ' || charAfter === '>' || charAfter === '\n' || charAfter === '\t') {
        break; // Valid tag found
      }
      nextOpen = text.indexOf(openTag, nextOpen + 1);
    }
    
    // Look for closing tags
    const nextClose = text.indexOf(closeTag, pos);
    
    if (nextClose === -1) {
      // No closing tag found - this is malformed HTML
      return -1;
    }
    
    if (nextOpen !== -1 && nextOpen < nextClose) {
      // Found another opening tag before closing tag - increase depth
      depth++;
      pos = text.indexOf('>', nextOpen) + 1;
    } else {
      // Found closing tag - decrease depth
      depth--;
      if (depth === 0) {
        return nextClose + closeTag.length;
      }
      pos = nextClose + closeTag.length;
    }
  }
  
  return -1;
};

// Helper function to extract complete HTML block elements
const extractBlockElements = (text: string): Array<{ type: 'block' | 'text'; content: string; start: number; end: number }> => {
  const blocks: Array<{ type: 'block' | 'text'; content: string; start: number; end: number }> = [];
  
  // Block-level HTML elements
  const blockTagNames = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'section', 'article', 'header', 'footer', 'nav', 'aside', 'main'];
  
  let lastIndex = 0;
  let pos = 0;
  
  while (pos < text.length) {
    // Find the next opening tag for any block element
    let nextBlockStart = -1;
    let nextBlockTag = '';
    
    for (const tagName of blockTagNames) {
      const openTag = `<${tagName}`;
      const tagPos = text.indexOf(openTag, pos);
      if (tagPos !== -1 && (nextBlockStart === -1 || tagPos < nextBlockStart)) {
        nextBlockStart = tagPos;
        nextBlockTag = tagName;
      }
    }
    
    if (nextBlockStart === -1) {
      // No more block elements found, add remaining text
      if (lastIndex < text.length) {
        blocks.push({
          type: 'text',
          content: text.substring(lastIndex),
          start: lastIndex,
          end: text.length
        });
      }
      break;
    }
    
    // Add text before this block
    if (nextBlockStart > lastIndex) {
      blocks.push({
        type: 'text',
        content: text.substring(lastIndex, nextBlockStart),
        start: lastIndex,
        end: nextBlockStart
      });
    }
    
    // Find the matching closing tag
    const blockEnd = findMatchingClosingTag(text, nextBlockTag, nextBlockStart);
    
    if (blockEnd === -1) {
      // No matching closing tag found, treat as text and continue
      pos = nextBlockStart + 1;
      continue;
    }
    
    // Add the block element
    const blockContent = text.substring(nextBlockStart, blockEnd);
    
    // Debug: log if we're extracting a <p> tag to see if it's being closed correctly
    if (nextBlockTag === 'p') {
      console.log('[extractBlockElements] Extracted <p> block:', {
        start: nextBlockStart,
        end: blockEnd,
        content: blockContent.substring(0, 150),
        fullLength: blockContent.length,
        originalTextAround: text.substring(Math.max(0, nextBlockStart - 20), Math.min(text.length, blockEnd + 20))
      });
    }
    
    blocks.push({
      type: 'block',
      content: blockContent,
      start: nextBlockStart,
      end: blockEnd
    });
    
    lastIndex = blockEnd;
    pos = blockEnd;
  }
  
  // If no blocks found, return entire text as text
  if (blocks.length === 0) {
    return [{ type: 'text', content: text, start: 0, end: text.length }];
  }
  
  return blocks;
};

// Helper function to normalize whitespace inside <p> tags
// IMPORTANT: This function should NOT modify HTML structure, only whitespace
export const normalizeParagraphWhitespace = (html: string): string => {
  // Use a more robust approach that handles nested tags correctly
  // Process from the end to avoid index issues when replacing
  let result = html;
  const pTagMatches: Array<{ fullMatch: string; attrs: string; content: string; index: number }> = [];
  
  // Find all <p> tags using a regex
  const pTagRegex = /<p([^>]*)>([\s\S]*?)<\/p>/gi;
  let match;
  
  while ((match = pTagRegex.exec(html)) !== null) {
    pTagMatches.push({
      fullMatch: match[0],
      attrs: match[1] || '',
      content: match[2] || '',
      index: match.index
    });
  }
  
  // Process from end to start to maintain correct indices
  for (let i = pTagMatches.length - 1; i >= 0; i--) {
    const pMatch = pTagMatches[i];
    
    // Only normalize whitespace in the content, don't modify structure
    // IMPORTANT: Only remove whitespace BETWEEN tags, not between tags and text
    let normalized = pMatch.content
      .replace(/>\s+</g, '><') // Remove whitespace BETWEEN tags ("> \n <" -> "><")
      .replace(/\s+/g, ' ') // Collapse all remaining whitespace sequences (newlines, tabs, multiple spaces) into single spaces
      .trim();
    
    // Replace the original match with normalized version
    const before = result.substring(0, pMatch.index);
    const after = result.substring(pMatch.index + pMatch.fullMatch.length);
    result = before + `<p${pMatch.attrs}>${normalized}</p>` + after;
  }
  
  return result;
};

// Helper function to render text without tables (original logic)
const renderTextWithoutTables = (text: string, keyPrefix: string): React.ReactNode => {
  // First, extract complete HTML block elements to preserve their structure
  const blocks = extractBlockElements(text);
  
  const parts: React.ReactNode[] = [];
  
  blocks.forEach((block, blockIndex) => {
    if (block.type === 'block') {
      // Debug: log block extraction for <p> tags
      if (block.content.trim().startsWith('<p')) {
        console.log('[renderTextWithoutTables] Extracted block:', {
          content: block.content.substring(0, 200),
          fullLength: block.content.length
        });
      }
      
      // Normalize whitespace inside <p> tags to prevent unwanted line breaks
      const normalizedContent = normalizeParagraphWhitespace(block.content);
      
      // Render block element as-is, preserving its HTML structure
      // Normalize spacing within block elements - reduce excessive whitespace
      parts.push(
        React.createElement('div', {
          key: `${keyPrefix}-block-${blockIndex}`,
          className: 'mb-2 break-words overflow-wrap-break-word [&_div]:break-words [&_div]:overflow-wrap-break-word [&_p]:break-words [&_p]:overflow-wrap-break-word [&_p]:leading-normal [&_p]:my-0 [&_p]:mb-1 [&_p]:whitespace-normal [&_h1]:leading-normal [&_h1]:my-1 [&_h2]:leading-normal [&_h2]:my-1 [&_h3]:leading-normal [&_h3]:my-1 [&_h4]:leading-normal [&_h4]:my-1 [&_h5]:leading-normal [&_h5]:my-1 [&_h6]:leading-normal [&_h6]:my-1 [&_ul]:leading-normal [&_ul]:my-1 [&_ul]:space-y-0 [&_li]:leading-normal [&_li]:my-0 [&_li]:mb-0.5',
          dangerouslySetInnerHTML: { __html: normalizedContent }
        })
      );
    } else {
      // Process text content (may contain inline HTML but no block elements)
      // Split text into paragraphs (double line breaks)
      const paragraphs = block.content.split(/\n\s*\n/);
      
      paragraphs.forEach((paragraph, pIndex) => {
        if (!paragraph.trim()) return;
        
        // Split paragraph into lines
        const lines = paragraph.split('\n');
        
        // Separate list items from regular text
        const bulletItems: React.ReactNode[] = [];
        const numberedItems: React.ReactNode[] = [];
        const regularLines: React.ReactNode[] = [];
        
        lines.forEach((line, index) => {
          // Check if line is a bullet list item
          if (line.trim().startsWith('- ')) {
            bulletItems.push(
              React.createElement('li', { key: `${keyPrefix}-${blockIndex}-${pIndex}-bullet-${index}`, className: 'ml-6' },
              React.createElement('div', { className: 'break-words overflow-wrap-break-word [&_div]:break-words [&_div]:overflow-wrap-break-word', dangerouslySetInnerHTML: { __html: line.substring(2) } })
              )
            );
          }
          // Check if line is a numbered list item
          else if (/^\d+\.\s/.test(line)) {
            numberedItems.push(
              React.createElement('li', { key: `${keyPrefix}-${blockIndex}-${pIndex}-numbered-${index}`, className: 'ml-6' },
              React.createElement('div', { className: 'break-words overflow-wrap-break-word [&_div]:break-words [&_div]:overflow-wrap-break-word', dangerouslySetInnerHTML: { __html: line.substring(line.indexOf('.') + 2) } })
              )
            );
          }
          // Regular text with HTML formatting
          else {
            regularLines.push(
              React.createElement('div', { 
            key: `${keyPrefix}-${blockIndex}-${pIndex}-${index}`, 
            className: 'mb-2 break-words overflow-wrap-break-word [&_div]:break-words [&_div]:overflow-wrap-break-word',
            dangerouslySetInnerHTML: { __html: line }
              })
            );
          }
        });

        // Add bullet list if we have bullet items
        if (bulletItems.length > 0) {
          parts.push(
            React.createElement('ul', { key: `${keyPrefix}-${blockIndex}-${pIndex}-ul`, className: 'mb-4 list-disc ml-6' }, bulletItems)
          );
        }

        // Add numbered list if we have numbered items
        if (numberedItems.length > 0) {
          parts.push(
            React.createElement('ol', { key: `${keyPrefix}-${blockIndex}-${pIndex}-ol`, className: 'mb-4 list-decimal ml-6' }, numberedItems)
          );
        }

        // Add regular lines
        if (regularLines.length > 0) {
          parts.push(
            React.createElement('div', { key: `${keyPrefix}-${blockIndex}-${pIndex}-regular`, className: 'mb-4 break-words overflow-wrap-break-word [&_div]:break-words [&_div]:overflow-wrap-break-word' }, regularLines)
          );
        }
      });
    }
  });
  
  return React.createElement(React.Fragment, {}, parts);
};
