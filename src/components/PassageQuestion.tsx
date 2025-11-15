import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { X, Eye, EyeOff, Flag, ChevronLeft, ChevronRight, Highlighter } from 'lucide-react';
import QuestionNavigator from '@/components/test/QuestionNavigator';
import LineReader from '@/components/test/LineReader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { renderFormattedText } from '@/lib/utils';
import { Passage, PassageQuestion as PassageQuestionType } from '@/components/admin/passages/types';
import { QuestionType } from '@/components/admin/questions/types';
import { TextInputQuestion } from '@/components/student/TextInputQuestion';

interface PassageQuestionProps {
  passage: Passage;
  currentQuestionIndex: number;
  totalQuestions: number;
  userAnswers: Record<string, string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  onPreviousQuestion: () => void;
  onNextQuestion: () => void;
  onToggleFlag: (questionId: string) => void;
  onToggleCrossOut: (questionId: string, optionId: string) => void;
  onToggleUnmask: (questionId: string, optionId: string) => void;
  flaggedQuestions: Set<string>;
  crossedOutOptions: Record<string, string[]>;
  unmaskedAnswers: Set<string>;
  setUnmaskedAnswers?: React.Dispatch<React.SetStateAction<Set<string>>>;
  crossOutMode: boolean;
  setCrossOutMode?: (value: boolean | ((prev: boolean) => boolean)) => void;
  isAnswerMasking: boolean;
  setIsAnswerMasking?: (value: boolean | ((prev: boolean) => boolean)) => void;
  isHighlighting: boolean;
  selectedColor: string;
  highlights: Array<{id: string, start: number, end: number, color: string}>;
  onHighlightsChange: (highlights: Array<{id: string, start: number, end: number, color: string}>) => void;
  onToggleHighlighting?: () => void;
  onColorChange?: (color: string) => void;
  testCategory?: 'SAT' | 'ACT';
  allQuestions?: any[]; // All questions in the passage for QuestionNavigator
  onGoToQuestion?: (index: number) => void;
}

