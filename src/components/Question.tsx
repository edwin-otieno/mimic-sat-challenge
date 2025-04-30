
import React from "react";
import { cn } from "@/lib/utils";

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
}

interface QuestionProps {
  question: QuestionData;
  selectedOption: string | null;
  onSelectOption: (optionId: string) => void;
  showExplanation?: boolean;
}

const Question = ({
  question,
  selectedOption,
  onSelectOption,
  showExplanation = false,
}: QuestionProps) => {
  const handleOptionClick = (optionId: string) => {
    onSelectOption(optionId);
  };
  
  const letters = ["A", "B", "C", "D", "E"];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <p className="text-xl font-medium mb-2">{question.text}</p>
      </div>
      <div className="space-y-3">
        {question.options.map((option, index) => (
          <label
            key={option.id}
            className={cn(
              "question-option",
              selectedOption === option.id && "selected",
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
            <span>{option.text}</span>
          </label>
        ))}
      </div>
      
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
