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
}) => {
  const [showLineReader, setShowLineReader] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [showExplanation, setShowExplanation] = useState(false);

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

  // Group questions by module type
  const readingWritingQuestions = questions.filter(q => q.module_type === "reading_writing");
  const mathQuestions = questions.filter(q => q.module_type === "math");

  // Find the current module type
  const currentModuleType = currentQuestion?.module_type || "reading_writing";

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
    setTextAnswer("");
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

  return (
    <>
      <div className="mb-6">
        <ProgressBar current={currentQuestionIndex + 1} total={questions.length} />
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Practice Test</h2>
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
        
        {currentQuestion && (
          <Button
            variant={isQuestionFlagged ? "destructive" : "outline"}
            size="sm"
            onClick={() => onToggleFlag(currentQuestion.id)}
          >
            <Flag className="mr-1 h-4 w-4" />
            {isQuestionFlagged ? "Unflag Question" : "Flag for Review"}
          </Button>
        )}
      </div>
      
      <LineReader 
        visible={showLineReader} 
        onToggle={() => setShowLineReader(false)} 
      />
      
      <Tabs defaultValue={currentModuleType} className="w-full mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="reading_writing">
            Reading & Writing ({readingWritingQuestions.length} questions)
          </TabsTrigger>
          <TabsTrigger value="math">
            Math ({mathQuestions.length} questions)
          </TabsTrigger>
        </TabsList>
        
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
                  onToggleCrossOut={(optionId) => onToggleCrossOut(currentQuestion.id, optionId)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
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
                  onToggleCrossOut={(optionId) => onToggleCrossOut(currentQuestion.id, optionId)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <TestNavigation
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={questions.length}
        onPrevious={onPreviousQuestion}
        onNext={onNextQuestion}
        showSubmitButton={showSubmitButton}
        onSubmit={onSubmit}
      />
      
      <div className="mt-8">
        <QuestionNavigator
          questions={questions}
          currentIndex={currentQuestionIndex}
          userAnswers={userAnswers}
          flaggedQuestions={flaggedQuestions}
          onQuestionClick={onGoToQuestion}
        />
      </div>
    </>
  );
};

export default TestContainer;
