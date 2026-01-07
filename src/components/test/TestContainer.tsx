import React, { useState, useEffect, useRef } from "react";
import Question, { QuestionData, QuestionType } from '@/components/Question';
import TestNavigation from './TestNavigation';
import ProgressBar from '@/components/ProgressBar';
import LineReader from './LineReader';
import TextHighlighter from '@/components/TextHighlighter';
import { Button } from '@/components/ui/button';
import { Flag, Calculator, Highlighter, X, Eye, EyeOff } from 'lucide-react';
import QuestionNavigator from './QuestionNavigator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface TestContainerProps {
  questions: QuestionData[];
  currentQuestionIndex: number;
  userAnswers: Record<string, string>;
  onSelectOption: (questionId: string, optionId: string) => void;
  onPreviousQuestion: () => void;
  onNextQuestion: () => void;
  onConfirmSubmit: () => void;
  onGoToQuestion: (index: number) => void;
  flaggedQuestions: Set<string>;
  onToggleFlag: (questionId: string) => void;
  crossedOutOptions: Record<string, string[]>;
  onToggleCrossOut: (questionId: string, optionId: string) => void;
  onOpenReviewPage: () => void;
  onSaveStatusChange?: (isSaving: boolean) => void;
  showSubmitButton?: boolean;
  onSubmit?: () => void;
  currentPart?: 1 | 2;
  crossOutMode: boolean;
  setCrossOutMode: React.Dispatch<React.SetStateAction<boolean>>;
  isAnswerMasking: boolean;
  setIsAnswerMasking: React.Dispatch<React.SetStateAction<boolean>>;
  unmaskedAnswers: Set<string>;
  setUnmaskedAnswers: React.Dispatch<React.SetStateAction<Set<string>>>;
  testCategory?: 'SAT' | 'ACT';
}

