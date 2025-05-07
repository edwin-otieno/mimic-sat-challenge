
import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Question, QuestionType } from './types';
import { questionFormSchema, QuestionFormValues } from './schema';
import QuestionDetails from './components/QuestionDetails';
import MultipleChoiceOptions from './components/MultipleChoiceOptions';
import TextInputAnswer from './components/TextInputAnswer';
import QuestionImageUpload from './components/QuestionImageUpload';

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
  
  // Get default question type
  const getDefaultQuestionType = () => {
    if (currentQuestion?.question_type) {
      return currentQuestion.question_type;
    }
    return QuestionType.MultipleChoice;
  };
  
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      test_id: testId,
      text: currentQuestion?.text || '',
      explanation: currentQuestion?.explanation || '',
      options: currentQuestion?.options || [
        { text: '', is_correct: false },
        { text: '', is_correct: false }
      ],
      module_type: currentQuestion?.module_type || "reading_writing",
      question_type: getDefaultQuestionType(),
      id: currentQuestion?.id,
      module_id: currentQuestion?.module_id,
      correct_answer: currentQuestion?.correct_answer || '',
    }
  });

  const questionType = form.watch('question_type');

  const handleSubmit = async (values: QuestionFormValues) => {
    // Combine the form values with the image URL
    const questionData = {
      ...values,
      image_url: previewImage
    };
    
    onSubmit(questionData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Question' : 'Create New Question'}</DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            {/* Question details (module, type, text, explanation) */}
            <QuestionDetails />
            
            {/* Image upload */}
            <QuestionImageUpload 
              previewImage={previewImage}
              setPreviewImage={setPreviewImage}
              setImageFile={setImageFile}
            />
            
            {/* Question answer components based on type */}
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
