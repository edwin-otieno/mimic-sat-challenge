
import React, { useState } from 'react';
import { Question } from './types';
import QuestionDialog from './QuestionDialog';
import QuestionList from './QuestionList';
import QuestionHeader from './components/QuestionHeader';
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

  return (
    <div className="space-y-4">
      <QuestionHeader 
        testTitle={testTitle} 
        onAddQuestion={() => handleOpenDialog()} 
      />

      {loading ? (
        <div className="text-center py-8 bg-gray-50 rounded-md">
          <p className="text-gray-500">Loading questions...</p>
        </div>
      ) : (
        <QuestionList 
          questions={questions} 
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
