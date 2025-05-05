
import React from 'react';
import TestList from './TestList';
import TestActions from './TestActions';
import TestDialogManager from './TestDialogManager';
import { useTests } from '@/hooks/useTests';
import { TestOperationsProvider, useTestOperations } from './TestOperationsProvider';

const TestContainerContent = () => {
  const { tests, isLoading, error } = useTests();
  const { expandedTest, handleOpenDialog, handleOpenDeleteDialog, toggleExpandTest } = useTestOperations();
  
  // Use 10 as default question count - in a real app, this would come from the test configuration
  const questionCount = 10;

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
        handleDeleteTest={handleOpenDeleteDialog}
      />

      <TestDialogManager questionCount={questionCount} />
    </div>
  );
};

const TestContainer = () => {
  return (
    <TestOperationsProvider>
      <TestContainerContent />
    </TestOperationsProvider>
  );
};

export default TestContainer;
