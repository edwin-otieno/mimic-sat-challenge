import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Test, ScaledScore, TestModule } from '@/components/admin/tests/types';
import {
  getTests as getTestsFromDb,
  createTestInDb,
  updateTestInDb,
  deleteTestInDb
} from '@/services/testService';

export const useTests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tests, setTests] = useState<Test[]>([]);

  // Helper to normalize test data from DB
  const normalizeTest = (test: any): Test => {
    return {
      ...test,
      modules: typeof test.modules === 'string' ? JSON.parse(test.modules) : test.modules,
      scaled_scoring: typeof test.scaled_scoring === 'string' ? JSON.parse(test.scaled_scoring) : test.scaled_scoring || [],
    };
  };

  // Use React Query for efficient data fetching and caching
  const { data: queryData, isLoading, error } = useQuery({
    queryKey: ['tests'],
    queryFn: async () => {
      console.log('Fetching tests from database...');
      const response = await getTestsFromDb();
      console.log('Raw database response:', response);
      
      if (!response) {
        throw new Error('Failed to fetch tests');
      }
      
      // Normalize the data immediately
      const normalizedTests = response.map(normalizeTest);
      console.log('Normalized tests:', normalizedTests);
      
      // Update local state immediately
      setTests(normalizedTests);
      
      return normalizedTests;
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch when component mounts
  });

  // Update tests state when query data changes
  useEffect(() => {
    if (queryData) {
      setTests(queryData);
    }
  }, [queryData]);

  // Create a new test
  const createTest = async (testData: Partial<Test>) => {
    try {
      const newTest = await createTestInDb(testData);
      if (newTest) {
        const normalizedTest = normalizeTest(newTest);
        setTests(prev => [...prev, normalizedTest]);
        // Invalidate the query cache to trigger a refetch
        queryClient.invalidateQueries({ queryKey: ['tests'] });
        return normalizedTest;
      }
    } catch (error) {
      console.error('Error creating test:', error);
      toast({
        title: "Error",
        description: "Failed to create test. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Update an existing test
  const updateTest = async (id: string, testData: Partial<Test>) => {
    try {
      const updatedTest = await updateTestInDb(id, testData);
      if (updatedTest) {
        const normalizedTest = normalizeTest(updatedTest);
        setTests(prev => prev.map(test => 
          test.id === id ? normalizedTest : test
        ));
        // Invalidate the query cache to trigger a refetch
        queryClient.invalidateQueries({ queryKey: ['tests'] });
        return normalizedTest;
      }
    } catch (error) {
      console.error('Error updating test:', error);
      toast({
        title: "Error",
        description: "Failed to update test. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Delete a test
  const deleteTest = async (id: string) => {
    try {
      await deleteTestInDb(id);
      setTests(prev => prev.filter(test => test.id !== id));
      // Invalidate the query cache to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    } catch (error) {
      console.error('Error deleting test:', error);
      toast({
        title: "Error",
        description: "Failed to delete test. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    tests,
    isLoading,
    error,
    createTest,
    updateTest,
    deleteTest
  };
};
