
import React from "react";
import { QuestionData } from "@/components/Question";
import { Button } from "@/components/ui/button";
import { Check, Flag } from "lucide-react";

interface ReviewPageProps {
  questions: QuestionData[];
  userAnswers: Record<string, string>;
  flaggedQuestions: Set<string>;
  onGoToQuestion: (index: number) => void;
  onSubmitTest: () => void;
  onCancel: () => void;
}

const ReviewPage: React.FC<ReviewPageProps> = ({
  questions,
  userAnswers,
  flaggedQuestions,
  onGoToQuestion,
  onSubmitTest,
  onCancel,
}) => {
  const answeredCount = Object.keys(userAnswers).length;
  const unansweredCount = questions.length - answeredCount;
  const flaggedCount = flaggedQuestions.size;
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Review Your Answers</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-md border">
          <div className="text-sm text-gray-500 mb-1">Total Questions</div>
          <div className="text-2xl font-bold">{questions.length}</div>
        </div>
        <div className="p-4 bg-green-50 rounded-md border border-green-100">
          <div className="text-sm text-gray-500 mb-1">Answered</div>
          <div className="text-2xl font-bold text-green-700">{answeredCount}</div>
        </div>
        <div className={`p-4 ${unansweredCount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50'} rounded-md border`}>
          <div className="text-sm text-gray-500 mb-1">Unanswered</div>
          <div className={`text-2xl font-bold ${unansweredCount > 0 ? 'text-amber-700' : ''}`}>
            {unansweredCount}
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-3">Question Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {questions.map((question, index) => {
            const isAnswered = !!userAnswers[question.id];
            const isFlagged = flaggedQuestions.has(question.id);
            
            return (
              <button
                key={question.id}
                className={`
                  p-3 rounded-md border text-center hover:bg-gray-50 transition-colors
                  ${isAnswered ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}
                  ${isFlagged ? 'ring-2 ring-amber-400' : ''}
                `}
                onClick={() => onGoToQuestion(index)}
              >
                <div className="font-medium">Question {index + 1}</div>
                <div className="flex items-center justify-center mt-1 gap-1">
                  {isAnswered && (
                    <span className="inline-flex items-center text-xs text-green-600">
                      <Check className="w-3 h-3 mr-1" /> Answered
                    </span>
                  )}
                  {!isAnswered && (
                    <span className="text-xs text-amber-600">Unanswered</span>
                  )}
                  {isFlagged && (
                    <span className="inline-flex items-center text-xs text-amber-600 ml-1">
                      <Flag className="w-3 h-3 mr-1" /> Flagged
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {unansweredCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
          <p className="text-amber-800">
            You have {unansweredCount} unanswered {unansweredCount === 1 ? 'question' : 'questions'}.
            Would you like to go back and answer them?
          </p>
        </div>
      )}
      
      {flaggedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
          <p className="text-amber-800">
            You have {flaggedCount} flagged {flaggedCount === 1 ? 'question' : 'questions'} for review.
            Would you like to go back and check them?
          </p>
        </div>
      )}
      
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={onCancel}>
          Back to Test
        </Button>
        <Button onClick={onSubmitTest}>
          Submit Test
        </Button>
      </div>
    </div>
  );
};

export default ReviewPage;
