
import React, { useState } from 'react';
import { z } from 'zod';
import { Test } from './types';
import TestDialog from './TestDialog';
import TestList from './TestList';
import TestActions from './TestActions';
import { useTests } from '@/hooks/useTests';
import { formSchema } from './TestForm';

const TestContainer = () => {
  const { tests, isLoading, error, updateTest, createTest } = useTests();
  const [isEditing, setIsEditing] = useState(false);
  const [currentTest, setCurrentTest] = useState<Test | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  
  // Use 10 as default question count - in a real app, this would come from the test configuration
  const questionCount = 10;

  const handleOpenDialog = (test?: Test) => {
    if (test) {
      setIsEditing(true);
      setCurrentTest(test);
    } else {
      setIsEditing(false);
      setCurrentTest(null);
    }
    setIsDialogOpen(true);
  };

  const toggleExpandTest = (testId: string) => {
    setExpandedTest(expandedTest === testId ? null : testId);
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
          scaled_scoring: values.scaled_scoring || [],
          // Ensure all modules have required properties
          modules: values.modules.map(module => ({
            id: module.id || Math.random().toString(36).substr(2, 9),
            name: module.name,
            type: module.type
          }))
        };
        
        updateTest(updatedTest);
      } else {
        // Create new test
        const newTest: Test = {
          id: Math.random().toString(36).substr(2, 9), // Generate a random ID
          title: values.title,
          description: values.description,
          is_active: values.is_active,
          created_at: new Date().toISOString(),
          scaled_scoring: values.scaled_scoring || [],
          // Ensure all modules have required properties
          modules: values.modules.map(module => ({
            id: module.id || Math.random().toString(36).substr(2, 9),
            name: module.name,
            type: module.type
          }))
        };
        
        createTest(newTest);
      }
      
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error submitting test:", error);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading tests...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md">
        Error loading tests: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TestActions onAddTest={() => handleOpenDialog()} />

      <TestList 
        tests={tests}
        expandedTest={expandedTest}
        toggleExpandTest={toggleExpandTest}
        handleOpenDialog={handleOpenDialog}
      />

      <TestDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isEditing={isEditing}
        currentTest={currentTest}
        onSubmit={onSubmit}
        questionCount={questionCount}
      />
    </div>
  );
};

export default TestContainer;
