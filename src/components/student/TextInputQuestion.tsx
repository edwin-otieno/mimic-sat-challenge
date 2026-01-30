import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { EssayTextareaWithPages } from '@/components/EssayTextareaWithPages';
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
  const isEssay = question.module_type === 'writing';

  useEffect(() => {
    if (value !== undefined) {
      setAnswer(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setAnswer(newValue);
    onChange?.(newValue);
    onAnswerChange?.(newValue);
  };

  const isCorrect = isSubmitted && question.correct_answer
    ? question.correct_answer
        .split(';')
        .map(a => a.trim().toLowerCase())
        .some(correctAnswer => {
          const userAnswer = answer.trim().toLowerCase();
          return userAnswer === correctAnswer;
        })
    : false;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && isEssay) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = answer.substring(0, start) + '  ' + answer.substring(end);
      setAnswer(newValue);
      onChange?.(newValue);
      onAnswerChange?.(newValue);
      // Set cursor position after the inserted tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="space-y-4">
      {isEssay ? (
        <EssayTextareaWithPages
          value={answer}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Write your essay here..."
          disabled={disabled}
          className="w-full min-h-[400px] text-xl"
        />
      ) : (
        <Input
          type="text"
          value={answer}
          onChange={handleChange}
          placeholder="Enter your answer"
          disabled={disabled}
          className="w-full"
        />
      )}
      {isSubmitted && (
        <div className={`mt-2 p-3 rounded-md ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <div className="mb-2">
            <span className="font-medium">Your answer: </span>
            {answer || '(no answer provided)'}
          </div>
          {question.correct_answer && (
            <div>
              <p className="font-medium">Correct answer{question.correct_answer.split(';').length === 1 ? ' is' : 's are'}:</p>
              <ul className="list-disc list-inside mt-1">
                {question.correct_answer.split(';').map((ans, index) => (
                  <li key={index}>{ans.trim()}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 