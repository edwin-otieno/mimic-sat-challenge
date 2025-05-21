import { z } from 'zod';
import { QuestionType } from './types';

export const questionFormSchema = z.object({
  id: z.string().optional(),
  test_id: z.string(),
  module_id: z.string().optional(),
  text: z.string().min(1, 'Question text is required'),
  explanation: z.string().optional().nullable(),
  module_type: z.string(),
  question_type: z.nativeEnum(QuestionType),
  correct_answer: z.string().optional().nullable(),
  image_url: z.string().nullable(),
  options: z.array(z.object({
    text: z.string().min(1, 'Option text is required'),
    is_correct: z.boolean()
  })).optional().nullable()
}).refine((data) => {
  // For text input questions, correct_answer is required
  if (data.question_type === QuestionType.TextInput) {
    return !!data.correct_answer;
  }
  // For multiple choice questions, options are required
  if (data.question_type === QuestionType.MultipleChoice) {
    return Array.isArray(data.options) && data.options.length >= 2;
  }
  return true;
}, {
  message: "Invalid question configuration",
  path: ["question_type"]
});

export type QuestionFormValues = z.infer<typeof questionFormSchema>;
