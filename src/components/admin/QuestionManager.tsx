import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger, 
} from '@/components/ui/collapsible';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, ChevronDown, Trash, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Define the question option interface
interface QuestionOption {
  id?: string;
  text: string;
  is_correct: boolean;
}

// Define the question interface
export interface Question {
  id?: string;
  test_id: string;
  text: string;
  explanation?: string;
  options: QuestionOption[];
}

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

// Create sample questions for now
const createSampleQuestions = (testId: string): Question[] => [
  {
    id: '1',
    test_id: testId,
    text: 'What is 2+2?',
    explanation: 'Basic addition',
    options: [
      { id: '1', text: '3', is_correct: false },
      { id: '2', text: '4', is_correct: true },
      { id: '3', text: '5', is_correct: false }
    ]
  },
  {
    id: '2',
    test_id: testId,
    text: 'What is the capital of France?',
    explanation: 'Geography question',
    options: [
      { id: '4', text: 'London', is_correct: false },
      { id: '5', text: 'Paris', is_correct: true },
      { id: '6', text: 'Berlin', is_correct: false }
    ]
  }
];

interface QuestionManagerProps {
  testId: string;
  testTitle: string;
}

const QuestionManager = ({ testId, testTitle }: QuestionManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  // Initialize with sample questions
  useEffect(() => {
    const sampleQuestions = createSampleQuestions(testId);
    setQuestions(sampleQuestions);
  }, [testId]);

  const form = useForm<z.infer<typeof questionFormSchema>>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      test_id: testId,
      text: '',
      explanation: '',
      options: [
        { text: '', is_correct: false },
        { text: '', is_correct: false }
      ]
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

  const handleOpenDialog = (question?: Question) => {
    if (question) {
      setIsEditing(true);
      setCurrentQuestion(question);
      form.reset({
        id: question.id,
        test_id: testId,
        text: question.text,
        explanation: question.explanation || '',
        options: question.options
      });
    } else {
      setIsEditing(false);
      setCurrentQuestion(null);
      form.reset({
        test_id: testId,
        text: '',
        explanation: '',
        options: [
          { text: '', is_correct: false },
          { text: '', is_correct: false }
        ]
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof questionFormSchema>) => {
    try {
      if (isEditing && currentQuestion) {
        // Update existing question in local state
        const updatedQuestions = questions.map(q => {
          if (q.id === currentQuestion.id) {
            return { ...values, id: currentQuestion.id } as Question;
          }
          return q;
        });
        
        setQuestions(updatedQuestions);
        toast({ title: "Success", description: "Question updated successfully" });
      } else {
        // Create new question in local state
        const newQuestion: Question = {
          ...values,
          id: Math.random().toString(36).substr(2, 9), // Generate a random ID
          test_id: testId,
          text: values.text, // Ensure text is explicitly set
          options: values.options.map(option => ({
            ...option,
            id: option.id || Math.random().toString(36).substr(2, 9),
            text: option.text, // Ensure text is explicitly set
            is_correct: option.is_correct
          }))
        };
        
        setQuestions([...questions, newQuestion]);
        toast({ title: "Success", description: "Question created successfully" });
      }
      
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "An error occurred", 
        variant: "destructive" 
      });
    }
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
    toast({ title: "Success", description: "Question deleted successfully" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-md font-medium">Questions for: {testTitle}</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Question' : 'Create New Question'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
      </div>

      {questions.length > 0 ? (
        <div className="space-y-2">
          {questions.map((question) => (
            <Collapsible key={question.id} className="border rounded-md">
              <CollapsibleTrigger asChild>
                <div className="p-4 flex justify-between items-center cursor-pointer">
                  <div className="font-medium">{question.text}</div>
                  <ChevronDown className="h-5 w-5" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 border-t">
                  <div className="space-y-4">
                    {question.explanation && (
                      <div>
                        <span className="font-medium">Explanation:</span> {question.explanation}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Options:</span>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        {question.options.map((option) => (
                          <li key={option.id} className={option.is_correct ? "text-green-600 font-medium" : ""}>
                            {option.text} {option.is_correct && "(Correct)"}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex justify-end space-x-2 mt-2">
                      <Button size="sm" variant="outline" onClick={() => handleOpenDialog(question)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteQuestion(question.id!)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-md">
          <p className="text-gray-500">No questions found. Add your first question!</p>
        </div>
      )}
    </div>
  );
};

export default QuestionManager;
