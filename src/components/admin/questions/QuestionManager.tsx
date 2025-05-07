
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { z } from 'zod';
import { Question, QuestionType } from './types';
import QuestionDialog from './QuestionDialog';
import QuestionList from './QuestionList';
import { saveQuestion, deleteQuestion } from '@/services/testService';
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch questions from database
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        
        // Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('test_questions')
          .select('*')
          .eq('test_id', testId);
          
        if (questionsError) {
          toast({ 
            title: "Error", 
            description: `Failed to load questions: ${questionsError.message}`,
            variant: "destructive" 
          });
          return;
        }
        
        // Fetch options for all questions
        const { data: optionsData, error: optionsError } = await supabase
          .from('test_question_options')
          .select('*')
          .in('question_id', questionsData.map(q => q.id));
          
        if (optionsError) {
          toast({ 
            title: "Error", 
            description: `Failed to load question options: ${optionsError.message}`,
            variant: "destructive" 
          });
          return;
        }
        
        // Group options by question
        const optionsByQuestion: Record<string, any[]> = {};
        optionsData.forEach(option => {
          if (!optionsByQuestion[option.question_id]) {
            optionsByQuestion[option.question_id] = [];
          }
          optionsByQuestion[option.question_id].push(option);
        });
        
        // Map questions with their options
        const loadedQuestions = questionsData.map(question => ({
          id: question.id,
          test_id: question.test_id,
          text: question.text,
          explanation: question.explanation,
          module_type: question.module_type as "reading_writing" | "math",
          question_type: question.question_type as QuestionType,
          image_url: question.image_url,
          options: (optionsByQuestion[question.id] || []).map(option => ({
            id: option.id,
            text: option.text,
            is_correct: option.is_correct
          }))
        }));
        
        setQuestions(loadedQuestions);
      } catch (error: any) {
        toast({ 
          title: "Error", 
          description: `Failed to load questions: ${error.message}`,
          variant: "destructive" 
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestions();
  }, [testId, toast]);

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

  const handleSubmit = async (values: z.infer<typeof questionFormSchema>) => {
    try {
      // Make sure the test_id, module_type, and text are properly set
      const questionData = {
        ...values,
        test_id: testId,
        text: values.text, // Explicitly ensure text is set
        module_type: values.module_type || "reading_writing" as const,
        question_type: values.question_type || QuestionType.MultipleChoice
      };
      
      // Save to database
      const savedQuestion = await saveQuestion(questionData);
      
      if (isEditing && currentQuestion) {
        // Update existing question in local state
        const updatedQuestions = questions.map(q => {
          if (q.id === currentQuestion.id) {
            return { 
              ...questionData, 
              id: currentQuestion.id
            } as Question;
          }
          return q;
        });
        
        setQuestions(updatedQuestions);
        toast({ title: "Success", description: "Question updated successfully" });
      } else {
        // Create new question in local state
        const newQuestion: Question = {
          ...questionData,
          id: savedQuestion.id
        };
        
        setQuestions([...questions, newQuestion]);
        toast({ title: "Success", description: "Question created successfully" });
      }
      
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['questions', testId] });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "An error occurred", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await deleteQuestion(questionId);
      setQuestions(questions.filter(q => q.id !== questionId));
      toast({ title: "Success", description: "Question deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['questions', testId] });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "An error occurred", 
        variant: "destructive" 
      });
    }
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

      {loading ? (
        <div className="text-center py-8 bg-gray-50 rounded-md">
          <p className="text-gray-500">Loading questions...</p>
        </div>
      ) : (
        <QuestionList 
          questions={questions} 
          onEditQuestion={handleOpenDialog}
          onDeleteQuestion={handleDeleteQuestion}
        />
      )}

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
