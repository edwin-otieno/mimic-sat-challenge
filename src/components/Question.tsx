
import React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionData {
  id: string;
  text: string;
  options: QuestionOption[];
  explanation?: string;
  imageUrl?: string;
  questionType?: "multiple_choice" | "text_input";
  module_type?: "reading_writing" | "math"; // Module type property
}

interface QuestionProps {
  question: QuestionData;
  selectedOption: string | null;
  onSelectOption: (optionId: string) => void;
  showExplanation?: boolean;
  textAnswer?: string;
  onTextAnswerChange?: (value: string) => void;
  crossedOutOptions?: string[];
  onToggleCrossOut?: (optionId: string) => void;
}

const Question = ({
  question,
  selectedOption,
  onSelectOption,
  showExplanation = false,
  textAnswer = "",
  onTextAnswerChange,
  crossedOutOptions = [],
  onToggleCrossOut,
}: QuestionProps) => {
  const handleOptionClick = (optionId: string) => {
    onSelectOption(optionId);
  };
  
  const letters = ["A", "B", "C", "D", "E"];

  const isTextInput = question.questionType === "text_input";

  return (
    <div className="animate-fade-in">
      {question.imageUrl && (
        <div className="mb-6">
          <img 
            src={question.imageUrl} 
            alt="Question" 
            className="max-h-60 object-contain mx-auto border rounded-md"
          />
        </div>
      )}
      <div className="mb-6">
        <p className="text-xl font-medium mb-2">{question.text}</p>
      </div>

      {!isTextInput ? (
        // Multiple choice options
        <div className="space-y-3">
          {question.options.map((option, index) => {
            const isCrossedOut = crossedOutOptions?.includes(option.id);
            
            return (
              <div key={option.id} className="relative">
                <label
                  className={cn(
                    "question-option flex items-center",
                    selectedOption === option.id && "selected",
                    isCrossedOut && "opacity-60",
                    showExplanation && option.isCorrect && "border-green-500 bg-green-50"
                  )}
                  onClick={() => handleOptionClick(option.id)}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option.id}
                    checked={selectedOption === option.id}
                    onChange={() => {}}
                  />
                  <span className="question-option-letter">{letters[index]}</span>
                  <span className={cn(isCrossedOut && "line-through")}>{option.text}</span>
                </label>
                
                {onToggleCrossOut && (
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
      ) : (
        // Text input for math questions
        <div className="mt-4">
          <input
            type="text"
            value={textAnswer}
            onChange={(e) => onTextAnswerChange?.(e.target.value)}
            placeholder="Enter your answer..."
            className="w-full px-4 py-2 border rounded-md"
          />
        </div>
      )}
      
      {showExplanation && question.explanation && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h4 className="font-semibold text-blue-800 mb-2">Explanation:</h4>
          <p>{question.explanation}</p>
        </div>
      )}
    </div>
  );
};

export default Question;
