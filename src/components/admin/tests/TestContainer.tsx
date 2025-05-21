import React from 'react';
import TestList from './TestList';
import TestActions from './TestActions';
import TestDialogManager from './TestDialogManager';
import { useTests } from '@/hooks/useTests';
import { TestOperationsProvider, useTestOperations } from './TestOperationsProvider';

const TestContainerContent = () => {
  const { tests, isLoading, error } = useTests();
  const { expandedTest, handleOpenDialog, handleOpenDeleteDialog, toggleExpandTest } = useTestOperations();
  
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

      <TestDialogManager />
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
