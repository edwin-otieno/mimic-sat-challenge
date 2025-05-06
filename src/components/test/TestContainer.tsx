
import React, { useState } from "react";
import { QuestionData } from "@/components/Question";
import Question from "@/components/Question";
import ProgressBar from "@/components/ProgressBar";
import TestNavigation from "./TestNavigation";
import LineReader from "./LineReader";
import { Button } from "@/components/ui/button";
import { Flag, Check } from "lucide-react";
import QuestionNavigator from "./QuestionNavigator";

interface TestContainerProps {
  questions: QuestionData[];
  currentQuestionIndex: number;
  userAnswers: Record<string, string>;
  onSelectOption: (optionId: string) => void;
  onPreviousQuestion: () => void;
  onNextQuestion: () => void;
  onConfirmSubmit: () => void;
  onGoToQuestion: (index: number) => void;
  flaggedQuestions: Set<string>;
  onToggleFlag: (questionId: string) => void;
  crossedOutOptions: Record<string, string[]>;
  onToggleCrossOut: (questionId: string, optionId: string) => void;
  onOpenReviewPage: () => void;
}

const TestContainer: React.FC<TestContainerProps> = ({
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
}) => {
  const [showLineReader, setShowLineReader] = useState(false);
  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = currentQuestion ? userAnswers[currentQuestion.id] : null;
  const isQuestionFlagged = currentQuestion ? flaggedQuestions.has(currentQuestion.id) : false;
  const questionCrossedOuts = currentQuestion ? crossedOutOptions[currentQuestion.id] || [] : [];

  return (
    <>
      <div className="mb-6">
        <ProgressBar current={currentQuestionIndex + 1} total={questions.length} />
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowLineReader(!showLineReader)}
        >
          {showLineReader ? "Hide Line Reader" : "Show Line Reader"}
        </Button>
        
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
      
      {currentQuestion && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <Question
            question={currentQuestion}
            selectedOption={selectedAnswer}
            onSelectOption={onSelectOption}
            crossedOutOptions={questionCrossedOuts}
            onToggleCrossOut={(optionId) => onToggleCrossOut(currentQuestion.id, optionId)}
          />
        </div>
      )}
      
      <TestNavigation
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={questions.length}
        onPrevious={onPreviousQuestion}
        onNext={onNextQuestion}
        onSubmit={onOpenReviewPage}
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