const PassageQuestion: React.FC<PassageQuestionProps> = ({
  passage,
  currentQuestionIndex,
  totalQuestions,
  userAnswers,
  onAnswerChange,
  onPreviousQuestion,
  onNextQuestion,
  onToggleFlag,
  onToggleCrossOut,
  onToggleUnmask,
  flaggedQuestions,
  crossedOutOptions,
  unmaskedAnswers,
  setUnmaskedAnswers,
  crossOutMode,
  setCrossOutMode,
  isAnswerMasking,
  setIsAnswerMasking,
  isHighlighting,
  selectedColor,
  highlights,
  onHighlightsChange,
  onToggleHighlighting,
  onColorChange,
  testCategory = 'ACT',
  allQuestions,
  onGoToQuestion
}) => {
  const [showLineReader, setShowLineReader] = useState(false);
  const [autoHighlightedSentences, setAutoHighlightedSentences] = useState<Set<number>>(new Set());
  const [autoHighlightedRanges, setAutoHighlightedRanges] = useState<Map<number, Array<{ start: number; end: number }>>>(new Map());
  const [showConfirmSubmitDialog, setShowConfirmSubmitDialog] = useState(false);
  const passageRef = useRef<HTMLDivElement>(null);
  // For navigation with all questions, currentQuestionIndex is global
  // For getting the question from current passage, we need to find it by matching question IDs
  let currentQuestion;
  if (allQuestions && allQuestions.length > 0) {
    // Use global index to find question, then match by ID in current passage
    const currentGlobalQuestion = allQuestions[currentQuestionIndex];
    currentQuestion = passage.questions?.find(q => q.id === currentGlobalQuestion?.id) || passage.questions?.[0];
  } else {
    // Fallback: use currentQuestionIndex as local index when allQuestions not provided
    currentQuestion = passage.questions?.[currentQuestionIndex];
  }
  const isQuestionFlagged = currentQuestion ? flaggedQuestions.has(currentQuestion.id) : false;
  const questionCrossedOuts = currentQuestion ? crossedOutOptions[currentQuestion.id] || [] : [];
  
  // For ACT tests, alternate between A/B/C/D and F/G/H/J based on sequential question number
  // Odd question numbers (1, 3, 5...) use A/B/C/D, even (2, 4, 6...) use F/G/H/J
  // Use the sequential question_number from allQuestions (which has sequential numbering across passages)
  const getOptionLetters = (questionNumber: number | undefined): string[] => {
    if (testCategory === 'ACT' && questionNumber !== undefined) {
      // ACT alternates: odd = A/B/C/D, even = F/G/H/J
      return questionNumber % 2 === 1 ? ['A', 'B', 'C', 'D'] : ['F', 'G', 'H', 'J'];
    }
    // Default: A, B, C, D, E
    return ['A', 'B', 'C', 'D', 'E'];
  };
  
  // Get the sequential question number from allQuestions (which has sequential numbering)
  const sequentialQuestionNumber = allQuestions && allQuestions.length > 0 && currentQuestion
    ? allQuestions.find(q => q.id === currentQuestion.id)?.question_number
    : currentQuestion?.question_number;
  
  const optionLetters = getOptionLetters(sequentialQuestionNumber);

  // Parse line numbers from question text (e.g., "lines 15-20" or "line 5")
  const parseLineNumbers = (questionText: string): { start: number; end: number } | null => {
    const text = typeof questionText === 'string' ? questionText : String(questionText || '');
    
    // Match patterns like "lines 15-20", "lines 15 to 20", "line 15", "lines 15, 16, 17"
    const lineRangeMatch = text.match(/lines?\s+(\d+)(?:\s*(?:-|to)\s*(\d+))?/i);
    if (lineRangeMatch) {
      const start = parseInt(lineRangeMatch[1], 10);
      const end = lineRangeMatch[2] ? parseInt(lineRangeMatch[2], 10) : start;
      return { start, end };
    }
    
    // Match "in line X" or "at line X"
    const singleLineMatch = text.match(/(?:in|at)\s+line\s+(\d+)/i);
    if (singleLineMatch) {
      const lineNum = parseInt(singleLineMatch[1], 10);
      return { start: lineNum, end: lineNum };
    }
    
    return null;
  };

  // Split passage into sentences and lines
  // Note: Uses plain text for position calculations to match sentence_references storage
  // Helper function to find HTML position from plain text position
  const findHtmlPosition = (htmlContent: string, plainText: string, plainTextPos: number): number => {
    if (plainTextPos >= plainText.length) {
      return htmlContent.length;
    }
    if (plainTextPos <= 0) {
      return 0;
    }
    
    // Count plain text characters up to plainTextPos, skipping HTML tags
    let htmlPos = 0;
    let plainTextCount = 0;
    let inTag = false;
    
    while (htmlPos < htmlContent.length && plainTextCount < plainTextPos) {
      const char = htmlContent[htmlPos];
      if (char === '<') {
        inTag = true;
      } else if (char === '>') {
        inTag = false;
      } else if (!inTag) {
        plainTextCount++;
      }
      htmlPos++;
    }
    
    return htmlPos;
  };

  const splitPassageIntoSentences = (content: string): { sentences: string[]; sentenceRanges: Array<{ start: number; end: number }> } => {
    const text = typeof content === 'string' ? content : String(content || '');
    // Use plain text for position calculations (stripping HTML) to match how sentence_references are stored
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
    endings.forEach((end, index) => {
      const sentence = plainText.slice(lastIndex, end).trim();
      if (sentence.length > 0) {
        sentences.push(sentence);
        sentenceRanges.push({ start: lastIndex, end }); // These are plain text positions
      }
      lastIndex = end;
    });
    
    return { sentences, sentenceRanges };
  };

  // Estimate line number from character position (rough estimate: ~70 chars per line)
  const estimateLineNumber = (charPosition: number, content: string): number => {
    const textBefore = content.substring(0, charPosition);
    const charsPerLine = 70; // Rough estimate
    return Math.floor(textBefore.length / charsPerLine) + 1;
  };

  // Auto-highlight sentences based on stored sentence_references only
  // If no sentence_references exist, clear all highlights
  useEffect(() => {
    if (testCategory !== 'ACT' || !currentQuestion || !passage.content) {
      // Clear highlights if not ACT test or no question
      setAutoHighlightedSentences(new Set());
      setAutoHighlightedRanges(new Map());
      return;
    }
    
    // Only highlight if sentence_references are stored for this question
    if (currentQuestion.sentence_references && currentQuestion.sentence_references.length > 0) {
      const highlightedSentences = new Set<number>();
      const highlightedRanges = new Map<number, Array<{ start: number; end: number }>>();
      
      currentQuestion.sentence_references.forEach((ref: any) => {
        if (typeof ref === 'number') {
          highlightedSentences.add(ref);
        } else if (ref && typeof ref === 'object' && ref.sentenceIndex !== undefined) {
          highlightedSentences.add(ref.sentenceIndex);
          if (!highlightedRanges.has(ref.sentenceIndex)) {
            highlightedRanges.set(ref.sentenceIndex, []);
          }
          highlightedRanges.get(ref.sentenceIndex)!.push({ start: ref.start, end: ref.end });
        }
      });
      
      setAutoHighlightedSentences(highlightedSentences);
      setAutoHighlightedRanges(highlightedRanges);
      
      // Scroll to first highlighted sentence or range
      if (passageRef.current && highlightedSentences.size > 0) {
        const firstHighlightedIndex = Math.min(...Array.from(highlightedSentences));
        setTimeout(() => {
          const sentenceElement = passageRef.current?.querySelector(`[data-sentence-index="${firstHighlightedIndex}"]`);
          if (sentenceElement) {
            sentenceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    } else {
      // No sentence_references - clear all highlights
      setAutoHighlightedSentences(new Set());
      setAutoHighlightedRanges(new Map());
    }
  }, [currentQuestionIndex, currentQuestion, passage.content, testCategory]);

  // Handle text selection for highlighting
  const handleTextSelection = () => {
    if (!isHighlighting || !currentQuestion) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    
    if (selectedText.length === 0) return;

    // Create highlight span
    const highlightSpan = document.createElement('span');
    highlightSpan.className = 'highlight';
    highlightSpan.style.backgroundColor = selectedColor === 'yellow' ? '#fef08a' : 
                                        selectedColor === 'green' ? '#bbf7d0' : 
                                        selectedColor === 'blue' ? '#bfdbfe' : 
                                        selectedColor === 'pink' ? '#fce7f3' : 
                                        selectedColor === 'orange' ? '#fed7aa' : '#e9d5ff';
    highlightSpan.style.padding = '2px 4px';
    highlightSpan.style.borderRadius = '3px';
    highlightSpan.style.cursor = 'pointer';
    highlightSpan.title = 'Click to remove highlight';
    
    // Add click handler to remove highlight
    highlightSpan.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parent = highlightSpan.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlightSpan.textContent || ''), highlightSpan);
        parent.normalize();
      }
    };

    try {
      range.surroundContents(highlightSpan);
      selection.removeAllRanges();
    } catch (error) {
      console.error('Error highlighting text:', error);
    }
  };

  // Dynamic CSS for highlighting
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .highlightable-text {
        user-select: ${isHighlighting ? 'text' : 'none'};
        cursor: ${isHighlighting ? 'text' : 'default'};
      }
      .highlight {
        transition: background-color 0.2s ease;
      }
      .highlight:hover {
        opacity: 0.8;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, [isHighlighting]);

  if (!currentQuestion) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No question found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            {passage.title || `Passage ${passage.passage_order}`}
          </h2>
          <Badge variant="outline">{passage.module_type}</Badge>
          <span className="text-sm text-gray-600">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2">
            <Switch
              checked={showLineReader}
              onCheckedChange={setShowLineReader}
            />
            <span className="text-sm">Line Reader</span>
          </div>
          <Button
            variant={isQuestionFlagged ? "destructive" : "outline"}
            size="sm"
            onClick={() => onToggleFlag(currentQuestion.id)}
          >
            <Flag className="w-4 h-4 mr-1" />
            {isQuestionFlagged ? "Unflag" : "Flag"}
          </Button>
          {setCrossOutMode && (
            <button
              className={`px-[25px] py-1 rounded border flex items-center justify-center text-sm font-bold w-8 h-8 ${crossOutMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'} transition`}
              title={crossOutMode ? 'Disable answer cross out' : 'Enable answer cross out'}
              onClick={() => setCrossOutMode((prev: boolean) => !prev)}
              aria-pressed={crossOutMode}
              style={{ textDecoration: 'line-through' }}
            >
              {testCategory === 'ACT' ? 'X' : 'ABC'}
            </button>
          )}
          {setIsAnswerMasking && (
            <button
              className={`px-[25px] py-1 rounded border flex items-center justify-center text-sm font-bold w-8 h-8 ${isAnswerMasking ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'} transition`}
              title={isAnswerMasking ? 'Disable answer masking' : 'Enable answer masking'}
              onClick={() => {
                if (setIsAnswerMasking) {
                  setIsAnswerMasking((prev: boolean) => {
                    const newValue = !prev;
                    if (newValue && setUnmaskedAnswers) {
                      // Clear unmasked answers when enabling masking
                      setUnmaskedAnswers(new Set());
                    }
                    return newValue;
                  });
                }
              }}
              aria-pressed={isAnswerMasking}
            >
              <span className="font-bold text-sm">M</span>
            </button>
          )}
          <div className="flex items-center space-x-1 border rounded-md px-2 py-1">
            <Highlighter className="h-4 w-4" />
            <span className="text-xs">Highlighter</span>
            {isHighlighting && (
              <div className="flex items-center space-x-1 ml-2">
                {['yellow', 'green', 'blue', 'pink', 'orange', 'purple'].map((color) => (
                  <button
                    key={color}
                    className={`w-3 h-3 rounded-full border ${
                      selectedColor === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color === 'yellow' ? '#fef08a' : color === 'green' ? '#bbf7d0' : color === 'blue' ? '#bfdbfe' : color === 'pink' ? '#fce7f3' : color === 'orange' ? '#fed7aa' : '#e9d5ff' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onColorChange) onColorChange(color);
                    }}
                    title={color}
                  />
                ))}
              </div>
            )}
            <button
              className={`ml-2 px-2 py-1 rounded text-xs ${isHighlighting ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleHighlighting) onToggleHighlighting();
              }}
            >
              {isHighlighting ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </div>

      {/* Line Reader */}
      <LineReader 
        visible={showLineReader} 
        onToggle={() => setShowLineReader(false)} 
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0 items-stretch">
        {/* Question Navigator - Left Side for ACT (but not for Essay/Writing module) */}
        {allQuestions && allQuestions.length > 0 && onGoToQuestion && testCategory === 'ACT' && currentQuestion?.module_type !== 'writing' && (
          <div className="w-40 border-r overflow-y-auto bg-gray-50 p-3">
            <QuestionNavigator
              questions={allQuestions}
              currentIndex={currentQuestionIndex}
              userAnswers={userAnswers}
              flaggedQuestions={flaggedQuestions}
              onQuestionClick={onGoToQuestion}
              layout="vertical"
            />
          </div>
        )}
        
        {/* Passage Column */}
        <div className={cn(
          "border-r flex flex-col min-h-0 h-full",
          allQuestions && allQuestions.length > 0 && onGoToQuestion && testCategory === 'ACT' 
            ? "flex-1" 
            : "w-1/2"
        )}>
            <Card className="h-full flex flex-col rounded-none border-0 min-h-0">
              <CardHeader className="pb-3 flex-shrink-0 border-b">
                <CardTitle className="text-base">Passage</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0">
                <div 
                  ref={passageRef}
                  className="text-xl max-w-none highlightable-text leading-relaxed"
                  onMouseUp={handleTextSelection}
                  onClick={handleTextSelection}
                >
                  {(() => {
                    const passageContent = typeof passage.content === 'string' ? passage.content : String(passage.content || '');
                    // Get plain text version for position matching (sentence_references use plain text positions)
                    const passageContentPlain = passageContent.replace(/<[^>]*>/g, '');
                    const { sentences, sentenceRanges } = splitPassageIntoSentences(passageContent);
                    
                    console.log(`[PassageQuestion] Rendering passage with ${sentences.length} sentences, autoHighlightedSentences:`, Array.from(autoHighlightedSentences), 'autoHighlightedRanges:', Array.from(autoHighlightedRanges.entries()));
                    
                    // If there are highlights, use the sentence-based rendering (but preserve HTML)
                    // Otherwise, render the full HTML content directly
                    const hasHighlights = autoHighlightedSentences.size > 0 || Array.from(autoHighlightedRanges.values()).some(ranges => ranges.length > 0);
                    
                    if (!hasHighlights) {
                      // No highlights, render HTML directly to preserve all formatting (including indentation)
                      // Use dangerouslySetInnerHTML to preserve HTML structure exactly
                      return <div dangerouslySetInnerHTML={{ __html: passageContent }} />;
                    }
                    
                    // Render passage with auto-highlighted sentences
                    // Note: For highlighted sentences, we'll render HTML, but highlighting uses plain text positions
                    // This means HTML formatting may not align perfectly with highlights, but it's a trade-off
                    const parts: React.ReactNode[] = [];
                    let lastIndex = 0;
                    
                    sentences.forEach((sentence, index) => {
                      const range = sentenceRanges[index]; // Plain text positions
                      const isFullSentenceHighlighted = autoHighlightedSentences.has(index);
                      const sentenceHighlightRanges = autoHighlightedRanges.get(index) || [];
                      
                      // Extract the HTML segment for this sentence from the original content
                      // Map plain text position to HTML position (approximate)
                      const htmlStart = findHtmlPosition(passageContent, passageContentPlain, range.start);
                      const htmlEnd = findHtmlPosition(passageContent, passageContentPlain, range.end);
                      const sentenceHtml = passageContent.substring(htmlStart, htmlEnd);
                      
                      // Add text before this sentence (if any) - preserve HTML
                      if (range.start > lastIndex) {
                        const beforePlainText = passageContentPlain.substring(lastIndex, range.start);
                        const beforeHtmlStart = findHtmlPosition(passageContent, passageContentPlain, lastIndex);
                        const beforeHtmlEnd = findHtmlPosition(passageContent, passageContentPlain, range.start);
                        const beforeHtml = passageContent.substring(beforeHtmlStart, beforeHtmlEnd);
                        if (beforeHtml) {
                          parts.push(
                            <span key={`before-${index}`} dangerouslySetInnerHTML={{ __html: beforeHtml }} />
                          );
                        }
                      }
                      
                      // Render sentence with highlights
                      if (isFullSentenceHighlighted && sentenceHighlightRanges.length === 0) {
                        // Full sentence highlight - preserve HTML
                        parts.push(
                          <span
                            key={`sentence-${index}`}
                            data-sentence-index={index}
                            className="bg-yellow-200 px-1 py-0.5 rounded transition-colors"
                            dangerouslySetInnerHTML={{ __html: sentenceHtml }}
                          />
                        );
                      } else if (sentenceHighlightRanges.length > 0) {
                        // Partial sentence highlights - use plain text for highlighting precision
                        const sortedRanges = [...sentenceHighlightRanges].sort((a, b) => a.start - b.start);
                        let sentenceLastPos = 0;
                        const sentenceParts: React.ReactNode[] = [];
                        
                        sortedRanges.forEach((r, rangeIdx) => {
                          // Convert absolute positions to relative positions within the sentence (plain text)
                          const relativeStart = Math.max(0, r.start - range.start);
                          const relativeEnd = Math.min(sentence.length, r.end - range.start);
                          
                          // Validate range
                          if (relativeStart < 0 || relativeEnd > sentence.length || relativeStart >= relativeEnd) {
                            return;
                          }
                          
                          // Add text before highlight (preserve HTML formatting)
                          if (relativeStart > sentenceLastPos) {
                            const beforeText = sentence.substring(sentenceLastPos, relativeStart);
                            if (beforeText) {
                              sentenceParts.push(
                                <span key={`before-range-${rangeIdx}`}>
                                  {beforeText}
                                </span>
                              );
                            }
                          }
                          
                          // Add highlighted text
                          const highlightText = sentence.substring(relativeStart, relativeEnd);
                          if (highlightText && highlightText.length > 0) {
                            sentenceParts.push(
                              <mark
                                key={`highlight-${rangeIdx}`}
                                className="bg-yellow-300 text-yellow-900 px-1 py-0.5 rounded transition-colors inline"
                              >
                                {highlightText}
                              </mark>
                            );
                          }
                          
                          sentenceLastPos = Math.max(sentenceLastPos, relativeEnd);
                        });
                        
                        // Add remaining text after last highlight
                        if (sentenceLastPos < sentence.length) {
                          const afterText = sentence.substring(sentenceLastPos);
                          if (afterText) {
                            sentenceParts.push(
                              <span key={`after-ranges`}>
                                {afterText}
                              </span>
                            );
                          }
                        }
                        
                        // If no parts were created, render the HTML sentence
                        parts.push(
                          <span
                            key={`sentence-${index}`}
                            data-sentence-index={index}
                          >
                            {sentenceParts.length > 0 ? sentenceParts : <span dangerouslySetInnerHTML={{ __html: sentenceHtml }} />}
                          </span>
                        );
                      } else {
                        // Normal sentence (no highlight) - preserve HTML
                        parts.push(
                          <span
                            key={`sentence-${index}`}
                            data-sentence-index={index}
                            dangerouslySetInnerHTML={{ __html: sentenceHtml }}
                          />
                        );
                      }
                      
                      lastIndex = range.end; // Plain text position
                    });
                    
                    // Add any remaining text after last sentence - preserve HTML
                    if (lastIndex < passageContentPlain.length) {
                      const remainingHtmlStart = findHtmlPosition(passageContent, passageContentPlain, lastIndex);
                      const remainingHtml = passageContent.substring(remainingHtmlStart);
                      if (remainingHtml) {
                        parts.push(
                          <span key="after-last-sentence" dangerouslySetInnerHTML={{ __html: remainingHtml }} />
                        );
                      }
                    }
                    
                    return parts.length > 0 ? parts : <span dangerouslySetInnerHTML={{ __html: passageContent }} />;
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

        {/* Question Column */}
        <div className={cn(
          "flex flex-col min-h-0 h-full",
          allQuestions && allQuestions.length > 0 && onGoToQuestion && testCategory === 'ACT'
            ? "flex-1"
            : "w-1/2"
        )}>
          <Card className="h-full flex flex-col rounded-none border-0 min-h-0">
            <CardHeader className="pb-3 flex-shrink-0 border-b">
              <CardTitle className="text-base">
                Question {sequentialQuestionNumber || currentQuestion.question_number || (currentQuestionIndex + 1)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0 space-y-4">
              {/* Question Text */}
              <div 
                className="highlightable-text text-xl font-medium whitespace-pre-wrap"
                onMouseUp={handleTextSelection}
                onClick={handleTextSelection}
              >
                {renderFormattedText(typeof currentQuestion.text === 'string' ? currentQuestion.text : String(currentQuestion.text || ''))}
              </div>

              {/* Question Image - Show below question text */}
              {currentQuestion.imageUrl && (
                <div className="mt-4">
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt="Question" 
                    className="max-h-60 object-contain mx-auto border rounded-md"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Answer Options */}
              {currentQuestion.question_type === QuestionType.MultipleChoice && currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => {
                    const isCrossedOut = questionCrossedOuts.includes(option.id);
                    const isUnmasked = unmaskedAnswers.has(option.id);
                    const isMasked = isAnswerMasking && !isUnmasked;
                    
                    return (
                      <div key={option.id} className="relative">
                        <label
                          className={cn(
                            "question-option flex items-start",
                            userAnswers[currentQuestion.id] === option.id && "selected",
                            isCrossedOut && "opacity-60"
                          )}
                          onClick={(e) => {
                            // If cross-out mode is active, toggle cross-out instead of selecting
                            if (crossOutMode && onToggleCrossOut) {
                              e.preventDefault();
                              e.stopPropagation();
                              onToggleCrossOut(currentQuestion.id, option.id);
                            } else if (!crossOutMode) {
                              onAnswerChange(currentQuestion.id, option.id);
                            }
                          }}
                        >
                          <div className="flex items-center mt-1">
                            <input
                              type="radio"
                              name={`question-${currentQuestion.id}`}
                              value={option.id}
                              checked={userAnswers[currentQuestion.id] === option.id}
                              onChange={() => {
                                // Only select answer if cross-out mode is not active
                                if (!crossOutMode) {
                                  onAnswerChange(currentQuestion.id, option.id);
                                }
                              }}
                              className="sr-only"
                              disabled={isCrossedOut}
                            />
                            <span className="question-option-letter ml-2">
                              {optionLetters[index] || String.fromCharCode(65 + index)}
                            </span>
                          </div>
                          <div className={cn(
                            "flex-grow ml-2 relative",
                            isCrossedOut && (testCategory === 'ACT' ? "" : "line-through")
                          )}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                {isMasked ? (
                                  <div className="bg-gray-200 h-6 w-full rounded animate-pulse"></div>
                                ) : (
                                  <span className="text-[1.25rem]">
                                    {renderFormattedText(typeof option.text === 'string' ? option.text : String(option.text || ''))}
                                  </span>
                                )}
                              </div>
                              {isAnswerMasking && onToggleUnmask && (
                                <button 
                                  type="button"
                                  className="ml-2 p-1 rounded hover:bg-gray-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleUnmask(currentQuestion.id, option.id);
                                  }}
                                  title={isUnmasked ? "Mask answer" : "Unmask answer"}
                                >
                                  {isUnmasked ? (
                                    <EyeOff className="h-4 w-4 text-gray-600" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-600" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Cross-out overlay for ACT */}
                          {isCrossedOut && testCategory === 'ACT' && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <X className="h-8 w-8 text-red-500 font-bold" />
                            </div>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Text Input Question */}
              {currentQuestion.question_type === QuestionType.TextInput && (
                <TextInputQuestion
                  question={{
                    ...currentQuestion,
                    sentence_references: currentQuestion.sentence_references as Array<number | { sentenceIndex: number; start: number; end: number }>
                  }}
                  value={userAnswers[currentQuestion.id] || ''}
                  onChange={(value) => onAnswerChange(currentQuestion.id, value)}
                />
              )}

              {/* Cross-out Mode Instructions */}
              {crossOutMode && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Cross-out mode is active. Click on answer options to cross them out.
                  </p>
                </div>
              )}

              {/* Answer Masking Instructions */}
              {isAnswerMasking && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Answer masking is active. Click the eye icon to unmask specific answers.
                  </p>
                </div>
              )}

              {/* Question Explanation */}
              {currentQuestion.explanation && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="font-semibold text-blue-800 mb-2">Explanation:</h4>
                  <div className="whitespace-pre-wrap italic">
                    {renderFormattedText(typeof currentQuestion.explanation === 'string' ? currentQuestion.explanation : String(currentQuestion.explanation || ''))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Question Navigator - Bottom (for non-ACT or when vertical not used, but not for Essay/Writing module) */}
      {allQuestions && allQuestions.length > 0 && onGoToQuestion && testCategory !== 'ACT' && currentQuestion?.module_type !== 'writing' && (
        <div className="mt-6 p-4 border-t">
          <QuestionNavigator
            questions={allQuestions}
            currentIndex={currentQuestionIndex}
            userAnswers={userAnswers}
            flaggedQuestions={flaggedQuestions}
            onQuestionClick={onGoToQuestion}
            layout="horizontal"
          />
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between p-4 border-t bg-gray-50">
        <Button
          variant="outline"
          onClick={onPreviousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {currentQuestionIndex + 1} of {totalQuestions}
          </span>
        </div>
        
        <Button
          onClick={() => {
            if (currentQuestionIndex === totalQuestions - 1) {
              setShowConfirmSubmitDialog(true);
            } else {
              onNextQuestion();
            }
          }}
        >
          {currentQuestionIndex === totalQuestions - 1 ? 'Submit test' : 'Next'}
          {currentQuestionIndex !== totalQuestions - 1 && <ChevronRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showConfirmSubmitDialog} onOpenChange={setShowConfirmSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Test?</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your test? You won't be able to change your answers after submission.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmSubmitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowConfirmSubmitDialog(false);
              onNextQuestion();
            }}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PassageQuestion;
