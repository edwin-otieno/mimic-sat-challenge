
import React from "react";
import { Button } from "@/components/ui/button";

interface TestNavigationProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

const TestNavigation: React.FC<TestNavigationProps> = ({
  currentQuestionIndex,
  totalQuestions,
  onPrevious,
  onNext,
  onSubmit,
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
      
      {isLastQuestion ? (
        <Button onClick={onSubmit}>
          Submit Test
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
