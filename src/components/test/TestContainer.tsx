
import React from "react";
import { QuestionData } from "@/components/Question";
import Question from "@/components/Question";
import ProgressBar from "@/components/ProgressBar";
import TestNavigation from "./TestNavigation";

interface TestContainerProps {
  questions: QuestionData[];
  currentQuestionIndex: number;
  userAnswers: Record<string, string>;
  onSelectOption: (optionId: string) => void;
  onPreviousQuestion: () => void;
  onNextQuestion: () => void;
  onConfirmSubmit: () => void;
}

const TestContainer: React.FC<TestContainerProps> = ({
  questions,
  currentQuestionIndex,
  userAnswers,
  onSelectOption,
  onPreviousQuestion,
  onNextQuestion,
  onConfirmSubmit,
}) => {
  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = currentQuestion ? userAnswers[currentQuestion.id] : null;

  return (
    <>
      <div className="mb-6">
        <ProgressBar current={currentQuestionIndex + 1} total={questions.length} />
      </div>
      
      {currentQuestion && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <Question
            question={currentQuestion}
            selectedOption={selectedAnswer}
            onSelectOption={onSelectOption}
          />
        </div>
      )}
      
      <TestNavigation
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={questions.length}
        onPrevious={onPreviousQuestion}
        onNext={onNextQuestion}
        onSubmit={onConfirmSubmit}
      />
    </>
  );
};

export default TestContainer;
