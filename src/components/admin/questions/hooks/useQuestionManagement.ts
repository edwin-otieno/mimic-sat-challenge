
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Question, QuestionType } from '../types';
import { saveQuestion, deleteQuestion } from '@/services/testService';
import { supabase } from "@/integrations/supabase/client";

// Schema for question form validation
export const questionFormSchema = z.object({
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

export const useQuestionManagement = (testId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState<Question[]>([]);
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

  const handleSubmitQuestion = async (values: z.infer<typeof questionFormSchema>) => {
    try {
      // Make sure all required fields are properly set
      const questionData = {
        ...values,
        test_id: testId,
        text: values.text, // Explicitly ensure text is set
        module_type: values.module_type || "reading_writing" as const,
        question_type: values.question_type || QuestionType.MultipleChoice,
        // Ensure options meet the QuestionOption interface requirements
        options: values.options ? values.options.map(option => ({
          id: option.id || undefined,
          text: option.text || "", // Ensure text is always provided
          is_correct: option.is_correct || false
        })) : []
      };
      
      // Save to database
      const savedQuestion = await saveQuestion(questionData);
      
      if (values.id) {
        // Update existing question in local state
        const updatedQuestions = questions.map(q => {
          if (q.id === values.id) {
            return { 
              ...questionData, 
              id: values.id
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
          id: savedQuestion.id,
          options: questionData.options as Question['options'] // Ensure type compatibility
        };
        
        setQuestions([...questions, newQuestion]);
        toast({ title: "Success", description: "Question created successfully" });
      }
      
      queryClient.invalidateQueries({ queryKey: ['questions', testId] });
      return true;
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "An error occurred", 
        variant: "destructive" 
      });
      return false;
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await deleteQuestion(questionId);
      setQuestions(questions.filter(q => q.id !== questionId));
      toast({ title: "Success", description: "Question deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['questions', testId] });
      return true;
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "An error occurred", 
        variant: "destructive" 
      });
      return false;
    }
  };

  return {
    questions,
    loading,
    handleSubmitQuestion,
    handleDeleteQuestion
  };
};
