import React, { useState } from 'react';
import { Question, QuestionType } from './types';
import QuestionDialog from './QuestionDialog';
import QuestionList from './QuestionList';
import QuestionHeader, { QuestionFilters } from './components/QuestionHeader';
import { useQuestionManagement } from './hooks/useQuestionManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTests } from '@/hooks/useTests';
import { DEFAULT_SAT_MODULES, DEFAULT_ACT_MODULES } from '../tests/types';
import PassageManager from '../passages/PassageManager';

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
  
  // Get test category to determine available modules
  const { tests } = useTests();
  const currentTest = tests.find(test => test.id === testId);
  const testCategory = currentTest?.test_category || 'SAT';
  const availableModules = testCategory === 'ACT' ? DEFAULT_ACT_MODULES : DEFAULT_SAT_MODULES;

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

  // Group questions by module type dynamically based on test category
  const moduleGroups = availableModules.reduce((groups, module) => {
    groups[module.type] = displayQuestions.filter(q => q.module_type === module.type);
    return groups;
  }, {} as Record<string, Question[]>);

  const filterOptions = {
    moduleTypes: availableModules.map(module => ({
      value: module.type,
      label: module.name
    })),
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
        <Tabs defaultValue={testCategory === 'ACT' ? "passages" : (availableModules[0]?.type || "reading_writing")} className="w-full">
          <TabsList className="mb-4">
            {testCategory === 'ACT' && (
              <TabsTrigger value="passages">
                Passages
              </TabsTrigger>
            )}
            {availableModules.map((module) => (
              <TabsTrigger key={module.type} value={module.type}>
                {module.name} ({moduleGroups[module.type]?.length || 0} questions)
              </TabsTrigger>
            ))}
          </TabsList>
          
          {testCategory === 'ACT' && (
            <TabsContent value="passages">
              <PassageManager testId={testId} testTitle={testTitle} />
            </TabsContent>
          )}
          
          {availableModules.map((module) => (
            <TabsContent key={module.type} value={module.type}>
              <Card>
                <CardHeader>
                  <CardTitle>{module.name} Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <QuestionList 
                    questions={moduleGroups[module.type] || []} 
                    onEditQuestion={handleOpenDialog}
                    onDeleteQuestion={handleDeleteQuestion}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
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
