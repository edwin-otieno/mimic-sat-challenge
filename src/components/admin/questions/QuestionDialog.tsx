import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Question, QuestionType } from './types';
import { questionFormSchema, QuestionFormValues } from './schema';
import QuestionDetails from './components/QuestionDetails';
import { useTests } from '@/hooks/useTests';
import { DEFAULT_SAT_MODULES, DEFAULT_ACT_MODULES } from '../tests/types';
import MultipleChoiceOptions from './components/MultipleChoiceOptions';
import TextInputAnswer from './components/TextInputAnswer';
import QuestionImageUpload from './components/QuestionImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QuestionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  currentQuestion: Question | null;
  testId: string;
  onSubmit: (values: QuestionFormValues) => void;
}

const QuestionDialog = ({
  isOpen,
  onOpenChange,
  isEditing,
  currentQuestion,
  testId,
  onSubmit
}: QuestionDialogProps) => {
  // Load the test to determine category and available modules for the dropdown
  const { tests } = useTests();
  const currentTest = tests.find(test => test.id === testId);
  const testCategory = currentTest?.test_category || 'SAT';
  const availableModules = testCategory === 'ACT' ? DEFAULT_ACT_MODULES : DEFAULT_SAT_MODULES;
  const testDataLoading = false; // We have the test data from the tests list
  
  console.log('=== QUESTION DIALOG DEBUG ===');
  console.log('testId:', testId);
  console.log('currentTest:', currentTest);
  console.log('testCategory:', testCategory);
  console.log('availableModules:', availableModules);
  console.log('=== END QUESTION DIALOG DEBUG ===');

  const [previewImage, setPreviewImage] = useState<string | null>(currentQuestion?.imageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { toast } = useToast();
  
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      text: currentQuestion?.text || '',
      explanation: currentQuestion?.explanation || '',
      module_type: currentQuestion?.module_type || 'reading_writing',
      question_type: currentQuestion?.question_type || QuestionType.MultipleChoice,
      image_url: currentQuestion?.imageUrl || '',
      correct_answer: currentQuestion?.correct_answer || '',
      options: currentQuestion?.options || [
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false }
      ]
    }
  });

  const questionType = form.watch('question_type');
  const moduleType = form.watch('module_type');

  // Watch for question type changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'question_type') {
        console.log('Question type changed to:', value.question_type);
        // Reset options or correct_answer based on question type
        if (value.question_type === QuestionType.TextInput) {
          form.setValue('options', undefined);
          form.setValue('correct_answer', '');
        } else {
          form.setValue('correct_answer', undefined);
          form.setValue('options', [
            { text: '', is_correct: false },
            { text: '', is_correct: false }
          ]);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Reset form with correct module type when test data is available
  useEffect(() => {
    if (availableModules && availableModules.length > 0 && !currentQuestion) {
      console.log('Test data available, resetting form with correct module type');
      const questionType = form.getValues('question_type') || QuestionType.MultipleChoice;
      const defaultModuleType = availableModules[0].type;
      const defaultValues = {
        test_id: testId,
        text: '',
        explanation: '',
        module_type: defaultModuleType,
        question_type: questionType,
        id: undefined,
        module_id: undefined,
        correct_answer: questionType === QuestionType.TextInput ? '' : undefined,
        image_url: null,
        options: questionType === QuestionType.MultipleChoice ? [
          { text: '', is_correct: false },
          { text: '', is_correct: false }
        ] : undefined
      };
      console.log('Resetting form with test data available:', defaultValues);
      form.reset(defaultValues);
    }
  }, [availableModules, currentQuestion, testId, form]);

  // Keep module dropdown aligned with test category
  useEffect(() => {
    if (!availableModules || availableModules.length === 0) return;
    const allowedTypes = new Set(availableModules.map(m => m.type));
    if (!moduleType || !allowedTypes.has(moduleType as any)) {
      // Set to the first available module for this test category
      console.log('Setting module_type to:', availableModules[0].type, 'for test category:', testCategory);
      form.setValue('module_type', availableModules[0].type as any, { shouldDirty: true });
    }
  }, [availableModules, moduleType, form, testCategory]);

  // Reset form when currentQuestion changes
  useEffect(() => {
    if (currentQuestion) {
      console.log('Resetting form with current question:', currentQuestion);
      const formData = {
        ...currentQuestion,
        options: currentQuestion.question_type === QuestionType.MultipleChoice 
          ? currentQuestion.options || [
              { text: '', is_correct: false },
              { text: '', is_correct: false }
            ]
          : undefined,
        correct_answer: currentQuestion.correct_answer || '',
        explanation: currentQuestion.explanation || ''
      };
      form.reset(formData);
      setPreviewImage(currentQuestion.imageUrl || null);
    } else {
      console.log('Resetting form for new question');
      // Let the other effect handle the form reset with correct module type
      console.log('Test data available, letting other effect handle form reset');
      setPreviewImage(null);
    }
  }, [currentQuestion, testId, form, availableModules]);

  const handleSubmit = async (values: QuestionFormValues) => {
    try {
      // Image is now uploaded immediately when selected, so image_url should already be set
      // Use the form value directly (it should contain the URL if an image was uploaded)
      const imageUrl = values.image_url || null;

      // Prepare the question data
      const questionData = {
        ...values,
        image_url: imageUrl,
        explanation: values.explanation || null
      };

      // Remove options if it's a text input question
      if (values.question_type === QuestionType.TextInput) {
        console.log('Processing text input question');
        delete questionData.options;
        // Essay questions (writing module) don't need a correct_answer since they're manually graded
        if (values.module_type === 'writing') {
          // For essay questions, set correct_answer to null
          questionData.correct_answer = null;
        } else {
          // Ensure correct_answer is set for other text input questions (e.g., math)
          if (!questionData.correct_answer) {
            console.error('Missing correct answer for text input question');
            toast({
              title: "Error",
              description: "Correct answer is required for text input questions",
              variant: "destructive"
            });
            return;
          }
        }
      } else {
        console.log('Processing multiple choice question');
        // Remove correct_answer for multiple choice
        delete questionData.correct_answer;
      }

      console.log('Final question data to submit:', JSON.stringify(questionData, null, 2));
      onSubmit(questionData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting question:', error);
      toast({
        title: "Error",
        description: "Failed to save question. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Question' : 'Create New Question'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Edit the details of your existing question.' : 'Fill in the details to create a new question.'}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <QuestionDetails availableModules={availableModules} />
            
            <QuestionImageUpload 
              previewImage={previewImage}
              setPreviewImage={setPreviewImage}
              setImageFile={setImageFile}
              onImageUrlChange={(url) => {
                // Update form field with the uploaded URL immediately
                form.setValue('image_url', url || '');
              }}
            />
            
            {questionType === QuestionType.MultipleChoice && <MultipleChoiceOptions />}
            {questionType === QuestionType.TextInput && <TextInputAnswer />}
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">{isEditing ? 'Save Changes' : 'Create Question'}</Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionDialog;
