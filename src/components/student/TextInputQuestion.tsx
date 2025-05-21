import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { QuestionData } from '@/components/Question';
import { Question } from '@/components/admin/questions/types';

interface TextInputQuestionProps {
  question: Question;
  onAnswerChange: (answer: string) => void;
  userAnswer?: string;
  isSubmitted?: boolean;
}

const TextInputQuestion: React.FC<TextInputQuestionProps> = ({
  question,
  onAnswerChange,
  userAnswer = '',
  isSubmitted = false
}) => {
  const [answer, setAnswer] = useState(userAnswer);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAnswer = e.target.value;
    setAnswer(newAnswer);
    onAnswerChange(newAnswer);
  };

  const isCorrect = isSubmitted && question.correct_answer
    ? question.correct_answer
        .split(',')
        .map(a => a.trim().toLowerCase())
        .includes(answer.trim().toLowerCase())
    : false;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <input
          type="text"
          value={answer}
          onChange={handleChange}
          className="w-full p-2 border rounded-md"
          placeholder="Type your answer here"
          disabled={isSubmitted}
        />
        
        {isSubmitted && (
          <div className={`p-2 rounded-md ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isCorrect ? (
              <p>Correct!</p>
            ) : (
              <div>
                <p>Incorrect. The correct answer(s) {question.correct_answer?.split(',').length === 1 ? 'is' : 'are'}:</p>
                <ul className="list-disc list-inside">
                  {question.correct_answer?.split(',').map((ans, index) => (
                    <li key={index}>{ans.trim()}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {isSubmitted && question.explanation && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h4 className="font-semibold mb-2">Explanation:</h4>
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: question.explanation }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TextInputQuestion; 