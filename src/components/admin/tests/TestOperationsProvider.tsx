
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
    if (test) {
      setIsEditing(true);
      setCurrentTest(test);
    } else {
      setIsEditing(false);
      setCurrentTest(null);
    }
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (test: Test) => {
    setTestToDelete(test);
    setIsDeleteDialogOpen(true);
  };

  const toggleExpandTest = (testId: string) => {
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
