
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Test, ScaledScore, TestModule } from '@/components/admin/tests/types';

// Sample data for tests until we set up the database
const sampleTests: Test[] = [
  {
    id: '1',
    title: 'Math Practice Test',
    description: 'A comprehensive practice test for math skills assessment',
    is_active: true,
    created_at: new Date().toISOString(),
    scaled_scoring: [
      { correct_answers: 0, scaled_score: 0 },
      { correct_answers: 5, scaled_score: 50 },
      { correct_answers: 10, scaled_score: 100 }
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
    ]
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
    ]
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
      return JSON.parse(storedTests);
    }
  } catch (error) {
    console.error('Error loading tests from localStorage:', error);
  }
  return sampleTests; // Fallback to sample tests
};

export const useTests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Initialize with tests from localStorage or sample tests
  const [tests, setTests] = useState<Test[]>(getTestsFromStorage());
  
  // Use React Query to simulate data fetching
  const { isLoading, error } = useQuery({
    queryKey: ['tests'],
    queryFn: async () => {
      // Simulating API call with a delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return getTestsFromStorage();
    },
    initialData: getTestsFromStorage(),
    staleTime: Infinity // Prevent auto-refetching
  });

  // Save tests to localStorage whenever they change
  useEffect(() => {
    saveTestsToStorage(tests);
  }, [tests]);

  const updateTest = (updatedTest: Test) => {
    const updatedTests = tests.map(test => {
      if (test.id === updatedTest.id) {
        return updatedTest;
      }
      return test;
    });
    
    setTests(updatedTests);
    saveTestsToStorage(updatedTests);
    
    toast({ title: "Success", description: "Test updated successfully" });
    queryClient.invalidateQueries({ queryKey: ['tests'] });
  };

  const createTest = (newTest: Test) => {
    const updatedTests = [...tests, newTest];
    setTests(updatedTests);
    saveTestsToStorage(updatedTests);
    
    toast({ title: "Success", description: "Test created successfully" });
    queryClient.invalidateQueries({ queryKey: ['tests'] });
  };
  
  const deleteTest = (testId: string) => {
    const updatedTests = tests.filter(test => test.id !== testId);
    setTests(updatedTests);
    saveTestsToStorage(updatedTests);
    
    toast({ title: "Success", description: "Test deleted successfully" });
    queryClient.invalidateQueries({ queryKey: ['tests'] });
  };
  
  return {
    tests,
    isLoading,
    error,
    updateTest,
    createTest,
    deleteTest
  };
};
