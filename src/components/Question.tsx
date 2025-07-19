import React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { QuestionType } from '@/components/admin/questions/types';
import { TextInputQuestion } from '@/components/student/TextInputQuestion';
import { renderFormattedText } from '@/lib/utils';

export { QuestionType };

export interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface QuestionData {
  id: string;
  text: string;
  options?: QuestionOption[];
  explanation?: string;
  imageUrl?: string;
  module_type?: "reading_writing" | "math";
  question_type: QuestionType;
  correct_answer?: string;
  test_id?: string;
  question_order?: number;
}

interface QuestionProps {
  question: QuestionData;
  onAnswerChange: (answer: string) => void;
  selectedOption?: string;
  textAnswer?: string;
  onTextAnswerChange?: (value: string) => void;
  showExplanation?: boolean;
  crossedOutOptions?: string[];
  onToggleCrossOut?: (optionId: string) => void;
  crossOutMode?: boolean;
}

const Question: React.FC<QuestionProps> = ({
  question,
  onAnswerChange,
  selectedOption,
  textAnswer,
  onTextAnswerChange,
  showExplanation = false,
  crossedOutOptions = [],
  onToggleCrossOut,
  crossOutMode = false,
}) => {
  const handleOptionClick = (optionId: string) => {
    onAnswerChange(optionId);
  };
  
  const letters = ["A", "B", "C", "D", "E"];

  if (question.question_type === QuestionType.TextInput) {
    return (
      <div className="animate-fade-in">
        {question.imageUrl && (
          <div className="mb-6">
            <img 
              src={question.imageUrl} 
              alt="Question" 
              className="max-h-60 object-contain mx-auto border rounded-md"
              loading="lazy"
            />
          </div>
        )}
        <div className="mb-6">
          <div className="text-xl font-medium mb-2 whitespace-pre-wrap">
            {renderFormattedText(question.text)}
          </div>
        </div>
        <TextInputQuestion
          question={question}
          value={textAnswer}
          onChange={onTextAnswerChange}
          onAnswerChange={onAnswerChange}
          disabled={showExplanation}
          isSubmitted={showExplanation}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {question.imageUrl && (
        <div className="mb-6">
          <img 
            src={question.imageUrl} 
            alt="Question" 
            className="max-h-60 object-contain mx-auto border rounded-md"
            loading="lazy"
          />
        </div>
      )}
      <div className="mb-6">
        <div className="text-xl font-medium mb-2 whitespace-pre-wrap">
          {renderFormattedText(question.text)}
        </div>
      </div>

      <div className="space-y-3">
        {question.options?.map((option, index) => {
          const isCrossedOut = crossedOutOptions?.includes(option.id);
          
          return (
            <div key={option.id} className="relative">
              <label
                className={cn(
                  "question-option flex items-start",
                  selectedOption === option.id && "selected",
                  isCrossedOut && "opacity-60",
                  showExplanation && option.is_correct && "border-green-500 bg-green-50"
                )}
                onClick={() => handleOptionClick(option.id)}
              >
                <div className="flex items-center mt-1">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option.id}
                    checked={selectedOption === option.id}
                    onChange={() => {}}
                  />
                  <span className="question-option-letter ml-2">{letters[index]}</span>
                </div>
                <div className={cn(
                  "flex-grow ml-2",
                  isCrossedOut && "line-through"
                )}>
                  {renderFormattedText(option.text)}
                </div>
              </label>
              
              {crossOutMode && onToggleCrossOut && (
                <button 
                  type="button"
                  className={cn(
                    "absolute right-3 top-3 w-6 h-6 flex items-center justify-center rounded-full",
                    isCrossedOut ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCrossOut(option.id);
                  }}
                  title={isCrossedOut ? "Remove cross-out" : "Cross out option"}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      
      {question.explanation && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h4 className="font-semibold text-blue-800 mb-2">Explanation:</h4>
          <div className="whitespace-pre-wrap italic">
            {renderFormattedText(question.explanation)}
          </div>
        </div>
      )}
    </div>
  );
};

export default Question;
