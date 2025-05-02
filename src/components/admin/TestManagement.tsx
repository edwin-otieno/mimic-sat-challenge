
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Pencil, PlusCircle, ChevronDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import QuestionManager from './QuestionManager';

// Define the test interface
interface Test {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

const formSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  is_active: z.boolean().default(true)
});

// Sample data for tests until we set up the database
const sampleTests: Test[] = [
  {
    id: '1',
    title: 'Math Practice Test',
    description: 'A comprehensive practice test for math skills assessment',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Reading Comprehension',
    description: 'Test students reading and analytical abilities',
    is_active: false,
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Science Assessment',
    description: 'Evaluate understanding of key scientific concepts',
    is_active: true,
    created_at: new Date().toISOString()
  }
];

const TestManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentTest, setCurrentTest] = useState<Test | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tests, setTests] = useState<Test[]>(sampleTests);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      is_active: true
    }
  });

  // Use React Query to simulate data fetching
  const { isLoading, error } = useQuery({
    queryKey: ['tests'],
    queryFn: async () => {
      // Simulating API call with a delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return sampleTests;
    },
    initialData: sampleTests
  });

  // Update tests state when query data changes
  useEffect(() => {
    setTests(sampleTests);
  }, []);

  const handleOpenDialog = (test?: Test) => {
    if (test) {
      setIsEditing(true);
      setCurrentTest(test);
      form.reset({
        id: test.id,
        title: test.title,
        description: test.description,
        is_active: test.is_active
      });
    } else {
      setIsEditing(false);
      setCurrentTest(null);
      form.reset({
        title: '',
        description: '',
        is_active: true
      });
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
              is_active: values.is_active
            };
          }
          return test;
        });
        
        setTests(updatedTests);
        toast({ title: "Success", description: "Test updated successfully" });
      } else {
        // Create new test in our local state
        const newTest: Test = {
          id: Math.random().toString(36).substr(2, 9), // Generate a random ID
          title: values.title,
          description: values.description,
          is_active: values.is_active,
          created_at: new Date().toISOString()
        };
        
        setTests([...tests, newTest]);
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Test
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Test' : 'Create New Test'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter test title..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter test description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Make this test available to students
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">{isEditing ? 'Save Changes' : 'Create Test'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {tests && tests.length > 0 ? (
        <div className="space-y-4">
          {tests.map((test) => (
            <Collapsible 
              key={test.id}
              open={expandedTest === test.id}
              onOpenChange={() => toggleExpandTest(test.id)}
              className="border rounded-md overflow-hidden"
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex justify-between items-center p-4 hover:bg-gray-50 cursor-pointer">
                  <div className="flex-1 text-left">
                    <div className="font-medium">{test.title}</div>
                    <div className="text-sm text-gray-500 truncate">{test.description}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      test.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {test.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDialog(test);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <ChevronDown className="h-5 w-5" />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t px-4 py-6">
                  <QuestionManager testId={test.id} testTitle={test.title} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 bg-gray-50 rounded-md">
          <p className="text-gray-500">No tests found. Create your first test!</p>
        </div>
      )}
    </div>
  );
};

export default TestManagement;
