
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { QuestionFormValues } from '../schema';

interface TextInputAnswerProps {
  // No additional props needed as we'll use useFormContext
}

const TextInputAnswer = ({}: TextInputAnswerProps) => {
  const { control } = useFormContext<QuestionFormValues>();
  
  return (
    <FormField
      control={control}
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
  );
};

export default TextInputAnswer;
