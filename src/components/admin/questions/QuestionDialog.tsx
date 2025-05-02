
import React from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash } from 'lucide-react';
import { Question, QuestionOption } from './types';

const questionFormSchema = z.object({
  id: z.string().optional(),
  test_id: z.string(),
  text: z.string().min(3, { message: "Question text must be at least 3 characters" }),
  explanation: z.string().optional(),
  options: z.array(
    z.object({
      id: z.string().optional(),
      text: z.string().min(1, { message: "Option text is required" }),
      is_correct: z.boolean().default(false)
    })
  ).min(2, { message: "At least 2 options are required" })
  .refine((options) => options.some(option => option.is_correct), {
    message: "At least one option must be marked as correct",
  })
});

interface QuestionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  currentQuestion: Question | null;
  testId: string;
  onSubmit: (values: z.infer<typeof questionFormSchema>) => void;
}

const QuestionDialog = ({
  isOpen,
  onOpenChange,
  isEditing,
  currentQuestion,
  testId,
  onSubmit
}: QuestionDialogProps) => {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof questionFormSchema>>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      test_id: testId,
      text: currentQuestion?.text || '',
      explanation: currentQuestion?.explanation || '',
      options: currentQuestion?.options || [
        { text: '', is_correct: false },
        { text: '', is_correct: false }
      ],
      id: currentQuestion?.id
    }
  });

  const addOption = () => {
    const currentOptions = form.getValues('options');
    form.setValue('options', [...currentOptions, { text: '', is_correct: false }]);
  };

  const removeOption = (index: number) => {
    const currentOptions = form.getValues('options');
    if (currentOptions.length <= 2) {
      toast({
        title: "Error",
        description: "Questions must have at least 2 options",
        variant: "destructive"
      });
      return;
    }
    form.setValue('options', currentOptions.filter((_, i) => i !== index));
  };

  const handleSubmit = (values: z.infer<typeof questionFormSchema>) => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Question' : 'Create New Question'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Text</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter question text..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="explanation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Explanation (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter explanation..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <FormLabel>Answer Options</FormLabel>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addOption}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Option
                </Button>
              </div>
              
              {form.watch('options').map((_, index) => (
                <div key={index} className="flex space-x-2 items-start">
                  <FormField
                    control={form.control}
                    name={`options.${index}.text`}
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormControl>
                          <Input placeholder={`Option ${index + 1}`} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name={`options.${index}.is_correct`}
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 mt-2">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Correct
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeOption(index)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <FormMessage>
                {form.formState.errors.options?.message}
              </FormMessage>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">{isEditing ? 'Save Changes' : 'Create Question'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionDialog;
