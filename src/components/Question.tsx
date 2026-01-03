import React from "react";
import { cn } from "@/lib/utils";
import { X, Eye, EyeOff } from "lucide-react";
import { QuestionType } from '@/components/admin/questions/types';
import { TextInputQuestion } from '@/components/student/TextInputQuestion';
import { renderFormattedText } from '@/lib/utils';
import TextHighlighter from '@/components/TextHighlighter';

export { QuestionType };

export interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface QuestionData {
  id: string;
  text: string;
  options?: QuestionOption[];
  explanation?: string;
  imageUrl?: string;
  module_type?: "reading_writing" | "math" | "english" | "reading" | "science" | "writing";
  question_type: QuestionType;
  correct_answer?: string;
  test_id?: string;
  question_order?: number;
  // New fields for passage support
  passage_id?: string;
  question_number?: number;
  sentence_references?: Array<number | { sentenceIndex: number; start: number; end: number }>; // Array of sentence indices (0-based) or character ranges within sentences
}

interface QuestionProps {
  question: QuestionData;
  onAnswerChange: (answer: string) => void;
  selectedOption?: string;
  textAnswer?: string;
  onTextAnswerChange?: (value: string) => void;
  showExplanation?: boolean;
  crossedOutOptions?: string[];
  onToggleCrossOut?: (optionId: string) => void;
  crossOutMode?: boolean;
  testCategory?: 'SAT' | 'ACT';
  isAdmin?: boolean;
  isHighlighting?: boolean;
  selectedColor?: string;
  highlights?: Array<{id: string, start: number, end: number, color: string}>;
  onHighlightsChange?: (highlights: Array<{id: string, start: number, end: number, color: string}>) => void;
  isAnswerMasking?: boolean;
  unmaskedAnswers?: Set<string>;
  onToggleUnmask?: (optionId: string) => void;
  sequentialQuestionNumber?: number; // Optional 1-based sequential question number for ACT Math
}

