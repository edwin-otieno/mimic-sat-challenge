
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
import { ScrollArea } from '@/components/ui/scroll-area';

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
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Test' : 'Create New Test'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[calc(85vh-120px)] pr-4">
          <TestForm 
            currentTest={currentTest}
            onSubmit={onSubmit}
            onCancel={handleCloseDialog}
            questionCount={questionCount}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TestDialog;
