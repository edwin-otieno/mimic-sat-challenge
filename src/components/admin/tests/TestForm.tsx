
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Test, ScaledScore, DEFAULT_MODULES, TestModule } from './types';
import ScaledScoreTable from './ScaledScoreTable';
import TestModulesDisplay from './TestModulesDisplay';

// Form schema definition
export const formSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  is_active: z.boolean().default(true),
  scaled_scoring: z.array(
    z.object({
      correct_answers: z.number().min(0),
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

interface TestFormProps {
  currentTest: Test | null;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  onCancel: () => void;
  questionCount: number;
}

const TestForm: React.FC<TestFormProps> = ({ 
  currentTest, 
  onSubmit,
  onCancel,
  questionCount
}) => {
  const [scaledScores, setScaledScores] = React.useState<ScaledScore[]>(
    currentTest?.scaled_scoring || []
  );

  const defaultModules = currentTest?.modules || DEFAULT_MODULES;
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: currentTest?.title || '',
      description: currentTest?.description || '',
      is_active: currentTest?.is_active ?? true,
      id: currentTest?.id,
      scaled_scoring: currentTest?.scaled_scoring || [],
      modules: defaultModules
    }
  });

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    // Include the scaled scores in the form submission
    const updatedValues = {
      ...values,
      scaled_scoring: scaledScores,
      modules: values.modules || DEFAULT_MODULES
    };
    onSubmit(updatedValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
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
        
        <TestModulesDisplay />
        
        <div className="border rounded-lg p-4">
          <ScaledScoreTable 
            scores={scaledScores}
            onChange={setScaledScores}
            questionCount={questionCount}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {currentTest ? 'Save Changes' : 'Create Test'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TestForm;
