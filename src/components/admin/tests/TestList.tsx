
import React from 'react';
import TestItem from './TestItem';
import { Test } from './types';

interface TestListProps {
  tests: Test[];
  expandedTest: string | null;
  toggleExpandTest: (testId: string) => void;
  handleOpenDialog: (test?: Test) => void;
}

const TestList = ({ 
  tests, 
  expandedTest, 
  toggleExpandTest, 
  handleOpenDialog 
}: TestListProps) => {
  if (!tests || tests.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-md">
        <p className="text-gray-500">No tests found. Create your first test!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tests.map((test) => (
        <TestItem 
          key={test.id}
          test={test}
          isExpanded={expandedTest === test.id}
          onToggleExpand={toggleExpandTest}
          onEditTest={handleOpenDialog}
        />
      ))}
    </div>
  );
};

export default TestList;
