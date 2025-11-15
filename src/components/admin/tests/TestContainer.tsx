import React, { useMemo, useState } from 'react';
import TestList from './TestList';
import TestActions from './TestActions';
import TestDialogManager from './TestDialogManager';
import { useTests } from '@/hooks/useTests';
import { TestOperationsProvider, useTestOperations } from './TestOperationsProvider';
import { TestExportImport } from './TestExportImport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TestContainerContent = () => {
  const { tests, isLoading, error } = useTests();
  const { expandedTest, handleOpenDialog, handleOpenDeleteDialog, toggleExpandTest } = useTestOperations();
  const [activeTab, setActiveTab] = useState<'all' | 'SAT' | 'ACT'>('all');
  
  // Separate tests by category
  const { satTests, actTests } = useMemo(() => {
    const sat = tests.filter(test => (test.test_category || 'SAT') !== 'ACT');
    const act = tests.filter(test => test.test_category === 'ACT');
    return { satTests: sat, actTests: act };
  }, [tests]);
  
  if (isLoading) {
    return <div className="flex justify-center p-8">Loading tests...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md">
        Error loading tests: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Test Management</h1>
        <TestExportImport />
      </div>
      
      <div className="space-y-6">
        <TestActions onAddTest={() => handleOpenDialog()} />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'SAT' | 'ACT')}>
          <TabsList>
            <TabsTrigger value="all">All Tests ({tests.length})</TabsTrigger>
            <TabsTrigger value="SAT">SAT ({satTests.length})</TabsTrigger>
            <TabsTrigger value="ACT">ACT ({actTests.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <TestList 
              tests={tests}
              expandedTest={expandedTest}
              toggleExpandTest={toggleExpandTest}
              handleOpenDialog={handleOpenDialog}
              handleDeleteTest={handleOpenDeleteDialog}
            />
          </TabsContent>
          
          <TabsContent value="SAT" className="mt-4">
            <TestList 
              tests={satTests}
              expandedTest={expandedTest}
              toggleExpandTest={toggleExpandTest}
              handleOpenDialog={handleOpenDialog}
              handleDeleteTest={handleOpenDeleteDialog}
            />
          </TabsContent>
          
          <TabsContent value="ACT" className="mt-4">
            <TestList 
              tests={actTests}
              expandedTest={expandedTest}
              toggleExpandTest={toggleExpandTest}
              handleOpenDialog={handleOpenDialog}
              handleDeleteTest={handleOpenDeleteDialog}
            />
          </TabsContent>
        </Tabs>

        <TestDialogManager />
      </div>
    </div>
  );
};

const TestContainer = () => {
  return (
    <TestOperationsProvider>
      <TestContainerContent />
    </TestOperationsProvider>
  );
};

export default TestContainer;
