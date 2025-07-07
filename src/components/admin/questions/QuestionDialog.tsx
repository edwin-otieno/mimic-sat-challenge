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
  const [previewImage, setPreviewImage] = useState<string | null>(currentQuestion?.image_url || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { toast } = useToast();
  
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      text: currentQuestion?.text || '',
      explanation: currentQuestion?.explanation || '',
      module_type: currentQuestion?.module_type || 'reading_writing',
      question_type: currentQuestion?.question_type || QuestionType.MultipleChoice,
      image_url: currentQuestion?.image_url || '',
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
      setPreviewImage(currentQuestion.image_url || null);
    } else {
      console.log('Resetting form for new question');
      // Default for new question: if type is text input, no options, empty correct_answer
      const questionType = form.getValues('question_type') || QuestionType.MultipleChoice;
      const defaultValues = {
        test_id: testId,
        text: '',
        explanation: '',
        module_type: "reading_writing",
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
      console.log('Default values for new question:', defaultValues);
      form.reset(defaultValues);
      setPreviewImage(null);
    }
  }, [currentQuestion, testId, form]);

  const handleSubmit = async (values: QuestionFormValues) => {
    try {
      // If no previewImage and no imageFile, set image_url to null
      let imageUrl = values.image_url;
      if (!previewImage && !imageFile) {
        imageUrl = null;
      }
      // Handle image upload if there's a new image
      if (imageFile) {
        console.log('Uploading image file:', imageFile.name);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `question-images/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('questions')
          .upload(filePath, imageFile);

        if (uploadError) {
          console.error('Image upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('questions')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
        console.log('Image uploaded successfully:', imageUrl);
      }

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
        // Ensure correct_answer is set for text input questions
        if (!questionData.correct_answer) {
          console.error('Missing correct answer for text input question');
          toast({
            title: "Error",
            description: "Correct answer is required for text input questions",
            variant: "destructive"
          });
          return;
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
            <QuestionDetails />
            
            <QuestionImageUpload 
              previewImage={previewImage}
              setPreviewImage={setPreviewImage}
              setImageFile={setImageFile}
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
