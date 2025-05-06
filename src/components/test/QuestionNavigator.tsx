
import React from "react";
import { QuestionData } from "@/components/Question";
import { cn } from "@/lib/utils";
import { Check, Flag } from "lucide-react";

interface QuestionNavigatorProps {
  questions: QuestionData[];
  currentIndex: number;
  userAnswers: Record<string, string>;
  flaggedQuestions: Set<string>;
  onQuestionClick: (index: number) => void;
}

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  questions,
  currentIndex,
  userAnswers,
  flaggedQuestions,
  onQuestionClick,
}) => {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="text-sm font-medium mb-3">Question Navigator</h3>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => {
          const isAnswered = !!userAnswers[question.id];
          const isFlagged = flaggedQuestions.has(question.id);
          const isCurrent = index === currentIndex;
          
          return (
            <button
              key={question.id}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-md border text-sm font-medium transition-colors",
                isCurrent && "ring-2 ring-primary ring-offset-2",
                isAnswered ? "bg-green-100 border-green-300" : "bg-gray-50",
                isFlagged && "bg-amber-100 border-amber-300"
              )}
              onClick={() => onQuestionClick(index)}
            >
              <span className="relative">
                {index + 1}
                {isAnswered && (
                  <Check className="absolute -top-1 -right-2 w-3 h-3 text-green-600" />
                )}
                {isFlagged && (
                  <Flag className="absolute -bottom-1 -right-2 w-3 h-3 text-amber-600" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionNavigator;
