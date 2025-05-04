
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

export const useTests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tests, setTests] = useState<Test[]>(sampleTests);
  
  // Use React Query to simulate data fetching
  const { isLoading, error } = useQuery({
    queryKey: ['tests'],
    queryFn: async () => {
      // Simulating API call with a delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return sampleTests;
    },
    initialData: sampleTests,
    staleTime: Infinity // Prevent auto-refetching
  });

  // Update tests state when query data changes
  useEffect(() => {
    setTests(sampleTests);
  }, []);

  const updateTest = (updatedTest: Test) => {
    const updatedTests = tests.map(test => {
      if (test.id === updatedTest.id) {
        return updatedTest;
      }
      return test;
    });
    
    setTests(updatedTests);
    
    // Also update our sample data so changes persist
    const testIndex = sampleTests.findIndex(t => t.id === updatedTest.id);
    if (testIndex >= 0) {
      sampleTests[testIndex] = updatedTest;
    }
    
    toast({ title: "Success", description: "Test updated successfully" });
    queryClient.invalidateQueries({ queryKey: ['tests'] });
  };

  const createTest = (newTest: Test) => {
    setTests([...tests, newTest]);
    // Also update our sample data so changes persist
    sampleTests.push(newTest);
    
    toast({ title: "Success", description: "Test created successfully" });
    queryClient.invalidateQueries({ queryKey: ['tests'] });
  };
  
  return {
    tests,
    isLoading,
    error,
    updateTest,
    createTest
  };
};
