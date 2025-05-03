
import React from "react";
import Question, { QuestionData } from "@/components/Question";

interface QuestionReviewProps {
  questions: QuestionData[];
  userAnswers: Record<string, string>;
}

const QuestionReview: React.FC<QuestionReviewProps> = ({ questions, userAnswers }) => {
  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-4">Review Your Answers</h3>
      
      <div className="space-y-8">
        {questions.map((question, index) => {
          const userAnswerId = userAnswers[question.id];
          const userSelectedOption = question.options.find(option => option.id === userAnswerId);
          const correctOption = question.options.find(option => option.isCorrect);
          
          let resultIndicator;
          if (!userAnswerId) {
            resultIndicator = (
              <div className="text-yellow-500 mb-2">
                Not answered
              </div>
            );
          } else if (userSelectedOption?.isCorrect) {
            resultIndicator = (
              <div className="text-green-600 mb-2">
                Correct
              </div>
            );
          } else {
            resultIndicator = (
              <div className="text-red-500 mb-2">
                Incorrect. The correct answer was: {
                  question.options.findIndex(o => o.isCorrect) === 0 ? "A" :
                  question.options.findIndex(o => o.isCorrect) === 1 ? "B" :
                  question.options.findIndex(o => o.isCorrect) === 2 ? "C" :
                  "D"
                }
              </div>
            );
          }
          
          return (
            <div key={question.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Question {index + 1}</h4>
                {resultIndicator}
              </div>
              
              <Question
                question={question}
                selectedOption={userAnswerId}
                onSelectOption={() => {}} // Read-only
                showExplanation={true}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionReview;
