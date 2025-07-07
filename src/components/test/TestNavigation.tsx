import React from "react";
import { Button } from "@/components/ui/button";

interface TestNavigationProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  showSubmitButton?: boolean;
}

const TestNavigation: React.FC<TestNavigationProps> = ({
  currentQuestionIndex,
  totalQuestions,
  onPrevious,
  onNext,
  onSubmit,
  showSubmitButton = false,
}) => {
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  return (
    <div className="flex justify-between items-center">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={isFirstQuestion}
      >
        Previous
      </Button>
      
      {isLastQuestion && showSubmitButton ? (
        <Button onClick={onSubmit}>
          Submit Module
        </Button>
      ) : (
        <Button onClick={onNext}>
          Next Question
        </Button>
      )}
    </div>
  );
};

export default TestNavigation;
