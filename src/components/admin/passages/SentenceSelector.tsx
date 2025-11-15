import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { renderFormattedText } from '@/lib/utils';

export type SentenceReference = number | { sentenceIndex: number; start: number; end: number };

interface SentenceSelectorProps {
  passageContent: string;
  selectedSentences: Set<number | string>; // Use Set with string keys for ranges
  selectedRanges: Map<number, Array<{ start: number; end: number }>>; // Map of sentence index to array of ranges
  onToggleSentence: (sentenceIndex: number) => void;
  onToggleRange: (sentenceIndex: number, start: number, end: number) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

const SentenceSelector: React.FC<SentenceSelectorProps> = ({
  passageContent,
  selectedSentences,
  selectedRanges,
  onToggleSentence,
  onToggleRange,
  onSelectAll,
  onDeselectAll,
}) => {
  const [selectionMode, setSelectionMode] = useState<'sentence' | 'text'>('text');

  // Split passage into sentences with character ranges (using plain text for position calculations)
  const { sentences, sentenceRanges } = useMemo(() => {
    const text = typeof passageContent === 'string' ? passageContent : String(passageContent || '');
    // Use plain text for position calculations (strip HTML)
    const plainText = text.replace(/<[^>]*>/g, '');
    
    // Split by sentence boundaries (. ! ? followed by space or end)
    const sentenceRegex = /([.!?]+)\s+/g;
    const sentences: string[] = [];
    const sentenceRanges: Array<{ start: number; end: number }> = [];
    let lastIndex = 0;
    let match;
    
    // Reset regex
    sentenceRegex.lastIndex = 0;
    
    // Find all sentence endings in plain text
    const endings: number[] = [];
    while ((match = sentenceRegex.exec(plainText)) !== null) {
      endings.push(match.index + match[0].length);
    }
    
    // Add final ending if text doesn't end with punctuation
    if (endings.length === 0 || endings[endings.length - 1] < plainText.length) {
      endings.push(plainText.length);
    }
    
    // Extract sentences based on endings (using plain text positions)
    endings.forEach((end) => {
      const sentencePlain = plainText.slice(lastIndex, end).trim();
      if (sentencePlain.length > 0) {
        // Get the sentence with HTML preserved by finding it in original text
        // This is approximate - we'll use plain text for highlighting calculations
        sentences.push(sentencePlain);
        sentenceRanges.push({ start: lastIndex, end });
      }
      lastIndex = end;
    });
    
    return { sentences, sentenceRanges };
  }, [passageContent]);

  const handleTextSelection = (sentenceIndex: number, sentenceText: string, sentenceRange: { start: number; end: number }, sentenceElement: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString().trim();
    if (selectedText.length === 0) return;

    // Check if selection is within the sentence element
    if (!sentenceElement.contains(selection.anchorNode) || !sentenceElement.contains(selection.focusNode)) {
      return;
    }

    // Get the plain text content of the sentence element (without HTML formatting)
    const sentenceElementText = sentenceElement.innerText || sentenceElement.textContent || '';
    
    // Find the selected text in the sentence element's text
    const range = selection.getRangeAt(0);
    
    // Create a range from the start of the sentence to the start of selection
    const preRange = document.createRange();
    preRange.setStartBefore(sentenceElement);
    preRange.setEnd(range.startContainer, range.startOffset);
    const textBeforeSelection = preRange.toString();
    
    // Calculate positions relative to the sentence start (in plain text)
    const relativeStart = textBeforeSelection.length;
    const relativeEnd = relativeStart + selectedText.length;
    
    // Convert to absolute positions in passage (plain text coordinates)
    const absoluteStart = sentenceRange.start + relativeStart;
    const absoluteEnd = sentenceRange.start + relativeEnd;

    console.log(`[handleTextSelection] sentenceIndex=${sentenceIndex}, selectedText="${selectedText}", relative=(${relativeStart}, ${relativeEnd}), absolute=(${absoluteStart}, ${absoluteEnd}), sentenceRange=(${sentenceRange.start}, ${sentenceRange.end})`);

    // Ensure we're within the sentence bounds
    if (absoluteStart >= sentenceRange.start && absoluteEnd <= sentenceRange.end && relativeStart >= 0 && relativeEnd <= sentenceText.length) {
      console.log(`[handleTextSelection] Calling onToggleRange(${sentenceIndex}, ${absoluteStart}, ${absoluteEnd})`);
      onToggleRange(sentenceIndex, absoluteStart, absoluteEnd);
      selection.removeAllRanges();
    } else {
      console.warn(`[handleTextSelection] Selection out of bounds: absoluteStart=${absoluteStart}, absoluteEnd=${absoluteEnd}, sentenceRange=(${sentenceRange.start}, ${sentenceRange.end})`);
    }
  };

  const isSentenceSelected = (index: number) => {
    return selectedSentences.has(index);
  };

  const getHighlightedRanges = (sentenceIndex: number, sentenceText: string, sentenceRange: { start: number; end: number }) => {
    const ranges = selectedRanges.get(sentenceIndex) || [];
    if (ranges.length === 0) {
      console.log(`[getHighlightedRanges] No ranges for sentence ${sentenceIndex}`, { selectedRanges: Array.from(selectedRanges.entries()) });
      return null;
    }

    // Get plain text version of passage and sentence for position matching
    const passageContentPlain = typeof passageContent === 'string' 
      ? passageContent.replace(/<[^>]*>/g, '') // Strip HTML tags
      : String(passageContent || '').replace(/<[^>]*>/g, '');
    
    const sentencePlain = sentenceText.replace(/<[^>]*>/g, ''); // Strip HTML from sentence
    
    console.log(`[getHighlightedRanges] sentenceIndex=${sentenceIndex}, ranges=`, ranges, `sentenceRange=`, sentenceRange, `sentencePlain.length=`, sentencePlain.length);
    
    const result = ranges.map((range, idx) => {
      // Convert absolute positions in plain text passage to relative positions in plain text sentence
      const relativeStart = Math.max(0, range.start - sentenceRange.start);
      const relativeEnd = Math.min(sentencePlain.length, range.end - sentenceRange.start);
      
      console.log(`[getHighlightedRanges] range ${idx}: absolute=(${range.start}, ${range.end}), relative=(${relativeStart}, ${relativeEnd}), sentenceRange=(${sentenceRange.start}, ${sentenceRange.end})`);
      
      // Ensure valid range
      if (relativeStart >= relativeEnd || relativeStart < 0 || relativeEnd > sentencePlain.length) {
        console.warn(`[getHighlightedRanges] Invalid range ${idx}: relativeStart=${relativeStart}, relativeEnd=${relativeEnd}, sentencePlain.length=${sentencePlain.length}`);
        return null;
      }
      
      return { start: relativeStart, end: relativeEnd, key: idx };
    }).filter((r): r is { start: number; end: number; key: number } => r !== null);
    
    console.log(`[getHighlightedRanges] Final result:`, result);
    return result.length > 0 ? result : null;
  };

  if (!passageContent || passageContent.trim().length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-gray-500">Enter passage content above to select text.</p>
        </CardContent>
      </Card>
    );
  }

