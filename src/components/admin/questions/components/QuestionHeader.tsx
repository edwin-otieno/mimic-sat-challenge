
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

interface QuestionHeaderProps {
  testTitle: string;
  onAddQuestion: () => void;
}

const QuestionHeader = ({ testTitle, onAddQuestion }: QuestionHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <h3 className="text-md font-medium">Questions for: {testTitle}</h3>
      <Button onClick={onAddQuestion} size="sm">
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Question
      </Button>
    </div>
  );
};

export default QuestionHeader;
