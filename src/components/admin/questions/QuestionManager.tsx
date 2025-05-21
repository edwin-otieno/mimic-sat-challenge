import React, { useState } from 'react';
import { Question, QuestionType } from './types';
import QuestionDialog from './QuestionDialog';
import QuestionList from './QuestionList';
import QuestionHeader, { QuestionFilters } from './components/QuestionHeader';
import { useQuestionManagement } from './hooks/useQuestionManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  // Group questions by module type
  const readingWritingQuestions = displayQuestions.filter(q => q.module_type === "reading_writing");
  const mathQuestions = displayQuestions.filter(q => q.module_type === "math");

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
        <Tabs defaultValue="reading_writing" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="reading_writing">
              Reading & Writing ({readingWritingQuestions.length} questions)
            </TabsTrigger>
            <TabsTrigger value="math">
              Math ({mathQuestions.length} questions)
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="reading_writing">
            <Card>
              <CardHeader>
                <CardTitle>Reading & Writing Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <QuestionList 
                  questions={readingWritingQuestions} 
                  onEditQuestion={handleOpenDialog}
                  onDeleteQuestion={handleDeleteQuestion}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="math">
            <Card>
              <CardHeader>
                <CardTitle>Math Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <QuestionList 
                  questions={mathQuestions} 
                  onEditQuestion={handleOpenDialog}
                  onDeleteQuestion={handleDeleteQuestion}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
