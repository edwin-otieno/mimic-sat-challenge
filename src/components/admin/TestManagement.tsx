
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import TestDialog from './tests/TestDialog';
import TestList from './tests/TestList';
import { Test, ScaledScore, DEFAULT_MODULES, TestModule } from './tests/types';

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

const formSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  is_active: z.boolean().default(true),
  scaled_scoring: z.array(
    z.object({
      correct_answers: z.number(),
      scaled_score: z.number()
    })
  ).optional(),
  modules: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      type: z.enum(["reading_writing", "math"])
    })
  ).default(DEFAULT_MODULES)
});

const TestManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentTest, setCurrentTest] = useState<Test | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tests, setTests] = useState<Test[]>(sampleTests);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  
  // Use 10 as default question count - in a real app, this would come from the test configuration
  const questionCount = 10;

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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (isEditing && currentTest) {
        // Update existing test in our local state
        const updatedTests = tests.map(test => {
          if (test.id === currentTest.id) {
            return {
              ...test,
              title: values.title,
              description: values.description,
              is_active: values.is_active,
              scaled_scoring: values.scaled_scoring as ScaledScore[] || [],
              // Ensure all modules have required properties
              modules: values.modules.map(module => ({
                id: module.id || Math.random().toString(36).substr(2, 9),
                name: module.name,
                type: module.type
              }))
            };
          }
          return test;
        });
        
        setTests(updatedTests);
        // Also update our sample data so changes persist
        const testIndex = sampleTests.findIndex(t => t.id === currentTest.id);
        if (testIndex >= 0) {
          sampleTests[testIndex] = {
            ...sampleTests[testIndex],
            title: values.title,
            description: values.description,
            is_active: values.is_active,
            scaled_scoring: values.scaled_scoring as ScaledScore[] || [],
            // Ensure all modules have required properties
            modules: values.modules.map(module => ({
              id: module.id || Math.random().toString(36).substr(2, 9),
              name: module.name,
              type: module.type
            }))
          };
        }
        
        toast({ title: "Success", description: "Test updated successfully" });
      } else {
        // Create new test in our local state
        const newTest: Test = {
          id: Math.random().toString(36).substr(2, 9), // Generate a random ID
          title: values.title,
          description: values.description,
          is_active: values.is_active,
          created_at: new Date().toISOString(),
          scaled_scoring: values.scaled_scoring as ScaledScore[] || undefined,
          // Ensure all modules have required properties
          modules: values.modules.map(module => ({
            id: module.id || Math.random().toString(36).substr(2, 9),
            name: module.name,
            type: module.type
          }))
        };
        
        setTests([...tests, newTest]);
        // Also update our sample data so changes persist
        sampleTests.push(newTest);
        
        toast({ title: "Success", description: "Test created successfully" });
      }
      
      // Simulate refetch
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "An error occurred", 
        variant: "destructive" 
      });
    }
  };

  const toggleExpandTest = (testId: string) => {
    setExpandedTest(expandedTest === testId ? null : testId);
  };

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Practice Tests</h3>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Test
        </Button>
      </div>

      <TestList 
        tests={tests}
        expandedTest={expandedTest}
        toggleExpandTest={toggleExpandTest}
        handleOpenDialog={handleOpenDialog}
      />

      <TestDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isEditing={isEditing}
        currentTest={currentTest}
        onSubmit={onSubmit}
        questionCount={questionCount}
      />
    </div>
  );
};

export default TestManagement;
