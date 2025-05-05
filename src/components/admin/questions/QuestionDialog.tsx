
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
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash, Image } from 'lucide-react';
import { Question, QuestionOption, QuestionType } from './types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DEFAULT_MODULES } from '../tests/types';

const questionFormSchema = z.object({
  id: z.string().optional(),
  test_id: z.string(),
  text: z.string().min(3, { message: "Question text must be at least 3 characters" }),
  explanation: z.string().optional(),
  module_id: z.string().optional(),
  module_type: z.enum(["reading_writing", "math"]),
  question_type: z.enum([QuestionType.MultipleChoice, QuestionType.TextInput]),
  options: z.array(
    z.object({
      id: z.string().optional(),
      text: z.string().min(1, { message: "Option text is required" }),
      is_correct: z.boolean().default(false)
    })
  ).optional().refine((options) => {
    // If question type is multiple choice, require at least 2 options and one correct option
    if (!options) return true;
    if (options.length < 2) return false;
    return options.some(option => option.is_correct);
  }, {
    message: "Multiple choice questions must have at least 2 options with one marked as correct",
  }),
  correct_answer: z.string().optional()
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
  const [previewImage, setPreviewImage] = useState<string | null>(currentQuestion?.image_url || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Get default question type
  const getDefaultQuestionType = () => {
    if (currentQuestion?.question_type) {
      return currentQuestion.question_type;
    }
    return QuestionType.MultipleChoice;
  };
  
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
      module_type: currentQuestion?.module_type || "reading_writing",
      question_type: getDefaultQuestionType(),
      id: currentQuestion?.id,
      module_id: currentQuestion?.module_id,
      correct_answer: '',
    }
  });

  const questionType = form.watch('question_type');
  const moduleType = form.watch('module_type');

  const addOption = () => {
    const currentOptions = form.getValues('options') || [];
    form.setValue('options', [...currentOptions, { text: '', is_correct: false }]);
  };

  const removeOption = (index: number) => {
    const currentOptions = form.getValues('options') || [];
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
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.match('image.*')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image file size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }
    
    setImageFile(file);
    
    // Create a preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const removeImage = () => {
    setPreviewImage(null);
    setImageFile(null);
  };

  const handleSubmit = async (values: z.infer<typeof questionFormSchema>) => {
    // For demo, we'll just use the preview image as the image_url
    // In a real app, you would upload the image to a storage service
    const imageUrl = previewImage;
    
    // Combine the form values with the image URL
    const questionData = {
      ...values,
      image_url: imageUrl
    };
    
    onSubmit(questionData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Question' : 'Create New Question'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            {/* Module selection */}
            <FormField
              control={form.control}
              name="module_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a module" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DEFAULT_MODULES.map((module) => (
                        <SelectItem key={module.type} value={module.type}>
                          {module.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Question type selection */}
            <FormField
              control={form.control}
              name="question_type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Question Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={QuestionType.MultipleChoice} id="multiple-choice" />
                        <FormLabel htmlFor="multiple-choice" className="font-normal">
                          Multiple Choice
                        </FormLabel>
                      </div>
                      {moduleType === "math" && (
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={QuestionType.TextInput} id="text-input" />
                          <FormLabel htmlFor="text-input" className="font-normal">
                            Text Input (Math only)
                          </FormLabel>
                        </div>
                      )}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Image upload */}
            <div className="space-y-2">
              <FormLabel>Question Image (Optional)</FormLabel>
              <div className="flex flex-col space-y-2">
                {previewImage ? (
                  <div className="relative">
                    <img 
                      src={previewImage} 
                      alt="Question" 
                      className="w-full max-h-60 object-contain border rounded-md" 
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md">
                    <Image className="h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">Upload an image for this question</p>
                    <label className="mt-2">
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                      <Button type="button" variant="outline" size="sm">
                        Select Image
                      </Button>
                    </label>
                  </div>
                )}
              </div>
            </div>
            
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
            
            {/* Multiple choice options */}
            {questionType === QuestionType.MultipleChoice && (
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
                
                {form.watch('options')?.map((_, index) => (
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
              </div>
            )}
            
            {/* Text input correct answer (for math questions) */}
            {questionType === QuestionType.TextInput && (
              <FormField
                control={form.control}
                name="correct_answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correct Answer</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter the correct answer..." {...field} />
                    </FormControl>
                    <FormDescription>
                      For text input questions, enter the exact answer that will be considered correct.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
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
