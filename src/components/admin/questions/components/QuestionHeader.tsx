
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Filter, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';

export interface QuestionHeaderProps {
  testTitle: string;
  onAddQuestion: () => void;
  onFilter?: (filters: QuestionFilters) => void;
  filterOptions?: {
    moduleTypes?: Array<{ value: string; label: string }>;
    questionTypes?: Array<{ value: string; label: string }>;
  };
  actions?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  }[];
}

export interface QuestionFilters {
  searchTerm?: string;
  moduleType?: string;
  questionType?: string;
}

const QuestionHeader = ({ 
  testTitle, 
  onAddQuestion, 
  onFilter,
  filterOptions,
  actions = []
}: QuestionHeaderProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleType, setModuleType] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleSearch = () => {
    if (onFilter) {
      onFilter({
        searchTerm,
        moduleType: moduleType || undefined,
        questionType: questionType || undefined
      });
    }
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (onFilter) {
      onFilter({
        searchTerm: e.target.value,
        moduleType: moduleType || undefined,
        questionType: questionType || undefined
      });
    }
  };

  const handleModuleTypeChange = (value: string) => {
    setModuleType(value);
    if (onFilter) {
      onFilter({
        searchTerm,
        moduleType: value || undefined,
        questionType: questionType || undefined
      });
    }
  };

  const handleQuestionTypeChange = (value: string) => {
    setQuestionType(value);
    if (onFilter) {
      onFilter({
        searchTerm,
        moduleType: moduleType || undefined,
        questionType: value || undefined
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-md font-medium">Questions for: {testTitle}</h3>
        <div className="flex items-center gap-2">
          {actions.map((action, index) => (
            <Button 
              key={index} 
              onClick={action.onClick} 
              variant={action.variant || "outline"} 
              size="sm"
            >
              {action.label}
            </Button>
          ))}
          
          <Button onClick={onAddQuestion} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      {onFilter && (
        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search questions..."
              value={searchTerm}
              onChange={handleSearchInput}
              className="pl-8"
            />
          </div>

          <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 p-3" align="end">
              {filterOptions?.moduleTypes && (
                <div className="mb-3">
                  <p className="text-xs font-medium mb-1">Module Type</p>
                  <Select value={moduleType} onValueChange={handleModuleTypeChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All module types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All module types</SelectItem>
                      {filterOptions.moduleTypes.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {filterOptions?.questionTypes && (
                <div className="mb-3">
                  <p className="text-xs font-medium mb-1">Question Type</p>
                  <Select value={questionType} onValueChange={handleQuestionTypeChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All question types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All question types</SelectItem>
                      {filterOptions.questionTypes.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Button 
                className="w-full mt-2" 
                size="sm" 
                variant="default" 
                onClick={() => {
                  setIsFilterOpen(false);
                  handleSearch();
                }}>
                Apply Filters
              </Button>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};

export default QuestionHeader;
