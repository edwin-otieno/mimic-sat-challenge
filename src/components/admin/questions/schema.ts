
import { z } from 'zod';
import { QuestionType } from './types';

export const questionFormSchema = z.object({
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

export type QuestionFormValues = z.infer<typeof questionFormSchema>;
