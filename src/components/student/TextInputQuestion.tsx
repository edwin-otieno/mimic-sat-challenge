import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { QuestionData } from '@/components/Question';

interface TextInputQuestionProps {
  question: QuestionData;
  value?: string;
  onChange?: (value: string) => void;
  onAnswerChange?: (value: string) => void;
  disabled?: boolean;
  isSubmitted?: boolean;
}

export const TextInputQuestion: React.FC<TextInputQuestionProps> = ({
  question,
  value,
  onChange,
  onAnswerChange,
  disabled = false,
  isSubmitted = false
}) => {
  const [answer, setAnswer] = useState(value || '');

  useEffect(() => {
    if (value !== undefined) {
      setAnswer(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setAnswer(newValue);
    onChange?.(newValue);
    onAnswerChange?.(newValue);
  };

  return (
    <div className="space-y-4">
      <Input
        type="text"
        value={answer}
        onChange={handleChange}
        placeholder="Enter your answer"
        disabled={disabled}
        className="w-full"
      />
      {isSubmitted && question.correct_answer && (
        <div className="mt-2 text-sm">
          <span className="font-medium">Correct answer: </span>
          {question.correct_answer}
        </div>
      )}
    </div>
  );
}; 