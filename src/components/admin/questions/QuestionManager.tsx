
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { z } from 'zod';
import { Question, QuestionType } from './types';
import QuestionDialog from './QuestionDialog';
import QuestionList from './QuestionList';

// Create sample questions for now
const createSampleQuestions = (testId: string): Question[] => [
  {
    id: '1',
    test_id: testId,
    text: 'What is 2+2?',
    explanation: 'Basic addition',
    options: [
      { id: '1', text: '3', is_correct: false },
      { id: '2', text: '4', is_correct: true },
      { id: '3', text: '5', is_correct: false }
    ],
    question_type: QuestionType.MultipleChoice,
    module_type: "math"
  },
  {
    id: '2',
    test_id: testId,
    text: 'What is the capital of France?',
    explanation: 'Geography question',
    options: [
      { id: '4', text: 'London', is_correct: false },
      { id: '5', text: 'Paris', is_correct: true },
      { id: '6', text: 'Berlin', is_correct: false }
    ],
    question_type: QuestionType.MultipleChoice,
    module_type: "reading_writing"
  }
];

interface QuestionManagerProps {
  testId: string;
  testTitle: string;
}

const questionFormSchema = z.object({
  id: z.string().optional(),
  test_id: z.string(),
  text: z.string().min(3, { message: "Question text must be at least 3 characters" }),
  explanation: z.string().optional(),
  options: z.array(
    z.object({
      id: z.string().optional(),
      text: z.string().min(1, { message: "Option text is required" }),
      is_correct: z.boolean().default(false)
    })
  ).min(2, { message: "At least 2 options are required" })
  .refine((options) => options.some(option => option.is_correct), {
    message: "At least one option must be marked as correct",
  }),
  module_type: z.enum(["reading_writing", "math"]).default("reading_writing"),
  question_type: z.enum([QuestionType.MultipleChoice, QuestionType.TextInput]).default(QuestionType.MultipleChoice),
  image_url: z.string().optional()
});

const QuestionManager = ({ testId, testTitle }: QuestionManagerProps) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  // Initialize with sample questions
  useEffect(() => {
    const sampleQuestions = createSampleQuestions(testId);
    setQuestions(sampleQuestions);
  }, [testId]);

  const handleOpenDialog = (question?: Question) => {
    if (question) {
      setIsEditing(true);
      setCurrentQuestion(question);
    } else {
      setIsEditing(false);
      setCurrentQuestion(null);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (values: z.infer<typeof questionFormSchema>) => {
    try {
      if (isEditing && currentQuestion) {
        // Update existing question in local state
        const updatedQuestions = questions.map(q => {
          if (q.id === currentQuestion.id) {
            return { 
              ...values, 
              id: currentQuestion.id,
              test_id: testId,
              text: values.text,
              options: values.options.map(option => ({
                ...option,
                id: option.id || Math.random().toString(36).substr(2, 9),
                text: option.text,
                is_correct: option.is_correct
              })),
              question_type: values.question_type,
              module_type: values.module_type,
              image_url: values.image_url
            } as Question;
          }
          return q;
        });
        
        setQuestions(updatedQuestions);
        toast({ title: "Success", description: "Question updated successfully" });
      } else {
        // Create new question in local state
        const newQuestion: Question = {
          ...values,
          id: Math.random().toString(36).substr(2, 9), // Generate a random ID
          test_id: testId,
          text: values.text,
          question_type: values.question_type,
          module_type: values.module_type,
          options: values.options.map(option => ({
            ...option,
            id: option.id || Math.random().toString(36).substr(2, 9),
            text: option.text,
            is_correct: option.is_correct
          }))
        };
        
        setQuestions([...questions, newQuestion]);
        toast({ title: "Success", description: "Question created successfully" });
      }
      
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "An error occurred", 
        variant: "destructive" 
      });
    }
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
    toast({ title: "Success", description: "Question deleted successfully" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-md font-medium">Questions for: {testTitle}</h3>
        <Button onClick={() => handleOpenDialog()} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </div>

      <QuestionList 
        questions={questions} 
        onEditQuestion={handleOpenDialog}
        onDeleteQuestion={deleteQuestion}
      />

      <QuestionDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isEditing={isEditing}
        currentQuestion={currentQuestion}
        testId={testId}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default QuestionManager;
