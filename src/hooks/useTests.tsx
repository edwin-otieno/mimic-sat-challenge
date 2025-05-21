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

// Sample data for tests until we set up the database
const sampleTests: Test[] = [
  {
    id: '1',
    title: 'Math Practice Test',
    description: 'A comprehensive practice test for math skills assessment',
    is_active: true,
    created_at: new Date().toISOString(),
    scaled_scoring: [
      { module_id: '1-1', correct_answers: 0, scaled_score: 0 },
      { module_id: '1-1', correct_answers: 5, scaled_score: 50 },
      { module_id: '1-1', correct_answers: 10, scaled_score: 100 },
      { module_id: '1-2', correct_answers: 0, scaled_score: 0 },
      { module_id: '1-2', correct_answers: 5, scaled_score: 50 },
      { module_id: '1-2', correct_answers: 10, scaled_score: 100 }
    ],
    modules: [
      { id: '1-1', name: 'Reading & Writing', type: 'reading_writing' },
      { id: '1-2', name: 'Math', type: 'math' }
    ]
  },
  {
    id: '2',
    title: 'Reading Comprehension',
    description: 'Test students reading and analytical abilities',
    is_active: false,
    created_at: new Date().toISOString(),
    modules: [
      { id: '2-1', name: 'Reading & Writing', type: 'reading_writing' },
      { id: '2-2', name: 'Math', type: 'math' }
    ],
    scaled_scoring: []
  },
  {
    id: '3',
    title: 'Science Assessment',
    description: 'Evaluate understanding of key scientific concepts',
    is_active: true,
    created_at: new Date().toISOString(),
    modules: [
      { id: '3-1', name: 'Reading & Writing', type: 'reading_writing' },
      { id: '3-2', name: 'Math', type: 'math' }
    ],
    scaled_scoring: []
  }
];

// Store tests in localStorage to persist between page refreshes
const saveTestsToStorage = (tests: Test[]) => {
  try {
    localStorage.setItem('admin_tests', JSON.stringify(tests));
  } catch (error) {
    console.error('Error saving tests to localStorage:', error);
  }
};

// Get tests from localStorage
const getTestsFromStorage = (): Test[] => {
  try {
    const storedTests = localStorage.getItem('admin_tests');
    if (storedTests) {
      const parsedTests = JSON.parse(storedTests);
      // Ensure scaled scoring arrays are properly initialized
      return parsedTests.map((test: Test) => ({
        ...test,
        scaled_scoring: test.scaled_scoring || []
      }));
    }
  } catch (error) {
    console.error('Error loading tests from localStorage:', error);
  }
  return sampleTests; // Fallback to sample tests
};

export const useTests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tests, setTests] = useState<Test[]>(getTestsFromStorage());

  // Helper to normalize test data from DB
  const normalizeTest = (test: any): Test => ({
    ...test,
    modules: typeof test.modules === 'string' ? JSON.parse(test.modules) : test.modules,
    scaled_scoring: typeof test.scaled_scoring === 'string' ? JSON.parse(test.scaled_scoring) : test.scaled_scoring || [],
  });

  // Fetch tests from Supabase, fallback to localStorage
  const fetchTests = async () => {
    try {
      const dbTests = await getTestsFromDb();
      return dbTests.map(normalizeTest);
    } catch (err) {
      console.error('Falling back to localStorage for tests:', err);
      return getTestsFromStorage();
    }
  };

  const { isLoading, error, refetch } = useQuery({
    queryKey: ['tests'],
    queryFn: fetchTests,
    initialData: getTestsFromStorage(),
    staleTime: Infinity
  });

  // Keep local state in sync with backend/localStorage
  useEffect(() => {
    setTests(tests => tests);
    saveTestsToStorage(tests);
  }, [tests]);

  // Generate a UUID-like unique ID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const updateTest = async (updatedTest: Test) => {
    console.log('Attempting to update test:', JSON.stringify(updatedTest, null, 2));
    
    try {
      console.log('Calling updateTestInDb with:', JSON.stringify(updatedTest, null, 2));
      const dbTest = await updateTestInDb(updatedTest);
      
      console.log('Database returned test:', JSON.stringify(dbTest, null, 2));
      
      const normalized = normalizeTest(dbTest);
      
      console.log('Normalized test:', JSON.stringify(normalized, null, 2));
      
      // Update tests in state
      setTests(prev => {
        const updatedTests = prev.map(t => t.id === normalized.id ? normalized : t);
        console.log('Updated tests state:', JSON.stringify(updatedTests, null, 2));
        return updatedTests;
      });
      
      toast({ 
        title: 'Success', 
        description: 'Test updated successfully' 
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      
      return normalized;
    } catch (err) {
      console.error('Error updating test:', err);
      
      // Fallback to localStorage
      const updatedTests = tests.map(test =>
        test.id === updatedTest.id ? { 
          ...updatedTest, 
          scaled_scoring: updatedTest.scaled_scoring || [] 
        } : test
      );
      
      console.log('Fallback updated tests:', JSON.stringify(updatedTests, null, 2));
      
      setTests(updatedTests);
      saveTestsToStorage(updatedTests);
      
      toast({ 
        title: 'Offline', 
        description: 'Test updated locally (offline mode)' 
      });
      
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      
      // Rethrow the error to allow caller to handle it
      throw err;
    }
  };

  // Generate a UUID-like unique ID
  const generateUniqueId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const createTest = async (newTest: Test) => {
    // Ensure the test has a valid UUID
    const testWithUuid = {
      ...newTest,
      id: newTest.id || generateUUID(),
      modules: newTest.modules.map(module => ({
        ...module,
        id: module.id || generateUUID()
      }))
    };

    try {
      const dbTest = await createTestInDb(testWithUuid);
      const normalized = normalizeTest(dbTest);
      setTests(prev => [...prev, normalized]);
      saveTestsToStorage([...tests, normalized]);
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      return normalized;
    } catch (err) {
      // Fallback to localStorage
      const localTest = { 
        ...testWithUuid, 
        scaled_scoring: testWithUuid.scaled_scoring || [] 
      };
      const updatedTests = [...tests, localTest];
      setTests(updatedTests);
      saveTestsToStorage(updatedTests);
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      throw err;
    }
  };

  const deleteTest = async (testId: string) => {
    try {
      await deleteTestInDb(testId);
      setTests(prev => prev.filter(test => test.id !== testId));
      toast({ title: 'Success', description: 'Test deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    } catch (err) {
      // Fallback to localStorage
      const updatedTests = tests.filter(test => test.id !== testId);
      setTests(updatedTests);
      saveTestsToStorage(updatedTests);
      toast({ title: 'Offline', description: 'Test deleted locally (offline mode)' });
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    }
  };

  return {
    tests,
    isLoading,
    error,
    updateTest,
    createTest,
    deleteTest,
    refetchTests: refetch
  };
};
