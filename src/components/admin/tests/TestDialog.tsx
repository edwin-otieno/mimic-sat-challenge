
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScaledScoreTable from './ScaledScoreTable';
import { Test, ScaledScore, DEFAULT_MODULES, TestModule } from './types';

const formSchema = z.object({
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

interface TestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  currentTest: Test | null;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  questionCount?: number;
}

const TestDialog = ({ 
  isOpen, 
  onOpenChange, 
  isEditing, 
  currentTest, 
  onSubmit,
  questionCount = 10 // Default question count if not provided
}: TestDialogProps) => {
  
  const [scaledScores, setScaledScores] = useState<ScaledScore[]>(
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

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    // Include the scaled scores in the form submission
    const updatedValues = {
      ...values,
      scaled_scoring: scaledScores,
      modules: values.modules || DEFAULT_MODULES
    };
    onSubmit(updatedValues);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Test' : 'Create New Test'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
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
            
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">Test Modules</h3>
              <p className="text-sm text-gray-600 mb-4">
                This test includes 2 standard modules:
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 border rounded-md bg-blue-50">
                  <h4 className="font-medium">Module 1: Reading & Writing</h4>
                  <p className="text-sm text-gray-600">Reading comprehension and language skills</p>
                </div>
                <div className="p-3 border rounded-md bg-purple-50">
                  <h4 className="font-medium">Module 2: Math</h4>
                  <p className="text-sm text-gray-600">Mathematics and quantitative reasoning</p>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <ScaledScoreTable 
                scores={scaledScores}
                onChange={setScaledScores}
                questionCount={questionCount}
              />
            </div>
            
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
  );
};

export default TestDialog;
