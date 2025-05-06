
import React from 'react';
import { z } from 'zod';
import { Test } from './types';
import TestDialog from './TestDialog';
import DeleteTestDialog from './DeleteTestDialog';
import { formSchema } from './TestForm';
import { useTestOperations } from './TestOperationsProvider';
import { useTests } from '@/hooks/useTests';

interface TestDialogManagerProps {
  questionCount?: number;
}

const TestDialogManager: React.FC<TestDialogManagerProps> = ({ 
  questionCount = 10 // Default question count
}) => {
  const { 
    isEditing, 
    currentTest, 
    isDialogOpen, 
    setIsDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    testToDelete
  } = useTestOperations();
  
  const { updateTest, createTest, deleteTest } = useTests();

  const handleDeleteConfirm = () => {
    if (testToDelete) {
      deleteTest(testToDelete.id);
      setIsDeleteDialogOpen(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (isEditing && currentTest) {
        // Update existing test
        const updatedTest: Test = {
          ...currentTest,
          title: values.title,
          description: values.description,
          is_active: values.is_active,
          // Ensure we properly save the scaled scoring data
          scaled_scoring: values.scaled_scoring ? values.scaled_scoring.map(item => ({
            module_id: item.module_id,
            correct_answers: item.correct_answers,
            scaled_score: item.scaled_score
          })) : [],
          // Ensure all modules have required properties
          modules: values.modules.map(module => ({
            id: module.id || Math.random().toString(36).substr(2, 9),
            name: module.name,
            type: module.type
          }))
        };
        
        console.log("Updating test with scaled scoring:", updatedTest.scaled_scoring);
        updateTest(updatedTest);
      } else {
        // Create new test
        const newTest: Test = {
          id: Math.random().toString(36).substr(2, 9), // Generate a random ID
          title: values.title,
          description: values.description,
          is_active: values.is_active,
          created_at: new Date().toISOString(),
          // Ensure we properly save the scaled scoring data
          scaled_scoring: values.scaled_scoring ? values.scaled_scoring.map(item => ({
            module_id: item.module_id,
            correct_answers: item.correct_answers,
            scaled_score: item.scaled_score
          })) : [],
          // Ensure all modules have required properties
          modules: values.modules.map(module => ({
            id: module.id || Math.random().toString(36).substr(2, 9),
            name: module.name,
            type: module.type
          }))
        };
        
        console.log("Creating test with scaled scoring:", newTest.scaled_scoring);
        createTest(newTest);
      }
      
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error submitting test:", error);
    }
  };

  return (
    <>
      <TestDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isEditing={isEditing}
        currentTest={currentTest}
        onSubmit={onSubmit}
        questionCount={questionCount}
      />

      <DeleteTestDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        test={testToDelete}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

export default TestDialogManager;
