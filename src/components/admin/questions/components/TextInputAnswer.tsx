import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { QuestionType } from '../types';

const TextInputAnswer = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-2">
      <Label htmlFor="correct_answer">Correct Answer(s)</Label>
      <Input
        id="correct_answer"
        placeholder="Enter correct answers separated by commas"
        {...register('correct_answer')}
      />
      {errors.correct_answer && (
        <p className="text-sm text-red-500">{errors.correct_answer.message as string}</p>
      )}
      <p className="text-sm text-muted-foreground">
        Enter multiple correct answers separated by commas. For example: "answer1, answer2, answer3"
      </p>
    </div>
  );
};

export default TextInputAnswer;
