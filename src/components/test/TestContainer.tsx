import React, { useState, useEffect } from "react";
import Question, { QuestionData, QuestionType } from '@/components/Question';
import TestNavigation from './TestNavigation';
import ProgressBar from '@/components/ProgressBar';
import LineReader from './LineReader';
import { Button } from '@/components/ui/button';
import { Flag, Calculator } from 'lucide-react';
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
}) => {
  const [showLineReader, setShowLineReader] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [showEndModuleDialog, setShowEndModuleDialog] = useState(false);

  // Validate questions prop
  if (!Array.isArray(questions) || questions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No questions available</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
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
  const readingWritingQuestions = questions.filter(q => q.module_type === "reading_writing");
  const mathQuestions = questions.filter(q => q.module_type === "math");

  // Find the current module type
  const currentModuleType = currentQuestion?.module_type || "reading_writing";
  const moduleName = currentModuleType === "reading_writing" ? "Reading & Writing" : "Math";

  // Determine if this is the last question of the module (end of Part 2)
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Show saving indicator when answers change
  useEffect(() => {
    if (onSaveStatusChange) {
      setIsSaving(true);
      onSaveStatusChange(true);
      
      const timer = setTimeout(() => {
        setIsSaving(false);
        onSaveStatusChange(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [userAnswers, onSaveStatusChange]);

  useEffect(() => {
    // Reset state when question changes
    setSelectedOption(null);
    // Don't reset textAnswer here as it's managed by the parent
    setShowExplanation(false);
  }, [currentQuestionIndex]);

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
        <ProgressBar current={currentQuestionIndex + 1} total={questions.length} />
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">
          {moduleName} - Part {currentPart}
        </h2>
        <div className="flex items-center gap-4">
          {isSaving && (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></div>
              Saving...
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Switch
              checked={showLineReader}
              onCheckedChange={setShowLineReader}
            />
            <span className="text-sm">Line Reader</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
                className={`px-[25px] py-1 rounded border flex items-center justify-center text-sm font-bold w-8 h-8 ml-2 ${crossOutMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'} transition`}
                title={crossOutMode ? 'Disable answer cross out' : 'Enable answer cross out'}
                onClick={() => setCrossOutMode((prev) => !prev)}
                aria-pressed={crossOutMode}
                style={{ textDecoration: 'line-through' }}
              >
                ABC
              </button>
            </>
          )}
        </div>
      </div>
      
      <LineReader 
        visible={showLineReader} 
        onToggle={() => setShowLineReader(false)} 
      />
      
      <Tabs defaultValue={currentModuleType} className="w-full mb-6">
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
        </TabsList>
        {currentModuleType === "reading_writing" && (
          <TabsContent value="reading_writing">
            <Card>
              <CardHeader>
                <CardTitle>Reading & Writing Questions</CardTitle>
              </CardHeader>
              <CardContent>
                {currentQuestion && currentQuestion.module_type === "reading_writing" && (
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
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {currentModuleType === "math" && (
          <TabsContent value="math">
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
                {currentQuestion && currentQuestion.module_type === "math" && (
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
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      
      <div className="flex justify-end gap-2 mt-8">
        <Button variant="outline" onClick={onPreviousQuestion} disabled={currentQuestionIndex === 0}>
          Previous Question
        </Button>
        <Button onClick={handleNext}>
          {isLastQuestion ? 'Finish Module' : 'Next Question'}
        </Button>
      </div>
      <div className="mt-8">
        <QuestionNavigator
          questions={questions}
          currentIndex={currentQuestionIndex}
          userAnswers={userAnswers}
          flaggedQuestions={flaggedQuestions}
          onQuestionClick={onGoToQuestion}
        />
      </div>
      <Dialog open={showEndModuleDialog} onOpenChange={setShowEndModuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Module?</DialogTitle>
            <DialogDescription>
              Are you sure you want to end this module and submit your answers?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndModuleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmEndModule}>
              Yes, Submit Module
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TestContainer;
