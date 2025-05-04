
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { z } from 'zod';
import { Test } from './types';
import TestForm, { formSchema } from './TestForm';

interface TestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  currentTest: Test | null;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  questionCount?: number;
}

const TestDialog: React.FC<TestDialogProps> = ({ 
  isOpen, 
  onOpenChange, 
  isEditing, 
  currentTest, 
  onSubmit,
  questionCount = 10 // Default question count if not provided
}) => {
  
  const handleCloseDialog = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Test' : 'Create New Test'}</DialogTitle>
        </DialogHeader>
        <TestForm 
          currentTest={currentTest}
          onSubmit={onSubmit}
          onCancel={handleCloseDialog}
          questionCount={questionCount}
        />
      </DialogContent>
    </Dialog>
  );
};

export default TestDialog;
