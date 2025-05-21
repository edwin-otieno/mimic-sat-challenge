import React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { QuestionType } from '@/components/admin/questions/types';
import TextInputQuestion from '@/components/student/TextInputQuestion';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
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

  // Function to render text with basic formatting
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    
    // Split text into paragraphs (double line breaks)
    const paragraphs = text.split(/\n\s*\n/);
    
    return paragraphs.map((paragraph, pIndex) => {
      // Split paragraph into lines
      const lines = paragraph.split('\n');
      
      const formattedLines = lines.map((line, index) => {
        // Check if line is a list item
        if (line.trim().startsWith('- ')) {
          return (
            <li key={index} className="ml-4">
              <div dangerouslySetInnerHTML={{ __html: line.substring(2) }} />
            </li>
          );
        }
        // Check if line is a numbered list item
        if (/^\d+\.\s/.test(line)) {
          return (
            <li key={index} className="ml-4">
              <div dangerouslySetInnerHTML={{ __html: line.substring(line.indexOf('.') + 2) }} />
            </li>
          );
        }
        // Regular text with HTML formatting
        return <div key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: line }} />;
      });

      // Wrap list items in a ul element if needed
      const hasListItems = lines.some(line => 
        line.trim().startsWith('- ') || /^\d+\.\s/.test(line)
      );

      if (hasListItems) {
        return <ul key={pIndex} className="mb-4">{formattedLines}</ul>;
      }

      return <div key={pIndex} className="mb-4">{formattedLines}</div>;
    });
  };

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
          value={textAnswer}
          onChange={onTextAnswerChange}
          disabled={showExplanation}
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
                  showExplanation && option.isCorrect && "border-green-500 bg-green-50"
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
      
      {showExplanation && question.explanation && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h4 className="font-semibold text-blue-800 mb-2">Explanation:</h4>
          <div className="whitespace-pre-wrap">
            {renderFormattedText(question.explanation)}
          </div>
        </div>
      )}
    </div>
  );
};

export default Question;
