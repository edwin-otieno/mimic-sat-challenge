
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Test } from './types';

interface DeleteTestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  test: Test | null;
  onConfirm: () => void;
}

const DeleteTestDialog: React.FC<DeleteTestDialogProps> = ({
  isOpen,
  onOpenChange,
  test,
  onConfirm
}) => {
  if (!test) return null;
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete this test?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to delete <span className="font-semibold">{test.title}</span>. 
            This action cannot be undone. All test data, questions, and results associated 
            with this test will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-red-500 hover:bg-red-600"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteTestDialog;
