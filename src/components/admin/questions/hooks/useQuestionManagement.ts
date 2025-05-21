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
  ).optional(),
  module_type: z.enum(["reading_writing", "math"]).default("reading_writing"),
  question_type: z.enum([QuestionType.MultipleChoice, QuestionType.TextInput]).default(QuestionType.MultipleChoice),
  image_url: z.string().optional(),
  correct_answer: z.string().optional()
}).superRefine((data, ctx) => {
  // Validate options for multiple choice questions
  if (data.question_type === QuestionType.MultipleChoice) {
    if (!data.options || data.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Multiple choice questions must have at least 2 options",
        path: ["options"]
      });
    } else if (!data.options.some(option => option.is_correct)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Multiple choice questions must have one correct option",
        path: ["options"]
      });
    }
  }

  // Validate correct_answer for text input questions
  if (data.question_type === QuestionType.TextInput) {
    if (!data.correct_answer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one correct answer is required for text input questions",
        path: ["correct_answer"]
      });
    } else {
      // Split by comma and trim each answer
      const answers = data.correct_answer.split(',').map(a => a.trim());
      if (answers.some(a => !a)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Empty answers are not allowed. Please separate answers with commas.",
          path: ["correct_answer"]
        });
      }
    }
  }
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
          .eq('test_id', testId)
          .order('question_order', { ascending: true });
          
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
        const loadedQuestions = questionsData
          .sort((a, b) => (a.question_order || 0) - (b.question_order || 0))
          .map(question => ({
            id: question.id,
            test_id: question.test_id,
            text: question.text,
            explanation: question.explanation,
            module_type: question.module_type as "reading_writing" | "math",
            question_type: question.question_type as QuestionType,
            image_url: question.image_url,
            correct_answer: question.correct_answer,
            options: (optionsByQuestion[question.id] || []).map(option => ({
              id: option.id,
              text: option.text,
              is_correct: option.is_correct
            })),
            question_order: question.question_order
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
        text: values.text,
        module_type: values.module_type || "reading_writing" as const,
        question_type: values.question_type || QuestionType.MultipleChoice,
        // Only include options for multiple choice questions
        ...(values.question_type === QuestionType.MultipleChoice ? {
          options: values.options?.map(option => ({
            id: option.id || undefined,
            text: option.text || "",
            is_correct: option.is_correct || false
          }))
        } : {
          correct_answer: values.correct_answer
        })
      };
      
      // Save to database
      const savedQuestion = await saveQuestion({
        ...questionData,
        question_order: values.id 
          ? questions.find(q => q.id === values.id)?.question_order 
          : undefined // Let the backend handle new question order
      });
      
      if (values.id) {
        // Update existing question in local state
        const updatedQuestions = questions.map(q => {
          if (q.id === values.id) {
            return { 
              ...questionData, 
              id: values.id,
              question_order: savedQuestion.question_order,
              created_at: q.created_at
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
          question_order: savedQuestion.question_order,
          created_at: new Date().toISOString()
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
