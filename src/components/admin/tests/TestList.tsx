
import React from 'react';
import { Test } from './types';
import TestItem from './TestItem';

interface TestListProps {
  tests: Test[];
  expandedTest: string | null;
  toggleExpandTest: (testId: string) => void;
  handleOpenDialog: (test?: Test) => void;
  handleDeleteTest: (test: Test) => void;
}

const TestList: React.FC<TestListProps> = ({
  tests,
  expandedTest,
  toggleExpandTest,
  handleOpenDialog,
  handleDeleteTest
}) => {
  if (tests.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6 text-center">
        <p className="text-muted-foreground">No tests found. Create your first test to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tests.map(test => (
        <TestItem
          key={test.id}
          test={test}
          isExpanded={expandedTest === test.id}
          onToggleExpand={() => toggleExpandTest(test.id)}
          onEdit={() => handleOpenDialog(test)}
          onDelete={() => handleDeleteTest(test)}
        />
      ))}
    </div>
  );
};

export default TestList;
