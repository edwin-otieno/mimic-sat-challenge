
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import QuestionManager from '../questions/QuestionManager';
import { Test } from './types';

interface TestItemProps {
  test: Test;
  isExpanded: boolean;
  onToggleExpand: (testId: string) => void;
  onEditTest: (test: Test) => void;
  onDeleteTest: (test: Test) => void;
}

const TestItem = ({ 
  test, 
  isExpanded, 
  onToggleExpand, 
  onEditTest,
  onDeleteTest 
}: TestItemProps) => {
  return (
    <Collapsible 
      key={test.id}
      open={isExpanded}
      onOpenChange={() => onToggleExpand(test.id)}
      className="border rounded-md overflow-hidden"
    >
      <CollapsibleTrigger className="w-full">
        <div className="flex justify-between items-center p-4 hover:bg-gray-50 cursor-pointer">
          <div className="flex-1 text-left">
            <div className="font-medium">{test.title}</div>
            <div className="text-sm text-gray-500 truncate">{test.description}</div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs ${
              test.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {test.is_active ? 'Active' : 'Inactive'}
            </span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={(e) => {
                e.stopPropagation();
                onEditTest(test);
              }}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTest(test);
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
            <ChevronDown className="h-5 w-5" />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t px-4 py-6">
          <div className="mb-6">
            <h3 className="text-md font-medium mb-2">Test Modules:</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {test.modules?.map((module, index) => (
                <Badge key={module.id || index} variant={module.type === "reading_writing" ? "default" : "secondary"}>
                  {index + 1}: {module.name}
                </Badge>
              ))}
            </div>
          </div>
          <QuestionManager testId={test.id} testTitle={test.title} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default TestItem;
