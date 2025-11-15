import React from 'react';
import { z } from 'zod';
import { Test } from './types';
import TestDialog from './TestDialog';
import DeleteTestDialog from './DeleteTestDialog';
import { formSchema } from './TestForm';
import { useTestOperations } from './TestOperationsProvider';
import { useTests } from '@/hooks/useTests';
import { useToast } from '@/components/ui/use-toast';
import { generateUUID } from '@/utils/uuid';
import { useAuth } from '@/contexts/AuthContext';

interface TestDialogManagerProps {
}

const TestDialogManager: React.FC<TestDialogManagerProps> = () => {
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
  const { user } = useAuth();

  const handleDeleteConfirm = () => {
    if (testToDelete) {
      deleteTest(testToDelete.id);
      setIsDeleteDialogOpen(false);
    }
  };

  const { toast } = useToast();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to update tests',
          variant: 'destructive'
        });
        return;
      }

      console.log("=== DIALOG MANAGER DEBUG ===");
      console.log("Form submission values:", JSON.stringify(values, null, 2));
      console.log("Current editing state:", { isEditing, currentTest });
      console.log("Test category from values:", values.test_category);
      console.log("Modules from values:", values.modules);
      console.log("Scaled scoring from values:", values.scaled_scoring);

      if (isEditing && currentTest) {
        // Update existing test
        const updatedTest: Test = {
          id: currentTest.id, // Explicitly set the ID from currentTest
          title: values.title,
          description: values.description,
          is_active: values.is_active,
          test_category: values.test_category, // Include test category
          created_at: currentTest.created_at, // Preserve the original creation date
          // Ensure we properly save the scaled scoring data
          scaled_scoring: values.scaled_scoring ? values.scaled_scoring.map(item => ({
            module_id: item.module_id,
            correct_answers: item.correct_answers,
            scaled_score: item.scaled_score
          })) : [],
          // Ensure all modules have required properties
          modules: values.modules.map(module => ({
            id: module.id || module.type, // Use module type as ID if not provided
            name: module.name,
            type: module.type,
            time: module.time,
            questionCount: module.questionCount
          }))
        };
        
        console.log("Updating test with full details:", JSON.stringify(updatedTest, null, 2));
        console.log("Test ID being updated:", updatedTest.id);
        
        if (!updatedTest.id) {
          throw new Error('Test ID is missing from the update data');
        }
        
        try {
          const result = await updateTest(updatedTest.id, updatedTest);
          console.log("=== UPDATE RESULT DEBUG ===");
          console.log("Update test result:", result);
          console.log("Result test_category:", result?.test_category);
          console.log("Result category:", result?.category);
          console.log("=== END UPDATE RESULT DEBUG ===");
          toast({
            title: 'Success',
            description: 'Test updated successfully'
          });
          setIsDialogOpen(false);
        } catch (updateError: any) {
          console.error("Failed to update test:", updateError);
          console.error("Error details:", {
            message: updateError.message,
            code: updateError.code,
            details: updateError.details
          });
          toast({
            title: 'Error',
            description: updateError.message || 'Failed to update test',
            variant: 'destructive'
          });
          throw updateError;
        }
      } else {
        // Create new test
        const newTest: Test = {
          id: generateUUID(),
          title: values.title,
          description: values.description,
          is_active: values.is_active,
          test_category: values.test_category, // Include test category
          created_at: new Date().toISOString(),
          // Ensure we properly save the scaled scoring data
          scaled_scoring: values.scaled_scoring ? values.scaled_scoring.map(item => ({
            module_id: item.module_id,
            correct_answers: item.correct_answers,
            scaled_score: item.scaled_score
          })) : [],
          // Ensure all modules have required properties
          modules: values.modules.map(module => ({
            id: module.id || module.type, // Use module type as ID if not provided
            name: module.name,
            type: module.type,
            time: module.time,
            questionCount: module.questionCount
          }))
        };
        
        console.log("Creating test with full details:", JSON.stringify(newTest, null, 2));
        
        try {
          const result = await createTest(newTest);
          console.log("Create test result:", result);
          toast({
            title: 'Success',
            description: 'Test created successfully'
          });
          setIsDialogOpen(false);
        } catch (createError: any) {
          console.error("Failed to create test:", createError);
          console.error("Error details:", {
            message: createError.message,
            code: createError.code,
            details: createError.details
          });
          toast({
            title: 'Error',
            description: createError.message || 'Failed to create test',
            variant: 'destructive'
          });
          throw createError;
        }
      }
    } catch (error: any) {
      console.error("Error submitting test:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details
      });
      // Show error toast to user
      toast({
        title: "Error",
        description: error.message || "Failed to save test",
        variant: "destructive"
      });
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