export const TestContainer: React.FC<TestContainerProps> = ({
  questions,
  currentQuestionIndex,
  userAnswers,
  onSelectOption,
  onPreviousQuestion,
  onNextQuestion,
  onConfirmSubmit,
  onGoToQuestion,
  flaggedQuestions,
  onToggleFlag,
  crossedOutOptions,
  onToggleCrossOut,
  onOpenReviewPage,
  onSaveStatusChange,
  showSubmitButton = false,
  onSubmit,
  currentPart = 1,
  crossOutMode,
  setCrossOutMode,
  isAnswerMasking,
  setIsAnswerMasking,
  unmaskedAnswers,
  setUnmaskedAnswers,
  testCategory = 'SAT',
}) => {
  const [showLineReader, setShowLineReader] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [showEndModuleDialog, setShowEndModuleDialog] = useState(false);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('yellow');
  const [highlights, setHighlights] = useState<Array<{id: string, start: number, end: number, color: string}>>([]);
  const questionAreaRef = useRef<HTMLDivElement>(null);

  // Always call hooks; avoid early return to keep hook order stable
  const safeQuestions = Array.isArray(questions) ? questions : [];
  const noQuestions = safeQuestions.length === 0;

  const currentQuestion = safeQuestions[currentQuestionIndex];
  const selectedAnswer = currentQuestion ? userAnswers[currentQuestion.id] : null;
  const isQuestionFlagged = currentQuestion ? flaggedQuestions.has(currentQuestion.id) : false;
  const questionCrossedOuts = currentQuestion ? crossedOutOptions[currentQuestion.id] || [] : [];

  // Initialize text answer from user's saved answer
  useEffect(() => {
    if (currentQuestion?.question_type === QuestionType.TextInput) {
      setTextAnswer(userAnswers[currentQuestion.id] || '');
    }
  }, [currentQuestion, userAnswers]);

  // Group questions by module type
  const readingWritingQuestions = safeQuestions.filter(q => q.module_type === "reading_writing");
  const mathQuestions = safeQuestions.filter(q => q.module_type === "math");
  const englishQuestions = safeQuestions.filter(q => q.module_type === "english");
  const readingQuestions = safeQuestions.filter(q => q.module_type === "reading");
  const scienceQuestions = safeQuestions.filter(q => q.module_type === "science");
  const writingQuestions = safeQuestions.filter(q => q.module_type === "writing");

  // Find the current module type
  const currentModuleType = currentQuestion?.module_type || "reading_writing";
  const getModuleName = (moduleType: string) => {
    switch (moduleType) {
      case "reading_writing": return "Reading & Writing";
      case "math": return "Math";
      case "english": return "English";
      case "reading": return "Reading";
      case "science": return "Science";
      case "writing": return "Writing";
      default: return moduleType;
    }
  };
  const moduleName = getModuleName(currentModuleType);
  
  // Calculate sequential question number for ACT Math (1-based position within math questions)
  const getSequentialQuestionNumber = (): number | undefined => {
    if (testCategory === 'ACT' && currentModuleType === 'math' && currentQuestion) {
      // Find the index of current question within all math questions
      const mathQuestionIndex = mathQuestions.findIndex(q => q.id === currentQuestion.id);
      return mathQuestionIndex >= 0 ? mathQuestionIndex + 1 : undefined;
    }
    return undefined;
  };
  const sequentialQuestionNumber = getSequentialQuestionNumber();

  // Determine if this is the last question of the module (end of Part 2)
  const isLastQuestion = currentQuestionIndex === safeQuestions.length - 1;

  // Show saving indicator when answers change
  // DISABLED: Auto-save is causing issues with navigation
  // useEffect(() => {
  //   if (onSaveStatusChange) {
  //     setIsSaving(true);
  //     onSaveStatusChange(true);
      
  //     const timer = setTimeout(() => {
  //       setIsSaving(false);
  //       onSaveStatusChange(false);
  //     }, 1000);
      
  //     return () => clearTimeout(timer);
  //   }
  // }, [userAnswers, onSaveStatusChange]);

  useEffect(() => {
    // Reset state when question changes
    setSelectedOption(selectedAnswer || null);
    // Don't reset textAnswer here as it's managed by the parent
    setShowExplanation(false);
  }, [currentQuestionIndex, selectedAnswer]);

  // Auto-scroll to top of question area when question changes (for SAT and ACT Math)
  useEffect(() => {
    // Only auto-scroll for non-passage questions (SAT and ACT Math)
    // Passage questions are handled in PassageQuestion component
    if (!currentQuestion) return;
    
    const isPassageModule = currentQuestion.module_type === 'reading' || 
                            currentQuestion.module_type === 'english' || 
                            currentQuestion.module_type === 'science' ||
                            currentQuestion.module_type === 'writing';
    
    if (!isPassageModule && questionAreaRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        questionAreaRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }, 50);
    }
  }, [currentQuestionIndex, currentQuestion?.id, currentQuestion]);

  const handleAnswerChange = (answer: string) => {
    if (currentQuestion.question_type === QuestionType.TextInput) {
      setTextAnswer(answer);
      onSelectOption(currentQuestion.id, answer);
    } else {
      setSelectedOption(answer);
      onSelectOption(currentQuestion.id, answer);
    }
  };

  const handleTextAnswerChange = (value: string) => {
    setTextAnswer(value);
    onSelectOption(currentQuestion.id, value);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setShowEndModuleDialog(true);
    } else {
      onNextQuestion();
    }
  };

  const handleConfirmEndModule = () => {
    setShowEndModuleDialog(false);
    onNextQuestion();
  };

  return (
    <>
      <div className="mb-6">
        <ProgressBar current={currentQuestionIndex + 1} total={safeQuestions.length} />
      </div>
      
      <div ref={questionAreaRef} className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">
          {moduleName}{testCategory === 'SAT' ? ` - Part ${currentPart}` : ''}
        </h2>
        <div className="flex items-center gap-4">
          {/* Removed saving indicator since auto-save is disabled */}
          <div className="flex items-center space-x-2">
            <Switch
              checked={showLineReader}
              onCheckedChange={setShowLineReader}
            />
            <span className="text-sm">Line Reader</span>
          </div>
          {currentQuestion && (
            <>
              <Button
                variant={isQuestionFlagged ? "destructive" : "outline"}
                size="sm"
                onClick={() => onToggleFlag(currentQuestion.id)}
              >
                <Flag className="mr-1 h-4 w-4" />
                {isQuestionFlagged ? "Unflag Question" : "Flag for Review"}
              </Button>
              <button
                className={`px-[25px] py-1 rounded border flex items-center justify-center text-sm font-bold w-8 h-8 ${crossOutMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'} transition`}
                title={crossOutMode ? 'Disable answer cross out' : 'Enable answer cross out'}
                onClick={() => setCrossOutMode((prev) => !prev)}
                aria-pressed={crossOutMode}
                style={{ textDecoration: 'line-through' }}
              >
                {testCategory === 'ACT' ? 'X' : 'ABC'}
              </button>
              <button
                className={`px-[25px] py-1 rounded border flex items-center justify-center text-sm font-bold w-8 h-8 ${isAnswerMasking ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'} transition`}
                title={isAnswerMasking ? 'Disable answer masking' : 'Enable answer masking'}
                onClick={() => {
                  setIsAnswerMasking((prev) => !prev);
                  if (!isAnswerMasking) {
                    setUnmaskedAnswers(new Set()); // Clear unmasked answers when enabling masking
                  }
                }}
                aria-pressed={isAnswerMasking}
              >
                <span className="font-bold text-sm">M</span>
              </button>
            </>
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
                      setSelectedColor(color);
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
                setIsHighlighting((prev) => !prev);
              }}
            >
              {isHighlighting ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </div>
      
      <LineReader 
        visible={showLineReader} 
        onToggle={() => setShowLineReader(false)} 
      />
      
      <Tabs value={currentModuleType} className="w-full mb-6">
        <TabsList className="mb-4">
          {currentModuleType === "reading_writing" && (
            <TabsTrigger value="reading_writing">
              Reading & Writing ({readingWritingQuestions.length} questions)
            </TabsTrigger>
          )}
          {currentModuleType === "math" && (
            <TabsTrigger value="math">
              Math ({mathQuestions.length} questions)
            </TabsTrigger>
          )}
          {currentModuleType === "english" && (
            <TabsTrigger value="english">
              English ({englishQuestions.length} questions)
            </TabsTrigger>
          )}
          {currentModuleType === "reading" && (
            <TabsTrigger value="reading">
              Reading ({readingQuestions.length} questions)
            </TabsTrigger>
          )}
          {currentModuleType === "science" && (
            <TabsTrigger value="science">
              Science ({scienceQuestions.length} questions)
            </TabsTrigger>
          )}
          {currentModuleType === "writing" && (
            <TabsTrigger value="writing">
              Writing ({writingQuestions.length} questions)
            </TabsTrigger>
          )}
        </TabsList>
        {currentModuleType === "reading_writing" && (
          <TabsContent value="reading_writing">
            <Card>
              <CardHeader>
                <CardTitle>Reading & Writing Questions</CardTitle>
              </CardHeader>
              <CardContent>
                                 {!noQuestions && currentQuestion && currentQuestion.module_type === "reading_writing" && (
                  <Question
                    question={currentQuestion}
                    onAnswerChange={handleAnswerChange}
                    selectedOption={selectedOption}
                    textAnswer={textAnswer}
                    onTextAnswerChange={handleTextAnswerChange}
                    showExplanation={showExplanation}
                    crossedOutOptions={questionCrossedOuts}
                    onToggleCrossOut={crossOutMode ? (optionId => onToggleCrossOut(currentQuestion.id, optionId)) : undefined}
                    crossOutMode={crossOutMode}
                    testCategory={testCategory}
                    isAdmin={false}
                    isHighlighting={isHighlighting}
                    selectedColor={selectedColor}
                    highlights={highlights}
                    onHighlightsChange={setHighlights}
                    isAnswerMasking={isAnswerMasking}
                    unmaskedAnswers={unmaskedAnswers}
                    onToggleUnmask={(optionId) => {
                      setUnmaskedAnswers(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(optionId)) {
                          newSet.delete(optionId);
                        } else {
                          newSet.add(optionId);
                        }
                        return newSet;
                      });
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {currentModuleType === "math" && (
          <TabsContent value="math">
            {/* For ACT Math, show vertical navigator on left side */}
            {testCategory === 'ACT' ? (
              <div className="flex gap-4">
                <div className="w-40 border-r bg-gray-50 p-3 h-[500px] overflow-hidden">
                  <QuestionNavigator
                    questions={safeQuestions}
                    currentIndex={currentQuestionIndex}
                    userAnswers={userAnswers}
                    flaggedQuestions={flaggedQuestions}
                    onQuestionClick={onGoToQuestion}
                    layout="vertical"
                  />
                </div>
                <div className="flex-1">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Math Questions</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('https://www.desmos.com/testing/digital-act/graphing', '_blank')}
                        >
                          <Calculator className="mr-2 h-4 w-4" />
                          Calculator
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!noQuestions && currentQuestion && currentQuestion.module_type === "math" && (
                        <Question
                          question={currentQuestion}
                          onAnswerChange={handleAnswerChange}
                          selectedOption={selectedOption}
                          textAnswer={textAnswer}
                          onTextAnswerChange={handleTextAnswerChange}
                          showExplanation={showExplanation}
                          crossedOutOptions={questionCrossedOuts}
                          onToggleCrossOut={crossOutMode ? (optionId => onToggleCrossOut(currentQuestion.id, optionId)) : undefined}
                          crossOutMode={crossOutMode}
                          testCategory={testCategory}
                          isAdmin={false}
                          isHighlighting={isHighlighting}
                          selectedColor={selectedColor}
                          highlights={highlights}
                          onHighlightsChange={setHighlights}
                          isAnswerMasking={isAnswerMasking}
                          unmaskedAnswers={unmaskedAnswers}
                          onToggleUnmask={(optionId) => {
                            setUnmaskedAnswers(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(optionId)) {
                                newSet.delete(optionId);
                              } else {
                                newSet.add(optionId);
                              }
                              return newSet;
                            });
                          }}
                          sequentialQuestionNumber={sequentialQuestionNumber}
                        />
                      )}
                      
                      {/* Cross-out Mode Instructions */}
                      {crossOutMode && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            Cross-out mode is active. Click the blue button to Deactivate.
                          </p>
                        </div>
                      )}

                      {/* Answer Masking Instructions */}
                      {isAnswerMasking && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            Answer masking is active. Click the blue button to Deactivate.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Math Questions</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('https://www.desmos.com/testing/digital-act/graphing', '_blank')}
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      Calculator
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!noQuestions && currentQuestion && currentQuestion.module_type === "math" && (
                    <Question
                      question={currentQuestion}
                      onAnswerChange={handleAnswerChange}
                      selectedOption={selectedOption}
                      textAnswer={textAnswer}
                      onTextAnswerChange={handleTextAnswerChange}
                      showExplanation={showExplanation}
                      crossedOutOptions={questionCrossedOuts}
                      onToggleCrossOut={crossOutMode ? (optionId => onToggleCrossOut(currentQuestion.id, optionId)) : undefined}
                      crossOutMode={crossOutMode}
                      testCategory={testCategory}
                      isAdmin={false}
                      isHighlighting={isHighlighting}
                      selectedColor={selectedColor}
                      highlights={highlights}
                      onHighlightsChange={setHighlights}
                      isAnswerMasking={isAnswerMasking}
                      unmaskedAnswers={unmaskedAnswers}
                      onToggleUnmask={(optionId) => {
                        setUnmaskedAnswers(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(optionId)) {
                            newSet.delete(optionId);
                          } else {
                            newSet.add(optionId);
                          }
                          return newSet;
                        });
                      }}
                      sequentialQuestionNumber={sequentialQuestionNumber}
                    />
                  )}
                  
                  {/* Cross-out Mode Instructions */}
                  {crossOutMode && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Cross-out mode is active. Click the blue button to Deactivate.
                      </p>
                    </div>
                  )}

                  {/* Answer Masking Instructions */}
                  {isAnswerMasking && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Answer masking is active. Click the blue button to Deactivate.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
        {currentModuleType === "english" && (
          <TabsContent value="english">
            <Card>
              <CardHeader>
                <CardTitle>English Questions</CardTitle>
              </CardHeader>
              <CardContent>
                {!noQuestions && currentQuestion && currentQuestion.module_type === "english" && (
                  <Question
                    question={currentQuestion}
                    onAnswerChange={handleAnswerChange}
                    selectedOption={selectedOption}
                    textAnswer={textAnswer}
                    onTextAnswerChange={handleTextAnswerChange}
                    showExplanation={showExplanation}
                    crossedOutOptions={questionCrossedOuts}
                    onToggleCrossOut={crossOutMode ? (optionId => onToggleCrossOut(currentQuestion.id, optionId)) : undefined}
                    crossOutMode={crossOutMode}
                    testCategory={testCategory}
                    isAdmin={false}
                    isHighlighting={isHighlighting}
                    selectedColor={selectedColor}
                    highlights={highlights}
                    onHighlightsChange={setHighlights}
                    isAnswerMasking={isAnswerMasking}
                    unmaskedAnswers={unmaskedAnswers}
                    onToggleUnmask={(optionId) => {
                      setUnmaskedAnswers(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(optionId)) {
                          newSet.delete(optionId);
                        } else {
                          newSet.add(optionId);
                        }
                        return newSet;
                      });
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {currentModuleType === "reading" && (
          <TabsContent value="reading">
            <Card>
              <CardHeader>
                <CardTitle>Reading Questions</CardTitle>
              </CardHeader>
              <CardContent>
                {!noQuestions && currentQuestion && currentQuestion.module_type === "reading" && (
                  <Question
                    question={currentQuestion}
                    onAnswerChange={handleAnswerChange}
                    selectedOption={selectedOption}
                    textAnswer={textAnswer}
                    onTextAnswerChange={handleTextAnswerChange}
                    showExplanation={showExplanation}
                    crossedOutOptions={questionCrossedOuts}
                    onToggleCrossOut={crossOutMode ? (optionId => onToggleCrossOut(currentQuestion.id, optionId)) : undefined}
                    crossOutMode={crossOutMode}
                    testCategory={testCategory}
                    isAdmin={false}
                    isHighlighting={isHighlighting}
                    selectedColor={selectedColor}
                    highlights={highlights}
                    onHighlightsChange={setHighlights}
                    isAnswerMasking={isAnswerMasking}
                    unmaskedAnswers={unmaskedAnswers}
                    onToggleUnmask={(optionId) => {
                      setUnmaskedAnswers(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(optionId)) {
                          newSet.delete(optionId);
                        } else {
                          newSet.add(optionId);
                        }
                        return newSet;
                      });
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {currentModuleType === "science" && (
          <TabsContent value="science">
            <Card>
              <CardHeader>
                <CardTitle>Science Questions</CardTitle>
              </CardHeader>
              <CardContent>
                {!noQuestions && currentQuestion && currentQuestion.module_type === "science" && (
                  <Question
                    question={currentQuestion}
                    onAnswerChange={handleAnswerChange}
                    selectedOption={selectedOption}
                    textAnswer={textAnswer}
                    onTextAnswerChange={handleTextAnswerChange}
                    showExplanation={showExplanation}
                    crossedOutOptions={questionCrossedOuts}
                    onToggleCrossOut={crossOutMode ? (optionId => onToggleCrossOut(currentQuestion.id, optionId)) : undefined}
                    crossOutMode={crossOutMode}
                    testCategory={testCategory}
                    isAdmin={false}
                    isHighlighting={isHighlighting}
                    selectedColor={selectedColor}
                    highlights={highlights}
                    onHighlightsChange={setHighlights}
                    isAnswerMasking={isAnswerMasking}
                    unmaskedAnswers={unmaskedAnswers}
                    onToggleUnmask={(optionId) => {
                      setUnmaskedAnswers(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(optionId)) {
                          newSet.delete(optionId);
                        } else {
                          newSet.add(optionId);
                        }
                        return newSet;
                      });
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {currentModuleType === "writing" && (
          <TabsContent value="writing">
            <Card>
              <CardHeader>
                <CardTitle>Writing Questions</CardTitle>
              </CardHeader>
              <CardContent>
                {!noQuestions && currentQuestion && currentQuestion.module_type === "writing" && (
                  <Question
                    question={currentQuestion}
                    onAnswerChange={handleAnswerChange}
                    selectedOption={selectedOption}
                    textAnswer={textAnswer}
                    onTextAnswerChange={handleTextAnswerChange}
                    showExplanation={showExplanation}
                    crossedOutOptions={questionCrossedOuts}
                    onToggleCrossOut={crossOutMode ? (optionId => onToggleCrossOut(currentQuestion.id, optionId)) : undefined}
                    crossOutMode={crossOutMode}
                    testCategory={testCategory}
                    isAdmin={false}
                    isHighlighting={isHighlighting}
                    selectedColor={selectedColor}
                    highlights={highlights}
                    onHighlightsChange={setHighlights}
                    isAnswerMasking={isAnswerMasking}
                    unmaskedAnswers={unmaskedAnswers}
                    onToggleUnmask={(optionId) => {
                      setUnmaskedAnswers(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(optionId)) {
                          newSet.delete(optionId);
                        } else {
                          newSet.add(optionId);
                        }
                        return newSet;
                      });
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      
      <div className={`flex justify-end gap-2 mt-8 ${testCategory === 'ACT' && currentModuleType === 'math' ? 'mb-24' : ''}`}>
        <Button variant="outline" onClick={onPreviousQuestion} disabled={currentQuestionIndex === 0}>
          {currentModuleType === 'math' ? 'Previous' : 'Previous Question'}
        </Button>
        <Button onClick={handleNext}>
          {isLastQuestion ? 'Finish Module' : (currentModuleType === 'math' ? 'Next' : 'Next Question')}
        </Button>
      </div>
      {/* Only show horizontal navigator if not ACT Math (which has vertical navigator) and not Essay/Writing module */}
      {!(testCategory === 'ACT' && currentModuleType === "math") && currentModuleType !== "writing" && (
        <div className="mt-8">
          <QuestionNavigator
            questions={safeQuestions}
            currentIndex={currentQuestionIndex}
            userAnswers={userAnswers}
            flaggedQuestions={flaggedQuestions}
            onQuestionClick={onGoToQuestion}
          />
        </div>
      )}
      <Dialog open={showEndModuleDialog} onOpenChange={setShowEndModuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End {testCategory === 'ACT' ? 'Section' : 'Module'}?</DialogTitle>
            <DialogDescription>
              Are you sure you want to end this {testCategory === 'ACT' ? 'section' : 'module'} and submit your answers?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndModuleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmEndModule}>
              Yes, Submit {testCategory === 'ACT' ? 'Section' : 'Module'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TestContainer;
