
import React, { useState } from 'react';
import { Question, QuestionType } from './types';
import QuestionDialog from './QuestionDialog';
import QuestionList from './QuestionList';
import QuestionHeader, { QuestionFilters } from './components/QuestionHeader';
import { useQuestionManagement } from './hooks/useQuestionManagement';

interface QuestionManagerProps {
  testId: string;
  testTitle: string;
}

const QuestionManager = ({ testId, testTitle }: QuestionManagerProps) => {
  const { questions, loading, handleSubmitQuestion, handleDeleteQuestion } = useQuestionManagement(testId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [filters, setFilters] = useState<QuestionFilters>({});

  const handleOpenDialog = (question?: Question) => {
    if (question) {
      setIsEditing(true);
      setCurrentQuestion(question);
    } else {
      setIsEditing(false);
      setCurrentQuestion(null);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (values: any) => {
    const success = await handleSubmitQuestion(values);
    if (success) {
      setIsDialogOpen(false);
    }
  };

  const handleFilter = (newFilters: QuestionFilters) => {
    setFilters(newFilters);
    
    let filtered = [...questions];
    
    if (newFilters.searchTerm) {
      const searchLower = newFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.text.toLowerCase().includes(searchLower) ||
        q.explanation?.toLowerCase().includes(searchLower)
      );
    }
    
    if (newFilters.moduleType) {
      filtered = filtered.filter(q => q.module_type === newFilters.moduleType);
    }
    
    if (newFilters.questionType) {
      filtered = filtered.filter(q => q.question_type === newFilters.questionType);
    }
    
    setFilteredQuestions(filtered);
  };

  // Determine which questions to show based on whether filters are applied
  const displayQuestions = Object.keys(filters).some(key => filters[key as keyof QuestionFilters]) 
    ? filteredQuestions
    : questions;

  const filterOptions = {
    moduleTypes: [
      { value: 'reading_writing', label: 'Reading & Writing' },
      { value: 'math', label: 'Math' }
    ],
    questionTypes: [
      { value: QuestionType.MultipleChoice, label: 'Multiple Choice' },
      { value: QuestionType.TextInput, label: 'Text Input' }
    ]
  };

  return (
    <div className="space-y-4">
      <QuestionHeader 
        testTitle={testTitle} 
        onAddQuestion={() => handleOpenDialog()} 
        onFilter={handleFilter}
        filterOptions={filterOptions}
      />

      {loading ? (
        <div className="text-center py-8 bg-gray-50 rounded-md">
          <p className="text-gray-500">Loading questions...</p>
        </div>
      ) : (
        <QuestionList 
          questions={displayQuestions} 
          onEditQuestion={handleOpenDialog}
          onDeleteQuestion={handleDeleteQuestion}
        />
      )}

      <QuestionDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isEditing={isEditing}
        currentQuestion={currentQuestion}
        testId={testId}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default QuestionManager;
