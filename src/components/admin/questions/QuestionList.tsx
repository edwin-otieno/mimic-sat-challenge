
import React from 'react';
import QuestionItem from './QuestionItem';
import { Question } from './types';

interface QuestionListProps {
  questions: Question[];
  onEditQuestion: (question: Question) => void;
  onDeleteQuestion: (questionId: string) => void;
}

const QuestionList = ({ 
  questions, 
  onEditQuestion, 
  onDeleteQuestion 
}: QuestionListProps) => {
  if (questions.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-md">
        <p className="text-gray-500">No questions found. Add your first question!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {questions.map((question) => (
        <QuestionItem
          key={question.id}
          question={question}
          onEdit={onEditQuestion}
          onDelete={onDeleteQuestion}
        />
      ))}
    </div>
  );
};

export default QuestionList;
