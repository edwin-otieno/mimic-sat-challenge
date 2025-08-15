import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Test, ScaledScore, TestModule } from '@/components/admin/tests/types';
import {
  getTests as getTestsFromDb,
  createTestInDb,
  updateTestInDb,
  deleteTestInDb,
  getTestWithQuestionsOptimized
} from '@/services/testService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { QuestionData } from '@/components/Question';

export const useTests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tests, setTests] = useState<Test[]>([]);
  const { user } = useAuth();

  // Helper to normalize test data from DB
  const normalizeTest = (test: any): Test => {
    return {
      ...test,
      modules: typeof test.modules === 'string' ? JSON.parse(test.modules) : test.modules,
      scaled_scoring: typeof test.scaled_scoring === 'string' ? JSON.parse(test.scaled_scoring) : test.scaled_scoring || [],
    };
  };

  // Use React Query for efficient data fetching and caching
  const { data: queryData, isLoading, error: queryError } = useQuery({
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
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (formerly cacheTime)
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
      const newTest = await createTestInDb(testData as Test);
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
      const updatedTest = await updateTestInDb({ id, ...testData });
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

  const checkTestInProgress = async (testPermalink: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase
        .from('test_states')
        .select('id')
        .eq('user_id', user.id)
        .eq('test_permalink', testPermalink)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking test state:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking test in progress:', error);
      return false;
    }
  };

  return {
    tests,
    isLoading,
    error: queryError,
    createTest,
    updateTest,
    deleteTest,
    checkTestInProgress
  };
};

// Optimized hook for loading individual tests with caching
export const useOptimizedTest = (testId: string | null) => {
  const [testData, setTestData] = useState<{
    test: any;
    questions: QuestionData[];
    scaledScoring: ScaledScore[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Map<string, any>>(new Map());

  const loadTest = useCallback(async () => {
    if (!testId) return;

    // Check cache first
    if (cache.current.has(testId)) {
      console.log('Loading test from cache:', testId);
      setTestData(cache.current.get(testId));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Loading test from database:', testId);
      const result = await getTestWithQuestionsOptimized(testId);
      
      // Cache the result
      cache.current.set(testId, result);
      setTestData({
        test: result.test,
        questions: result.questions,
        scaledScoring: result.scaledScoring || []
      });
      console.log('Test loaded successfully:', testId);
    } catch (err) {
      console.error('Error loading test:', err);
      setError(err instanceof Error ? err.message : 'Failed to load test');
    } finally {
      setIsLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    loadTest();
  }, [loadTest]);

  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  return {
    testData,
    isLoading,
    error,
    reload: loadTest,
    clearCache
  };
};
