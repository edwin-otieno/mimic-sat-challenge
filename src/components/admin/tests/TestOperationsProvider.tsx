import React, { createContext, useContext, useState } from 'react';
import { Test } from './types';

interface TestOperationsContextType {
  isEditing: boolean;
  currentTest: Test | null;
  isDialogOpen: boolean;
  expandedTest: string | null;
  isDeleteDialogOpen: boolean;
  testToDelete: Test | null;
  setIsEditing: (isEditing: boolean) => void;
  setCurrentTest: (test: Test | null) => void;
  setIsDialogOpen: (isOpen: boolean) => void;
  setExpandedTest: (testId: string | null) => void;
  setIsDeleteDialogOpen: (isOpen: boolean) => void;
  setTestToDelete: (test: Test | null) => void;
  handleOpenDialog: (test?: Test) => void;
  handleOpenDeleteDialog: (test: Test) => void;
  toggleExpandTest: (testId: string) => void;
}

const TestOperationsContext = createContext<TestOperationsContextType | undefined>(undefined);

export const useTestOperations = () => {
  const context = useContext(TestOperationsContext);
  if (!context) {
    throw new Error('useTestOperations must be used within a TestOperationsProvider');
  }
  return context;
};

interface TestOperationsProviderProps {
  children: React.ReactNode;
}

export const TestOperationsProvider: React.FC<TestOperationsProviderProps> = ({ children }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentTest, setCurrentTest] = useState<Test | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);
  
  const handleOpenDialog = (test?: Test) => {
    console.log('Opening dialog with test:', JSON.stringify(test, null, 2));
    if (test) {
      console.log('Setting editing mode with test:', JSON.stringify(test, null, 2));
      setIsEditing(true);
      // Ensure we have a complete test object with all required fields
      const completeTest: Test = {
        id: test.id,
        title: test.title,
        description: test.description,
        is_active: test.is_active,
        test_category: test.test_category || test.category || 'SAT', // Include test category
        created_at: test.created_at,
        modules: test.modules || [],
        scaled_scoring: test.scaled_scoring || []
      };
      console.log('Complete test object being set:', JSON.stringify(completeTest, null, 2));
      setCurrentTest(completeTest);
    } else {
      console.log('Setting create mode');
      setIsEditing(false);
      setCurrentTest(null);
    }
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (test: Test) => {
    console.log('Opening delete dialog for test:', JSON.stringify(test, null, 2));
    setTestToDelete(test);
    setIsDeleteDialogOpen(true);
  };

  const toggleExpandTest = (testId: string) => {
    console.log('Toggling expand for test:', testId);
    setExpandedTest(expandedTest === testId ? null : testId);
  };

  const value = {
    isEditing,
    currentTest,
    isDialogOpen,
    expandedTest,
    isDeleteDialogOpen,
    testToDelete,
    setIsEditing,
    setCurrentTest,
    setIsDialogOpen,
    setExpandedTest,
    setIsDeleteDialogOpen,
    setTestToDelete,
    handleOpenDialog,
    handleOpenDeleteDialog,
    toggleExpandTest,
  };

  return (
    <TestOperationsContext.Provider value={value}>
      {children}
    </TestOperationsContext.Provider>
  );
};