const Question: React.FC<QuestionProps> = ({
  question,
  onAnswerChange,
  selectedOption,
  textAnswer,
  onTextAnswerChange,
  showExplanation = false,
  crossedOutOptions = [],
  onToggleCrossOut,
  crossOutMode = false,
  testCategory = 'SAT',
  isAdmin = false,
  isHighlighting = false,
  selectedColor = 'yellow',
  highlights = [],
  onHighlightsChange,
  isAnswerMasking = false,
  unmaskedAnswers = new Set(),
  onToggleUnmask,
  sequentialQuestionNumber,
}) => {
  const handleOptionClick = (optionId: string) => {
    onAnswerChange(optionId);
  };

  const handleTextSelection = () => {
    if (!isHighlighting || !onHighlightsChange) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    
    if (selectedText.length === 0) return;
    
    // Create a highlight element
    const highlightSpan = document.createElement('span');
    highlightSpan.className = `highlight-${selectedColor || 'yellow'}`;
    highlightSpan.style.backgroundColor = selectedColor === 'yellow' ? '#fef08a' : 
                                       selectedColor === 'green' ? '#bbf7d0' : 
                                       selectedColor === 'blue' ? '#bfdbfe' : 
                                       selectedColor === 'pink' ? '#fce7f3' : 
                                       selectedColor === 'orange' ? '#fed7aa' : '#e9d5ff';
    highlightSpan.style.padding = '2px 1px';
    highlightSpan.style.borderRadius = '2px';
    
    try {
      // Extract the contents of the range
      const contents = range.extractContents();
      highlightSpan.appendChild(contents);
      range.insertNode(highlightSpan);
      
      // Create a new highlight record
      const newHighlight = {
        id: Date.now().toString(),
        start: 0, // We'll track this differently
        end: selectedText.length,
        color: selectedColor || 'yellow',
        text: selectedText
      };
      
      // Add to highlights
      const newHighlights = [...(highlights || []), newHighlight];
      onHighlightsChange(newHighlights);
      
    } catch (error) {
      console.error('Error creating highlight:', error);
    }
    
    // Clear selection
    selection.removeAllRanges();
  };
  
  // For ACT tests, alternate between A/B/C/D and F/G/H/J based on question number
  // Odd question numbers (1, 3, 5...) use A/B/C/D, even (2, 4, 6...) use F/G/H/J
  const getOptionLetters = (): string[] => {
    if (testCategory === 'ACT') {
      // Use sequentialQuestionNumber (passed prop), question_number (for passage questions), or question_order
      // sequentialQuestionNumber is preferred as it's the most accurate (1-based sequential number)
      const qNum = sequentialQuestionNumber ?? question.question_number ?? question.question_order;
      if (qNum !== undefined && qNum !== null) {
        // ACT alternates: odd = A/B/C/D, even = F/G/H/J
        // Use modulo 2 to determine if odd (1) or even (0)
        return qNum % 2 === 1 ? ['A', 'B', 'C', 'D'] : ['F', 'G', 'H', 'J'];
      }
    }
    // Default: A, B, C, D, E
    return ['A', 'B', 'C', 'D', 'E'];
  };
  
  const letters = getOptionLetters();

  const handleHighlightClick = (event: React.MouseEvent) => {
    if (!isHighlighting || !onHighlightsChange) return;
    
    const target = event.target as HTMLElement;
    if (target.classList.toString().includes('highlight-')) {
      // Remove the highlight span and restore its contents
      const parent = target.parentNode;
      if (parent) {
        while (target.firstChild) {
          parent.insertBefore(target.firstChild, target);
        }
        parent.removeChild(target);
      }
    }
  };

  // Add CSS for highlighting
  React.useEffect(() => {
    if (isHighlighting) {
      const style = document.createElement('style');
      style.textContent = `
        .highlightable-text.highlighting-enabled {
          position: relative;
        }
        .highlightable-text.highlighting-enabled span[class^="highlight-"] {
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .highlightable-text.highlighting-enabled span[class^="highlight-"]:hover {
          opacity: 0.7;
        }
      `;
      document.head.appendChild(style);
      return () => document.head.removeChild(style);
    }
  }, [isHighlighting]);

  if (question.question_type === QuestionType.TextInput) {
    return (
      <div className="animate-fade-in">
        {question.imageUrl && (
          <div className="mb-6">
            <img 
              src={question.imageUrl} 
              alt="Question" 
              className="max-h-60 object-contain mx-auto border rounded-md"
              loading="lazy"
            />
          </div>
        )}
        <div className="mb-6">
          <div className="text-xl font-medium mb-2 whitespace-pre-wrap">
            {console.log('Question component - isAdmin:', isAdmin, 'testCategory:', testCategory, 'question.text:', question.text)}
            {!isAdmin ? (
              <div 
                className={`highlightable-text ${isHighlighting ? 'highlighting-enabled' : ''}`}
                onMouseUp={isHighlighting ? handleTextSelection : undefined}
                onClick={isHighlighting ? handleHighlightClick : undefined}
                style={{ userSelect: isHighlighting ? 'text' : 'none' }}
              >
                {renderFormattedText(typeof question.text === 'string' ? question.text : String(question.text || ''))}
              </div>
            ) : (
              renderFormattedText(typeof question.text === 'string' ? question.text : String(question.text || ''))
            )}
          </div>
        </div>
        <TextInputQuestion
          question={question}
          value={textAnswer}
          onChange={onTextAnswerChange}
          onAnswerChange={onAnswerChange}
          disabled={showExplanation}
          isSubmitted={showExplanation}
        />
      </div>
    );
  }

  // For ACT tests, use two-column layout
  if (testCategory === 'ACT') {
    const isMathModule = question.module_type === 'math';
    
    return (
      <div className="animate-fade-in">
        {/* For Math module, show image below question text; for other modules, show above */}
        {!isMathModule && question.imageUrl && (
          <div className="mb-6">
            <img 
              src={question.imageUrl} 
              alt="Question" 
              className="max-h-60 object-contain mx-auto border rounded-md"
              loading="lazy"
            />
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column - Question text */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Question</h3>
            <div className="text-xl font-medium whitespace-pre-wrap">
              {console.log('ACT Question component - isAdmin:', isAdmin, 'testCategory:', testCategory, 'question.text:', question.text)}
              {!isAdmin ? (
                <div 
                  className={`highlightable-text ${isHighlighting ? 'highlighting-enabled' : ''}`}
                  onMouseUp={isHighlighting ? handleTextSelection : undefined}
                  onClick={isHighlighting ? handleHighlightClick : undefined}
                  style={{ userSelect: isHighlighting ? 'text' : 'none' }}
                >
                  {renderFormattedText(typeof question.text === 'string' ? question.text : String(question.text || ''))}
                </div>
              ) : (
                renderFormattedText(typeof question.text === 'string' ? question.text : String(question.text || ''))
              )}
            </div>
            {/* For Math module, show image below question text */}
            {isMathModule && question.imageUrl && (
              <div className="mt-4">
                <img 
                  src={question.imageUrl} 
                  alt="Question" 
                  className="max-h-60 object-contain mx-auto border rounded-md"
                  loading="lazy"
                />
              </div>
            )}
          </div>

          {/* Right column - Answer options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Answer Options</h3>
            <div className="space-y-3">
              {question.options?.map((option, index) => {
                const isCrossedOut = crossedOutOptions?.includes(option.id);
                const isUnmasked = unmaskedAnswers?.has(option.id);
                const isMasked = isAnswerMasking && !isUnmasked;
                
                return (
                  <div key={option.id} className="relative">
                    <label
                      className={cn(
                        "question-option flex items-start",
                        selectedOption === option.id && "selected",
                        isCrossedOut && "opacity-60",
                        showExplanation && option.is_correct && "border-green-500 bg-green-50"
                      )}
                      onClick={() => handleOptionClick(option.id)}
                    >
                      <div className="flex items-center mt-1">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option.id}
                          checked={selectedOption === option.id}
                          onChange={() => {}}
                        />
                        <span className="question-option-letter ml-2">{letters[index]}</span>
                      </div>
                      <div className={cn(
                        "flex-grow ml-2 relative",
                        isCrossedOut && (testCategory === 'ACT' ? "" : "line-through")
                      )}>
                        {isMasked ? (
                          <div className="bg-gray-200 h-6 w-full rounded animate-pulse"></div>
                        ) : (
                          renderFormattedText(option.text)
                        )}
                        {isCrossedOut && testCategory === 'ACT' && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <X className="h-12 w-12 text-red-600" style={{ minWidth: '100%', minHeight: '100%' }} />
                          </div>
                        )}
                      </div>
                    </label>
                    
                    {isAnswerMasking && onToggleUnmask && (
                      <button 
                        type="button"
                        className={cn(
                          "absolute right-3 top-3 w-6 h-6 flex items-center justify-center rounded-full",
                          isUnmasked ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleUnmask(option.id);
                        }}
                        title={isUnmasked ? "Mask answer" : "Unmask answer"}
                      >
                        {isUnmasked ? <EyeOff className="h-5 w-5 text-green-600" style={{ strokeWidth: 2 }} /> : <Eye className="h-5 w-5 text-gray-600" style={{ strokeWidth: 2 }} />}
                      </button>
                    )}
                    
                    {crossOutMode && onToggleCrossOut && (
                      <button 
                        type="button"
                        className={cn(
                          "absolute right-12 top-3 w-6 h-6 flex items-center justify-center rounded-full",
                          isCrossedOut ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCrossOut(option.id);
                        }}
                        title={isCrossedOut ? "Remove cross-out" : "Cross out option"}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {question.explanation && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2">Explanation:</h4>
            <div className="whitespace-pre-wrap italic">
              {!isAdmin ? (
                <TextHighlighter 
                  text={typeof question.explanation === 'string' ? question.explanation : String(question.explanation || '')} 
                  readOnly={true}
                />
              ) : (
                renderFormattedText(typeof question.explanation === 'string' ? question.explanation : String(question.explanation || ''))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default SAT layout
  return (
    <div className="animate-fade-in">
      {question.imageUrl && (
        <div className="mb-6">
          <img 
            src={question.imageUrl} 
            alt="Question" 
            className="max-h-60 object-contain mx-auto border rounded-md"
            loading="lazy"
          />
        </div>
      )}
      <div className="mb-6">
        <div className="text-xl font-medium mb-2 whitespace-pre-wrap">
          {console.log('SAT Question component - isAdmin:', isAdmin, 'testCategory:', testCategory, 'question.text:', question.text)}
          {!isAdmin ? (
            <div 
              className={`highlightable-text ${isHighlighting ? 'highlighting-enabled' : ''}`}
              onMouseUp={isHighlighting ? handleTextSelection : undefined}
              onClick={isHighlighting ? handleHighlightClick : undefined}
              style={{ userSelect: isHighlighting ? 'text' : 'none' }}
            >
              {renderFormattedText(typeof question.text === 'string' ? question.text : String(question.text || ''))}
            </div>
          ) : (
            renderFormattedText(typeof question.text === 'string' ? question.text : String(question.text || ''))
          )}
        </div>
      </div>

      <div className="space-y-3">
        {question.options?.map((option, index) => {
          const isCrossedOut = crossedOutOptions?.includes(option.id);
          const isUnmasked = unmaskedAnswers?.has(option.id);
          const isMasked = isAnswerMasking && !isUnmasked;
          
          return (
            <div key={option.id} className="relative">
              <label
                className={cn(
                  "question-option flex items-start",
                  selectedOption === option.id && "selected",
                  isCrossedOut && "opacity-60",
                  showExplanation && option.is_correct && "border-green-500 bg-green-50"
                )}
                onClick={() => handleOptionClick(option.id)}
              >
                <div className="flex items-center mt-1">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option.id}
                    checked={selectedOption === option.id}
                    onChange={() => {}}
                  />
                  <span className="question-option-letter ml-2">{letters[index]}</span>
                </div>
                <div className={cn(
                  "flex-grow ml-2 relative",
                  isCrossedOut && (testCategory === 'ACT' ? "" : "line-through")
                )}>
                  {isMasked ? (
                    <div className="bg-gray-200 h-6 w-full rounded animate-pulse"></div>
                  ) : (
                    renderFormattedText(typeof option.text === 'string' ? option.text : String(option.text || ''))
                  )}
                  {isCrossedOut && testCategory === 'ACT' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <X className="h-8 w-8 text-red-500 font-bold" />
                    </div>
                  )}
                </div>
              </label>
              
              {isAnswerMasking && onToggleUnmask && (
                <button 
                  type="button"
                  className={cn(
                    "absolute right-3 top-3 w-6 h-6 flex items-center justify-center rounded-full",
                    isUnmasked ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleUnmask(option.id);
                  }}
                  title={isUnmasked ? "Mask answer" : "Unmask answer"}
                >
                  {isUnmasked ? <EyeOff className="h-5 w-5 text-green-600" style={{ strokeWidth: 2 }} /> : <Eye className="h-5 w-5 text-gray-600" style={{ strokeWidth: 2 }} />}
                </button>
              )}
              
              {crossOutMode && onToggleCrossOut && (
                <button 
                  type="button"
                  className={cn(
                    "absolute right-12 top-3 w-6 h-6 flex items-center justify-center rounded-full",
                    isCrossedOut ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCrossOut(option.id);
                  }}
                  title={isCrossedOut ? "Remove cross-out" : "Cross out option"}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      
      {question.explanation && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h4 className="font-semibold text-blue-800 mb-2">Explanation:</h4>
          <div className="whitespace-pre-wrap italic">
            {!isAdmin ? (
              <TextHighlighter 
                text={question.explanation} 
                readOnly={true}
              />
            ) : (
              renderFormattedText(typeof question.explanation === 'string' ? question.explanation : String(question.explanation || ''))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Question;
