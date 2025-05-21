import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Collapsible, 
  CollapsibleTrigger, 
  CollapsibleContent 
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { Question, QuestionType } from './types';

interface QuestionItemProps {
  question: Question;
  onEdit: (question: Question) => void;
  onDelete: (questionId: string) => void;
}

const QuestionItem = ({ question, onEdit, onDelete }: QuestionItemProps) => {
  return (
    <Collapsible className="border rounded-md">
      <CollapsibleTrigger asChild>
        <div className="p-4 flex justify-between items-center cursor-pointer">
          <div className="font-medium">{question.text}</div>
          <ChevronDown className="h-5 w-5" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 pt-0 border-t">
          <div className="space-y-4">
            {question.explanation && (
              <div>
                <span className="font-medium">Explanation:</span> {question.explanation}
              </div>
            )}
            {question.question_type === QuestionType.MultipleChoice && question.options && (
              <div>
                <span className="font-medium">Options:</span>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {question.options.map((option, index) => (
                    <li key={`${question.id}-option-${index}`} className={option.is_correct ? "text-green-600 font-medium" : ""}>
                      <div dangerouslySetInnerHTML={{ __html: option.text }} />
                      {option.is_correct && "(Correct)"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {question.question_type === QuestionType.TextInput && (
              <div>
                <span className="font-medium">Correct Answer:</span>
                <div className="mt-2 text-green-600 font-medium">
                  {question.correct_answer}
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(question)}>
                Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onDelete(question.id!)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default QuestionItem;
