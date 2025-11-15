import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormControl, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QuestionFormValues } from '../schema';
import TextHighlighter from '@/components/TextHighlighter';
import { Textarea } from '@/components/ui/textarea';
import OptionImageUpload from './OptionImageUpload';

interface MultipleChoiceOptionsProps {
  // No additional props needed as we'll use useFormContext
}

const MultipleChoiceOptions = ({}: MultipleChoiceOptionsProps) => {
  const { toast } = useToast();
  const { control, setValue } = useFormContext<QuestionFormValues>();
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: "options"
  });

  const addOption = () => {
    append({ text: '', is_correct: false });
  };

  const removeOption = (index: number) => {
    if (fields.length <= 2) {
      toast({
        title: "Error",
        description: "Questions must have at least 2 options",
        variant: "destructive"
      });
      return;
    }
    remove(index);
  };

  const handleImageUploaded = (index: number) => {
    return (newText: string) => {
      setValue(`options.${index}.text`, newText);
    };
  };

  return (
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
      
      {fields.map((field, index) => (
        <div key={field.id} className="flex space-x-2 items-start">
          <FormField
            control={control}
            name={`options.${index}.text`}
            render={({ field }) => (
              <FormItem className="flex-grow">
                <FormControl>
                  <div className="space-y-2">
                    <Textarea 
                      placeholder={`Option ${index + 1}`} 
                      {...field} 
                      className="min-h-[100px]"
                    />
                    <OptionImageUpload
                      onImageUploaded={handleImageUploaded(index)}
                      currentText={field.value}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
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
  );
};

export default MultipleChoiceOptions;
