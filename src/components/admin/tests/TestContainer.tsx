import React from 'react';
import TestList from './TestList';
import TestActions from './TestActions';
import TestDialogManager from './TestDialogManager';
import { useTests } from '@/hooks/useTests';
import { TestOperationsProvider, useTestOperations } from './TestOperationsProvider';
import { TestExportImport } from './TestExportImport';

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
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Test Management</h1>
        <TestExportImport />
      </div>
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
