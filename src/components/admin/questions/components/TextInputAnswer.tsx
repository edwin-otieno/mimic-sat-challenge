import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { QuestionType } from '../types';

const TextInputAnswer = () => {
  const { register, formState: { errors }, watch } = useFormContext();
  const moduleType = watch('module_type');
  const isEssay = moduleType === 'writing';

  // For essay questions, don't show the correct answer field since they're manually graded
  if (isEssay) {
    return (
      <div className="space-y-2 p-4 bg-blue-50 rounded-md border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Essay Question:</strong> This question will be manually graded by teachers/admins. 
          No correct answer is required.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="correct_answer">Correct Answer(s) <span className="text-red-500">*</span></Label>
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