  const totalSelections = selectedSentences.size + Array.from(selectedRanges.values()).reduce((sum, ranges) => sum + ranges.length, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Select Relevant Text</CardTitle>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={selectionMode === 'sentence' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectionMode('sentence')}
            >
              Sentence Mode
            </Button>
            <Button
              type="button"
              variant={selectionMode === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectionMode('text')}
            >
              Text Selection Mode
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-gray-500">
            {selectionMode === 'sentence' 
              ? 'Click on sentences to select entire sentences.'
              : 'Click and drag to select specific words or phrases within sentences.'}
          </p>
          <div className="flex gap-2">
            {onSelectAll && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSelectAll}
              >
                Select All Sentences
              </Button>
            )}
            {onDeselectAll && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDeselectAll}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto border rounded-md p-4 bg-gray-50">
          {sentences.map((sentence, index) => {
            const sentenceRange = sentenceRanges[index];
            const isSelected = isSentenceSelected(index);
            const highlightedRanges = getHighlightedRanges(index, sentence, sentenceRange);
            
            return (
              <div
                key={index}
                className={cn(
                  "w-full text-left p-3 rounded-md transition-all border-2",
                  isSelected || (highlightedRanges && highlightedRanges.length > 0)
                    ? "bg-yellow-100 border-yellow-400"
                    : "bg-white border-gray-200 hover:border-yellow-300 hover:bg-yellow-50"
                )}
              >
                <div className="flex items-start gap-2">
                  <span className={cn(
                    "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                    isSelected || (highlightedRanges && highlightedRanges.length > 0)
                      ? "bg-yellow-500 text-white"
                      : "bg-gray-300 text-gray-700"
                  )}>
                    {index + 1}
                  </span>
                  <div 
                    className={cn(
                      "flex-1 text-sm select-text",
                      selectionMode === 'text' && "cursor-text"
                    )}
                    onClick={(e) => {
                      if (selectionMode === 'sentence') {
                        e.preventDefault();
                        onToggleSentence(index);
                      }
                    }}
                    onMouseUp={(e) => {
                      if (selectionMode === 'text') {
                        const target = e.currentTarget;
                        handleTextSelection(index, sentence, sentenceRange, target);
                      }
                    }}
                  >
                    {(() => {
                      // Get plain text version of sentence (already plain text from splitting)
                      const sentencePlain = sentence;
                      
                      if (!highlightedRanges || highlightedRanges.length === 0) {
                        return <span>{sentencePlain}</span>;
                      }
                      
                      // Render with highlighted ranges
                      const parts: React.ReactNode[] = [];
                      let lastPos = 0;
                      
                      // Sort ranges by start position
                      const sortedRanges = [...highlightedRanges].sort((a, b) => a.start - b.start);
                      
                      console.log(`[Render] sentenceIndex=${index}, sentencePlain="${sentencePlain}", sortedRanges=`, sortedRanges);
                      
                      sortedRanges.forEach((range, rangeIdx) => {
                        // Validate range
                        if (range.start < 0 || range.end > sentencePlain.length || range.start >= range.end) {
                          console.warn(`[Render] Invalid range ${rangeIdx}: start=${range.start}, end=${range.end}, sentenceLength=${sentencePlain.length}`);
                          return;
                        }
                        
                        // Add text before highlight
                        if (range.start > lastPos) {
                          const beforeText = sentencePlain.substring(lastPos, range.start);
                          if (beforeText) {
                            parts.push(
                              <span key={`before-${rangeIdx}`}>
                                {beforeText}
                              </span>
                            );
                          }
                        }
                        
                        // Add highlighted text - ensure this is always added if valid
                        const highlightText = sentencePlain.substring(range.start, range.end);
                        console.log(`[Render] range ${rangeIdx}: highlightText="${highlightText}", range=(${range.start}, ${range.end})`);
                        if (highlightText && highlightText.length > 0) {
                          parts.push(
                            <mark
                              key={`highlight-${rangeIdx}`}
                              className="bg-yellow-300 text-yellow-900 px-1 py-0.5 rounded cursor-pointer hover:bg-yellow-400 transition-colors inline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleRange(index, sentenceRange.start + range.start, sentenceRange.start + range.end);
                              }}
                              title="Click to remove"
                            >
                              {highlightText}
                            </mark>
                          );
                        }
                        
                        lastPos = Math.max(lastPos, range.end);
                      });
                      
                      // Add remaining text
                      if (lastPos < sentencePlain.length) {
                        const afterText = sentencePlain.substring(lastPos);
                        if (afterText) {
                          parts.push(
                            <span key="after">
                              {afterText}
                            </span>
                          );
                        }
                      }
                      
                      // Always return parts - if empty, show full sentence
                      console.log(`[Render] Final parts count: ${parts.length}`);
                      if (parts.length === 0) {
                        return <span>{sentencePlain}</span>;
                      }
                      return <>{parts}</>;
                    })()}
                  </div>
                </div>
                {highlightedRanges && highlightedRanges.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600 ml-8">
                    {highlightedRanges.length} selection{highlightedRanges.length !== 1 ? 's' : ''} in this sentence
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {totalSelections} selection{totalSelections !== 1 ? 's' : ''} total
        </p>
      </CardContent>
    </Card>
  );
};

export default SentenceSelector;
