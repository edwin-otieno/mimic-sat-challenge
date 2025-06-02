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
    console.log('Normalizing test:', test);
    const normalized = {
      ...test,
      modules: typeof test.modules === 'string' ? JSON.parse(test.modules) : test.modules,
      scaled_scoring: typeof test.scaled_scoring === 'string' ? JSON.parse(test.scaled_scoring) : test.scaled_scoring || [],
    };
    console.log('Normalized test:', normalized);
    return normalized;
  };

  // Fetch tests from Supabase
  const fetchTests = async () => {
    try {
      console.log('Fetching tests from database...');
      const dbTests = await getTestsFromDb();
      console.log('Raw database response:', dbTests);
      
      if (!dbTests || dbTests.length === 0) {
        console.log('No tests found in database');
        return [];
      }
      
      const normalizedTests = dbTests.map(normalizeTest);
      console.log('Normalized tests:', normalizedTests);
      return normalizedTests;
    } catch (err) {
      console.error('Error fetching tests from database:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch tests. Please try again later.',
        variant: 'destructive'
      });
      return [];
    }
  };

  const { data: queryData, isLoading, error, refetch } = useQuery({
    queryKey: ['tests'],
    queryFn: fetchTests,
    initialData: [],
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 3, // Retry failed requests 3 times
    onError: (error) => {
      console.error('Query error:', error);
    }
  });

  // Keep local state in sync with query data
  useEffect(() => {
    if (queryData) {
      console.log('Updating tests state with query data:', queryData);
      setTests(queryData);
    }
  }, [queryData]);

  const updateTest = async (updatedTest: Test) => {
    try {
      console.log('Updating test:', updatedTest);
      const dbTest = await updateTestInDb(updatedTest);
      console.log('Database response:', dbTest);
      
      const normalized = normalizeTest(dbTest);
      console.log('Normalized updated test:', normalized);
      
      // Update both local state and query cache
      setTests(prev => prev.map(t => t.id === normalized.id ? normalized : t));
      queryClient.setQueryData(['tests'], (old: Test[] = []) => 
        old.map(t => t.id === normalized.id ? normalized : t)
      );
      
      toast({ 
        description: 'Test updated successfully' 
      });
      
      return normalized;
    } catch (err) {
      console.error('Error updating test:', err);
      toast({
        title: 'Error',
        description: 'Failed to update test. Please try again later.',
        variant: 'destructive'
      });
      throw err;
    }
  };

  return {
    tests,
    isLoading,
    error,
    refetch,
    updateTest
  };
};
