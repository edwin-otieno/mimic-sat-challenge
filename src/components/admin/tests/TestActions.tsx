
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Test } from './types';

interface TestActionsProps {
  onAddTest: () => void;
}

const TestActions = ({ onAddTest }: TestActionsProps) => {
  return (
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-medium">Practice Tests</h3>
      <Button onClick={onAddTest}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add New Test
      </Button>
    </div>
  );
};

export default TestActions;
