
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { QuestionType } from '../types';
import { DEFAULT_MODULES } from '../../tests/types';
import { QuestionFormValues } from '../schema';

interface QuestionDetailsProps {
  // No additional props needed as we'll use useFormContext
}

const QuestionDetails = ({}: QuestionDetailsProps) => {
  const { control, watch } = useFormContext<QuestionFormValues>();
  const moduleType = watch('module_type');
  
  return (
    <>
      {/* Module selection */}
      <FormField
        control={control}
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
        control={control}
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
      
      {/* Question text */}
      <FormField
        control={control}
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
      
      {/* Explanation */}
      <FormField
        control={control}
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
    </>
  );
};

export default QuestionDetails;
